import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsObject,
} from 'class-validator';

export enum PlanId {
  FREE = 'free',
  STANDARD = 'standard',
  CREATOR = 'creator',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

export enum PaymentType {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
  CRYPTO = 'crypto',
  BANK_TRANSFER = 'bank_transfer',
}

export class CreateSubscriptionDto {
  @IsEmail()
  @IsNotEmpty()
  userEmail: string;

  @IsEnum(PlanId)
  @IsNotEmpty()
  planId: PlanId;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;
}

export class UpdateSubscriptionDto {
  @IsEnum(PlanId)
  @IsOptional()
  planId?: PlanId;

  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;
}

export class CreatePaymentMethodDto {
  @IsEmail()
  @IsNotEmpty()
  userEmail: string;

  @IsEnum(PaymentType)
  @IsNotEmpty()
  paymentType: PaymentType;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsString()
  @IsOptional()
  providerCustomerId?: string;

  @IsString()
  @IsOptional()
  lastFour?: string;

  @IsString()
  @IsOptional()
  cardBrand?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(12)
  expiryMonth?: number;

  @IsNumber()
  @IsOptional()
  @Min(2024)
  expiryYear?: number;

  @IsString()
  @IsOptional()
  cryptoWalletAddress?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdatePaymentMethodDto {
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(12)
  expiryMonth?: number;

  @IsNumber()
  @IsOptional()
  @Min(2024)
  expiryYear?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreatePaymentTransactionDto {
  @IsEmail()
  @IsNotEmpty()
  userEmail: string;

  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsNotEmpty()
  paymentProvider: string;

  @IsString()
  @IsOptional()
  providerTransactionId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CheckUsageLimitDto {
  @IsEmail()
  @IsNotEmpty()
  userEmail: string;
}