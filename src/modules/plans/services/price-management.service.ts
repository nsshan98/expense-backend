import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { PaddleService } from '../../../services/paddle.service';
import { CreatePriceDto, UpdatePriceDto } from '../dto/price-management.dto';

@Injectable()
export class PriceManagementService {
    private readonly logger = new Logger(PriceManagementService.name);

    constructor(
        @Inject('DB') private db: NodePgDatabase<typeof schema>,
        private paddleService: PaddleService,
    ) { }

    /**
     * Create a new price
     */
    async createPrice(dto: CreatePriceDto) {
        this.logger.log(`Creating price for plan: ${dto.plan_id}`);

        // Verify plan exists
        const [plan] = await this.db
            .select()
            .from(schema.subscriptionPlans)
            .where(eq(schema.subscriptionPlans.id, dto.plan_id))
            .limit(1);

        if (!plan) {
            throw new NotFoundException(`Plan not found: ${dto.plan_id}`);
        }

        let paddlePriceId: string | null = null;

        // If provider is Paddle, create price in Paddle
        if (dto.provider === 'paddle') {
            if (!plan.paddle_product_id) {
                throw new BadRequestException('Plan does not have Paddle enabled');
            }

            if (!this.paddleService.isConfigured()) {
                throw new BadRequestException('Paddle is not configured');
            }

            try {
                const paddlePrice = await this.paddleService.createPrice({
                    productId: plan.paddle_product_id,
                    description: dto.description || `${plan.name} - ${dto.interval}`,
                    unitPrice: {
                        amount: dto.amount ? (dto.amount * 100).toString() : '0', // Convert to cents
                        currencyCode: dto.currency.toUpperCase(),
                    },
                    billingCycle: dto.billing_cycle,
                });

                paddlePriceId = paddlePrice.id;
                this.logger.log(`Created Paddle price: ${paddlePriceId}`);
            } catch (error) {
                this.logger.error('Failed to create Paddle price', error);
                throw new BadRequestException('Failed to create Paddle price');
            }
        } else {
            // For manual prices, amount is required
            if (!dto.amount) {
                throw new BadRequestException('Amount is required for manual prices');
            }
        }

        // Create price in database
        const [price] = await this.db
            .insert(schema.planPricing)
            .values({
                plan_id: parseInt(dto.plan_id), // Convert to integer if needed
                provider: dto.provider,
                interval: dto.interval || 'monthly',
                currency: dto.currency.toUpperCase(),
                amount: dto.amount ? dto.amount.toString() : null,
                paddle_price_id: paddlePriceId,
            })
            .returning();

        this.logger.log(`Created price: ${price.id}`);
        return price;
    }

    /**
     * Get all prices for a plan
     */
    async getPricesByPlan(planId: string) {
        const prices = await this.db
            .select()
            .from(schema.planPricing)
            .where(eq(schema.planPricing.plan_id, parseInt(planId)));

        return prices;
    }

    /**
     * Get all prices
     */
    async getAllPrices() {
        const prices = await this.db.select().from(schema.planPricing);
        return prices;
    }

    /**
     * Get a single price by ID
     */
    async getPriceById(priceId: number) {
        const [price] = await this.db
            .select()
            .from(schema.planPricing)
            .where(eq(schema.planPricing.id, priceId))
            .limit(1);

        if (!price) {
            throw new NotFoundException(`Price not found: ${priceId}`);
        }

        return price;
    }

    /**
     * Update a price
     */
    async updatePrice(priceId: number, dto: UpdatePriceDto) {
        this.logger.log(`Updating price: ${priceId}`);

        const price = await this.getPriceById(priceId);

        // If Paddle price exists, update in Paddle
        if (price.paddle_price_id && this.paddleService.isConfigured()) {
            try {
                await this.paddleService.updatePrice(price.paddle_price_id, {
                    description: dto.description,
                });
                this.logger.log(`Updated Paddle price: ${price.paddle_price_id}`);
            } catch (error) {
                this.logger.error('Failed to update Paddle price', error);
                // Continue with local update even if Paddle fails
            }
        }

        // Update price in database
        const updateData: any = {};
        if (dto.description !== undefined) updateData.description = dto.description;
        if (dto.amount !== undefined && price.provider === 'manual') {
            updateData.amount = dto.amount.toString();
        }

        const [updatedPrice] = await this.db
            .update(schema.planPricing)
            .set(updateData)
            .where(eq(schema.planPricing.id, priceId))
            .returning();

        this.logger.log(`Updated price: ${priceId}`);
        return updatedPrice;
    }

    /**
     * Delete a price (archive in Paddle if applicable)
     */
    async deletePrice(priceId: number) {
        this.logger.log(`Deleting price: ${priceId}`);

        const price = await this.getPriceById(priceId);

        // If Paddle price exists, archive it
        if (price.paddle_price_id && this.paddleService.isConfigured()) {
            try {
                await this.paddleService.archivePrice(price.paddle_price_id);
                this.logger.log(`Archived Paddle price: ${price.paddle_price_id}`);
            } catch (error) {
                this.logger.error('Failed to archive Paddle price', error);
                // Continue with local deletion even if Paddle fails
            }
        }

        // Delete price from database
        await this.db
            .delete(schema.planPricing)
            .where(eq(schema.planPricing.id, priceId));

        this.logger.log(`Deleted price: ${priceId}`);
        return { message: 'Price deleted successfully' };
    }
}
