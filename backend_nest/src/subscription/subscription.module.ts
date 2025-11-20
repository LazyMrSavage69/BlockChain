import { Module, forwardRef } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionGuard } from './guards/subscription.guard';
import { UsageLimitGuard } from './guards/usage-limit.guard';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [forwardRef(() => ContractsModule)],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionGuard, UsageLimitGuard],
  exports: [SubscriptionService, SubscriptionGuard, UsageLimitGuard],
})
export class SubscriptionModule {}