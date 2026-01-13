import { Module } from '@nestjs/common';

import { PlansController } from './plans.controller';
import { PlanManagementService } from './services/plan-management.service';
import { PriceManagementService } from './services/price-management.service';
import { PricingService } from './services/pricing.service';
import { PlanManagementController } from './controllers/plan-management.controller';
import { PriceManagementController } from './controllers/price-management.controller';
import { PricingController } from './controllers/pricing.controller';
import { DbModule } from '../../db/db.module';
import { PaddleModule } from '../../services/paddle.module';

@Module({
  imports: [DbModule, PaddleModule],
  controllers: [
    PlansController,
    PlanManagementController,
    PriceManagementController,
    PricingController,
  ],
  providers: [
    PlanManagementService,
    PriceManagementService,
    PricingService,
  ],
  exports: [
    PlanManagementService,
    PriceManagementService,
    PricingService,
  ],
})
export class PlansModule { }
