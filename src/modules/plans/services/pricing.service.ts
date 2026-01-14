import { Injectable, Logger, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../../db/schema';

@Injectable()
export class PricingService {
    private readonly logger = new Logger(PricingService.name);

    constructor(@Inject('DB') private db: NodePgDatabase<typeof schema>) { }

    /**
     * Get unified pricing information for all plans
     */
    async getPublicPricing() {
        this.logger.log('Fetching public pricing');

        // Get all active plans
        const plans = await this.db.select().from(schema.subscriptionPlans);

        // Get all prices
        const allPrices = await this.db.select().from(schema.planPricing);

        // Group prices by plan
        const pricing = plans.map((plan) => {
            const planPrices = allPrices.filter((price) => price.plan_id === plan.id);

            // Organize prices by interval
            const pricesByInterval: any = {};

            planPrices.forEach((price) => {
                const interval = price.interval || 'one-time';

                if (!pricesByInterval[interval]) {
                    pricesByInterval[interval] = [];
                }

                pricesByInterval[interval].push({
                    id: price.id,
                    provider: price.provider,
                    currency: price.currency,
                    amount: price.amount ? parseFloat(price.amount) : null,
                    paddle_price_id: price.paddle_price_id,
                });
            });

            return {
                id: plan.id,
                name: plan.name,
                plan_key: plan.plan_key,
                display_features: plan.display_features,
                features: plan.features,
                is_paddle_enabled: plan.is_paddle_enabled,
                prices: pricesByInterval,
            };
        });

        return pricing;
    }

    /**
     * Get pricing for a specific plan
     */
    async getPlanPricing(planId: string) {
        this.logger.log(`Fetching pricing for plan: ${planId}`);

        // Get plan
        const [plan] = await this.db
            .select()
            .from(schema.subscriptionPlans)
            .where(eq(schema.subscriptionPlans.id, planId))
            .limit(1);

        if (!plan) {
            return null;
        }

        // Get prices for this plan
        const prices = await this.db
            .select()
            .from(schema.planPricing)
            .where(eq(schema.planPricing.plan_id, planId));

        // Organize prices by interval
        const pricesByInterval: any = {};

        prices.forEach((price) => {
            const interval = price.interval || 'one-time';

            if (!pricesByInterval[interval]) {
                pricesByInterval[interval] = [];
            }

            pricesByInterval[interval].push({
                id: price.id,
                provider: price.provider,
                currency: price.currency,
                amount: price.amount ? parseFloat(price.amount) : null,
                paddle_price_id: price.paddle_price_id,
            });
        });

        return {
            id: plan.id,
            name: plan.name,
            plan_key: plan.plan_key,
            display_features: plan.display_features,
            features: plan.features,
            is_paddle_enabled: plan.is_paddle_enabled,
            prices: pricesByInterval,
        };
    }
}
