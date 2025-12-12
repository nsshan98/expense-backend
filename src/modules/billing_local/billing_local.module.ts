import { Module } from '@nestjs/common';
import { BillingLocalService } from './billing_local.service';
import { BillingLocalController } from './billing_local.controller';
import { DbModule } from '../../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [BillingLocalController],
  providers: [BillingLocalService],
  exports: [BillingLocalService],
})
export class BillingLocalModule {}
