import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
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
        this.logger.log(`Received Paddle webhook: ${payload.event_type} - ID: ${payload.event_id}`);

        // Verify webhook signature
        const isValid = await this.webhookService.verifySignature(payload, signature);
        if (!isValid) {
            this.logger.error('Invalid webhook signature');
            // Return 401 so Paddle knows the signature failed
            throw new UnauthorizedException('Invalid webhook signature');
        }

        try {
            // Process the webhook event
            await this.webhookService.processEvent(payload);
            return { received: true };
        } catch (error) {
            this.logger.error(`Failed to process webhook event ${payload.event_type}`, error.stack);
            // Return 500 so Paddle retries later
            throw new InternalServerErrorException(error.message);
        }
    }
}
