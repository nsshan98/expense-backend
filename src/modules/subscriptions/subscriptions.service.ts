import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { subscriptions } from './entities/subscriptions.schema';
import { transactions } from '../transactions/entities/transactions.schema';
import { users } from '../users/entities/users.schema';
import { userSettings } from '../users/entities/user_settings.schema'; // Import userSettings
import { categories } from '../categories/entities/categories.schema'; // Import for relation
import { FeatureAccessService } from '../feature_access/feature_access.service'; // Import
import { eq, and, inArray, gte, lte, sql } from 'drizzle-orm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubscriptionsService {
    private readonly logger = new Logger(SubscriptionsService.name);

    constructor(
        private readonly drizzleService: DrizzleService,
        private readonly notificationsService: NotificationsService,
        private readonly featureAccessService: FeatureAccessService, // Injected dependency
    ) { }

    async create(userId: string, createSubscriptionDto: CreateSubscriptionDto) {
        // 1. Check Plan Limits
        const [countResult] = await this.drizzleService.db
            .select({ count: sql`count(*)` })
            .from(subscriptions)
            .where(and(eq(subscriptions.user_id, userId), eq(subscriptions.is_active, true)));

        await this.featureAccessService.checkLimit(userId, 'max_subscriptions', Number(countResult?.count || 0) + 1);

        const nextRenewal = new Date(createSubscriptionDto.next_renewal_date);

        // Initial transaction logic? 
        // The requirement says: "Step 1: Setup... Immediate Action: The system creates a Transaction for the current month"

        const [subscription] = await this.drizzleService.db
            .insert(subscriptions)
            .values({
                user_id: userId,
                ...createSubscriptionDto,
                next_renewal_date: nextRenewal,
            })
            .returning();

        // Create immediate transaction if renewal date is today or in past (unlikely for "next_renewal", but if it's today)
        // I will adhere to "Projected" logic for future dates. If the user sets next_renewal_date to today, we create a transaction.
        await this.checkAndCreateProjected(subscription, userId);

        return subscription;
    }

    async findAll(userId: string) {
        return this.drizzleService.db
            .select({
                id: subscriptions.id,
                name: subscriptions.name,
                amount: subscriptions.amount,
                currency: subscriptions.currency,
                global_amount: subscriptions.global_amount,
                global_currency: subscriptions.global_currency,
                billing_cycle: subscriptions.billing_cycle,
                next_renewal_date: subscriptions.next_renewal_date,
                category_id: subscriptions.category_id,
                category_name: categories.name,
                alert_days: subscriptions.alert_days,
                is_active: subscriptions.is_active,
                description: subscriptions.description,
            })
            .from(subscriptions)
            .leftJoin(categories, eq(subscriptions.category_id, categories.id))
            .where(and(eq(subscriptions.user_id, userId), eq(subscriptions.is_active, true)));
    }

    async findOne(id: string, userId: string) {
        const [subscription] = await this.drizzleService.db
            .select()
            .from(subscriptions)
            .where(and(eq(subscriptions.id, id), eq(subscriptions.user_id, userId)));

        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }
        return subscription;
    }

    async update(id: string, userId: string, updateSubscriptionDto: UpdateSubscriptionDto) {
        const { next_renewal_date, ...rest } = updateSubscriptionDto;
        const updateData: any = { ...rest };

        if (next_renewal_date) {
            updateData.next_renewal_date = new Date(next_renewal_date);
        }

        const [updated] = await this.drizzleService.db
            .update(subscriptions)
            .set({ ...updateData, updated_at: new Date() })
            .where(and(eq(subscriptions.id, id), eq(subscriptions.user_id, userId)))
            .returning();

        if (!updated) {
            throw new NotFoundException('Subscription not found');
        }

        // Check if the NEW renewal date warrants a transaction
        await this.checkAndCreateProjected(updated, userId);

        return updated;
    }

    private async checkAndCreateProjected(subscription: any, userId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const renewalDate = new Date(subscription.next_renewal_date);
        renewalDate.setHours(0, 0, 0, 0);

        const diffTime = renewalDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Get user settings for default alert days
        const [settings] = await this.drizzleService.db
            .select()
            .from(userSettings)
            .where(eq(userSettings.user_id, userId));

        const defaultAlert = settings?.subscription_alert_days || 3;
        const effectiveAlertDays = subscription.alert_days !== null ? subscription.alert_days : defaultAlert;

        // Condition:
        // 1. Upcoming within window (diffDays > 0 && <= alert)
        // 2. OR Just passed/Today (diffDays <= 0 && diffDays >= -7) -> Catch late inputs!
        if (diffDays <= effectiveAlertDays && diffDays >= -7) {
            await this.ensureProjectedTransaction(subscription, renewalDate);
        }
    }

    async remove(id: string, userId: string) {
        // 1. Check for existing REAL transactions (not projected ones)
        const [usage] = await this.drizzleService.db
            .select({ count: sql`count(*)` })
            .from(transactions)
            .where(and(
                eq(transactions.subscription_id, id),
                eq(transactions.is_projected, false) // Only count real payments
            ));

        const hasHistory = Number(usage?.count || 0) > 0;

        if (hasHistory) {
            // Soft Delete (Deactivate)
            const [deactivated] = await this.drizzleService.db
                .update(subscriptions)
                .set({ is_active: false, updated_at: new Date() })
                .where(and(eq(subscriptions.id, id), eq(subscriptions.user_id, userId)))
                .returning();

            if (!deactivated) throw new NotFoundException('Subscription not found');

            // Cleanup any future projected items
            await this.drizzleService.db.delete(transactions)
                .where(and(eq(transactions.subscription_id, id), eq(transactions.is_projected, true)));

            return { message: 'Subscription deactivated (History preserved)', subscription: deactivated };
        } else {
            // Hard Delete
            // First delete any projected ones to avoid FK error
            await this.drizzleService.db.delete(transactions)
                .where(eq(transactions.subscription_id, id));

            const [deleted] = await this.drizzleService.db
                .delete(subscriptions)
                .where(and(eq(subscriptions.id, id), eq(subscriptions.user_id, userId)))
                .returning();

            if (!deleted) throw new NotFoundException('Subscription not found');

            return { message: 'Subscription deleted permanently', subscription: deleted };
        }
    }

    async cancel(idOrIds: string | string[], userId: string) {
        const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];

        // 1. Set is_active = false for all
        // 2. Find and delete UPCOMING predicted transactions
        const updatedList = await this.drizzleService.db
            .update(subscriptions)
            .set({ is_active: false, updated_at: new Date() })
            .where(and(inArray(subscriptions.id, ids), eq(subscriptions.user_id, userId)))
            .returning();

        if (!updatedList.length) throw new NotFoundException('Subscription(s) not found');

        // Delete future projected transactions for these subscriptions
        // Note: inArray might fail if ids is empty, but we know it's not empty here strictly speaking, but handy to check
        if (ids.length > 0) {
            await this.drizzleService.db.delete(transactions)
                .where(and(
                    inArray(transactions.subscription_id, ids),
                    eq(transactions.is_projected, true),
                    gt(transactions.date, new Date())
                ));
        }

        return { message: `${updatedList.length} Subscription(s) cancelled and upcoming charges removed.` };
    }

    async confirmTransaction(idOrIds: string | string[], userId: string) {
        const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];

        // 1. Verify transactions exist and belong to user
        const transactionList = await this.drizzleService.db
            .select()
            .from(transactions)
            .where(and(inArray(transactions.id, ids), eq(transactions.user_id, userId)));

        if (!transactionList.length) throw new NotFoundException('Transaction(s) not found');

        let count = 0;

        for (const transaction of transactionList) {
            if (!transaction.is_projected) continue; // Already confirmed

            // 2. Update Transaction: is_projected = false
            await this.drizzleService.db
                .update(transactions)
                .set({ is_projected: false })
                .where(eq(transactions.id, transaction.id));

            count++;

            // 3. Update Subscription: Advance next_renewal_date
            if (transaction.subscription_id) {
                const [subscription] = await this.drizzleService.db
                    .select()
                    .from(subscriptions)
                    .where(eq(subscriptions.id, transaction.subscription_id));

                if (subscription) {
                    const oldDate = new Date(subscription.next_renewal_date);
                    let newDate = new Date(oldDate);

                    switch (subscription.billing_cycle) {
                        case 'monthly':
                            newDate.setMonth(newDate.getMonth() + 1);
                            break;
                        case 'yearly':
                            newDate.setFullYear(newDate.getFullYear() + 1);
                            break;
                        case 'weekly':
                            newDate.setDate(newDate.getDate() + 7);
                            break;
                        case 'daily':
                            newDate.setDate(newDate.getDate() + 1);
                            break;
                    }

                    await this.drizzleService.db
                        .update(subscriptions)
                        .set({ next_renewal_date: newDate, updated_at: new Date() })
                        .where(eq(subscriptions.id, subscription.id));

                    this.logger.log(`Advanced Subscription ${subscription.name} to ${newDate.toISOString()}`);
                }
            }
        }

        return { message: `${count} Transaction(s) confirmed and subscriptions renewed.` };
    }

    @Cron(CronExpression.EVERY_DAY_AT_1AM)
    async handleDailyRenewalCheck() {
        this.logger.log('Running daily subscription renewal check...');

        // Get all active subscriptions
        // Get all active subscriptions joined with user settings
        const activeSubs = await this.drizzleService.db
            .select({
                sub: subscriptions,
                user_email: users.email,
                user_name: users.name,
                default_alert_days: userSettings.subscription_alert_days,
            })
            .from(subscriptions)
            .innerJoin(users, eq(subscriptions.user_id, users.id))
            .leftJoin(userSettings, eq(users.id, userSettings.user_id))
            .where(eq(subscriptions.is_active, true));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Group renewals by user email
        const userRenewals: Map<string, { userName: string, items: any[] }> = new Map();

        for (const record of activeSubs) {
            const { sub, user_email, user_name, default_alert_days } = record;

            if (!user_email) continue;

            const renewalDate = new Date(sub.next_renewal_date);
            renewalDate.setHours(0, 0, 0, 0);

            const diffTime = renewalDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Determine effective alert window
            // If sub.alert_days is set, use it. Else use user global (default 3).
            const effectiveAlertDays = sub.alert_days !== null ? sub.alert_days : (default_alert_days || 3);

            // Check if within window
            if (diffDays > 0 && diffDays <= effectiveAlertDays) {
                // 1. Create Projected Transaction
                await this.ensureProjectedTransaction(sub, renewalDate);

                // 2. Add to batch
                if (!userRenewals.has(user_email)) {
                    userRenewals.set(user_email, { userName: user_name || 'User', items: [] });
                }
                userRenewals.get(user_email)!.items.push({
                    name: sub.name,
                    amount: sub.amount,
                    currency: sub.currency || 'BDT',
                    date: renewalDate,
                    daysLeft: diffDays
                });
            }
        }

        // Send batched emails
        for (const [email, data] of userRenewals.entries()) {
            if (data.items.length > 0) {
                const html = this.notificationsService.generateBatchRenewalTemplate(data.userName, data.items);
                const subject = data.items.length === 1
                    ? `Upcoming Renewal: ${data.items[0].name}`
                    : `You have ${data.items.length} Upcoming Renewals`;

                await this.notificationsService.sendEmail(email, subject, html);
                this.logger.log(`Sent batch renewal email to ${email} with ${data.items.length} items`);
            }
        }
    }

    private async ensureProjectedTransaction(subscription: any, date: Date) {
        // Check if exists
        const [existing] = await this.drizzleService.db
            .select()
            .from(transactions)
            .where(and(
                eq(transactions.subscription_id, subscription.id),
                eq(transactions.date, date)
                // Note: date comparison needs to be precise or handled carefully with ranges for "Same Day"
            ));

        if (!existing) {
            await this.drizzleService.db.insert(transactions).values({
                user_id: subscription.user_id,
                name: subscription.name,
                amount: subscription.amount,
                date: date, // The future date
                category_id: subscription.category_id,
                subscription_id: subscription.id,
                is_projected: true,
                note: 'Auto-generated renewal based on subscription',
            });
            this.logger.log(`Created projected transaction for ${subscription.name} on ${date}`);
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_1AM)
    async handlePostRenewalCheck() {
        this.logger.log('Running daily post-renewal confirmation check...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find transactions that are projected (ghost) and date is in the past
        const pendingTransactions = await this.drizzleService.db
            .select({
                transaction: transactions,
                user_email: users.email,
                user_name: users.name
            })
            .from(transactions)
            .innerJoin(users, eq(transactions.user_id, users.id))
            .where(and(
                eq(transactions.is_projected, true),
                lte(transactions.date, today) // Check items from today or past
            ));

        // Group by user
        const userPendingItems: Map<string, { userName: string, items: any[] }> = new Map();

        for (const record of pendingTransactions) {
            const { transaction, user_email, user_name } = record;

            if (!user_email) continue;

            // Only notify if recently passed (e.g., within last 3 days) to avoid spamming old ones forever
            // Or just check if it was exactly yesterday? logic: "renewal date 3rd jan, now 4th jan check"
            // Let's allow a window (e.g. 1-7 days overdue)
            const dueTime = new Date(transaction.date).getTime();
            const diffTime = today.getTime() - dueTime;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays <= 3) {
                if (!userPendingItems.has(user_email)) {
                    userPendingItems.set(user_email, { userName: user_name || 'User', items: [] });
                }
                userPendingItems.get(user_email)!.items.push({
                    id: transaction.id,
                    name: transaction.name,
                    amount: transaction.amount,
                    currency: 'BDT', // Need to fetch currency from subscription or transaction? Transaction schema doesn't have it, assumes local.
                    date: new Date(transaction.date)
                });
            }
        }

        // Send Emails
        for (const [email, data] of userPendingItems.entries()) {
            if (data.items.length > 0) {
                const html = this.notificationsService.generatePostRenewalCheckTemplate(data.userName, data.items);
                const subject = `Action Required: Confirm ${data.items.length} Pending Renewals`;
                await this.notificationsService.sendEmail(email, subject, html);
                this.logger.log(`Sent post-renewal check email to ${email}`);
            }
        }
    }
}

// Helper to handle date comparison in SQL if needed, but JS logic in loop is fine for moderate dataset
function gt(column: any, value: Date) {
    return sql`${column} > ${value}`;
}
