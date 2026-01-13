import { Controller, Get, Param, Post, Patch, Body, UseGuards, Delete } from '@nestjs/common';
import { PlanManagementService } from './services/plan-management.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlanManagementService) { }

  @Get('all-plans')
  findAll() {
    return this.plansService.getActivePlans();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plansService.getPlanById(id);
  }
}
