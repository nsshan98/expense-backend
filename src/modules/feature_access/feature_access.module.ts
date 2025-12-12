import { Module } from '@nestjs/common';
import { FeatureAccessService } from './feature_access.service';
import { UsersModule } from '../users/users.module';
import { PlansModule } from '../plans/plans.module';

import { DbModule } from '../../db/db.module';

@Module({
  providers: [FeatureAccessService],
  imports: [UsersModule, PlansModule, DbModule],
  exports: [FeatureAccessService],
})
export class FeatureAccessModule {}
