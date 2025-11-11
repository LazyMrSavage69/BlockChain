import { SetMetadata } from '@nestjs/common';
import { PlanId } from '../dto/subscription.dto';

export const REQUIRED_PLAN = 'required_plan';

export const RequirePlan = (plan: PlanId) => SetMetadata(REQUIRED_PLAN, plan);