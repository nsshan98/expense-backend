import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PlansService } from '../plans/plans.service';
import { DrizzleService } from '../../db/db.service';
import { subscriptions } from '../billing_local/entities/billing.schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class FeatureAccessService {
  constructor(
    private usersService: UsersService,
    private plansService: PlansService,
    private drizzleService: DrizzleService,
  ) {}

  async hasAccess(userId: number, featureName: string): Promise<boolean> {
    // Find active subscription
    const [subscription] = await this.drizzleService.db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.user_id, userId),
          eq(subscriptions.status, 'active'),
        ),
      );

    if (!subscription) {
      // Fallback to free plan limits if no active subscription
      // For now, return false for premium features
      if (featureName === 'premium') return false;
      return true; // Allow basic access
    }

    const features = await this.plansService.getFeaturesForPlan(
      subscription.plan_id,
    );
    if (!features) return false;

    if (featureName === 'premium') {
      return (features as any).premium === true;
    }
    return true;
  }
}
