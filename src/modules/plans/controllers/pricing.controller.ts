import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PricingService } from '../services/pricing.service';

@Controller('pricing')
export class PricingController {
    constructor(private readonly pricingService: PricingService) { }

    @Get()
    async getPublicPricing() {
        return this.pricingService.getPublicPricing();
    }

    @Get(':planId')
    async getPlanPricing(@Param('planId') planId: string) {
        const pricing = await this.pricingService.getPlanPricing(planId);

        if (!pricing) {
            throw new NotFoundException(`Plan not found: ${planId}`);
        }

        return pricing;
    }
}
