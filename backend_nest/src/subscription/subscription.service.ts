import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
  CreatePaymentTransactionDto,
  PlanId,
} from './dto/subscription.dto';
import {
  Subscription,
  PaymentMethod,
  PaymentTransaction,
  UsageTracking,
  PlanLimits,
} from './interfaces/subscription.interface';

@Injectable()
export class SubscriptionService {
  private supabase: SupabaseClient;

  // Plan configurations matching your frontend
  private readonly PLAN_LIMITS: Record<PlanId, PlanLimits> = {
    [PlanId.FREE]: {
      contractsPerDay: 1,
      features: [
        'Access to 1 free contract template',
        'Basic contract customization',
        'Community support',
        'Read-only marketplace access',
      ],
    },
    [PlanId.STANDARD]: {
      contractsPerDay: 10,
      features: [
        'Up to 10 contracts per day',
        'Access to all marketplace templates',
        'Advanced customization tools',
        'Multi-party signature support',
        'Priority email support',
        'Blockchain verification',
        'Version history tracking',
      ],
    },
    [PlanId.CREATOR]: {
      contractsPerDay: 'unlimited',
      features: [
        'Unlimited contract usage',
        'Create & submit custom templates',
        'Sell templates on marketplace',
        '70% revenue share on sales',
        'Featured creator badge',
        'Analytics dashboard',
        '24/7 priority support',
        'Early access to new features',
        'Custom branding options',
      ],
    },
  };

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        '',
    );
  }

  // ==================== SUBSCRIPTION METHODS ====================

  async createSubscription(
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    try {
      const { userEmail, planId, paymentMethodId } = createSubscriptionDto;

      // Check if user already has a subscription
      const { data: existing } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('user_email', userEmail)
        .single();

      if (existing) {
        throw new ConflictException(
          'User already has a subscription. Use update endpoint to change plan.',
        );
      }

      // For paid plans, verify payment method exists
      if (planId !== PlanId.FREE && !paymentMethodId) {
        throw new BadRequestException(
          'Payment method required for paid plans',
        );
      }

      if (paymentMethodId) {
        const paymentMethod = await this.getPaymentMethodById(paymentMethodId);
        if (paymentMethod.user_email !== userEmail) {
          throw new BadRequestException('Payment method does not belong to user');
        }
      }

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month subscription

      const { data, error } = await this.supabase
        .from('subscriptions')
        .insert({
          user_email: userEmail,
          plan_id: planId,
          status: planId === PlanId.FREE ? 'active' : 'pending',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // If paid plan, create payment transaction
      if (planId !== PlanId.FREE && paymentMethodId) {
        const amount = planId === PlanId.STANDARD ? 29 : 99;
        await this.createPaymentTransaction({
          userEmail,
          subscriptionId: data.id,
          paymentMethodId,
          amount,
          currency: 'USD',
          paymentProvider: 'stripe', // Default, can be customized
        });
      }

      console.log('✅ Created subscription:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error creating subscription:', error);
      throw error;
    }
  }

  async getSubscriptionByEmail(userEmail: string): Promise<Subscription> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (error || !data) {
      // Auto-create free subscription if none exists
      return this.createSubscription({
        userEmail,
        planId: PlanId.FREE,
      });
    }

    return data;
  }

  async updateSubscription(
    userEmail: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    const { planId, status } = updateSubscriptionDto;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (planId) {
      updateData.plan_id = planId;
      // Reset period when changing plan
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      updateData.current_period_start = now.toISOString();
      updateData.current_period_end = periodEnd.toISOString();
    }

    if (status) {
      updateData.status = status;
      if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }
    }

    const { data, error } = await this.supabase
      .from('subscriptions')
      .update(updateData)
      .eq('user_email', userEmail)
      .select()
      .single();

    if (error || !data) {
      console.error('❌ updateSubscription failed', {
        userEmail,
        updateData,
        error,
      });
      throw new NotFoundException(`Subscription not found or not updated for ${userEmail}`);
    }

    console.log('✅ Updated subscription:', data.id);
    return data;
  }

  async cancelSubscription(userEmail: string): Promise<Subscription> {
    return this.updateSubscription(userEmail, { status: 'cancelled' as any });
  }

  // ==================== PAYMENT METHOD METHODS ====================

  async createPaymentMethod(
    createPaymentMethodDto: CreatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    try {
      const { userEmail, isDefault, ...rest } = createPaymentMethodDto;

      // If this is set as default, unset other defaults
      if (isDefault) {
        await this.supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_email', userEmail);
      }

      const { data, error } = await this.supabase
        .from('payment_methods')
        .insert({
          user_email: userEmail,
          payment_type: rest.paymentType,
          is_default: isDefault ?? false,
          provider_customer_id: rest.providerCustomerId,
          last_four: rest.lastFour,
          card_brand: rest.cardBrand,
          expiry_month: rest.expiryMonth,
          expiry_year: rest.expiryYear,
          crypto_wallet_address: rest.cryptoWalletAddress,
          metadata: rest.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Created payment method:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error creating payment method:', error);
      throw error;
    }
  }

  async getPaymentMethodsByEmail(userEmail: string): Promise<PaymentMethod[]> {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getPaymentMethodById(id: string): Promise<PaymentMethod> {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Payment method not found: ${id}`);
    }

    return data;
  }

  async updatePaymentMethod(
    id: string,
    userEmail: string,
    updatePaymentMethodDto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    // Verify ownership
    const existing = await this.getPaymentMethodById(id);
    if (existing.user_email !== userEmail) {
      throw new BadRequestException('Payment method does not belong to user');
    }

    // If setting as default, unset other defaults
    if (updatePaymentMethodDto.isDefault) {
      await this.supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_email', userEmail);
    }

    const { data, error } = await this.supabase
      .from('payment_methods')
      .update({
        ...updatePaymentMethodDto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(`Payment method not found: ${id}`);
    }

    return data;
  }

  async deletePaymentMethod(id: string, userEmail: string): Promise<void> {
    // Verify ownership
    const existing = await this.getPaymentMethodById(id);
    if (existing.user_email !== userEmail) {
      throw new BadRequestException('Payment method does not belong to user');
    }

    const { error } = await this.supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);

    if (error) {
      throw new NotFoundException(`Payment method not found: ${id}`);
    }
  }

  // ==================== PAYMENT TRANSACTION METHODS ====================

  async createPaymentTransaction(
    createPaymentTransactionDto: CreatePaymentTransactionDto,
  ): Promise<PaymentTransaction> {
    try {
      const { data, error } = await this.supabase
        .from('payment_transactions')
        .insert({
          user_email: createPaymentTransactionDto.userEmail,
          subscription_id: createPaymentTransactionDto.subscriptionId,
          payment_method_id: createPaymentTransactionDto.paymentMethodId,
          amount: createPaymentTransactionDto.amount,
          currency: createPaymentTransactionDto.currency || 'USD',
          status: 'pending',
          payment_provider: createPaymentTransactionDto.paymentProvider,
          provider_transaction_id:
            createPaymentTransactionDto.providerTransactionId,
          metadata: createPaymentTransactionDto.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Created payment transaction:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error creating payment transaction:', error);
      throw error;
    }
  }

  async getTransactionsByEmail(
    userEmail: string,
  ): Promise<PaymentTransaction[]> {
    const { data, error } = await this.supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateTransactionStatus(
    transactionId: string,
    status: 'completed' | 'failed' | 'refunded',
    failureReason?: string,
  ): Promise<PaymentTransaction> {
    const { data, error } = await this.supabase
      .from('payment_transactions')
      .update({
        status,
        failure_reason: failureReason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(`Transaction not found: ${transactionId}`);
    }

    // If completed, activate subscription
    if (status === 'completed' && data.subscription_id) {
      await this.supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('id', data.subscription_id);
    }

    return data;
  }

  async findTransactionByProviderTransactionId(
    providerTransactionId: string,
  ): Promise<PaymentTransaction | null> {
    const { data, error } = await this.supabase
      .from('payment_transactions')
      .select('*')
      .eq('provider_transaction_id', providerTransactionId)
      .single();

    if (error) {
      return null;
    }
    return data;
  }

  async updateTransactionStatusByProviderId(
    providerTransactionId: string,
    status: 'completed' | 'failed' | 'refunded',
    failureReason?: string,
  ): Promise<PaymentTransaction | null> {
    const existing = await this.findTransactionByProviderTransactionId(providerTransactionId);
    if (!existing) {
      return null;
    }
    return this.updateTransactionStatus(existing.id, status, failureReason);
  }

  // ==================== USAGE TRACKING METHODS ====================

  async checkUsageLimit(userEmail: string): Promise<{
    canCreate: boolean;
    used: number;
    limit: number | 'unlimited';
    planId: string;
  }> {
    const subscription = await this.getSubscriptionByEmail(userEmail);
    const limits = this.PLAN_LIMITS[subscription.plan_id as PlanId];

    if (limits.contractsPerDay === 'unlimited') {
      return {
        canCreate: true,
        used: 0,
        limit: 'unlimited',
        planId: subscription.plan_id,
      };
    }

    const today = new Date().toISOString().split('T')[0];

    const { data } = await this.supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_email', userEmail)
      .eq('date', today)
      .single();

    const used = data?.contracts_created || 0;
    const canCreate = used < limits.contractsPerDay;

    return {
      canCreate,
      used,
      limit: limits.contractsPerDay,
      planId: subscription.plan_id,
    };
  }

  async incrementUsage(userEmail: string): Promise<UsageTracking> {
    const today = new Date().toISOString().split('T')[0];

    // Check if usage record exists for today
    const { data: existing } = await this.supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_email', userEmail)
      .eq('date', today)
      .single();

    if (existing) {
      // Increment existing record
      const { data, error } = await this.supabase
        .from('usage_tracking')
        .update({
          contracts_created: existing.contracts_created + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new record
      const { data, error } = await this.supabase
        .from('usage_tracking')
        .insert({
          user_email: userEmail,
          date: today,
          contracts_created: 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }

  async getUsageHistory(
    userEmail: string,
    days: number = 30,
  ): Promise<UsageTracking[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_email', userEmail)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ==================== HELPER METHODS ====================

  getPlanLimits(planId: PlanId): PlanLimits {
    return this.PLAN_LIMITS[planId];
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}