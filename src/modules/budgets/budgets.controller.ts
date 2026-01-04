import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
  ParseArrayPipe,
} from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureGuard } from '../feature_access/guards/feature.guard';
import { RequireFeature } from '../feature_access/decorators/require-feature.decorator';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { SetSavingsGoalDto } from './dto/savings-goal.dto';
import { AddIncomeDto } from './dto/income.dto';
import { CreateMonthlyPlanDto } from './dto/create-monthly-plan.dto';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) { }

  @Roles(Role.User, Role.SuperAdmin)
  @Post('create')
  // @UseGuards(FeatureGuard)
  // @RequireFeature('budgets')
  create(
    @Request() req,
    @Body(new ParseArrayPipe({ items: CreateBudgetDto })) body: CreateBudgetDto[],
  ) {
    return this.budgetsService.bulkCreate(req.user.id, body);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Post('plan')
  createPlan(@Request() req, @Body() body: CreateMonthlyPlanDto) {
    return this.budgetsService.createMonthlyPlan(req.user.id, body);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Get('all')
  findAll(@Request() req, @Query('month') month?: string) {
    return this.budgetsService.findAll(req.user.id, month);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Post('goals')
  setSavingsGoal(@Request() req, @Body() body: SetSavingsGoalDto) {
    return this.budgetsService.setSavingsGoal(req.user.id, body);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Get('goals')
  getSavingsGoal(@Request() req, @Query('month') month: string) {
    if (!month) throw new Error('Month is required');
    return this.budgetsService.getSavingsGoal(req.user.id, month);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Delete('goals/:id')
  removeSavingsGoal(@Request() req, @Param('id') id: string) {
    return this.budgetsService.removeSavingsGoal(req.user.id, id);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Post('incomes')
  addIncome(@Request() req, @Body() body: AddIncomeDto) {
    return this.budgetsService.addIncome(req.user.id, body);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Get('incomes')
  getIncomes(@Request() req, @Query('month') month: string) {
    if (!month) throw new Error('Month is required');
    return this.budgetsService.getIncomes(req.user.id, month);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Delete('incomes/:id')
  removeIncome(@Request() req, @Param('id') id: string) {
    return this.budgetsService.removeIncome(req.user.id, id);
  }

  // Generic Operations (must come last to avoid shadowing)

  @Roles(Role.User, Role.SuperAdmin)
  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.budgetsService.findOne(id, req.user.id);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() body: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(id, req.user.id, body);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.budgetsService.remove(id, req.user.id);
  }
}
