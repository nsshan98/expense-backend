import { Injectable, Logger, NotFoundException, BadRequestException, Inject, ConflictException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { PaddleService } from '../../../services/paddle.service';
import { CreatePlanDto, UpdatePlanDto } from '../dto/plan-management.dto';

@Injectable()
export class PlanManagementService {
    private readonly logger = new Logger(PlanManagementService.name);

    constructor(
        @Inject('DB') private db: NodePgDatabase<typeof schema>,
        private paddleService: PaddleService,
    ) { }

    /**
     * Create a new plan
     */
    async createPlan(dto: CreatePlanDto) {
        this.logger.log(`Creating plan: ${dto.name}`);

        let paddleProductId: string | null = null;

        // If Paddle is enabled, create product in Paddle first
        if (dto.is_paddle_enabled && this.paddleService.isConfigured()) {
            try {
                const paddleProduct = await this.paddleService.createProduct({
                    name: dto.name,
                    taxCategory: dto.paddle_tax_category || 'standard',
                    imageUrl: dto.paddle_image_url,
                });

                paddleProductId = paddleProduct.id;
                this.logger.log(`Created Paddle product: ${paddleProductId}`);
            } catch (error) {
                this.logger.error('Failed to create Paddle product', error);
                throw new BadRequestException('Failed to create Paddle product');
            }
        }

        // Create plan in database
        try {
            const [plan] = await this.db
                .insert(schema.subscriptionPlans)
                .values({
                    name: dto.name,
                    plan_key: dto.plan_key,
                    features: dto.features,
                    display_features: dto.display_features,
                    is_paddle_enabled: dto.is_paddle_enabled || false,
                    paddle_product_id: paddleProductId,
                })
                .returning();

            this.logger.log(`Created plan: ${plan.id}`);
            return plan;
        } catch (error: any) {
            // Check for unique constraint violation (Postgres code 23505)
            // Drizzle wraps the error, so we need to check error.cause.code
            if (error?.code === '23505' || error?.cause?.code === '23505') {
                throw new ConflictException(`Plan with key '${dto.plan_key}' already exists`);
            }
            throw error;
        }
    }

    /**
     * Get all plans
     */
    async getAllPlans() {
        const plans = await this.db.select().from(schema.subscriptionPlans);
        return plans;
    }

    /**
     * Get a single plan by ID
     */
    async getPlanById(planId: string) {
        const [plan] = await this.db
            .select()
            .from(schema.subscriptionPlans)
            .where(eq(schema.subscriptionPlans.id, planId))
            .limit(1);

        if (!plan) {
            throw new NotFoundException(`Plan not found: ${planId}`);
        }

        return plan;
    }

    /**
     * Update a plan
     */
    async updatePlan(planId: string, dto: UpdatePlanDto) {
        this.logger.log(`Updating plan: ${planId}`);

        const plan = await this.getPlanById(planId);

        // If Paddle is enabled and product exists, update in Paddle
        if (plan.paddle_product_id && this.paddleService.isConfigured()) {
            try {
                await this.paddleService.updateProduct(plan.paddle_product_id, {
                    name: dto.name,
                    imageUrl: dto.paddle_image_url,
                });
                this.logger.log(`Updated Paddle product: ${plan.paddle_product_id}`);
            } catch (error) {
                this.logger.error('Failed to update Paddle product', error);
                // Continue with local update even if Paddle fails
            }
        }

        // Update plan in database
        const [updatedPlan] = await this.db
            .update(schema.subscriptionPlans)
            .set({
                name: dto.name,
                display_features: dto.display_features,
                features: dto.features,
                is_paddle_enabled: dto.is_paddle_enabled,
                updated_at: new Date(),
            })
            .where(eq(schema.subscriptionPlans.id, planId))
            .returning();

        this.logger.log(`Updated plan: ${planId}`);
        return updatedPlan;
    }

    /**
     * Delete a plan (archive in Paddle if applicable)
     */
    async deletePlan(planId: string) {
        this.logger.log(`Deleting plan: ${planId}`);

        const plan = await this.getPlanById(planId);

        // If Paddle product exists, archive it
        if (plan.paddle_product_id && this.paddleService.isConfigured()) {
            try {
                await this.paddleService.archiveProduct(plan.paddle_product_id);
                this.logger.log(`Archived Paddle product: ${plan.paddle_product_id}`);
            } catch (error) {
                this.logger.error('Failed to archive Paddle product', error);
                // Continue with local deletion even if Paddle fails
            }
        }

        // Delete plan from database
        await this.db
            .delete(schema.subscriptionPlans)
            .where(eq(schema.subscriptionPlans.id, planId));

        this.logger.log(`Deleted plan: ${planId}`);
        return { message: 'Plan deleted successfully' };
    }

    /**
     * Enable Paddle for an existing plan
     */
    async enablePaddle(planId: string, taxCategory: string = 'standard', imageUrl?: string) {
        this.logger.log(`Enabling Paddle for plan: ${planId}`);

        const plan = await this.getPlanById(planId);

        if (plan.paddle_product_id) {
            throw new BadRequestException('Paddle is already enabled for this plan');
        }

        if (!this.paddleService.isConfigured()) {
            throw new BadRequestException('Paddle is not configured');
        }

        // Create product in Paddle
        const paddleProduct = await this.paddleService.createProduct({
            name: plan.name || 'Unnamed Plan',
            taxCategory,
            imageUrl,
        });

        // Update plan with Paddle product ID
        const [updatedPlan] = await this.db
            .update(schema.subscriptionPlans)
            .set({
                is_paddle_enabled: true,
                paddle_product_id: paddleProduct.id,
                updated_at: new Date(),
            })
            .where(eq(schema.subscriptionPlans.id, planId))
            .returning();

        this.logger.log(`Enabled Paddle for plan: ${planId}`);
        return updatedPlan;
    }
}
