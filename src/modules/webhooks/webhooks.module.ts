import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaddleWebhookController } from './paddle-webhook.controller';
import { PaddleWebhookService } from './paddle-webhook.service';
import { DbModule } from '../../db/db.module';

@Module({
    imports: [ConfigModule, DbModule],
    controllers: [PaddleWebhookController],
    providers: [PaddleWebhookService],
    exports: [PaddleWebhookService],
})
export class WebhooksModule { }
