import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as schema from '../../db/schema';

@Injectable()
export class PaddleWebhookService {
    private readonly logger = new Logger(PaddleWebhookService.name);
    private readonly webhookSecret: string;

    constructor(
        private configService: ConfigService,
        @Inject('DB') private db: NodePgDatabase<typeof schema>,
    ) {
        this.webhookSecret = this.configService.get<string>('PADDLE_WEBHOOK_SECRET') || '';
    }

    /**
     * Verify Paddle webhook signature
     */
    async verifySignature(payload: any, signature: string): Promise<boolean> {
        if (!this.webhookSecret) {
            this.logger.warn('PADDLE_WEBHOOK_SECRET not configured. Skipping signature verification.');
            return true; // In development, you might skip verification
        }

        try {
            // Paddle signature format: ts=timestamp;h1=signature
            const parts = signature.split(';');
            const timestamp = parts.find(p => p.startsWith('ts='))?.split('=')[1];
            const signatureHash = parts.find(p => p.startsWith('h1='))?.split('=')[1];

            if (!timestamp || !signatureHash) {
                return false;
            }

            // Create the signed payload
            const signedPayload = `${timestamp}:${JSON.stringify(payload)}`;

            // Calculate HMAC
            const hmac = crypto
                .createHmac('sha256', this.webhookSecret)
                .update(signedPayload)
                .digest('hex');

            return hmac === signatureHash;
        } catch (error) {
            this.logger.error('Error verifying webhook signature', error);
            return false;
        }
    }

    /**
     * Process webhook event
     */
    async processEvent(payload: any): Promise<void> {
        const eventType = payload.event_type;

        this.logger.log(`Processing event: ${eventType}`);

        switch (eventType) {
            case 'transaction.completed':
                await this.handleTransactionCompleted(payload);
                break;

            case 'transaction.paid':
                await this.handleTransactionPaid(payload);
                break;

            case 'transaction.payment_failed':
                await this.handleTransactionPaymentFailed(payload);
                break;

            case 'subscription.created':
                await this.handleSubscriptionCreated(payload);
                break;

            case 'subscription.updated':
                await this.handleSubscriptionUpdated(payload);
                break;

            case 'subscription.canceled':
                await this.handleSubscriptionCanceled(payload);
                break;

            case 'subscription.paused':
                await this.handleSubscriptionPaused(payload);
                break;

            case 'subscription.resumed':
                await this.handleSubscriptionResumed(payload);
                break;

            case 'subscription.past_due':
                await this.handleSubscriptionPastDue(payload);
                break;

            default:
                this.logger.log(`Unhandled event type: ${eventType}`);
        }
    }

    /**
     * Handle transaction.completed event
     */
    private async handleTransactionCompleted(payload: any): Promise<void> {
        const transaction = payload.data;

        console.log(transaction);


        this.logger.log(`Transaction completed: ${transaction.id}`);

        const userId = transaction.custom_data?.user_id;

        if (!userId) {
            this.logger.error(`Transaction ${transaction.id} missing user_id in custom_data. Cannot record payment.`);
            // Potentially try to find user by paddle_customer_id here if needed
            return;
        }

        try {
            await this.db.insert(schema.userPaymentEvents).values({
                user_id: userId,
                paddle_subscription_id: transaction.subscription_id || null,
                amount: parseFloat(transaction.details?.totals?.total || '0'),
                currency: transaction.currency_code,
                status: transaction.status,
                source: 'paddle',
                paddle_txn_id: transaction.id,
                invoice_number: transaction.invoice_number,
                // receipt_url: transaction.checkout?.url, // Often null for recurring
                payment_method_type: transaction.payments?.[0]?.method_details?.type,
                billed_at: transaction.billed_at ? new Date(transaction.billed_at) : new Date(),
                raw_response: transaction,
            });

            this.logger.log(`Recorded transaction ${transaction.id} to user_payment_events`);
        } catch (error) {
            this.logger.error(`Failed to record transaction ${transaction.id}`, error);
        }

        if (transaction.subscription_id) {
            this.logger.log(`Transaction ${transaction.id} is for subscription ${transaction.subscription_id}`);
            return;
        }

        this.logger.log(`One-time purchase completed: ${transaction.id}`);
    }

    /**
     * Handle transaction.paid event
     */
    private async handleTransactionPaid(payload: any): Promise<void> {
        const transaction = payload.data;
        this.logger.log(`Transaction paid: ${transaction.id}`);
    }

    /**
     * Handle transaction.payment_failed event
     */
    private async handleTransactionPaymentFailed(payload: any): Promise<void> {
        const transaction = payload.data;
        this.logger.log(`Transaction payment failed: ${transaction.id}`);
    }

