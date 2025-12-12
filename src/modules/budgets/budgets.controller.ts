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
} from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureGuard } from '../feature_access/guards/feature.guard';
import { RequireFeature } from '../feature_access/decorators/require-feature.decorator';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @UseGuards(FeatureGuard)
  @RequireFeature('budgets')
  create(@Request() req, @Body() body: CreateBudgetDto) {
    return this.budgetsService.create(req.user.id, body);
  }

  @Get()
  findAll(@Request() req) {
    return this.budgetsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.budgetsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.budgetsService.update(id, req.user.id, body);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.budgetsService.remove(id, req.user.id);
  }
}
