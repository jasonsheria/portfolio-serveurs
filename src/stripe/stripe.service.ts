import { Injectable } from '@nestjs/common';
import { CreateStripeDto } from './dto/create-stripe.dto';
import { UpdateStripeDto } from './dto/update-stripe.dto';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-06-30.basil',
    }); 
  }
 
  async createPaymentIntent(amount: number, currency: string = 'eur') {
    return await this.stripe.paymentIntents.create({
      amount: amount * 100, // Stripe utilise les centimes
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });
  }

  async confirmPayment(paymentIntentId: string) {
    return await this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  findAll() {
    return `This action returns all stripe`;
  }

  findOne(id: number) {
    return `This action returns a #${id} stripe`;
  }

  update(id: number, updateStripeDto: UpdateStripeDto) {
    return `This action updates a #${id} stripe`;
  }

  remove(id: number) {
    return `This action removes a #${id} stripe`;
  }
}
