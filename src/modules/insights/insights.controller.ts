import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureGuard } from '../feature_access/guards/feature.guard';
import { RequireFeature } from '../feature_access/decorators/require-feature.decorator';

@Controller('insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get()
  @UseGuards(FeatureGuard)
  @RequireFeature('insights') // Assuming 'insights' is a feature flag, or part of 'premium'
  getInsights(@Request() req) {
    return this.insightsService.getInsights(req.user.id);
  }
}
