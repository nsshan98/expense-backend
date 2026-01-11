import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { PaddleService } from '../../../services/paddle.service';
import { CreateCouponDto, UpdateCouponDto } from '../dto/coupon-management.dto';

@Injectable()
export class CouponManagementService {
    private readonly logger = new Logger(CouponManagementService.name);

    constructor(
        @Inject('DB') private db: NodePgDatabase<typeof schema>,
        private paddleService: PaddleService,
    ) { }

    /**
     * Create a new coupon
     */
    async createCoupon(dto: CreateCouponDto) {
        this.logger.log(`Creating coupon: ${dto.code}`);

        // Check if coupon code already exists
        const [existing] = await this.db
            .select()
            .from(schema.coupons)
            .where(eq(schema.coupons.code, dto.code))
            .limit(1);

        if (existing) {
            throw new BadRequestException(`Coupon code already exists: ${dto.code}`);
        }

        let paddleDiscountId: string | null = null;

        // If provider is Paddle, create discount in Paddle
        if (dto.provider === 'paddle') {
            if (!this.paddleService.isConfigured()) {
                throw new BadRequestException('Paddle is not configured');
            }

            // Validate currency for flat discounts
            if ((dto.discount_type === 'flat' || dto.discount_type === 'flat_per_seat') && !dto.currency) {
                throw new BadRequestException('Currency is required for flat discounts');
            }

            try {
                const paddleDiscount = await this.paddleService.createDiscount({
                    description: dto.description || `Discount: ${dto.code}`,
                    type: dto.discount_type,
                    amount: dto.discount_amount.toString(),
                    currencyCode: dto.currency?.toUpperCase(),
                    code: dto.code,
                    enabledForCheckout: dto.enabled_for_checkout,
                    expiresAt: dto.expires_at,
                    recur: dto.recur,
                    maximumRecurringIntervals: dto.maximum_recurring_intervals,
                    restrictTo: dto.restrict_to,
                    usageLimit: dto.max_uses,
                });

                paddleDiscountId = paddleDiscount.id;
                this.logger.log(`Created Paddle discount: ${paddleDiscountId}`);
            } catch (error) {
                this.logger.error('Failed to create Paddle discount', error);
                throw new BadRequestException('Failed to create Paddle discount');
            }
        }

        // Create coupon in database
        const [coupon] = await this.db
            .insert(schema.coupons)
            .values({
                code: dto.code,
                provider: dto.provider,
                discount_type: dto.discount_type,
                discount_amount: dto.discount_amount.toString(),
                currency: dto.currency?.toUpperCase() || null,
                paddle_discount_id: paddleDiscountId,
                max_uses: dto.max_uses || null,
                expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
                is_active: true,
            })
            .returning();

        this.logger.log(`Created coupon: ${coupon.id}`);
        return coupon;
    }

    /**
     * Get all coupons
     */
    async getAllCoupons() {
        const coupons = await this.db.select().from(schema.coupons);
        return coupons;
    }

    /**
     * Get active coupons only
     */
    async getActiveCoupons() {
        const coupons = await this.db
            .select()
            .from(schema.coupons)
            .where(eq(schema.coupons.is_active, true));

        return coupons;
    }

    /**
     * Get a single coupon by ID
     */
    async getCouponById(couponId: number) {
        const [coupon] = await this.db
            .select()
            .from(schema.coupons)
            .where(eq(schema.coupons.id, couponId))
            .limit(1);

        if (!coupon) {
            throw new NotFoundException(`Coupon not found: ${couponId}`);
        }

        return coupon;
    }

    /**
     * Get a coupon by code
     */
    async getCouponByCode(code: string) {
        const [coupon] = await this.db
            .select()
            .from(schema.coupons)
            .where(eq(schema.coupons.code, code))
            .limit(1);

        if (!coupon) {
            throw new NotFoundException(`Coupon not found: ${code}`);
        }

        return coupon;
    }

    /**
     * Update a coupon
     */
    async updateCoupon(couponId: number, dto: UpdateCouponDto) {
        this.logger.log(`Updating coupon: ${couponId}`);

        const coupon = await this.getCouponById(couponId);

        // If Paddle discount exists, update in Paddle
        if (coupon.paddle_discount_id && this.paddleService.isConfigured()) {
            try {
                await this.paddleService.updateDiscount(coupon.paddle_discount_id, {
                    description: dto.description,
                    enabledForCheckout: dto.enabled_for_checkout,
                    expiresAt: dto.expires_at,
                });
                this.logger.log(`Updated Paddle discount: ${coupon.paddle_discount_id}`);
            } catch (error) {
                this.logger.error('Failed to update Paddle discount', error);
                // Continue with local update even if Paddle fails
            }
        }

        // Update coupon in database
        const updateData: any = {};
        if (dto.description !== undefined) updateData.description = dto.description;
        if (dto.is_active !== undefined) updateData.is_active = dto.is_active;
        if (dto.expires_at !== undefined) updateData.expires_at = new Date(dto.expires_at);

        const [updatedCoupon] = await this.db
            .update(schema.coupons)
            .set(updateData)
            .where(eq(schema.coupons.id, couponId))
            .returning();

        this.logger.log(`Updated coupon: ${couponId}`);
        return updatedCoupon;
    }

    /**
     * Delete a coupon (archive in Paddle if applicable)
     */
    async deleteCoupon(couponId: number) {
        this.logger.log(`Deleting coupon: ${couponId}`);

        const coupon = await this.getCouponById(couponId);

        // If Paddle discount exists, archive it
        if (coupon.paddle_discount_id && this.paddleService.isConfigured()) {
            try {
                await this.paddleService.archiveDiscount(coupon.paddle_discount_id);
                this.logger.log(`Archived Paddle discount: ${coupon.paddle_discount_id}`);
            } catch (error) {
                this.logger.error('Failed to archive Paddle discount', error);
                // Continue with local deletion even if Paddle fails
            }
        }

        // Delete coupon from database
        await this.db
            .delete(schema.coupons)
            .where(eq(schema.coupons.id, couponId));

        this.logger.log(`Deleted coupon: ${couponId}`);
        return { message: 'Coupon deleted successfully' };
    }

    /**
     * Deactivate a coupon (soft delete)
     */
    async deactivateCoupon(couponId: number) {
        this.logger.log(`Deactivating coupon: ${couponId}`);

        const [updatedCoupon] = await this.db
            .update(schema.coupons)
            .set({ is_active: false })
            .where(eq(schema.coupons.id, couponId))
            .returning();

        this.logger.log(`Deactivated coupon: ${couponId}`);
        return updatedCoupon;
    }

    /**
     * Validate a coupon for use
     */
    async validateCoupon(code: string) {
        const coupon = await this.getCouponByCode(code);

        // Check if active
        if (!coupon.is_active) {
            throw new BadRequestException('Coupon is not active');
        }

        // Check if expired
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            throw new BadRequestException('Coupon has expired');
        }

        // Check usage limit
        if (coupon.max_uses && coupon.times_used >= coupon.max_uses) {
            throw new BadRequestException('Coupon usage limit reached');
        }

        return coupon;
    }
}
