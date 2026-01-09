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

    async getBreakdown(userId: string) {
        const activeSubs = await this.drizzleService.db
            .select()
            .from(subscriptions)
            .where(and(eq(subscriptions.user_id, userId), eq(subscriptions.is_active, true)));

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear(), 11, 31);

        const activeSubIds = activeSubs.map(s => s.id);

        // Fetch existing transactions for this MONTH to calculate "Real" base (Only for active subs)
        const monthTransactions = activeSubIds.length > 0 ? await this.drizzleService.db
            .select({ amount: transactions.amount, date: transactions.date, subId: transactions.subscription_id })
            .from(transactions)
            .where(and(
                eq(transactions.user_id, userId),
                gte(transactions.date, startOfMonth),
                lte(transactions.date, endOfMonth),
                inArray(transactions.subscription_id, activeSubIds)
            )) : [];

        // Fetch existing transactions for this YEAR (Only for active subs)
        const yearTransactions = activeSubIds.length > 0 ? await this.drizzleService.db
            .select({ amount: transactions.amount, date: transactions.date, subId: transactions.subscription_id })
            .from(transactions)
            .where(and(
                eq(transactions.user_id, userId),
                gte(transactions.date, startOfYear),
                lte(transactions.date, endOfYear),
                inArray(transactions.subscription_id, activeSubIds)
            )) : [];

        // 1. Approximate (Projected/Normalized)
        let approxMonthly = 0;
        let approxYearly = 0;

        for (const sub of activeSubs) {
            const amount = sub.amount;
            switch (sub.billing_cycle) {
                case 'daily':
                    approxMonthly += amount * 30;
                    approxYearly += amount * 365;
                    break;
                case 'weekly':
                    approxMonthly += amount * 4;
                    approxYearly += amount * 52;
                    break;
                case 'monthly':
                    approxMonthly += amount;
                    approxYearly += amount * 12;
                    break;
                case 'yearly':
                    approxMonthly += amount / 12;
                    approxYearly += amount;
                    break;
            }
        }

        // 2. Real (Actual Cashflow: Past Transactions + Future Renewals)
        let realMonthly = 0;
        let realYearly = 0;

        // Add confirmed/projected transactions from DB (covers past + near future)
        realMonthly = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
        realYearly = yearTransactions.reduce((sum, t) => sum + t.amount, 0);

        // Simulate FUTURE renewals that are NOT in the transactions table yet
        for (const sub of activeSubs) {
            let nextDate = new Date(sub.next_renewal_date);
            nextDate.setHours(0, 0, 0, 0);

            // While simulating, we need to check if this specific occurrence 
            // is already covered by a transaction (projected or real) to avoid double counting.
            // We'll iterate through the rest of the YEAR

            while (nextDate <= endOfYear) {
                // If date is in the past, it 'should' have been a transaction or 'next_renewal_date' would be future.
                // However, 'next_renewal_date' is the anchor. 
                // Any recurrence starting from 'next_renewal_date' is by definition NOT yet paid/processed (unless projected).

                // Compare by Date String to avoid time mismatches
                const nextDateStr = nextDate.toDateString();

                // Check if this date has a transaction record already
                const hasTransactionYear = yearTransactions.some(t =>
                    new Date(t.date).toDateString() === nextDateStr && t.subId === sub.id
                );

                if (!hasTransactionYear) {
                    realYearly += sub.amount;

                    // Also check for Monthly
                    if (nextDate >= startOfMonth && nextDate <= endOfMonth) {
                        realMonthly += sub.amount;
                    }
                }

                // Advance Date
                switch (sub.billing_cycle) {
                    case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
                    case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
                    case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
                    case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
                }
            }
        }

        return {
            approx: {
                monthly: Math.round(approxMonthly),
                yearly: Math.round(approxYearly)
            },
            real: {
                monthly: Math.round(realMonthly),
                yearly: Math.round(realYearly)
            },
        };
    }

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
        renewalDate.setHours(12, 0, 0, 0); // Set to Noon to avoid Date Shift

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
        let ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
        if (ids.length === 0) return { message: 'No IDs provided' };

        // Check if these are Subscription IDs
        const existingSubs = await this.drizzleService.db
            .select({ id: subscriptions.id })
            .from(subscriptions)
            .where(and(inArray(subscriptions.id, ids), eq(subscriptions.user_id, userId)));

        // If no subscriptions found, check if they are Transaction IDs (User might have clicked cancel on a transaction item)
        if (existingSubs.length === 0) {
            const linkedTransactions = await this.drizzleService.db
                .select({ subId: transactions.subscription_id })
                .from(transactions)
                .where(and(inArray(transactions.id, ids), eq(transactions.user_id, userId)));

            if (linkedTransactions.length > 0) {
                const derivedIds = linkedTransactions.map(t => t.subId).filter(id => id !== null) as string[];
                if (derivedIds.length > 0) {
                    this.logger.log(`Resolved ${derivedIds.length} Subscription IDs from Transaction IDs provided for cancellation.`);
                    ids = [...new Set(derivedIds)];
                }
            }
        }

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
                    eq(transactions.is_projected, true)
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

    async getTransactionsDetails(idOrIds: string | string[], userId: string) {
        const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];

        if (ids.length === 0) return [];

        const transactionList = await this.drizzleService.db
            .select()
            .from(transactions)
            .where(and(
                inArray(transactions.id, ids),
                eq(transactions.user_id, userId),
                eq(transactions.is_projected, true)
            ));

        return transactionList;
    }

    // Run every hour to catch 10 AM in different timezones
    @Cron(CronExpression.EVERY_HOUR)
    async handleDailyRenewalCheck() {
        this.logger.log('Running detailed subscription renewal check (Hourly)...');

        // Get all active subscriptions joined with user settings
        const activeSubs = await this.drizzleService.db
            .select({
                sub: subscriptions,
                user_email: users.email,
                user_name: users.name,
                default_alert_days: userSettings.subscription_alert_days,
                timezone: userSettings.timezone, // Fetch timezone
                category_name: categories.name,
            })
            .from(subscriptions)
            .innerJoin(users, eq(subscriptions.user_id, users.id))
            .leftJoin(userSettings, eq(users.id, userSettings.user_id))
            .leftJoin(categories, eq(subscriptions.category_id, categories.id))
            .where(eq(subscriptions.is_active, true));

        // Group renewals by user email
        const userRenewals: Map<string, { userName: string, items: any[], timezone: string }> = new Map();

        // 1. Group Data First
        for (const record of activeSubs) {
            const { sub, user_email, user_name, default_alert_days, category_name, timezone } = record;
            if (!user_email) continue;

            // Initialize Group
            if (!userRenewals.has(user_email)) {
                userRenewals.set(user_email, {
                    userName: user_name || 'User',
                    items: [],
                    timezone: timezone || 'UTC' // Default to UTC
                });
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const renewalDate = new Date(sub.next_renewal_date);
            renewalDate.setHours(12, 0, 0, 0);

            const diffTime = renewalDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const effectiveAlertDays = sub.alert_days !== null ? sub.alert_days : (default_alert_days || 3);

            // Logic: Is it upcoming?
            if (diffDays > 0 && diffDays <= effectiveAlertDays) {
                // Ensure Transaction Exists (Logic independent of email time)
                await this.ensureProjectedTransaction(sub, renewalDate);

                // Add to list for potential email
                userRenewals.get(user_email)!.items.push({
                    name: sub.name,
                    category: category_name || 'General',
                    amount: sub.amount,
                    currency: sub.currency || 'BDT',
                    date: renewalDate,
                    daysLeft: diffDays
                });
            }
        }

        // 2. Process Delivery based on Timezone
        const currentServerDate = new Date();
        const targetHour = 10; // We want to send at 10 AM local time

        for (const [email, data] of userRenewals.entries()) {
            if (data.items.length === 0) continue;

            // Check Timezone
            try {
                // Get the hour in the user's timezone
                const userTimeStr = currentServerDate.toLocaleString('en-US', { timeZone: data.timezone, hour: 'numeric', hour12: false });
                const userHour = parseInt(userTimeStr, 10);

                if (userHour === targetHour) {
                    // Sort items: Latest first
                    data.items.sort((a, b) => b.date.getTime() - a.date.getTime());

                    const html = this.notificationsService.generateBatchRenewalTemplate(data.userName, data.items);
                    const subject = data.items.length === 1
                        ? `Upcoming Renewal: ${data.items[0].name}`
                        : `You have ${data.items.length} Upcoming Renewals`;

                    await this.notificationsService.sendEmail(email, subject, html);
                    this.logger.log(`Sent batch renewal email to ${email} (Timezone: ${data.timezone})`);
                } else {
                    // this.logger.debug(`Skipping ${email}: Local hour is ${userHour}, waiting for ${targetHour} (${data.timezone})`);
                }
            } catch (error) {
                this.logger.error(`Error processing timezone for ${email}: ${error.message}`);
                // Fallback? Maybe send anyway if timezone is invalid? 
                // For now, safety skip or log error.
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

    // Run every hour to catch 10 AM in different timezones
    @Cron(CronExpression.EVERY_HOUR)
    async handlePostRenewalCheck() {
        this.logger.log('Running post-renewal confirmation check (Hourly)...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find transactions that are projected (ghost) and date is in the past
        const pendingTransactions = await this.drizzleService.db
            .select({
                transaction: transactions,
                user_email: users.email,
                user_name: users.name,
                timezone: userSettings.timezone,
                currency: userSettings.currency,
            })
            .from(transactions)
            .innerJoin(users, eq(transactions.user_id, users.id))
            .leftJoin(userSettings, eq(users.id, userSettings.user_id))
            .where(and(
                eq(transactions.is_projected, true),
                lte(transactions.date, today) // Check items from today or past
            ));

        // Group by user
        const userPendingItems: Map<string, { userName: string, items: any[], timezone: string }> = new Map();

        for (const record of pendingTransactions) {
            const { transaction, user_email, user_name, timezone, currency } = record;

            if (!user_email) continue;

            const dueTime = new Date(transaction.date).getTime();
            const diffTime = today.getTime() - dueTime;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Logic: Notify if it's due today (0) or recently passed (1-3 days)
            if (diffDays >= 0 && diffDays <= 3) {
                if (!userPendingItems.has(user_email)) {
                    userPendingItems.set(user_email, {
                        userName: user_name || 'User',
                        items: [],
                        timezone: timezone || 'UTC'
                    });
                }
                userPendingItems.get(user_email)!.items.push({
                    id: transaction.id,
                    name: transaction.name,
                    amount: transaction.amount,
                    currency: currency || 'BDT', // Use User Settings Currency
                    date: new Date(transaction.date)
                });
            }
        }

        // Process Delivery based on Timezone
        const currentServerDate = new Date();
        const targetHour = 10; // Send at 10 AM local time

        for (const [email, data] of userPendingItems.entries()) {
            if (data.items.length === 0) continue;

            // Check Timezone
            try {
                const userTimeStr = currentServerDate.toLocaleString('en-US', { timeZone: data.timezone, hour: 'numeric', hour12: false });
                const userHour = parseInt(userTimeStr, 10);

                if (userHour === targetHour) {
                    const html = this.notificationsService.generatePostRenewalCheckTemplate(data.userName, data.items);
                    const subject = `Action Required: Confirm ${data.items.length} Pending Renewals`;
                    await this.notificationsService.sendEmail(email, subject, html);
                    this.logger.log(`Sent post-renewal check email to ${email} (Timezone: ${data.timezone})`);
                }
            } catch (error) {
                this.logger.error(`Error processing timezone for ${email}: ${error.message}`);
            }
        }
    }
}

// Helper to handle date comparison in SQL if needed, but JS logic in loop is fine for moderate dataset
function gt(column: any, value: Date) {
    return sql`${column} > ${value}`;
}
