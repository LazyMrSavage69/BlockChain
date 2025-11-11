import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from '../subscription.service';
import { PlanId } from '../dto/subscription.dto';

export const REQUIRED_PLAN = 'required_plan';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.get<PlanId>(
      REQUIRED_PLAN,
      context.getHandler(),
    );

    if (!requiredPlan) {
      return true; // No subscription requirement
    }

    const request = context.switchToHttp().getRequest();
    const userEmail = this.extractUserEmail(request);

    if (!userEmail) {
      throw new UnauthorizedException('User email not found');
    }

    try {
      const subscription = await this.subscriptionService.getSubscriptionByEmail(
        userEmail,
      );

      // Check if subscription is active
      if (subscription.status !== 'active') {
        throw new ForbiddenException('Your subscription is not active');
      }

      // Check if subscription has expired
      const now = new Date();
      const periodEnd = new Date(subscription.current_period_end);
      if (now > periodEnd) {
        throw new ForbiddenException('Your subscription has expired');
      }

      // Check plan tier
      const planHierarchy = {
        [PlanId.FREE]: 0,
        [PlanId.STANDARD]: 1,
        [PlanId.CREATOR]: 2,
      };

      const userPlanLevel = planHierarchy[subscription.plan_id as PlanId];
      const requiredPlanLevel = planHierarchy[requiredPlan];

      if (userPlanLevel < requiredPlanLevel) {
        throw new ForbiddenException(
          `This feature requires ${requiredPlan} plan or higher`,
        );
      }

      // Attach subscription to request for later use
      request.subscription = subscription;

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new ForbiddenException('Unable to verify subscription');
    }
  }

  private extractUserEmail(request: any): string | null {
    // Extract from query params
    if (request.query?.email) {
      return request.query.email;
    }

    // Extract from body
    if (request.body?.userEmail) {
      return request.body.userEmail;
    }

    // Extract from params
    if (request.params?.email) {
      return request.params.email;
    }

    // Extract from JWT token if you have auth setup
    if (request.user?.email) {
      return request.user.email;
    }

    return null;
  }
}