    /**
     * Handle subscription.created event
     */
    private async handleSubscriptionCreated(payload: any): Promise<void> {
        const subscription = payload.data;
        const customData = subscription.custom_data;

        this.logger.log(`Subscription created: ${subscription.id}`);

        const userId = customData?.user_id;
        if (!userId) {
            this.logger.error('No user_id in subscription custom_data');
            return;
        }

        // Find the user
        const users = await this.db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, userId))
            .limit(1);

        if (users.length === 0) {
            this.logger.error(`User not found: ${userId}`);
            return;
        }

        const firstItem = subscription.items?.[0];
        if (!firstItem) {
            this.logger.error('No items in subscription');
            return;
        }

        const paddleProductId = firstItem.price.product_id;
        const mappedPlan = await this.db
            .select()
            .from(schema.subscriptionPlans)
            .where(eq(schema.subscriptionPlans.paddle_product_id, paddleProductId))
            .limit(1);

        let planId = customData?.plan_id || users[0].plan_id;

        if (mappedPlan.length > 0) {
            planId = mappedPlan[0].id;
        } else {
            this.logger.warn(
                `No internal plan found for paddle_product_id: ${paddleProductId}. Fallback to user current plan.`,
            );
        }

        // Create subscription record
        await this.db.insert(schema.subscriptions).values({
            user_id: userId,
            plan_id: planId,
            source: 'paddle',
            status: 'active',
            start_date: new Date(subscription.started_at),
            next_renewal_date: subscription.next_billed_at
                ? new Date(subscription.next_billed_at)
                : null,
            currency: subscription.currency_code,
            paddle_subscription_id: subscription.id,
            paddle_price_id: firstItem.price.id,
        });

        // Update user's current plan
        await this.db
            .update(schema.users)
            .set({
                plan_id: planId,
                paddle_customer_id: subscription.customer_id,
            })
            .where(eq(schema.users.id, userId));

        this.logger.log(
            `Created subscription record and updated user ${userId} to plan ${planId}`,
        );
    }

    /**
     * Handle subscription.updated event
     */
    private async handleSubscriptionUpdated(payload: any): Promise<void> {
        const subscription = payload.data;

        this.logger.log(`Subscription updated: ${subscription.id}`);

        const dbSubscriptions = await this.db
            .select()
            .from(schema.subscriptions)
            .where(eq(schema.subscriptions.paddle_subscription_id, subscription.id))
            .limit(1);

        if (dbSubscriptions.length === 0) {
            this.logger.error(`Subscription not found: ${subscription.id}`);
            return;
        }

        const firstItem = subscription.items?.[0];
        let planIdUpdate = {};

        if (firstItem) {
            const paddleProductId = firstItem.price.product_id;
            const mappedPlan = await this.db
                .select()
                .from(schema.subscriptionPlans)
                .where(eq(schema.subscriptionPlans.paddle_product_id, paddleProductId))
                .limit(1);

            if (mappedPlan.length > 0) {
                planIdUpdate = {
                    plan_id: mappedPlan[0].id,
                    paddle_price_id: firstItem.price.id,
                };
            }
        }

        await this.db
            .update(schema.subscriptions)
            .set({
                status: this.mapPaddleStatus(subscription.status),
                next_renewal_date: subscription.next_billed_at
                    ? new Date(subscription.next_billed_at)
                    : null,
                updated_at: new Date(),
                ...planIdUpdate,
            })
            .where(eq(schema.subscriptions.paddle_subscription_id, subscription.id));

        // If plan changed, update user
        if (Object.keys(planIdUpdate).length > 0) {
            // We need to fetch the user_id from the subscription first if we want to be safe, 
            // but we already fetched dbSubscriptions above which has user_id? 
            // Wait, the previous code didn't save dbSubscriptions result to a variable that excludes the user_id. 
            // 'dbSubscriptions' is an array of subscription objects.

            const userId = dbSubscriptions[0].user_id;

            await this.db.update(schema.users)
                .set({
                    plan_id: (planIdUpdate as any).plan_id,
                })
                .where(eq(schema.users.id, userId));
        }

        this.logger.log(`Updated subscription ${subscription.id} and synced plan info`);
    }

    /**
     * Handle subscription.canceled event
     */
    private async handleSubscriptionCanceled(payload: any): Promise<void> {
        const subscription = payload.data;

        this.logger.log(`Subscription canceled: ${subscription.id}`);

        await this.db
            .update(schema.subscriptions)
            .set({
                status: 'canceled',
                end_date: new Date(),
                updated_at: new Date(),
            })
            .where(eq(schema.subscriptions.paddle_subscription_id, subscription.id));

        this.logger.log(`Canceled subscription ${subscription.id}`);
    }

    /**
     * Handle subscription.paused event
     */
    private async handleSubscriptionPaused(payload: any): Promise<void> {
        const subscription = payload.data;

        this.logger.log(`Subscription paused: ${subscription.id}`);

        await this.db
            .update(schema.subscriptions)
            .set({
                status: 'paused',
                updated_at: new Date(),
            })
            .where(eq(schema.subscriptions.paddle_subscription_id, subscription.id));

        this.logger.log(`Paused subscription ${subscription.id}`);
    }

    /**
     * Handle subscription.resumed event
     */
    private async handleSubscriptionResumed(payload: any): Promise<void> {
        const subscription = payload.data;

        this.logger.log(`Subscription resumed: ${subscription.id}`);

        await this.db
            .update(schema.subscriptions)
            .set({
                status: 'active',
                updated_at: new Date(),
            })
            .where(eq(schema.subscriptions.paddle_subscription_id, subscription.id));

        this.logger.log(`Resumed subscription ${subscription.id}`);
    }

    /**
     * Handle subscription.past_due event
     */
    private async handleSubscriptionPastDue(payload: any): Promise<void> {
        const subscription = payload.data;

        this.logger.log(`Subscription past due: ${subscription.id}`);

        await this.db
            .update(schema.subscriptions)
            .set({
                status: 'past_due',
                updated_at: new Date(),
            })
            .where(eq(schema.subscriptions.paddle_subscription_id, subscription.id));

        this.logger.log(`Marked subscription ${subscription.id} as past_due`);
    }

    /**
     * Map Paddle subscription status to our internal status
     */
    private mapPaddleStatus(paddleStatus: string): string {
        const statusMap: Record<string, string> = {
            active: 'active',
            canceled: 'canceled',
            paused: 'paused',
            past_due: 'past_due',
            trialing: 'active',
        };

        return statusMap[paddleStatus] || 'active';
    }
}
