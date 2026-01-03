import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(NotificationsService.name);

    constructor(private configService: ConfigService) {
        this.createTransporter();
    }

    private createTransporter() {
        const host = this.configService.get<string>('EMAIL_HOST');
        const user = this.configService.get<string>('EMAIL_USER');
        const pass = this.configService.get<string>('EMAIL_PASS');

        if (!host || !user || !pass) {
            this.logger.warn('Email configuration missing. Email notifications will be disabled.');
            return;
        }

        this.transporter = nodemailer.createTransport({
            host,
            // port: 587, 
            service: 'gmail', // Simplifies gmail setup if host is smtp.gmail.com
            auth: {
                user,
                pass,
            },
        });
    }

    async sendEmail(to: string, subject: string, html: string) {
        if (!this.transporter) {
            this.logger.warn('Attempted to send email but transporter is not initialized.');
            return;
        }
        try {
            const info = await this.transporter.sendMail({
                from: `"${this.configService.get('APP_NAME') || 'Expense Tracker'}" <${this.configService.get('EMAIL_USER')}>`,
                to,
                subject,
                html,
            });
            this.logger.log(`Message sent: ${info.messageId} to ${to}`);
            return info;
        } catch (error) {
            this.logger.error(`Error sending email to ${to}`, error);
            return null;
        }
    }

    generateRenewalTemplate(userName: string, subscriptionName: string, amount: number, currency: string, renewalDate: Date, daysLeft: number) {
        const formattedDate = renewalDate.toLocaleDateString();
        return `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
          <h2>Upcoming Subscription Renewal</h2>
          <p>Hi ${userName},</p>
          <p>Your subscription for <strong>${subscriptionName}</strong> is renewing in <strong>${daysLeft} days</strong> (on ${formattedDate}).</p>
          <p>Amount: <strong>${amount} ${currency}</strong></p>
          <p>We have automatically added this to your expense list to help you plan.</p>
          <div style="margin: 20px 0;">
            <a href="${this.configService.get('FRONTEND_URL') || '#'}/subscriptions" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Manage Subscription</a>
          </div>
          <p>If you don't plan to renew, please cancel it via the link above to remove the expense.</p>
        </div>
      `;
    }
    generateBatchRenewalTemplate(userName: string, renewals: Array<{ name: string, amount: number, currency: string, date: Date, daysLeft: number }>) {
        const itemsHtml = renewals.map(item => `
            <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <strong>${item.name}</strong><br>
                Amount: ${item.amount} ${item.currency}<br>
                Renewing on: ${item.date.toLocaleDateString()} (${item.daysLeft} days left)
            </div>
        `).join('');

        return `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
          <h2>Upcoming Subscription Renewals</h2>
          <p>Hi ${userName},</p>
          <p>You have <strong>${renewals.length}</strong> subscription(s) renewing soon:</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            ${itemsHtml}
          </div>

          <p>We have automatically added these to your expense list.</p>
          <div style="margin: 20px 0;">
            <a href="${this.configService.get('FRONTEND_URL') || '#'}/subscriptions" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Manage Subscriptions</a>
          </div>
          <p>If you don't plan to renew, please cancel them via the link above.</p>
        </div>
      `;
    }

    generatePostRenewalCheckTemplate(userName: string, pendingItems: Array<{ id: string, name: string, amount: number, currency: string, date: Date }>) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || '#';

        const itemsHtml = pendingItems.map(item => `
            <div style="border-bottom: 1px solid #eee; padding: 15px 0; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${item.name}</strong><br>
                    <span style="color: #666;">${item.amount} ${item.currency}</span><br>
                    <span style="font-size: 12px; color: #888;">Due: ${item.date.toLocaleDateString()}</span>
                </div>
                <div>
                     <a href="${frontendUrl}/confirm-transaction/${item.id}" style="background-color: #2196F3; color: white; padding: 8px 15px; text-decoration: none; border-radius: 4px; font-size: 14px;">Confirm Paid</a>
                </div>
            </div>
        `).join('');

        return `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
          <h2 style="color: #FF9800;">Did you pay these subscriptions?</h2>
          <p>Hi ${userName},</p>
          <p>The following subscriptions were scheduled for renewal recently, but we haven't received a confirmation yet.</p>
          
          <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffe0b2;">
            ${itemsHtml}
          </div>

          <p style="color: #d32f2f; font-weight: bold;">⚠️ Warning: Your expense tracking may be inaccurate if you don't confirm these payments.</p>
          
          <p>If you cancelled these or didn't pay, you can ignore this or remove them from your list.</p>
          
          <div style="margin: 20px 0; text-align: center;">
            <a href="${frontendUrl}/subscriptions" style="color: #666; text-decoration: underline;">View All Subscriptions</a>
          </div>
        </div>
      `;
    }
}

