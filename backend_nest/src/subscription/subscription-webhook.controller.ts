import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Controller('api/webhooks/subscriptions')
export class SubscriptionWebhookController {
  private readonly logger = new Logger(SubscriptionWebhookController.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Body() body: any,
    @Headers('stripe-signature') signature: string,
  ) {
    this.logger.log('Received Stripe webhook');

    try {
      // Verify webhook signature (you'll need to add Stripe SDK)
      // const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);

      const event = body; // For now, without verification

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(event.data.object);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook error:', error);
      throw new BadRequestException('Webhook error');
    }
  }

  @Post('paypal')
  @HttpCode(HttpStatus.OK)
  async handlePayPalWebhook(@Body() body: any) {
    this.logger.log('Received PayPal webhook');

    try {
      const eventType = body.event_type;

      switch (eventType) {
        case 'PAYMENT.SALE.COMPLETED':
          await this.handlePaymentSuccess(body.resource);
          break;

        case 'PAYMENT.SALE.DENIED':
          await this.handlePaymentFailure(body.resource);
          break;

        default:
          this.logger.log(`Unhandled event type: ${eventType}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook error:', error);
      throw new BadRequestException('Webhook error');
    }
  }

  @Post('crypto')
  @HttpCode(HttpStatus.OK)
  async handleCryptoWebhook(@Body() body: any) {
    this.logger.log('Received Crypto webhook');

    try {
      // Handle cryptocurrency payment confirmation
      if (body.status === 'confirmed') {
        await this.handlePaymentSuccess(body);
      } else if (body.status === 'failed') {
        await this.handlePaymentFailure(body);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook error:', error);
      throw new BadRequestException('Webhook error');
    }
  }

  private async handlePaymentSuccess(paymentData: any) {
    this.logger.log('Processing successful payment');

    // Extract transaction ID (format depends on provider)
    const transactionId = paymentData.id || paymentData.transaction_id;

    if (transactionId) {
      await this.subscriptionService.updateTransactionStatus(
        transactionId,
        'completed',
      );
    }
  }

  private async handlePaymentFailure(paymentData: any) {
    this.logger.log('Processing failed payment');

    const transactionId = paymentData.id || paymentData.transaction_id;
    const failureReason =
      paymentData.failure_message || paymentData.reason || 'Payment failed';

    if (transactionId) {
      await this.subscriptionService.updateTransactionStatus(
        transactionId,
        'failed',
        failureReason,
      );
    }
  }

  private async handleSubscriptionCancelled(subscriptionData: any) {
    this.logger.log('Processing subscription cancellation');

    // You'll need to map the provider's subscription ID to your internal ID
    // For now, this is a placeholder
    const userEmail = subscriptionData.customer_email;

    if (userEmail) {
      await this.subscriptionService.cancelSubscription(userEmail);
    }
  }
}