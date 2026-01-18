import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../../notifications/notifications.service';

export interface EmailNotificationData {
    to: string;
    subject: string;
    template: 'payment-submitted' | 'payment-approved' | 'payment-rejected' | 'subscription-expiring';
    data: {
        userName?: string;
        planName?: string;
        amount?: number;
        transactionId?: string;
        reason?: string;
        expiryDate?: Date;
        daysRemaining?: number;
    };
}

@Injectable()
export class EmailNotificationService {
    private readonly logger = new Logger(EmailNotificationService.name);

    constructor(private readonly notificationsService: NotificationsService) { }

    /**
     * Send email notification
     */
    async sendEmail(notification: EmailNotificationData): Promise<void> {
        this.logger.log(`Sending email to ${notification.to}: ${notification.subject}`);

        const html = this.generateHtml(notification.template, notification.data);

        await this.notificationsService.sendEmail(
            notification.to,
            notification.subject,
            html
        );
    }

    private generateHtml(template: string, data: any): string {
        switch (template) {
            case 'payment-submitted':
                return `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                        <h2 style="color: #009688;">Payment Submitted</h2>
                        <p>Hi ${data.userName},</p>
                        <p>We've received your payment submission for the <strong>${data.planName}</strong> plan.</p>
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 15px 0;">
                            <p style="margin: 5px 0;"><strong>Amount:</strong> ${data.amount}</p>
                            <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${data.transactionId}</p>
                        </div>
                        <p>Our team will review your submission shortly. You'll receive another email once it's approved.</p>
                    </div>
                `;
            case 'payment-approved':
                return `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                        <h2 style="color: #4CAF50;">Payment Approved! 🎉</h2>
                        <p>Hi ${data.userName},</p>
                        <p>Great news! Your payment for <strong>${data.planName}</strong> has been approved.</p>
                        <p>Your subscription is now active.</p>
                        <div style="background: #e8f5e9; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #c8e6c9;">
                            <p style="margin: 5px 0;"><strong>Expires On:</strong> ${new Date(data.expiryDate).toLocaleDateString()}</p>
                        </div>
                        <p>Enjoy your premium features!</p>
                    </div>
                `;
            case 'payment-rejected':
                return `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                        <h2 style="color: #F44336;">Payment Rejected</h2>
                        <p>Hi ${data.userName},</p>
                        <p>Unfortunately, your payment submission for <strong>${data.planName}</strong> could not be verified.</p>
                        <div style="background: #ffebee; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #ffcdd2;">
                            <p style="margin: 5px 0;"><strong>Reason:</strong> ${data.reason || 'Invalid transaction details'}</p>
                        </div>
                        <p>Please check your transaction details and try submitting again.</p>
                    </div>
                `;
            case 'subscription-expiring':
                return `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                        <h2 style="color: #FF9800;">Subscription Expiring Soon</h2>
                        <p>Hi ${data.userName},</p>
                        <p>Your <strong>${data.planName}</strong> subscription is expiring in <strong>${data.daysRemaining} days</strong>.</p>
                        <div style="background: #fff3e0; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #ffe0b2;">
                            <p style="margin: 5px 0;"><strong>Expiry Date:</strong> ${new Date(data.expiryDate).toLocaleDateString()}</p>
                        </div>
                        <p>To avoid losing access to premium features, please renew your subscription via the dashboard.</p>
                    </div>
                `;
            default:
                return `<p>Notification for ${data.userName}</p>`;
        }
    }

    /**
     * Send payment submission notification to user
     */
    async notifyPaymentSubmitted(userEmail: string, userName: string, planName: string, amount: number, transactionId: string): Promise<void> {
        await this.sendEmail({
            to: userEmail,
            subject: 'Payment Submission Received',
            template: 'payment-submitted',
            data: {
                userName,
                planName,
                amount,
                transactionId,
            },
        });
    }

    /**
     * Send payment approval notification to user
     */
    async notifyPaymentApproved(userEmail: string, userName: string, planName: string, expiryDate: Date): Promise<void> {
        await this.sendEmail({
            to: userEmail,
            subject: 'Payment Approved - Subscription Activated',
            template: 'payment-approved',
            data: {
                userName,
                planName,
                expiryDate,
            },
        });
    }

    /**
     * Send payment rejection notification to user
     */
    async notifyPaymentRejected(userEmail: string, userName: string, planName: string, reason?: string): Promise<void> {
        await this.sendEmail({
            to: userEmail,
            subject: 'Payment Submission Rejected',
            template: 'payment-rejected',
            data: {
                userName,
                planName,
                reason,
            },
        });
    }

    /**
     * Send subscription expiring notification to user
     */
    async notifySubscriptionExpiring(userEmail: string, userName: string, planName: string, expiryDate: Date, daysRemaining: number): Promise<void> {
        await this.sendEmail({
            to: userEmail,
            subject: `Your ${planName} Subscription is Expiring Soon`,
            template: 'subscription-expiring',
            data: {
                userName,
                planName,
                expiryDate,
                daysRemaining,
            },
        });
    }
}
