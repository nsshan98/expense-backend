import { Module } from '@nestjs/common';
import { BillingLocalService } from './billing_local.service';
import { BillingLocalController } from './billing_local.controller';
import { CouponManagementService } from './services/coupon-management.service';
import { CouponManagementController } from './controllers/coupon-management.controller';
import { DbModule } from '../../db/db.module';
import { PaddleModule } from '../../services/paddle.module';

@Module({
  imports: [DbModule, PaddleModule],
  controllers: [BillingLocalController, CouponManagementController],
  providers: [BillingLocalService, CouponManagementService],
  exports: [BillingLocalService, CouponManagementService],
})
export class BillingLocalModule { }
