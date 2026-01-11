import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { PaddleWebhookService } from './paddle-webhook.service';

@Controller('webhooks/paddle')
export class PaddleWebhookController {
    private readonly logger = new Logger(PaddleWebhookController.name);

    constructor(private readonly webhookService: PaddleWebhookService) { }

    @Post()
    @HttpCode(HttpStatus.OK)
    async handleWebhook(
        @Body() payload: any,
        @Headers('paddle-signature') signature: string,
    ) {
        this.logger.log(`Received Paddle webhook: ${payload.event_type}`);

        try {
            // Verify webhook signature
            const isValid = await this.webhookService.verifySignature(payload, signature);
            if (!isValid) {
                this.logger.error('Invalid webhook signature');
                return { error: 'Invalid signature' };
            }

            // Process the webhook event
            await this.webhookService.processEvent(payload);

            return { received: true };
        } catch (error) {
            this.logger.error('Failed to process webhook', error);
            throw error;
        }
    }
}
