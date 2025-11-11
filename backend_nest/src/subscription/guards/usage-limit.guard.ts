import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionService } from '../subscription.service';

@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(private subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userEmail = this.extractUserEmail(request);

    if (!userEmail) {
      throw new ForbiddenException('User email not found');
    }

    const usageCheck = await this.subscriptionService.checkUsageLimit(userEmail);

    if (!usageCheck.canCreate) {
      throw new ForbiddenException(
        `Daily limit reached. You have used ${usageCheck.used} of ${usageCheck.limit} contracts today. Upgrade to ${usageCheck.planId === 'free' ? 'Standard' : 'Creator'} plan for more.`,
      );
    }

    // Attach usage info to request
    request.usageInfo = usageCheck;

    return true;
  }

  private extractUserEmail(request: any): string | null {
    return (
      request.query?.email ||
      request.body?.userEmail ||
      request.params?.email ||
      request.user?.email ||
      null
    );
  }
}