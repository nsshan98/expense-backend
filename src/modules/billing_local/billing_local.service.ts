import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { subscriptions, subscriptionOrders, paymentSubmissions } from './entities/billing.schema';
import { users } from '../users/entities/users.schema';
import { subscriptionPlans } from '../plans/entities/subscription_plans.schema';
import { eq, and, count, desc, gt, lt, sql, inArray } from 'drizzle-orm';
import { CreateSubscriptionRequestDto } from './dto/create-subscription-request.dto';
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import {
  MANUAL_SUBSCRIPTION_CONSTANTS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  SUBSCRIPTION_STATUS,
} from './constants';

@Injectable()
export class BillingLocalService {
  constructor(private readonly drizzleService: DrizzleService) { }

  async createDefaultSubscription(userId: string) {
    // Ideally find "Free" plan from DB.
    const [freePlan] = await this.drizzleService.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.name, 'Free'))
      .limit(1);

    if (!freePlan) {
      return;
    }

    const renewalDate = new Date('9999-12-31'); // Free plan never expires

    await this.drizzleService.db.transaction(async (tx) => {
      await tx.insert(subscriptions).values({
        user_id: userId,
        plan_id: freePlan.id,
        status: 'active',
        start_date: new Date(),
        end_date: renewalDate,
      });

      await tx
        .update(users)
        .set({ plan_id: freePlan.id })
        .where(eq(users.id, userId));
    });
  }

  async createSubscriptionRequest(userId: string, dto: CreateSubscriptionRequestDto) {
    const [plan] = await this.drizzleService.db
      .select({
        id: subscriptionPlans.id,
      })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, dto.planId));

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Fetch price from plan_pricing table
    const { planPricing } = await import('../plans/entities/plan_pricing.schema');
    const interval = dto.duration === 'yearly' ? 'yearly' : 'monthly';

    const [priceRecord] = await this.drizzleService.db
      .select()
      .from(planPricing)
      .where(
        and(
          eq(planPricing.plan_id, parseInt(dto.planId)),
          eq(planPricing.interval, interval),
          eq(planPricing.provider, 'manual')
        )
      )
      .limit(1);

    if (!priceRecord || !priceRecord.amount) {
      throw new BadRequestException('Selected plan duration price is unavailable');
    }

    const price = parseFloat(priceRecord.amount);
    const durationDays = dto.duration === 'yearly' ? 365 : 30;

    return this.drizzleService.db.transaction(async (tx) => {
      // 0. Check for existing pending requests (Limit 1)
      const [pendingCount] = await tx
        .select({ count: count() })
        .from(subscriptionOrders)
        .where(
          and(
            eq(subscriptionOrders.user_id, userId),
            eq(subscriptionOrders.status, ORDER_STATUS.PENDING_VERIFICATION)
          )
        );

      if (pendingCount.count >= 1) {
        throw new BadRequestException('You already have a pending subscription request.');
      }

      const [order] = await tx
        .insert(subscriptionOrders)
        .values({
          user_id: userId,
          plan_id: plan.id,
          status: dto.transactionId ? ORDER_STATUS.PENDING_VERIFICATION : ORDER_STATUS.DRAFT,
          amount_snapshot: price,
          duration_snapshot: durationDays,
        })
        .returning();

      if (dto.transactionId) {
        await tx.insert(paymentSubmissions).values({
          order_id: order.id,
          user_id: userId,
          provider: dto.provider || 'unknown',
          transaction_id: dto.transactionId,
          sender_number: dto.senderNumber,
          status: PAYMENT_STATUS.SUBMITTED,
        });
      }

      return order;
    });
  }

  async submitPayment(userId: string, dto: SubmitPaymentDto) {
    const [order] = await this.drizzleService.db
      .select()
      .from(subscriptionOrders)
      .where(
        and(
          eq(subscriptionOrders.id, dto.requestId),
          eq(subscriptionOrders.user_id, userId)
        )
      )
      .limit(1);

    if (!order) {
      throw new BadRequestException('Request not found.');
    }

    if (order.status === ORDER_STATUS.COMPLETED) {
      throw new BadRequestException('Request already completed.');
    }

    // Transaction ID is now required/enforced by DTO validation, but double checking logic stays same
    // Validate Provider if needed
    if (!MANUAL_SUBSCRIPTION_CONSTANTS.PROVIDERS.includes(dto.provider.toLowerCase() as any)) {
      // throw new BadRequestException('Invalid Provider');
    }

    return this.drizzleService.db.transaction(async (tx) => {
      await tx
        .update(subscriptionOrders)
        .set({
          status: ORDER_STATUS.PENDING_VERIFICATION,
          updated_at: new Date(),
        })
        .where(eq(subscriptionOrders.id, order.id));

      // Always Create New Submission (History Preserved)
      await tx.insert(paymentSubmissions).values({
        order_id: order.id,
        user_id: userId,
        provider: dto.provider.toLowerCase(),
        transaction_id: dto.transactionId,
        sender_number: dto.senderNumber,
        status: PAYMENT_STATUS.SUBMITTED,
      });

      return { success: true };
    });
  }

  async getPendingSubmissions() {
    const submissions = await this.drizzleService.db
      .select({
        id: paymentSubmissions.id,
        user_id: paymentSubmissions.user_id,
        transaction_id: paymentSubmissions.transaction_id,
        provider: paymentSubmissions.provider,
        amount_snapshot: subscriptionOrders.amount_snapshot,
        payment_date: paymentSubmissions.created_at,
        status: paymentSubmissions.status
      })
      .from(paymentSubmissions)
      .leftJoin(subscriptionOrders, eq(paymentSubmissions.order_id, subscriptionOrders.id))
      .where(eq(paymentSubmissions.status, PAYMENT_STATUS.SUBMITTED));

    // Post-process to flag duplicates (Global History Check)
    if (submissions.length === 0) {
      return [];
    }

    const pendingTrxIds = submissions.map(s => s.transaction_id);

    // Count occurrences of these IDs in the ENTIRE table (Pending + Verified + Rejected)
    const counts = await this.drizzleService.db
      .select({
        transaction_id: paymentSubmissions.transaction_id,
        count: count()
      })
      .from(paymentSubmissions)
      .where(
        inArray(paymentSubmissions.transaction_id, pendingTrxIds)
      )
      .groupBy(paymentSubmissions.transaction_id);

    const dupMap = new Map<string, number>();
    counts.forEach(row => dupMap.set(row.transaction_id, row.count));

    return submissions.map(sub => ({
      ...sub,
      is_duplicate: (dupMap.get(sub.transaction_id) || 0) > 1
    }));
  }

  /**
   * Admin: Get specific subscription request details
   */
  async getSubscriptionRequestDetails(requestId: string) {
    const [order] = await this.drizzleService.db
      .select({
        id: subscriptionOrders.id,
        status: subscriptionOrders.status,
        amount: subscriptionOrders.amount_snapshot,
        duration: subscriptionOrders.duration_snapshot,
        created_at: subscriptionOrders.created_at,
        updated_at: subscriptionOrders.updated_at,
        user: {
          id: users.id,
          name: users.name,
          email: users.email
        },
        plan: {
          id: subscriptionPlans.id,
          name: subscriptionPlans.name
        }
      })
      .from(subscriptionOrders)
      .leftJoin(users, eq(subscriptionOrders.user_id, users.id))
      .leftJoin(subscriptionPlans, eq(subscriptionOrders.plan_id, subscriptionPlans.id))
      .where(eq(subscriptionOrders.id, requestId));

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const submissions = await this.drizzleService.db
      .select()
      .from(paymentSubmissions)
      .where(eq(paymentSubmissions.order_id, requestId))
      .orderBy(desc(paymentSubmissions.created_at));

    return {
      ...order,
      submissions
    };
  }

  /**
   * PHASE 6 & 8: Admin Verification / Rejection
   */
  async reviewSubmission(adminId: string, submissionId: string, action: 'approve' | 'reject', reason?: string) {
    return this.drizzleService.db.transaction(async (tx) => {
      const [submission] = await tx
        .select()
        .from(paymentSubmissions)
        .where(eq(paymentSubmissions.id, submissionId));

      if (!submission) throw new NotFoundException('Submission not found');

      const [order] = await tx
        .select()
        .from(subscriptionOrders)
        .where(eq(subscriptionOrders.id, submission.order_id));

      if (action === 'approve') {
        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + order.duration_snapshot);

        await tx
          .update(paymentSubmissions)
          .set({
            status: PAYMENT_STATUS.VERIFIED,
            verified_by: adminId,
            verified_at: new Date(),
            verification_notes: reason,
          })
          .where(eq(paymentSubmissions.id, submissionId));

        const [existingSub] = await tx
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.user_id, order.user_id));

        if (existingSub) {
          await tx.update(subscriptions).set({
            plan_id: order.plan_id,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            start_date: now,
            end_date: endDate,
            updated_at: now
          }).where(eq(subscriptions.id, existingSub.id));
        } else {
          await tx.insert(subscriptions).values({
            user_id: order.user_id,
            plan_id: order.plan_id,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            start_date: now,
            end_date: endDate,
          });
        }

        await tx.update(subscriptionOrders).set({
          status: ORDER_STATUS.COMPLETED
        }).where(eq(subscriptionOrders.id, order.id));

        return { success: true, status: 'active' };

      } else {
        await tx
          .update(paymentSubmissions)
          .set({
            status: PAYMENT_STATUS.REJECTED,
            verification_notes: reason,
            verified_by: adminId,
            verified_at: new Date(),
          })
          .where(eq(paymentSubmissions.id, submissionId));

        await tx
          .update(subscriptionOrders)
          .set({
            status: ORDER_STATUS.REJECTED,
            updated_at: new Date(),
          })
          .where(eq(subscriptionOrders.id, order.id));

        return { success: true, status: 'rejected' };
      }
    });
  }

  /**
   * PHASE 9: Automatic Expiry
   * Should be called by Cron
   */
  async checkExpiries() {
    const now = new Date();
    const expiredSubs = await this.drizzleService.db
      .update(subscriptions)
      .set({ status: SUBSCRIPTION_STATUS.EXPIRED })
      .where(
        and(
          eq(subscriptions.status, SUBSCRIPTION_STATUS.ACTIVE),
          lt(subscriptions.end_date, now)
        )
      );

    return expiredSubs;
  }

  async getSubscriptionStatus(userId: string) {
    const [activeSub] = await this.drizzleService.db
      .select({
        status: subscriptions.status,
        start_date: subscriptions.start_date,
        end_date: subscriptions.end_date,
        plan_id: subscriptions.plan_id
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.user_id, userId),
          eq(subscriptions.status, SUBSCRIPTION_STATUS.ACTIVE)
        )
      );

    // Always check for pending orders, regardless of active subscription
    const [pendingOrder] = await this.drizzleService.db
      .select({
        status: subscriptionOrders.status,
        created_at: subscriptionOrders.created_at,
        amount: subscriptionOrders.amount_snapshot,
        plan_id: subscriptionOrders.plan_id
      })
      .from(subscriptionOrders)
      .where(
        and(
          eq(subscriptionOrders.user_id, userId),
          eq(subscriptionOrders.status, ORDER_STATUS.PENDING_VERIFICATION)
        )
      )
      .orderBy(desc(subscriptionOrders.created_at))
      .limit(1);

    return {
      current: activeSub || null,
      pending: pendingOrder || null
    };
  }
  async getMyTransactionHistory(userId: string, page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    const [totalObj] = await this.drizzleService.db
      .select({ count: count() })
      .from(subscriptionOrders)
      .where(eq(subscriptionOrders.user_id, userId));

    const orders = await this.drizzleService.db
      .select({
        id: subscriptionOrders.id,
        status: subscriptionOrders.status,
        amount: subscriptionOrders.amount_snapshot,
        duration: subscriptionOrders.duration_snapshot,
        created_at: subscriptionOrders.created_at,
        plan_name: subscriptionPlans.name
      })
      .from(subscriptionOrders)
      .leftJoin(subscriptionPlans, eq(subscriptionOrders.plan_id, subscriptionPlans.id))
      .where(eq(subscriptionOrders.user_id, userId))
      .orderBy(desc(subscriptionOrders.created_at))
      .limit(limit)
      .offset(offset);

    // Fetch submissions for each order
    const history = await Promise.all(orders.map(async (order) => {
      const submissions = await this.drizzleService.db
        .select({
          id: paymentSubmissions.id,
          transaction_id: paymentSubmissions.transaction_id,
          provider: paymentSubmissions.provider,
          status: paymentSubmissions.status,
          verification_notes: paymentSubmissions.verification_notes,
          created_at: paymentSubmissions.created_at,
        })
        .from(paymentSubmissions)
        .where(eq(paymentSubmissions.order_id, order.id))
        .orderBy(desc(paymentSubmissions.created_at));

      return {
        ...order,
        submissions
      };
    }));

    return {
      data: history,
      meta: {
        total: totalObj.count,
        page,
        limit,
        totalPages: Math.ceil(totalObj.count / limit)
      }
    };
  }
}
