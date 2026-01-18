import { Controller, Get, Param, NotFoundException, Query } from '@nestjs/common';
import { PricingService } from '../services/pricing.service';

@Controller('pricing')
export class PricingController {
    constructor(private readonly pricingService: PricingService) { }

    @Get()
    async getPublicPricing(
        @Query('interval') interval?: string,
        @Query('countryCode') countryCode?: string,
    ) {
        return this.pricingService.getPublicPricing(interval, countryCode);
    }

    // New endpoint: Get ALL pricing (Manual + Paddle)
    @Get('all')
    async getAllPricing(
        @Query('interval') interval?: string,
        @Query('countryCode') countryCode?: string,
    ) {
        return this.pricingService.getAllPricing(interval, countryCode);
    }

    // New endpoint: Get ALL pricing for specific plan (Manual + Paddle)
    @Get('all/:planId')
    async getAllPlanPricing(
        @Param('planId') planId: string,
        @Query('interval') interval?: string,
        @Query('countryCode') countryCode?: string,
    ) {
        const pricing = await this.pricingService.getAllPlanPricing(planId, interval, countryCode);

        if (!pricing) {
            throw new NotFoundException(`Plan not found: ${planId}`);
        }

        return pricing;
    }

    // Existing endpoint: Get Paddle-only pricing
    @Get(':planId')
    async getPlanPricing(
        @Param('planId') planId: string,
        @Query('interval') interval?: string,
        @Query('countryCode') countryCode?: string,
    ) {
        const pricing = await this.pricingService.getPlanPricing(planId, interval, countryCode);

        if (!pricing) {
            throw new NotFoundException(`Plan not found: ${planId}`);
        }

        return pricing;
    }
}
