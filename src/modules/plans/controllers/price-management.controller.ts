import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PriceManagementService } from '../services/price-management.service';
import { CreatePriceDto, UpdatePriceDto } from '../dto/price-management.dto';

@Controller('admin/prices')
@UseGuards(JwtAuthGuard)
export class PriceManagementController {
    constructor(private readonly priceService: PriceManagementService) { }

    @Post()
    async createPrice(@Body() dto: CreatePriceDto) {
        return this.priceService.createPrice(dto);
    }

    @Get()
    async getAllPrices(@Query('planId') planId?: string) {
        if (planId) {
            return this.priceService.getPricesByPlan(planId);
        }
        return this.priceService.getAllPrices();
    }

    @Get(':id')
    async getPriceById(@Param('id', ParseIntPipe) id: number) {
        return this.priceService.getPriceById(id);
    }

    @Put(':id')
    async updatePrice(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdatePriceDto,
    ) {
        return this.priceService.updatePrice(id, dto);
    }

    @Delete(':id')
    async deletePrice(@Param('id', ParseIntPipe) id: number) {
        return this.priceService.deletePrice(id);
    }
}
