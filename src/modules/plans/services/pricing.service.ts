import { Injectable, Logger, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../../db/schema';

@Injectable()
export class PricingService {
    private readonly logger = new Logger(PricingService.name);

    constructor(@Inject('DB') private db: NodePgDatabase<typeof schema>) { }

    /**
     * Get unified pricing information for all plans
     */
    async getPublicPricing(interval?: string, countryCode?: string) {
        this.logger.log('Fetching public pricing');

        // Get all active plans
        const plans = await this.db.select().from(schema.subscriptionPlans);

        // Get all prices
        const allPrices = await this.db
            .select()
            .from(schema.planPricing)
            .where(and(
                eq(schema.planPricing.provider, 'paddle'),
                eq(schema.planPricing.is_active, true)
            ));

        // Group prices by plan
        const pricing = plans.map((plan) => {
            const planPrices = allPrices.filter((price) => price.plan_id === plan.id);

            // Organize prices by interval
            const pricesByInterval: any = {};

            planPrices.forEach((price) => {
                const priceInterval = price.interval || 'one-time';

                if (!pricesByInterval[priceInterval]) {
                    pricesByInterval[priceInterval] = [];
                }

                pricesByInterval[priceInterval].push({
                    id: price.id,
                    provider: price.provider,
                    currency: price.currency,
                    amount: price.amount ? parseFloat(price.amount) : null,
                    paddle_price_id: price.paddle_price_id,
                    unit_price_overrides: price.unit_price_overrides,
                });
            });

            // Filter based on interval and countryCode if provided
            let filteredPrices = pricesByInterval;

            if (interval) {
                // Only return prices for the specified interval
                const intervalPrices = pricesByInterval[interval] || [];

                if (countryCode && intervalPrices.length > 0) {
                    // Find price with country-specific override
                    filteredPrices = intervalPrices.map((price: any) => {
                        const override = this.findCountryOverride(price.unit_price_overrides, countryCode);

                        if (override) {
                            return {
                                id: price.id,
                                provider: price.provider,
                                currency: override.currency_code,
                                amount: parseFloat(override.amount),
                                paddle_price_id: price.paddle_price_id,
                                country_code: countryCode,
                            };
                        }

                        // Return base price if no override found
                        return {
                            id: price.id,
                            provider: price.provider,
                            currency: price.currency,
                            amount: price.amount,
                            paddle_price_id: price.paddle_price_id,
                        };
                    });
                } else {
                    // Return base prices for the interval
                    filteredPrices = intervalPrices.map((price: any) => ({
                        id: price.id,
                        provider: price.provider,
                        currency: price.currency,
                        amount: price.amount,
                        paddle_price_id: price.paddle_price_id,
                    }));
                }
            }

            return {
                id: plan.id,
                name: plan.name,
                plan_key: plan.plan_key,
                display_features: plan.display_features,
                features: plan.features,
                is_paddle_enabled: plan.is_paddle_enabled,
                prices: interval ? filteredPrices : pricesByInterval,
            };
        });

        return pricing;
    }

    /**
     * Get ALL pricing information for all plans (Manual + Paddle)
     */
    async getAllPricing(interval?: string, countryCode?: string) {
        this.logger.log('Fetching all pricing (manual + paddle)');
        return this.fetchPricing(null, interval, countryCode);
    }

    /**
     * Get ALL pricing for a specific plan (Manual + Paddle)
     */
    async getAllPlanPricing(planId: string, interval?: string, countryCode?: string) {
        this.logger.log(`Fetching all pricing for plan: ${planId} (manual + paddle)`);
        return this.fetchPricing(planId, interval, countryCode);
    }

    /**
     * Helper method to fetch pricing with optional provider filter
     */
    private async fetchPricing(planId?: string | null, interval?: string, countryCode?: string, provider?: 'manual' | 'paddle') {
        // Get plans
        const plans = planId
            ? await this.db.select().from(schema.subscriptionPlans).where(eq(schema.subscriptionPlans.id, planId))
            : await this.db.select().from(schema.subscriptionPlans);

        if (planId && plans.length === 0) {
            return null;
        }

        // Build price query conditions
        const conditions = [eq(schema.planPricing.is_active, true)];
        if (provider) {
            conditions.push(eq(schema.planPricing.provider, provider));
        }
        if (planId) {
            conditions.push(eq(schema.planPricing.plan_id, planId));
        }

        // Get all prices
        const allPrices = await this.db
            .select()
            .from(schema.planPricing)
            .where(and(...conditions));

        // Group prices by plan
        const pricing = plans.map((plan) => {
            const planPrices = allPrices.filter((price) => price.plan_id === plan.id);

            // Organize prices by interval
            const pricesByInterval: any = {};

            planPrices.forEach((price) => {
                const priceInterval = price.interval || 'one-time';

                if (!pricesByInterval[priceInterval]) {
                    pricesByInterval[priceInterval] = [];
                }

                pricesByInterval[priceInterval].push({
                    id: price.id,
                    provider: price.provider,
                    currency: price.currency,
                    amount: price.amount ? parseFloat(price.amount) : null,
                    paddle_price_id: price.paddle_price_id,
                    unit_price_overrides: price.unit_price_overrides,
                });
            });

            // Filter based on interval and countryCode if provided
            let filteredPrices = pricesByInterval;

            if (interval) {
                // Only return prices for the specified interval
                const intervalPrices = pricesByInterval[interval] || [];

                if (countryCode && intervalPrices.length > 0) {
                    // Find price with country-specific override
                    filteredPrices = intervalPrices.map((price: any) => {
                        const override = this.findCountryOverride(price.unit_price_overrides, countryCode);

                        if (override) {
                            return {
                                id: price.id,
                                provider: price.provider,
                                currency: override.currency_code,
                                amount: parseFloat(override.amount),
                                paddle_price_id: price.paddle_price_id,
                                country_code: countryCode,
                            };
                        }

                        // Return base price if no override found
                        return {
                            id: price.id,
                            provider: price.provider,
                            currency: price.currency,
                            amount: price.amount,
                            paddle_price_id: price.paddle_price_id,
                        };
                    });
                } else {
                    // Return base prices for the interval
                    filteredPrices = intervalPrices.map((price: any) => ({
                        id: price.id,
                        provider: price.provider,
                        currency: price.currency,
                        amount: price.amount,
                        paddle_price_id: price.paddle_price_id,
                    }));
                }
            }

            return {
                id: plan.id,
                name: plan.name,
                plan_key: plan.plan_key,
                display_features: plan.display_features,
                features: plan.features,
                is_paddle_enabled: plan.is_paddle_enabled,
                prices: interval ? filteredPrices : pricesByInterval,
            };
        });

        return planId ? pricing[0] || null : pricing;
    }

    /**
     * Get pricing for a specific plan
     */
    async getPlanPricing(planId: string, interval?: string, countryCode?: string) {
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
            .where(and(
                eq(schema.planPricing.plan_id, planId),
                eq(schema.planPricing.provider, 'paddle'),
                eq(schema.planPricing.is_active, true)
            ));

        // Organize prices by interval
        const pricesByInterval: any = {};

        prices.forEach((price) => {
            const priceInterval = price.interval || 'one-time';

            if (!pricesByInterval[priceInterval]) {
                pricesByInterval[priceInterval] = [];
            }

            pricesByInterval[priceInterval].push({
                id: price.id,
                provider: price.provider,
                currency: price.currency,
                amount: price.amount ? parseFloat(price.amount) : null,
                paddle_price_id: price.paddle_price_id,
                unit_price_overrides: price.unit_price_overrides,
            });
        });

        // Filter based on interval and countryCode if provided
        let filteredPrices = pricesByInterval;

        if (interval) {
            // Only return prices for the specified interval
            const intervalPrices = pricesByInterval[interval] || [];

            if (countryCode && intervalPrices.length > 0) {
                // Find price with country-specific override
                filteredPrices = intervalPrices.map((price: any) => {
                    const override = this.findCountryOverride(price.unit_price_overrides, countryCode);

                    if (override) {
                        return {
                            id: price.id,
                            provider: price.provider,
                            currency: override.currency_code,
                            amount: parseFloat(override.amount),
                            paddle_price_id: price.paddle_price_id,
                            country_code: countryCode,
                        };
                    }

                    // Return base price if no override found
                    return {
                        id: price.id,
                        provider: price.provider,
                        currency: price.currency,
                        amount: price.amount,
                        paddle_price_id: price.paddle_price_id,
                    };
                });
            } else {
                // Return base prices for the interval
                filteredPrices = intervalPrices.map((price: any) => ({
                    id: price.id,
                    provider: price.provider,
                    currency: price.currency,
                    amount: price.amount,
                    paddle_price_id: price.paddle_price_id,
                }));
            }
        }

        return {
            id: plan.id,
            name: plan.name,
            plan_key: plan.plan_key,
            display_features: plan.display_features,
            features: plan.features,
            is_paddle_enabled: plan.is_paddle_enabled,
            prices: interval ? filteredPrices : pricesByInterval,
        };
    }

    /**
     * Helper method to find country-specific price override
     */
    private findCountryOverride(overrides: any, countryCode: string): { amount: string; currency_code: string } | null {
        if (!overrides || !Array.isArray(overrides)) {
            return null;
        }

        for (const override of overrides) {
            // Handle both snake_case and camelCase
            const countryCodes = override.countryCodes || override.country_codes;
            const unitPrice = override.unitPrice || override.unit_price;

            if (countryCodes && Array.isArray(countryCodes) && countryCodes.includes(countryCode)) {
                return {
                    amount: unitPrice.amount,
                    currency_code: unitPrice.currency_code,
                };
            }
        }

        return null;
    }
}
