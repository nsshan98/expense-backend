import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { DbModule } from '../../db/db.module';
import { FeatureAccessModule } from '../feature_access/feature_access.module';

@Module({
    imports: [NotificationsModule, DbModule, FeatureAccessModule],
    controllers: [SubscriptionsController],
    providers: [SubscriptionsService],
})
export class SubscriptionsModule { }
