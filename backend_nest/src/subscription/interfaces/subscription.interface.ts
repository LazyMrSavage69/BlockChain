export interface Subscription {
  id: string;
  user_email: string;
  plan_id: 'free' | 'standard' | 'creator';
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
}

export interface PaymentMethod {
  id: string;
  user_email: string;
  payment_type: 'credit_card' | 'paypal' | 'crypto' | 'bank_transfer';
  is_default: boolean;
  provider_customer_id?: string;
  last_four?: string;
  card_brand?: string;
  expiry_month?: number;
  expiry_year?: number;
  crypto_wallet_address?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  user_email: string;
  subscription_id?: string;
  payment_method_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_provider: string;
  provider_transaction_id?: string;
  failure_reason?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UsageTracking {
  id: string;
  user_email: string;
  date: string;
  contracts_created: number;
  created_at: string;
  updated_at: string;
}

export interface PlanLimits {
  contractsPerDay: number | 'unlimited';
  features: string[];
}