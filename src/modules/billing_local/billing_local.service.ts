import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { subscriptions, paymentEvents } from './entities/billing.schema';
import { users } from '../users/entities/users.schema';
import { CreateLocalPaymentDto } from './dto/create-local-payment.dto';
import { eq, desc } from 'drizzle-orm';
import { subscriptionPlans } from '../plans/entities/subscription_plans.schema';

@Injectable()
export class BillingLocalService {
  constructor(private readonly drizzleService: DrizzleService) { }

  async processPayment(dto: CreateLocalPaymentDto) {
    return this.drizzleService.db.transaction(async (tx) => {
      // 1. Create/Update Subscription
      // Check if user already has a subscription
      const [existingSub] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.user_id, dto.userId));

      let subscriptionId: string;
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 30); // Default 30 days

      if (existingSub) {
        const [updatedSub] = await tx
          .update(subscriptions)
          .set({
            plan_id: dto.planId,
            status: 'active',
            renewal_date: renewalDate,
          })
          .where(eq(subscriptions.id, existingSub.id))
          .returning();
        subscriptionId = updatedSub.id;
      } else {
        const [newSub] = await tx
          .insert(subscriptions)
          .values({
            user_id: dto.userId,
            plan_id: dto.planId,
            status: 'active',
            renewal_date: renewalDate,
          })
          .returning();
        subscriptionId = newSub.id;
      }

      // 2. Create Payment Event
      await tx.insert(paymentEvents).values({
        user_id: dto.userId,
        subscription_id: subscriptionId,
        amount: dto.amount,
        status: 'paid',
        reference: dto.reference,
        payload: { note: dto.note },
      });

      return { success: true, subscriptionId };
    });
  }

  async getSubscriptions(userId: string) {
    return this.drizzleService.db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        renewal_date: subscriptions.renewal_date,
        plan_name: subscriptionPlans.name,
        plan_features: subscriptionPlans.features,
      })
      .from(subscriptions)
      .leftJoin(
        subscriptionPlans,
        eq(subscriptions.plan_id, subscriptionPlans.id),
      )
      .where(eq(subscriptions.user_id, userId));
  }

  async createDefaultSubscription(userId: string) {
    // Ideally find "Free" plan from DB. For now assuming we need to fetch it.
    // Or we could have a "default" flag on plans.
    // Let's assume we find a plan named 'Free' or create a dummy one if empty?
    // Better: Helper in PlansService to get default plan. But here we just need to insert.

    // Let's first search for 'Free' plan.
    const [freePlan] = await this.drizzleService.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.name, 'Free'))
      .limit(1);

    if (!freePlan) {
      // If no free plan exists, we can't create a default subscription safely.
      // Maybe log warning or return.
      return;
    }

    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 30);

    await this.drizzleService.db.transaction(async (tx) => {
      await tx.insert(subscriptions).values({
        user_id: userId,
        plan_id: freePlan.id,
        status: 'active',
        renewal_date: renewalDate,
      });

      await tx
        .update(users)
        .set({ plan_id: freePlan.id })
        .where(eq(users.id, userId));
    });
  }

  async cancelSubscription(userId: string) {
    const [sub] = await this.drizzleService.db
      .update(subscriptions)
      .set({ status: 'canceled' })
      .where(eq(subscriptions.user_id, userId))
      .returning();
    return sub;
  }
}
