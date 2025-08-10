import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { StripeService } from './stripe.service';

@Controller('payments')
export class StripeController {
  constructor(private stripeService: StripeService) {}

  @Post('create-intent')
  async createPaymentIntent(@Body() body: { amount: number; currency?: string }) {
    const paymentIntent = await this.stripeService.createPaymentIntent(
      body.amount,
      body.currency
    );
    
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  @Get('confirm/:id')
  async confirmPayment(@Param('id') paymentIntentId: string) {
    return await this.stripeService.confirmPayment(paymentIntentId);
  }
}