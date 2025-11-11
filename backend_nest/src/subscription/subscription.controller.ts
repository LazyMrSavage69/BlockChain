import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Headers,
  Req,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import Stripe from 'stripe';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
  CreatePaymentTransactionDto,
  CheckUsageLimitDto,
  PlanId,
  SubscriptionStatus,
} from './dto/subscription.dto';
import type { Request } from 'express';

@Controller('api/subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async health() {
    return { status: 'ok', service: 'subscription-service' };
  }

  // ==================== SUBSCRIPTION ENDPOINTS ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    const subscription = await this.subscriptionService.createSubscription(
      createSubscriptionDto,
    );
    return {
      success: true,
      message: 'Subscription created successfully',
      data: subscription,
    };
  }

  @Get('user/:email')
  async getSubscription(@Param('email') email: string) {
    const subscription = await this.subscriptionService.getSubscriptionByEmail(
      email,
    );
    return {
      success: true,
      data: subscription,
    };
  }

  @Put('user/:email')
  async updateSubscription(
    @Param('email') email: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    const subscription = await this.subscriptionService.updateSubscription(
      email,
      updateSubscriptionDto,
    );
    return {
      success: true,
      message: 'Subscription updated successfully',
      data: subscription,
    };
  }

  @Post('user/:email/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@Param('email') email: string) {
    const subscription = await this.subscriptionService.cancelSubscription(email);
    return {
      success: true,
      message: 'Subscription cancelled successfully',
      data: subscription,
    };
  }

  @Get()
  async getAllSubscriptions() {
    const subscriptions = await this.subscriptionService.getAllSubscriptions();
    return {
      success: true,
      data: subscriptions,
    };
  }

  // ==================== PAYMENT METHOD ENDPOINTS ====================

  @Post('payment-methods')
  @HttpCode(HttpStatus.CREATED)
  async createPaymentMethod(@Body() createPaymentMethodDto: CreatePaymentMethodDto) {
    const paymentMethod = await this.subscriptionService.createPaymentMethod(
      createPaymentMethodDto,
    );
    return {
      success: true,
      message: 'Payment method added successfully',
      data: paymentMethod,
    };
  }

  @Get('payment-methods/user/:email')
  async getPaymentMethods(@Param('email') email: string) {
    const paymentMethods = await this.subscriptionService.getPaymentMethodsByEmail(
      email,
    );
    return {
      success: true,
      data: paymentMethods,
    };
  }

  @Get('payment-methods/:id')
  async getPaymentMethod(@Param('id') id: string) {
    const paymentMethod = await this.subscriptionService.getPaymentMethodById(id);
    return {
      success: true,
      data: paymentMethod,
    };
  }

  @Put('payment-methods/:id')
  async updatePaymentMethod(
    @Param('id') id: string,
    @Query('email') email: string,
    @Body() updatePaymentMethodDto: UpdatePaymentMethodDto,
  ) {
    if (!email) {
      throw new BadRequestException('Email query parameter is required');
    }

    const paymentMethod = await this.subscriptionService.updatePaymentMethod(
      id,
      email,
      updatePaymentMethodDto,
    );
    return {
      success: true,
      message: 'Payment method updated successfully',
      data: paymentMethod,
    };
  }

  @Delete('payment-methods/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePaymentMethod(
    @Param('id') id: string,
    @Query('email') email: string,
  ) {
    if (!email) {
      throw new BadRequestException('Email query parameter is required');
    }

    await this.subscriptionService.deletePaymentMethod(id, email);
  }

  // ==================== TRANSACTION ENDPOINTS ====================

  @Post('transactions')
  @HttpCode(HttpStatus.CREATED)
  async createTransaction(
    @Body() createPaymentTransactionDto: CreatePaymentTransactionDto,
  ) {
    const transaction = await this.subscriptionService.createPaymentTransaction(
      createPaymentTransactionDto,
    );
    return {
      success: true,
      message: 'Payment transaction created',
      data: transaction,
    };
  }

  @Get('transactions/user/:email')
  async getTransactions(@Param('email') email: string) {
    const transactions = await this.subscriptionService.getTransactionsByEmail(
      email,
    );
    return {
      success: true,
      data: transactions,
    };
  }

  @Put('transactions/:id/status')
  async updateTransactionStatus(
    @Param('id') id: string,
    @Body() body: { status: 'completed' | 'failed' | 'refunded'; failureReason?: string },
  ) {
    const transaction = await this.subscriptionService.updateTransactionStatus(
      id,
      body.status,
      body.failureReason,
    );
    return {
      success: true,
      message: 'Transaction status updated',
      data: transaction,
    };
  }

  // ==================== USAGE TRACKING ENDPOINTS ====================

  @Post('usage/check')
  @HttpCode(HttpStatus.OK)
  async checkUsageLimit(@Body() checkUsageLimitDto: CheckUsageLimitDto) {
    const usage = await this.subscriptionService.checkUsageLimit(
      checkUsageLimitDto.userEmail,
    );
    return {
      success: true,
      data: usage,
    };
  }

  @Post('usage/increment')
  @HttpCode(HttpStatus.OK)
  async incrementUsage(@Body() body: { userEmail: string }) {
    const usage = await this.subscriptionService.incrementUsage(body.userEmail);
    return {
      success: true,
      message: 'Usage incremented',
      data: usage,
    };
  }

  @Get('usage/history/:email')
  async getUsageHistory(
    @Param('email') email: string,
    @Query('days') days?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : 30;
    const history = await this.subscriptionService.getUsageHistory(
      email,
      daysNumber,
    );
    return {
      success: true,
      data: history,
    };
  }

  // ==================== PLAN INFO ENDPOINT ====================

  @Get('plans/:planId')
  async getPlanLimits(@Param('planId') planId: string) {
    const limits = this.subscriptionService.getPlanLimits(planId as any);
    return {
      success: true,
      data: limits,
    };
  }

  // ==================== STRIPE CHECKOUT ====================

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async createCheckoutSession(
    @Body()
    body: {
      userEmail: string;
      planId: PlanId | string;
      successUrl: string;
      cancelUrl: string;
    },
  ) {
    console.log('➡️ /api/subscriptions/checkout called with', {
      userEmail: body?.userEmail,
      planId: body?.planId,
    });
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new BadRequestException('Stripe is not configured');
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' as any });

    const normalizedPlanId = (typeof body.planId === 'string'
      ? body.planId.toLowerCase()
      : body.planId) as PlanId;

    if (normalizedPlanId !== PlanId.STANDARD && normalizedPlanId !== PlanId.CREATOR) {
      throw new BadRequestException('Invalid plan selected');
    }

    const amountUsd = normalizedPlanId === PlanId.STANDARD ? 29 : 99;
    const planName = normalizedPlanId === PlanId.STANDARD ? 'Standard Plan' : 'Creator Plan';

    // Ensure a subscription exists and is pending for this plan
    console.log('📄 Ensuring subscription exists for', body.userEmail);
    await this.subscriptionService.getSubscriptionByEmail(body.userEmail);
    console.log('🔄 Updating subscription to pending for', body.userEmail);
    await this.subscriptionService.updateSubscription(body.userEmail, {
      planId: normalizedPlanId,
      status: SubscriptionStatus.PENDING,
    } as UpdateSubscriptionDto);
    const subscription = await this.subscriptionService.getSubscriptionByEmail(body.userEmail);

    // Create Stripe Checkout Session
    console.log('🧾 Creating Stripe checkout session');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountUsd * 100,
            product_data: { name: planName },
          },
          quantity: 1,
        },
      ],
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
      metadata: {
        user_email: body.userEmail,
        subscription_id: String(subscription.id),
        plan_id: normalizedPlanId,
      },
    });
    console.log('✅ Stripe session created', { sessionId: session.id });

    // Record pending transaction
    console.log('💾 Creating pending transaction record');
    const transaction = await this.subscriptionService.createPaymentTransaction({
      userEmail: body.userEmail,
      subscriptionId: subscription.id,
      paymentMethodId: null as any,
      amount: amountUsd,
      currency: 'USD',
      paymentProvider: 'stripe',
      providerTransactionId: session.id,
      metadata: { checkout_session_id: session.id, planId: normalizedPlanId },
    } as any);

    return {
      success: true,
      data: {
        checkoutUrl: session.url,
        transactionId: transaction.id,
        sessionId: session.id,
      },
    };
  }

  // ==================== STRIPE WEBHOOK ====================

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(@Req() req: Request, @Headers('stripe-signature') signature: string) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeSecretKey || !webhookSecret) {
      // Silently accept to avoid retries spamming if misconfigured
      return { received: true };
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' as any });

    const raw = (req as any).rawBody || (req as any).body;
    try {
      const event = stripe.webhooks.constructEvent(raw, signature, webhookSecret);

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          await this.subscriptionService.updateTransactionStatusByProviderId(
            session.id,
            'completed',
          );
          break;
        }
        case 'checkout.session.expired': {
          const session = event.data.object as any;
          await this.subscriptionService.updateTransactionStatusByProviderId(
            session.id,
            'failed',
            'Session expired',
          );
          break;
        }
        default:
          // ignore other events
          break;
      }
    } catch (err) {
      // Signature verification failed or processing error
      return { received: false };
    }

    return { received: true };
  }
}