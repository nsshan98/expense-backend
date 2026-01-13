import { Injectable, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PlanManagementService } from '../plans/services/plan-management.service';
import { DrizzleService } from '../../db/db.service';
import { subscriptions } from '../billing_local/entities/billing.schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class FeatureAccessService {
  constructor(
    private usersService: UsersService,
    private planService: PlanManagementService,
    private drizzleService: DrizzleService,
  ) { }

  async getPlanFeatures(userId: string) {
    // 1. Try to find active subscription
    const [subscription] = await this.drizzleService.db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.user_id, userId),
          eq(subscriptions.status, 'active'),
        ),
      );

    if (subscription) {
      const plan = await this.planService.getPlanById(subscription.plan_id);
      return plan.features;
    }

    // 2. Check user's direct plan assignment (fallback)
    const user = await this.usersService.findById(userId);
    if (user && user.plan_id) {
      const plan = await this.planService.getPlanById(user.plan_id);
      return plan.features;
    }

    // 3. Fallback to Free plan
    const freePlan = await this.planService.getPlanByName('Free');
    return freePlan ? freePlan.features : null;
  }

  async hasAccess(userId: string, featureName: string): Promise<boolean> {
    const features = await this.getPlanFeatures(userId);
    if (!features) return false;

    if (featureName === 'premium') {
      // Check for generic premium status, or specific feature flags
      // For now, assuming if they have high limits or a specific flag
      return (features as any).is_premium === true;
    }
    return true;
  }

  async checkLimit(userId: string, limitKey: string, currentCount: number) {
    const features: any = (await this.getPlanFeatures(userId)) || {};
    const limit = features[limitKey];

    // If limit is defined and current count exceeds limit
    // We assume limit is "max allowed". So if count == limit, can you add one more? Yes, if count is BEFORE add. 
    // BUT here `currentCount` is passed as the FUTURE total (current + 1).
    // So if Limit is 5, and we pass 5 (0+5 or 4+1), it should be allowed.
    // If we pass 6, it should fail.
    if (limit !== undefined && currentCount > limit) {
      throw new ForbiddenException(
        `You have reached the maximum limit for ${limitKey} (${limit}) allowed by your plan.`,
      );
    }
  }
}
