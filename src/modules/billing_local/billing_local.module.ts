import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BillingLocalService } from './billing_local.service';
import { BillingLocalController } from './billing_local.controller';
import { CouponManagementService } from './services/coupon-management.service';
import { CouponManagementController } from './controllers/coupon-management.controller';
import { SubscriptionCronService } from './services/subscription-cron.service';
import { EmailNotificationService } from './services/email-notification.service';
import { InvoiceGenerationService } from './services/invoice-generation.service';
import { DbModule } from '../../db/db.module';
import { PaddleModule } from '../../services/paddle.module';
import { PlansModule } from '../plans/plans.module';
import { NotificationsModule } from '../notifications/notifications.module';


@Module({
  imports: [DbModule, PaddleModule, PlansModule, ScheduleModule.forRoot(), NotificationsModule],
  controllers: [BillingLocalController, CouponManagementController],
  providers: [BillingLocalService, CouponManagementService, SubscriptionCronService, EmailNotificationService, InvoiceGenerationService],
  exports: [BillingLocalService, CouponManagementService],
})
export class BillingLocalModule { }
