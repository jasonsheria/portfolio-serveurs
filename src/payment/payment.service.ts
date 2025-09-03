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
        
    private isTestMode = true; // Mettre à true pour le mode simulation

    private generateSimulatedPaymentUrl(params: {
        paymentId: string;
        frontendUrl: string;
        amount: number;
        paymentMethod: string;
    }): string {
        const { paymentId, frontendUrl, amount, paymentMethod } = params;
        return `${frontendUrl}/payment-simulation/${paymentId}?amount=${amount}&method=${paymentMethod}`;
    }

    async processPayment(data: CreatePaymentDto): Promise<any> {
        Logger.log('Données de paiement reçues: ' + JSON.stringify(data, null, 2), 'PaymentService');

        const { amount, paymentMethod, accountId, accountType, plan } = data;
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
            // Configuration des URLs
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

            // Simuler un délai de traitement en mode test
            if (this.isTestMode) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                Logger.log('Mode simulation de paiement activé', 'PaymentService');
            }

            // Valider les informations de paiement
            if (['visa', 'mastercard'].includes(paymentMethod)) {
                if (!data.cardHolderName || !data.cardNumber || !data.expiryDate || !data.cvv) {
                    throw new Error('Informations de carte incomplètes');
                }
            } else {
                if (!data.mobileNumber) {
                    throw new Error('Numéro de téléphone manquant');
                }
            }

            // Préparer les données pour FreshPay
            let paymentMethodDetails;
            if (['visa', 'mastercard'].includes(paymentMethod)) {
                paymentMethodDetails = {
                    card: {
                        holder_name: data.cardHolderName,
                        number: data.cardNumber,
                        expiry: data.expiryDate.replace('/', ''),
                        cvv: data.cvv
                    }
                };
            } else {
                paymentMethodDetails = {
                    mobile_money: {
                        phone_number: data.mobileNumber
                    }
                };
            }

            // Logger les URLs pour le débogage
            Logger.log(`Frontend URL: ${frontendUrl}`, 'PaymentService');
            Logger.log(`Backend URL: ${backendUrl}`, 'PaymentService');

            // Générer un ID de paiement simulé
            const simulatedPaymentId = `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            let responseData;
            
            if (this.isTestMode) {
                // Simuler une réponse de l'API de paiement
                responseData = {
                    payment_id: simulatedPaymentId,
                    payment_url: `${frontendUrl}/payment-simulation/${simulatedPaymentId}`,
                    status: 'pending',
                    amount: amount,
                    currency: 'USD'
                };
                Logger.log('Réponse simulée générée:', responseData);
            } else {
                // Code réel FreshPay à implémenter plus tard
                throw new Error('Mode production non configuré');
            }

            // Créer l'entrée de paiement dans la base de données
            const paymentRecord = {
                amount,
                currency: 'USD',
                paymentMethod,
                status: 'pending',
                freshpayPaymentId: simulatedPaymentId,
                metadata: {
                    accountId,
                    accountType,
                    plan,
                },
                paymentDetails: ['visa', 'mastercard'].includes(paymentMethod)
                    ? {
                        cardHolderName: data.cardHolderName,
                        cardNumber: '****' + data.cardNumber?.slice(-4),
                        expiryDate: data.expiryDate,
                    }
                    : {
                        mobileNumber: data.mobileNumber
                    }
            };

            // Sauvegarder le paiement dans la base de données
            const payment = new this.paymentModel(paymentRecord);
            await payment.save();

            // En mode test, on retourne une URL de simulation
            return {
                paymentUrl: responseData.payment_url,
                paymentId: responseData.payment_id,
                isTestMode: this.isTestMode
            };
        } catch (error) {
            Logger.error('Erreur lors du processus de paiement: ' + error.message, 'PaymentService');
            throw new ConflictException('Erreur lors du processus de paiement: ' + error.message);
        }
    }

    private mapPaymentMethod(method: string): string {
        // Si la méthode est 'on', la convertir en 'airtel' par défaut
        if (method === 'on') {
            method = 'airtel';
        }

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

    private validatePaymentMethod(method: string): void {
        // Validation de la méthode de paiement
        if (method === 'on') {
            throw new Error('Méthode de paiement non spécifiée');
        }
        
        if (!['visa', 'mastercard', 'airtel', 'orange', 'vodacom'].includes(method)) {
            throw new Error('Méthode de paiement non supportée');
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