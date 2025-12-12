import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureGuard } from '../feature_access/guards/feature.guard';
import { RequireFeature } from '../feature_access/decorators/require-feature.decorator';

@Controller('predictions')
@UseGuards(JwtAuthGuard)
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get()
  @UseGuards(FeatureGuard)
  @RequireFeature('premium')
  findAll(@Request() req) {
    return this.predictionsService.findAll(req.user.id);
  }

  @Post('refresh')
  @UseGuards(FeatureGuard)
  @RequireFeature('premium')
  refresh(@Request() req) {
    return this.predictionsService.refreshPredictions(req.user.id);
  }
}
