import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment } from '../entity/payment/payment.schema';
import { CreatePaymentDto } from './dto/payment.dto';
import { UsersService } from '../users/users.service';
import { Site } from '../entity/site/site.schema';
import { User } from '../entity/users/user.schema';
import * as axios from 'axios';

@Injectable()
export class PaymentService {
    constructor(
        @InjectModel('User') private userModel: Model<User>,
        @InjectModel(Payment.name) private paymentModel: Model<Payment>,
        @InjectModel(Site.name) private siteModel: Model<Site>,
        @InjectModel('Owner') private ownerModel: Model<any>,
        private usersService: UsersService,
        private configService: ConfigService
    ) {
            // L'ancienne simulation en mémoire (private readonly usersModel: Model<User>, this.usersModel = userModel,
            // ainsi que les références à this.users et this.nextId) a été retirée.
            // Toutes les opérations de base de données se feront maintenant via this.userModel.
        
        }
    
    // Example method to handle payment processing
        
    async processPayment(data: CreatePaymentDto): Promise<any> {
        const { amount, paymentMethod, accountId, accountType, plan, paymentDetails } = data;
        Logger.log('Début processPayment', 'PaymentService');
        Logger.log('Payload reçu : ' + JSON.stringify(data), 'PaymentService');

        if (amount <= 0) {
            Logger.warn('Montant <= 0, annulation paiement', 'PaymentService');
            throw new BadRequestException('Le montant doit être supérieur à 0');
        }

        // Vérifier que tous les champs requis sont présents
        if (!accountId || !accountType || !plan || !paymentMethod) {
            throw new BadRequestException('Informations de paiement incomplètes');
        }

        try {
            // Valider les informations de paiement
            this.validatePaymentDetails(data);

            // Configuration FreshPay
            const FRESHPAY_API_URL = process.env.FRESHPAY_API_URL;
            const FRESHPAY_API_KEY = process.env.FRESHPAY_API_KEY;
            const FRESHPAY_MERCHANT_ID = process.env.FRESHPAY_MERCHANT_ID;

            // Préparer les données pour FreshPay
            const paymentData = {
                merchant_id: FRESHPAY_MERCHANT_ID,
                amount: amount,
                currency: 'USD',
                payment_method: this.mapPaymentMethod(paymentMethod),
                description: `Abonnement ${plan} pour compte ${accountType}`,
                return_url: `${process.env.FRONTEND_URL}/payment/confirm`,
                cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
                notify_url: `${process.env.BACKEND_URL}/api/payment/webhook`,
                metadata: {
                    accountId,
                    accountType,
                    plan,
                },
                ...(['visa', 'mastercard'].includes(paymentMethod) 
                    ? {
                        card: {
                            holder_name: data.paymentDetails.cardHolderName,
                            number: data.paymentDetails.cardNumber,
                            expiry: data.paymentDetails.expiryDate.replace('/', ''),
                            cvv: data.paymentDetails.cvv
                        }
                    }
                    : {
                        mobile_money: {
                            phone_number: data.paymentDetails.mobileNumber
                        }
                    }
                )
            };

            // Appel à l'API FreshPay
            const axios = require('axios');
            const response = await axios.post(
                `${FRESHPAY_API_URL}/payments`,
                paymentData,
                {
                    headers: {
                        'Authorization': `Bearer ${FRESHPAY_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            // Créer l'entrée de paiement dans notre base
            const payment = new this.paymentModel({
                amount,
                currency: 'USD',
                paymentMethod,
                status: 'pending',
                freshpayPaymentId: response.data.payment_id,
                metadata: {
                    accountId,
                    accountType,
                    plan,
                },
                paymentDetails: data.paymentDetails
            });
            await payment.save();

            return {
                paymentUrl: response.data.payment_url,
                paymentId: response.data.payment_id,
            };
        } catch (error) {
            Logger.error('Erreur lors du processus de paiement: ' + error.message, 'PaymentService');
            throw new ConflictException('Erreur lors du processus de paiement: ' + error.message);
        }
    }

    private mapPaymentMethod(method: string): string {
        const mapping = {
            'airtel': 'airtel_money',
            'orange': 'orange_money',
            'vodacom': 'mpesa',
            'visa': 'card',
            'mastercard': 'card',
        };

        const mappedMethod = mapping[method] || method;

        if (!mappedMethod) {
            throw new Error(`Méthode de paiement non supportée: ${method}`);
        }

        return mappedMethod;
    }

    private validatePaymentDetails(data: CreatePaymentDto): void {
        const { paymentMethod, paymentDetails } = data;

        if (['visa', 'mastercard'].includes(paymentMethod)) {
            if (!paymentDetails.cardHolderName || 
                !paymentDetails.cardNumber || 
                !paymentDetails.expiryDate || 
                !paymentDetails.cvv) {
                throw new Error('Informations de carte incomplètes');
            }

            if (paymentDetails.cardNumber.length !== 16) {
                throw new Error('Numéro de carte invalide');
            }

            if (paymentDetails.cvv.length !== 3) {
                throw new Error('Code CVV invalide');
            }

            const [month, year] = paymentDetails.expiryDate.split('/');
            if (!month || !year || +month > 12 || +month < 1) {
                throw new Error('Date d\'expiration invalide');
            }
        } else {
            if (!paymentDetails.mobileNumber || paymentDetails.mobileNumber.length !== 9) {
                throw new Error('Numéro de téléphone invalide');
            }
        }
    }

    async handlePaymentWebhook(webhookData: any): Promise<any> {
        const { payment_id, status, metadata } = webhookData;
        const { accountId, plan } = metadata;

        // Vérifier la signature du webhook (à implémenter selon la documentation FreshPay)
        
        if (status === 'completed') {
            // Mettre à jour le statut du paiement
            await this.paymentModel.findOneAndUpdate(
                { freshpayPaymentId: payment_id },
                { status: 'completed' }
            );

            // Activer l'abonnement
            const owner = await this.ownerModel.findById(accountId);
            if (owner) {
                owner.isActive = true;
                owner.subscriptionType = plan;
                owner.status = 'active';
                owner.subscriptionStartDate = new Date();
                owner.subscriptionEndDate = this.calculateSubscriptionEndDate(plan);
                await owner.save();
            }
        }

        return { success: true };
    }

    private calculateSubscriptionEndDate(plan: string): Date {
        const date = new Date();
        if (plan === 'monthly') {
            date.setMonth(date.getMonth() + 1);
        }
        return date;
    }
    
    // Add more methods as needed for payment-related functionalities
    async getPayment(id: string): Promise<Payment> {
        const payment = await this.paymentModel.findById(id)
            .populate('client')
            .populate('site')
            .exec();
        if (!payment) {
            throw new NotFoundException(`Payment with id ${id} not found`);
        }
        return payment;
    }
    async getAllPayments(): Promise<Payment[]> {
        return this.paymentModel.find()
            .populate('client')
            .populate('site')
            .exec();
    }
    async deletePayment(id: string): Promise<Payment> {
        const payment = await this.paymentModel.findByIdAndDelete(id).exec();
        if (!payment) {
            throw new NotFoundException(`Payment with id ${id} not found`);
        }
        return payment;
    }
    async updatePayment(id: string, data: Partial<CreatePaymentDto>): Promise<Payment> {
        const payment = await this.paymentModel.findByIdAndUpdate(id, data, { new: true }).exec();
        if (!payment) {
            throw new NotFoundException(`Payment with id ${id} not found`);
        }   
        return payment;

    }
    async findByUserId(userId: string): Promise<Payment[]> {
        const payments = await this.paymentModel.find({ client: userId }).exec();
        if (!payments || payments.length === 0) {
            throw new NotFoundException(`Payments for user with id ${userId} not found`);
        }
        return payments;
    }
    async getPaymentBySite(siteId: string): Promise<Payment | null> {
        const site = await this.siteModel.findById(siteId);
        if (!site) {
            console.warn(`Site avec _id=${siteId} non trouvé`, 'PaymentService');
            throw new NotFoundException(`Site with id ${siteId} not found`);
        }
        // On recherche le paiement lié à ce site (cast siteId en ObjectId)
        const payment = await this.paymentModel.findOne({ site: new Types.ObjectId(siteId) })
            .populate('client')
            .populate('site')
            .exec();
        if (!payment) {
            console.warn(`Aucun paiement trouvé pour le site avec _id=${siteId}`, 'PaymentService');
            return null;
        }
        return payment;
         }
}