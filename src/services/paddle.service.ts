import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';

@Injectable()
export class PaddleService {
    private readonly logger = new Logger(PaddleService.name);
    private paddle: Paddle;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('PADDLE_API_KEY');
        const environment = this.configService.get<string>('PADDLE_ENVIRONMENT') || 'sandbox';

        if (!apiKey) {
            this.logger.warn('PADDLE_API_KEY not configured. Paddle integration disabled.');
            return;
        }

        this.paddle = new Paddle(apiKey, {
            environment: environment === 'production' ? Environment.production : Environment.sandbox,
        });

        this.logger.log(`Paddle SDK initialized in ${environment} mode`);
    }

    /**
     * Check if Paddle is configured and available
     */
    isConfigured(): boolean {
        return !!this.paddle;
    }

    // ==================== PRODUCTS ====================

    /**
     * Create a product in Paddle
     */
    async createProduct(data: {
        name: string;
        description?: string;
        taxCategory: string;
        imageUrl?: string;
    }) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const product = await this.paddle.products.create({
                name: data.name,
                description: data.description,
                taxCategory: data.taxCategory as any,
                imageUrl: data.imageUrl,
            });

            this.logger.log(`Created Paddle product: ${product.id}`);
            return product;
        } catch (error) {
            this.logger.error('Failed to create Paddle product', error);
            throw error;
        }
    }

    /**
     * Update a product in Paddle
     */
    async updateProduct(
        productId: string,
        data: {
            name?: string;
            description?: string;
            taxCategory?: string;
            imageUrl?: string;
        },
    ) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const product = await this.paddle.products.update(productId, data as any);
            this.logger.log(`Updated Paddle product: ${productId}`);
            return product;
        } catch (error) {
            this.logger.error(`Failed to update Paddle product ${productId}`, error);
            throw error;
        }
    }

    /**
     * Archive a product in Paddle
     */
    async archiveProduct(productId: string) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const product = await this.paddle.products.update(productId, {
                status: 'archived' as any,
            });
            this.logger.log(`Archived Paddle product: ${productId}`);
            return product;
        } catch (error) {
            this.logger.error(`Failed to archive Paddle product ${productId}`, error);
            throw error;
        }
    }

    // ==================== PRICES ====================

    /**
     * Create a price in Paddle
     */
    async createPrice(data: {
        productId: string;
        description: string;
        name?: string;
        unitPrice: {
            amount: string;
            currency_code: string;
        };
        unitPriceOverrides?: {
            countryCodes: string[];
            unitPrice: {
                amount: string;
                currency_code: string;
            };
        }[];
        quantity?: {
            minimum?: number;
            maximum?: number;
        };
        billingCycle?: {
            interval: 'day' | 'week' | 'month' | 'year';
            frequency: number;
        };
    }) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const price = await this.paddle.prices.create({
                productId: data.productId,
                description: data.description,
                name: data.name,
                unitPrice: data.unitPrice as any,
                unitPriceOverrides: data.unitPriceOverrides as any,
                quantity: data.quantity,
                billingCycle: data.billingCycle,
            } as any);

            this.logger.log(`Created Paddle price: ${price.id}`);
            return price;
        } catch (error) {
            this.logger.error('Failed to create Paddle price', error);
            throw error;
        }
    }

    /**
     * Update a price in Paddle
     */
    async updatePrice(
        priceId: string,
        data: {
            description?: string;
            unitPrice?: {
                amount: string;
                currency_code: string;
            };
            unitPriceOverrides?: any[];
        },
    ) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const price = await this.paddle.prices.update(priceId, {
                ...data,
                unitPriceOverrides: data.unitPriceOverrides,
            } as any);
            this.logger.log(`Updated Paddle price: ${priceId}`);
            return price;
        } catch (error) {
            this.logger.error(`Failed to update Paddle price ${priceId}`, error);
            throw error;
        }
    }

    /**
     * Archive a price in Paddle
     */
    async archivePrice(priceId: string) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const price = await this.paddle.prices.update(priceId, {
                status: 'archived' as any,
            });
            this.logger.log(`Archived Paddle price: ${priceId}`);
            return price;
        } catch (error) {
            this.logger.error(`Failed to archive Paddle price ${priceId}`, error);
            throw error;
        }
    }

    /**
     * Reactivate a price in Paddle
     */
    async reactivatePrice(priceId: string) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const price = await this.paddle.prices.update(priceId, {
                status: 'active' as any,
            });
            this.logger.log(`Reactivated Paddle price: ${priceId}`);
            return price;
        } catch (error) {
            this.logger.error(`Failed to reactivate Paddle price ${priceId}`, error);
            throw error;
        }
    }

    // ==================== DISCOUNTS ====================

    /**
     * Create a discount in Paddle
     */
    async createDiscount(data: {
        description: string;
        type: 'flat' | 'flat_per_seat' | 'percentage';
        amount: string;
        currencyCode?: string;
        code?: string;
        enabledForCheckout?: boolean;
        expiresAt?: string;
        maximumRecurringIntervals?: number;
        recur?: boolean;
        restrictTo?: string[];
        usageLimit?: number;
    }) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const discount = await this.paddle.discounts.create(data as any);
            this.logger.log(`Created Paddle discount: ${discount.id}`);
            return discount;
        } catch (error) {
            this.logger.error('Failed to create Paddle discount', error);
            throw error;
        }
    }

    /**
     * Update a discount in Paddle
     */
    async updateDiscount(
        discountId: string,
        data: {
            description?: string;
            enabledForCheckout?: boolean;
            expiresAt?: string;
            amount?: string;
            currencyCode?: string;
            type?: 'flat' | 'flat_per_seat' | 'percentage';
            usageLimit?: number;
            recur?: boolean;
            maximumRecurringIntervals?: number;
        },
    ) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const discount = await this.paddle.discounts.update(discountId, data as any);
            this.logger.log(`Updated Paddle discount: ${discountId}`);
            return discount;
        } catch (error) {
            this.logger.error(`Failed to update Paddle discount ${discountId}`, error);
            throw error;
        }
    }

    /**
     * Archive a discount in Paddle
     */
    async archiveDiscount(discountId: string) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const discount = await this.paddle.discounts.update(discountId, {
                status: 'archived' as any,
            });
            this.logger.log(`Archived Paddle discount: ${discountId}`);
            return discount;
        } catch (error) {
            this.logger.error(`Failed to archive Paddle discount ${discountId}`, error);
            throw error;
        }
    }

    /**
     * Reactivate a discount in Paddle
     */
    async reactivateDiscount(discountId: string) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const discount = await this.paddle.discounts.update(discountId, {
                status: 'active' as any,
            });
            this.logger.log(`Reactivated Paddle discount: ${discountId}`);
            return discount;
        } catch (error) {
            this.logger.error(`Failed to reactivate Paddle discount ${discountId}`, error);
            throw error;
        }
    }

    // ==================== TRANSACTIONS ====================

    /**
     * Create a transaction (checkout) in Paddle
     */
    async createTransaction(data: {
        items: Array<{
            priceId: string;
            quantity: number;
        }>;
        customerId?: string;
        addressId?: string;
        discountId?: string;
        customData?: any;
    }) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const transaction = await this.paddle.transactions.create(data as any);
            this.logger.log(`Created Paddle transaction: ${transaction.id}`);
            return transaction;
        } catch (error) {
            this.logger.error('Failed to create Paddle transaction', error);
            throw error;
        }
    }

    /**
     * Get a transaction from Paddle
     */
    async getTransaction(transactionId: string) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const transaction = await this.paddle.transactions.get(transactionId);
            return transaction;
        } catch (error) {
            this.logger.error(`Failed to get Paddle transaction ${transactionId}`, error);
            throw error;
        }
    }

    // ==================== SUBSCRIPTIONS ====================

    /**
     * Get a subscription from Paddle
     */
    async getSubscription(subscriptionId: string) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const subscription = await this.paddle.subscriptions.get(subscriptionId);
            return subscription;
        } catch (error) {
            this.logger.error(`Failed to get Paddle subscription ${subscriptionId}`, error);
            throw error;
        }
    }

    /**
     * Cancel a subscription in Paddle
     */
    async cancelSubscription(subscriptionId: string, effectiveFrom: 'next_billing_period' | 'immediately' = 'next_billing_period') {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const subscription = await this.paddle.subscriptions.cancel(subscriptionId, {
                effectiveFrom,
            } as any);
            this.logger.log(`Canceled Paddle subscription: ${subscriptionId}`);
            return subscription;
        } catch (error) {
            this.logger.error(`Failed to cancel Paddle subscription ${subscriptionId}`, error);
            throw error;
        }
    }

    /**
     * Pause a subscription in Paddle
     */
    async pauseSubscription(subscriptionId: string, effectiveFrom: 'next_billing_period' | 'immediately' = 'next_billing_period') {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const subscription = await this.paddle.subscriptions.pause(subscriptionId, {
                effectiveFrom,
            } as any);
            this.logger.log(`Paused Paddle subscription: ${subscriptionId}`);
            return subscription;
        } catch (error) {
            this.logger.error(`Failed to pause Paddle subscription ${subscriptionId}`, error);
            throw error;
        }
    }

    /**
     * Resume a subscription in Paddle
     */
    async resumeSubscription(subscriptionId: string, effectiveFrom: 'next_billing_period' | 'immediately' = 'immediately') {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const subscription = await this.paddle.subscriptions.resume(subscriptionId, {
                effectiveFrom,
            } as any);
            this.logger.log(`Resumed Paddle subscription: ${subscriptionId}`);
            return subscription;
        } catch (error) {
            this.logger.error(`Failed to resume Paddle subscription ${subscriptionId}`, error);
            throw error;
        }
    }

    // ==================== CUSTOMERS ====================

    /**
     * Create a customer in Paddle
     */
    async createCustomer(data: {
        email: string;
        name?: string;
    }) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const customer = await this.paddle.customers.create(data as any);
            this.logger.log(`Created Paddle customer: ${customer.id}`);
            return customer;
        } catch (error) {
            this.logger.error('Failed to create Paddle customer', error);
            throw error;
        }
    }

    /**
     * Get a customer from Paddle
     */
    async getCustomer(customerId: string) {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const customer = await this.paddle.customers.get(customerId);
            return customer;
        } catch (error) {
            this.logger.error(`Failed to get Paddle customer ${customerId}`, error);
            throw error;
        }
    }

    // ==================== INVOICES ====================

    /**
     * Get transaction invoice URL from Paddle
     * Returns a temporary URL that expires in 1 hour
     */
    async getTransactionInvoice(
        transactionId: string,
        disposition: 'attachment' | 'inline' = 'attachment'
    ): Promise<{ url: string }> {
        if (!this.isConfigured()) {
            throw new Error('Paddle is not configured');
        }

        try {
            const invoice = await this.paddle.transactions.getInvoicePDF(transactionId, {
                disposition,
            } as any);

            this.logger.log(`Retrieved invoice URL for transaction: ${transactionId}`);
            return { url: invoice.url };
        } catch (error) {
            this.logger.error(`Failed to get invoice for transaction ${transactionId}`, error);
            throw error;
        }
    }
}
