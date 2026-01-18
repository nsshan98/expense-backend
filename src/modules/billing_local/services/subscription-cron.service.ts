import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BillingLocalService } from '../billing_local.service';

@Injectable()
export class SubscriptionCronService {
    private readonly logger = new Logger(SubscriptionCronService.name);

    constructor(private readonly billingService: BillingLocalService) { }

    /**
     * Check for expired subscriptions daily at midnight
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleSubscriptionExpiries() {
        this.logger.log('Running subscription expiry check...');

        try {
            const result = await this.billingService.checkExpiries();
            this.logger.log(`Expiry check completed. Expired subscriptions: ${result.expiredCount}`);
        } catch (error) {
            this.logger.error('Error during expiry check:', error);
        }
    }

    /**
     * Alternative: Check every hour (can be enabled if needed)
     */
    // @Cron(CronExpression.EVERY_HOUR)
    // async handleHourlyExpiryCheck() {
    //   this.logger.log('Running hourly subscription expiry check...');
    //   
    //   try {
    //     const result = await this.billingService.checkExpiries();
    //     this.logger.log(`Hourly expiry check completed. Expired subscriptions: ${result.expiredCount}`);
    //   } catch (error) {
    //     this.logger.error('Error during hourly expiry check:', error);
    //   }
    // }
}
