import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CouponManagementService } from '../services/coupon-management.service';
import { CreateCouponDto, UpdateCouponDto } from '../dto/coupon-management.dto';

@Controller('admin/coupons')
@UseGuards(JwtAuthGuard)
export class CouponManagementController {
    constructor(private readonly couponService: CouponManagementService) { }

    @Post()
    async createCoupon(@Body() dto: CreateCouponDto) {
        return this.couponService.createCoupon(dto);
    }

    @Get()
    async getAllCoupons(@Query('active') active?: string) {
        const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
        return this.couponService.getAllCoupons(isActive);
    }

    @Get(':id')
    async getCouponById(@Param('id', ParseUUIDPipe) id: string) {
        return this.couponService.getCouponById(id);
    }

    @Get('code/:code')
    async getCouponByCode(@Param('code') code: string) {
        return this.couponService.getCouponByCode(code);
    }

    @Patch(':id')
    async updateCoupon(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCouponDto,
    ) {
        return this.couponService.updateCoupon(id, dto);
    }

    @Delete(':id')
    async deleteCoupon(@Param('id', ParseUUIDPipe) id: string) {
        return this.couponService.deleteCoupon(id);
    }

    @Post(':id/deactivate')
    async deactivateCoupon(@Param('id', ParseUUIDPipe) id: string) {
        return this.couponService.deactivateCoupon(id);
    }

    @Post(':id/reactivate')
    async reactivateCoupon(@Param('id', ParseUUIDPipe) id: string) {
        return this.couponService.reactivateCoupon(id);
    }

    @Post('validate')
    async validateCoupon(@Body() body: { code: string }) {
        return this.couponService.validateCoupon(body.code);
    }
}
