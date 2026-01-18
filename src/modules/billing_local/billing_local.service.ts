import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { subscriptions, subscriptionOrders, paymentSubmissions, userPaymentEvents } from './entities/billing.schema';
import { coupons } from './entities/coupons.schema';
import { users } from '../users/entities/users.schema';
import { subscriptionPlans } from '../plans/entities/subscription_plans.schema';
import { eq, and, count, desc, gt, lt, sql, inArray } from 'drizzle-orm';
import { CreateSubscriptionRequestDto } from './dto/create-subscription-request.dto';
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import { PlanManagementService } from '../plans/services/plan-management.service';
import { EmailNotificationService } from './services/email-notification.service';
import { InvoiceGenerationService } from './services/invoice-generation.service';
import { PaddleService } from '../../services/paddle.service';
import {
  MANUAL_SUBSCRIPTION_CONSTANTS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  SUBSCRIPTION_STATUS,
} from './constants';

@Injectable()
export class BillingLocalService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly planService: PlanManagementService,
    private readonly emailService: EmailNotificationService,
    private readonly invoiceService: InvoiceGenerationService,
    private readonly paddleService: PaddleService,
  ) { }

  async createDefaultSubscription(userId: string) {
    // Find "Free" plan using PlanManagementService
    const freePlan = await this.planService.getPlanByName('Free');

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
    const plan = await this.planService.getPlanById(dto.planId);

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
          eq(planPricing.plan_id, dto.planId),
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

    // Validate and apply coupon if provided
    let finalPrice = price;
    let couponId: string | null = null;
    let discountAmount = 0;

    if (dto.couponCode) {
      const [coupon] = await this.drizzleService.db
        .select()
        .from(coupons)
        .where(
          and(
            eq(coupons.code, dto.couponCode.toUpperCase()),
            eq(coupons.provider, 'manual'),
            eq(coupons.is_active, true)
          )
        )
        .limit(1);

      if (!coupon) {
        throw new BadRequestException('Invalid or inactive coupon code');
      }

      // Check expiry
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        throw new BadRequestException('Coupon has expired');
      }

      // Check usage limit
      if (coupon.max_uses && coupon.times_used >= coupon.max_uses) {
        throw new BadRequestException('Coupon usage limit reached');
      }

      // Calculate discount
      if (coupon.discount_type === 'percentage') {
        discountAmount = (price * parseFloat(coupon.discount_amount)) / 100;
      } else if (coupon.discount_type === 'flat') {
        // Ensure currency matches
        if (coupon.currency !== priceRecord.currency) {
          throw new BadRequestException(`Coupon currency (${coupon.currency}) does not match plan price currency (${priceRecord.currency})`);
        }
        discountAmount = parseFloat(coupon.discount_amount);
      } else if (coupon.discount_type === 'flat_per_seat') {
        // For manual plans, treat as flat discount (no seat concept)
        if (coupon.currency !== priceRecord.currency) {
          throw new BadRequestException(`Coupon currency (${coupon.currency}) does not match plan price currency (${priceRecord.currency})`);
        }
        discountAmount = parseFloat(coupon.discount_amount);
      }

      finalPrice = Math.max(0, price - discountAmount);
      couponId = coupon.id;
    }

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

      // Increment coupon usage if applied
      if (couponId) {
        await tx
          .update(coupons)
          .set({ times_used: sql`${coupons.times_used} + 1` })
          .where(eq(coupons.id, couponId));
      }

      const [order] = await tx
        .insert(subscriptionOrders)
        .values({
          user_id: userId,
          plan_id: plan.id,
          status: dto.transactionId ? ORDER_STATUS.PENDING_VERIFICATION : ORDER_STATUS.DRAFT,
          amount_snapshot: finalPrice,
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

        // Send email notification (async, don't wait)
        this.sendPaymentSubmittedEmail(userId, plan.name || 'Plan', finalPrice, dto.transactionId).catch(err => {
          console.error('Failed to send payment submitted email:', err);
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

    console.log(order);


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
    }).then(async (result) => {
      // Send email notification after transaction commits
      const [planInfo] = await this.drizzleService.db
        .select({ name: subscriptionPlans.name })
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, order.plan_id))
        .limit(1);

      this.sendPaymentSubmittedEmail(userId, planInfo?.name || 'Plan', order.amount_snapshot, dto.transactionId).catch(err => {
        console.error('Failed to send payment submitted email:', err);
      });

      return result;
    });
  }

  async getPendingSubmissions() {
    const submissions = await this.drizzleService.db
      .select({
        id: paymentSubmissions.id,
        user_id: paymentSubmissions.user_id,
        user_name: users.name,
        user_email: users.email,
        transaction_id: paymentSubmissions.transaction_id,
        provider: paymentSubmissions.provider,
        amount_snapshot: subscriptionOrders.amount_snapshot,
        payment_date: paymentSubmissions.created_at,
        status: paymentSubmissions.status
      })
      .from(paymentSubmissions)
      .leftJoin(subscriptionOrders, eq(paymentSubmissions.order_id, subscriptionOrders.id))
      .leftJoin(users, eq(paymentSubmissions.user_id, users.id))
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
    // Fetch submission and order data first for email notifications
    const [submission] = await this.drizzleService.db
      .select()
      .from(paymentSubmissions)
      .where(eq(paymentSubmissions.id, submissionId));

    if (!submission) throw new NotFoundException('Submission not found');

    const [orderData] = await this.drizzleService.db
      .select()
      .from(subscriptionOrders)
      .where(eq(subscriptionOrders.id, submission.order_id));

    if (!orderData) throw new NotFoundException('Order not found');

    const result = await this.drizzleService.db.transaction(async (tx) => {
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

        // Update user's plan_id to match the active subscription
        await tx
          .update(users)
          .set({ plan_id: order.plan_id })
          .where(eq(users.id, order.user_id));

        return { success: true, status: 'active' as const, endDate };

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

        return { success: true, status: 'rejected' as const };
      }
    });

    // Send email notifications after transaction commits
    const [planInfo] = await this.drizzleService.db
      .select({ name: subscriptionPlans.name })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, orderData.plan_id))
      .limit(1);

    if (result.status === 'active') {
      this.sendPaymentApprovedEmail(orderData.user_id, planInfo?.name || 'Plan', result.endDate).catch(err => {
        console.error('Failed to send payment approved email:', err);
      });
    } else if (result.status === 'rejected') {
      this.sendPaymentRejectedEmail(orderData.user_id, planInfo?.name || 'Plan', reason).catch(err => {
        console.error('Failed to send payment rejected email:', err);
      });
    }

    return result;
  }

  /**
   * PHASE 9: Automatic Expiry
   * Should be called by Cron
   */
  async checkExpiries() {
    const now = new Date();

    // 1. Identify active subscriptions that have passed their end date
    const expiringSubs = await this.drizzleService.db
      .select({
        id: subscriptions.id,
        user_id: subscriptions.user_id,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, SUBSCRIPTION_STATUS.ACTIVE),
          lt(subscriptions.end_date, now)
        )
      );

    if (expiringSubs.length === 0) {
      return { expiredCount: 0 };
    }

    // 2. Fetch Free Plan details
    const freePlan = await this.planService.getPlanByName('Free');
    const renewalDate = new Date('9999-12-31');

    await this.drizzleService.db.transaction(async (tx) => {
      // 3. Mark old subscriptions as EXPIRED
      await tx
        .update(subscriptions)
        .set({ status: SUBSCRIPTION_STATUS.EXPIRED })
        .where(inArray(subscriptions.id, expiringSubs.map(s => s.id)));

      // 4. If Free plan exists, assign it to users
      if (freePlan) {
        for (const sub of expiringSubs) {
          // Create new Free subscription
          await tx.insert(subscriptions).values({
            user_id: sub.user_id,
            plan_id: freePlan.id,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            start_date: new Date(),
            end_date: renewalDate,
          });

          // Update user record to point to Free plan
          await tx
            .update(users)
            .set({ plan_id: freePlan.id })
            .where(eq(users.id, sub.user_id));
        }
      }
    });

    return { expiredCount: expiringSubs.length };
  }

  async getSubscriptionStatus(userId: string) {
    const [activeSub] = await this.drizzleService.db
      .select({
        status: subscriptions.status,
        start_date: subscriptions.start_date,
        end_date: subscriptions.end_date,
        plan_id: subscriptions.plan_id,
        source: subscriptions.source,
        currency: subscriptions.currency,
        paddle_subscription_id: subscriptions.paddle_subscription_id,
        paddle_price_id: subscriptions.paddle_price_id,
        next_renewal_date: subscriptions.next_renewal_date,
        plan_name: subscriptionPlans.name,
      })
      .from(subscriptions)
      .leftJoin(subscriptionPlans, eq(subscriptions.plan_id, subscriptionPlans.id))
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

    // 1. Manual Orders Segment
    const [manualTotal] = await this.drizzleService.db
      .select({ count: count() })
      .from(subscriptionOrders)
      .where(eq(subscriptionOrders.user_id, userId));

    const manualOrders = await this.drizzleService.db
      .select({
        id: subscriptionOrders.id,
        status: subscriptionOrders.status,
        amount: subscriptionOrders.amount_snapshot,
        duration: subscriptionOrders.duration_snapshot,
        created_at: subscriptionOrders.created_at,
        plan_name: subscriptionPlans.name,
        source: sql<string>`'internal'`,
      })
      .from(subscriptionOrders)
      .leftJoin(subscriptionPlans, eq(subscriptionOrders.plan_id, subscriptionPlans.id))
      .where(eq(subscriptionOrders.user_id, userId))
      .orderBy(desc(subscriptionOrders.created_at))
      .limit(limit)
      .offset(offset);

    // Fetch submissions for each manual order
    const manualHistory = await Promise.all(manualOrders.map(async (order) => {
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

    // 2. Paddle Events Segment
    const [paddleTotal] = await this.drizzleService.db
      .select({ count: count() })
      .from(userPaymentEvents)
      .where(
        and(
          eq(userPaymentEvents.user_id, userId),
          eq(userPaymentEvents.source, 'paddle')
        )
      );

    const paddleEvents = await this.drizzleService.db
      .select({
        id: userPaymentEvents.id,
        status: userPaymentEvents.status,
        amount: userPaymentEvents.amount,
        currency: userPaymentEvents.currency,
        source: userPaymentEvents.source,
        paddle_txn_id: userPaymentEvents.paddle_txn_id,
        invoice_number: userPaymentEvents.invoice_number,
        receipt_url: userPaymentEvents.receipt_url,
        billed_at: userPaymentEvents.billed_at,
        created_at: userPaymentEvents.created_at,
        // Try to get plan name via subscription relation if possible
        plan_name: subscriptionPlans.name,
      })
      .from(userPaymentEvents)
      .leftJoin(subscriptions, eq(userPaymentEvents.paddle_subscription_id, subscriptions.paddle_subscription_id))
      .leftJoin(subscriptionPlans, eq(subscriptions.plan_id, subscriptionPlans.id))
      .where(
        and(
          eq(userPaymentEvents.user_id, userId),
          eq(userPaymentEvents.source, 'paddle')
        )
      )
      .orderBy(desc(userPaymentEvents.created_at))
      .limit(limit)
      .offset(offset);

    return {
      manual: {
        data: manualHistory,
        meta: {
          total: manualTotal.count,
          page,
          limit,
          totalPages: Math.ceil(manualTotal.count / limit)
        }
      },
      paddle: {
        data: paddleEvents,
        meta: {
          total: paddleTotal.count,
          page,
          limit,
          totalPages: Math.ceil(paddleTotal.count / limit)
        }
      }
    };
  }

  /**
   * Helper: Send payment submitted email notification
   */
  private async sendPaymentSubmittedEmail(userId: string, planName: string, amount: number, transactionId: string): Promise<void> {
    try {
      const [user] = await this.drizzleService.db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user?.email) {
        await this.emailService.notifyPaymentSubmitted(
          user.email,
          user.name || 'User',
          planName,
          amount,
          transactionId
        );
      }
    } catch (error) {
      console.error('Error sending payment submitted email:', error);
    }
  }

  /**
   * Helper: Send payment approved email notification
   */
  private async sendPaymentApprovedEmail(userId: string, planName: string, endDate: Date): Promise<void> {
    try {
      const [user] = await this.drizzleService.db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user?.email) {
        await this.emailService.notifyPaymentApproved(
          user.email,
          user.name || 'User',
          planName,
          endDate
        );
      }
    } catch (error) {
      console.error('Error sending payment approved email:', error);
    }
  }

  /**
   * Helper: Send payment rejected email notification
   */
  private async sendPaymentRejectedEmail(userId: string, planName: string, reason?: string): Promise<void> {
    try {
      const [user] = await this.drizzleService.db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user?.email) {
        await this.emailService.notifyPaymentRejected(
          user.email,
          user.name || 'User',
          planName,
          reason
        );
      }
    } catch (error) {
      console.error('Error sending payment rejected email:', error);
    }
  }

  /**
   * Validate coupon and calculate discount
   */
  async validateCoupon(dto: { couponCode: string; planId: string; duration: 'monthly' | 'yearly' }) {
    // Get plan
    const plan = await this.planService.getPlanById(dto.planId);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Get price
    const { planPricing } = await import('../plans/entities/plan_pricing.schema');
    const interval = dto.duration === 'yearly' ? 'yearly' : 'monthly';

    const [priceRecord] = await this.drizzleService.db
      .select()
      .from(planPricing)
      .where(
        and(
          eq(planPricing.plan_id, dto.planId),
          eq(planPricing.interval, interval),
          eq(planPricing.provider, 'manual')
        )
      )
      .limit(1);

    if (!priceRecord || !priceRecord.amount) {
      throw new BadRequestException('Selected plan duration price is unavailable');
    }

    const originalPrice = parseFloat(priceRecord.amount);

    // Validate coupon
    const [coupon] = await this.drizzleService.db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.code, dto.couponCode.toUpperCase()),
          eq(coupons.provider, 'manual'),
          eq(coupons.is_active, true)
        )
      )
      .limit(1);

    if (!coupon) {
      throw new BadRequestException('Invalid or inactive coupon code');
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      throw new BadRequestException('Coupon has expired');
    }

    // Check usage limit
    if (coupon.max_uses && coupon.times_used >= coupon.max_uses) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (originalPrice * parseFloat(coupon.discount_amount)) / 100;
    } else if (coupon.discount_type === 'flat') {
      if (coupon.currency !== priceRecord.currency) {
        throw new BadRequestException(`Coupon currency (${coupon.currency}) does not match plan price currency (${priceRecord.currency})`);
      }
      discountAmount = parseFloat(coupon.discount_amount);
    } else if (coupon.discount_type === 'flat_per_seat') {
      if (coupon.currency !== priceRecord.currency) {
        throw new BadRequestException(`Coupon currency (${coupon.currency}) does not match plan price currency (${priceRecord.currency})`);
      }
      discountAmount = parseFloat(coupon.discount_amount);
    }

    const finalPrice = Math.max(0, originalPrice - discountAmount);

    return {
      valid: true,
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_amount: coupon.discount_amount,
        description: coupon.description,
      },
      pricing: {
        original_price: originalPrice,
        discount_amount: discountAmount,
        final_price: finalPrice,
        currency: priceRecord.currency,
        savings_percentage: originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 0,
      },
      plan: {
        id: plan.id,
        name: plan.name,
        duration: dto.duration,
      }
    };
  }

  /**
   * Get invoice for manual transaction (order)
   * Generates a PDF invoice from database data
   */
  async getManualInvoice(userId: string, orderId: string, disposition: 'attachment' | 'inline' = 'attachment'): Promise<{ buffer: Buffer; filename: string }> {
    // Fetch order with related data
    const [order] = await this.drizzleService.db
      .select({
        id: subscriptionOrders.id,
        status: subscriptionOrders.status,
        amount: subscriptionOrders.amount_snapshot,
        duration: subscriptionOrders.duration_snapshot,
        created_at: subscriptionOrders.created_at,
        user_id: subscriptionOrders.user_id,
        plan_id: subscriptionOrders.plan_id,
        user_name: users.name,
        user_email: users.email,
        plan_name: subscriptionPlans.name,
      })
      .from(subscriptionOrders)
      .leftJoin(users, eq(subscriptionOrders.user_id, users.id))
      .leftJoin(subscriptionPlans, eq(subscriptionOrders.plan_id, subscriptionPlans.id))
      .where(eq(subscriptionOrders.id, orderId))
      .limit(1);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify ownership (unless admin - you can add admin check later)
    if (order.user_id !== userId) {
      throw new BadRequestException('You do not have permission to access this invoice');
    }

    // Only allow invoice generation for completed orders
    if (order.status !== ORDER_STATUS.COMPLETED) {
      throw new BadRequestException('Invoice is only available for completed orders');
    }

    // Fetch payment submission details
    const [submission] = await this.drizzleService.db
      .select({
        transaction_id: paymentSubmissions.transaction_id,
        provider: paymentSubmissions.provider,
        created_at: paymentSubmissions.created_at,
      })
      .from(paymentSubmissions)
      .where(
        and(
          eq(paymentSubmissions.order_id, orderId),
          eq(paymentSubmissions.status, PAYMENT_STATUS.VERIFIED)
        )
      )
      .orderBy(desc(paymentSubmissions.created_at))
      .limit(1);

    // Generate invoice number (you can customize this format)
    const invoiceNumber = `INV-${order.id.substring(0, 8).toUpperCase()}`;

    // Generate PDF
    const pdfBuffer = await this.invoiceService.generateManualInvoice({
      invoiceNumber,
      invoiceDate: order.created_at || new Date(),
      customerName: order.user_name || 'Customer',
      customerEmail: order.user_email || '',
      planName: order.plan_name || 'Plan',
      amount: order.amount,
      currency: 'BDT', // You can make this dynamic based on your pricing
      duration: order.duration,
      transactionId: submission?.transaction_id,
      provider: submission?.provider,
      paymentDate: submission?.created_at || undefined,
      status: order.status,
    });

    const filename = `invoice-${invoiceNumber}.pdf`;

    return { buffer: pdfBuffer, filename };
  }

  /**
   * Get invoice for Paddle transaction
   * Fetches invoice URL from Paddle API
   */
  async getPaddleInvoice(userId: string, eventId: string, disposition: 'attachment' | 'inline' = 'attachment'): Promise<{ url: string }> {
    // Fetch the payment event
    const [event] = await this.drizzleService.db
      .select({
        id: userPaymentEvents.id,
        user_id: userPaymentEvents.user_id,
        paddle_txn_id: userPaymentEvents.paddle_txn_id,
        status: userPaymentEvents.status,
      })
      .from(userPaymentEvents)
      .where(eq(userPaymentEvents.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundException('Transaction not found');
    }

    // Verify ownership
    if (event.user_id !== userId) {
      throw new BadRequestException('You do not have permission to access this invoice');
    }

    // Only allow invoice for completed transactions
    if (event.status !== 'completed') {
      throw new BadRequestException('Invoice is only available for completed transactions');
    }

    if (!event.paddle_txn_id) {
      throw new BadRequestException('Paddle transaction ID not found');
    }

    // Call Paddle API to get invoice URL
    // Note: This uses the MCP Paddle tool
    try {
      const invoiceResponse = await this.getPaddleInvoiceUrl(event.paddle_txn_id, disposition);
      return { url: invoiceResponse.url };
    } catch (error) {
      throw new BadRequestException('Failed to retrieve invoice from Paddle: ' + error.message);
    }
  }

  /**
   * Helper method to call Paddle API for invoice URL
   */
  private async getPaddleInvoiceUrl(transactionId: string, disposition: 'attachment' | 'inline'): Promise<{ url: string }> {
    return await this.paddleService.getTransactionInvoice(transactionId, disposition);
  }

  /**
   * Check if invoice is available for a transaction
   */
  async checkInvoiceAvailability(userId: string, transactionId: string, source: 'manual' | 'paddle'): Promise<{ available: boolean; reason?: string }> {
    if (source === 'manual') {
      const [order] = await this.drizzleService.db
        .select({ status: subscriptionOrders.status, user_id: subscriptionOrders.user_id })
        .from(subscriptionOrders)
        .where(eq(subscriptionOrders.id, transactionId))
        .limit(1);

      if (!order) {
        return { available: false, reason: 'Order not found' };
      }

      if (order.user_id !== userId) {
        return { available: false, reason: 'Unauthorized' };
      }

      if (order.status !== ORDER_STATUS.COMPLETED) {
        return { available: false, reason: 'Invoice only available for completed orders' };
      }

      return { available: true };
    } else {
      const [event] = await this.drizzleService.db
        .select({ status: userPaymentEvents.status, user_id: userPaymentEvents.user_id })
        .from(userPaymentEvents)
        .where(eq(userPaymentEvents.id, transactionId))
        .limit(1);

      if (!event) {
        return { available: false, reason: 'Transaction not found' };
      }

      if (event.user_id !== userId) {
        return { available: false, reason: 'Unauthorized' };
      }

      if (event.status !== 'completed') {
        return { available: false, reason: 'Invoice only available for completed transactions' };
      }

      return { available: true };
    }
  }
}
