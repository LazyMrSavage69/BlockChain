import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionGuard } from './guards/subscription.guard';
import { UsageLimitGuard } from './guards/usage-limit.guard';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionGuard, UsageLimitGuard],
  exports: [SubscriptionService, SubscriptionGuard, UsageLimitGuard],
})
export class SubscriptionModule {}