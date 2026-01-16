import { Injectable, Logger, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { PaddleService } from '../../services/paddle.service';
import { CreateCheckoutDto } from './dto/checkout.dto';

@Injectable()
export class CheckoutService {
    private readonly logger = new Logger(CheckoutService.name);

    constructor(
        @Inject('DB') private db: NodePgDatabase<typeof schema>,
        private paddleService: PaddleService,
    ) { }

    /**
     * Create a checkout session (transaction) for a user
     */
    async createCheckout(userId: string, dto: CreateCheckoutDto) {
        this.logger.log(`Creating checkout for user ${userId} with price ${dto.priceId}`);

        if (!this.paddleService.isConfigured()) {
            throw new BadRequestException('Paddle is not configured');
        }

        // 1. Get user
        const [user] = await this.db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, userId))
            .limit(1);

        if (!user) {
            throw new NotFoundException(`User not found: ${userId}`);
        }

        if (!user.email) {
            throw new BadRequestException('User email is required for checkout');
        }

        let paddleCustomerId = user.paddle_customer_id;

        // 2. Create Paddle customer if not exists
        if (!paddleCustomerId) {
            this.logger.log(`User ${userId} has no paddle_customer_id. Creating new Paddle customer.`);
            try {
                const newCustomer = await this.paddleService.createCustomer({
                    email: user.email,
                    name: user.name || undefined,
                });

                paddleCustomerId = newCustomer.id;

                // Update user in DB
                await this.db
                    .update(schema.users)
                    .set({
                        paddle_customer_id: paddleCustomerId,
                    })
                    .where(eq(schema.users.id, userId));

                this.logger.log(`Updated user ${userId} with paddle_customer_id: ${paddleCustomerId}`);
            } catch (error) {
                this.logger.error('Failed to create/sync customer with Paddle', error);
                throw new BadRequestException('Failed to initialize customer for checkout');
            }
        }

        // 3. Create Transaction
        try {
            const transaction = await this.paddleService.createTransaction({
                items: [
                    {
                        priceId: dto.priceId,
                        quantity: 1,
                    },
                ],
                customerId: paddleCustomerId,
                customData: {
                    user_id: user.id, // Critical for webhook association
                },
            });

            this.logger.log(`Created transaction ${transaction.id} for user ${userId}`);

            return {
                transactionId: transaction.id,
                // The frontend handles the redirect or overlay using this ID
                // but if we were doing a redirect flow, we might return checkout.url if available
                // simpler to just return the full transaction object or specific fields
                checkoutUrl: (transaction.checkout as any)?.url || null, // Safety check
                status: transaction.status,
            };
        } catch (error) {
            this.logger.error('Failed to create Paddle transaction', error);
            throw new BadRequestException('Failed to create checkout session');
        }
    }
}
