import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { subscriptions, paymentEvents } from './entities/billing.schema';
import { CreateLocalPaymentDto } from './dto/create-local-payment.dto';
import { eq, desc } from 'drizzle-orm';
import { subscriptionPlans } from '../plans/entities/subscription_plans.schema';

@Injectable()
export class BillingLocalService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async processPayment(dto: CreateLocalPaymentDto) {
    return this.drizzleService.db.transaction(async (tx) => {
      // 1. Create/Update Subscription
      // Check if user already has a subscription
      const [existingSub] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.user_id, dto.userId));

      let subscriptionId: number;
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

  async getSubscriptions(userId: number) {
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

  async cancelSubscription(userId: number) {
    const [sub] = await this.drizzleService.db
      .update(subscriptions)
      .set({ status: 'canceled' })
      .where(eq(subscriptions.user_id, userId))
      .returning();
    return sub;
  }
}
