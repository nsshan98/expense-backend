import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@Controller('insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) { }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.User)
  // @RequireFeature('insights') // Assuming 'insights' is a feature flag, or part of 'premium'
  getInsights(@Request() req) {
    return this.insightsService.getInsights(req.user.id);
  }
  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.User)
  getDashboardOverview(@Request() req) {
    return this.insightsService.getDashboardOverview(req.user.id);
  }
}
