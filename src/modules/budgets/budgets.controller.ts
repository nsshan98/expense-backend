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
  @Get('all')
  findAll(@Request() req, @Query('month') month?: string) {
    return this.budgetsService.findAll(req.user.id, month);
  }

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
