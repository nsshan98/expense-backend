import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlanManagementService } from '../services/plan-management.service';
import { CreatePlanDto, UpdatePlanDto } from '../dto/plan-management.dto';

@Controller('admin/plans')
@UseGuards(JwtAuthGuard)
export class PlanManagementController {
    constructor(private readonly planService: PlanManagementService) { }

    @Post()
    async createPlan(@Body() dto: CreatePlanDto) {
        return this.planService.createPlan(dto);
    }

    @Get()
    async getAllPlans() {
        return this.planService.getAllPlans();
    }

    @Get(':id')
    async getPlanById(@Param('id') id: string) {
        return this.planService.getPlanById(id);
    }

    @Patch(':id')
    async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
        return this.planService.updatePlan(id, dto);
    }

    @Delete(':id')
    async deletePlan(@Param('id') id: string) {
        return this.planService.deletePlan(id);
    }

    @Post(':id/enable-paddle')
    async enablePaddle(
        @Param('id') id: string,
        @Body() body: { taxCategory?: string; imageUrl?: string },
    ) {
        return this.planService.enablePaddle(id, body.taxCategory, body.imageUrl);
    }
}
