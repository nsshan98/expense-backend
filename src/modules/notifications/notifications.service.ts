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
  generateBatchRenewalTemplate(userName: string, renewals: Array<{ name: string, category?: string, amount: number, currency: string, date: Date, daysLeft: number }>) {
    const frontendUrl = this.configService.get('FRONTEND_URL') || '#';

    const itemsHtml = renewals.map((item, index) => {
      // clear background colors for icons
      const bgColors = ['#ffebee', '#e8f5e9', '#e3f2fd', '#f3e5f5', '#fff3e0'];
      const textColors = ['#c62828', '#2e7d32', '#1565c0', '#6a1b9a', '#ef6c00'];
      const colorIndex = (item.name.length + index) % bgColors.length;
      const bgColor = bgColors[colorIndex];
      const textColor = textColors[colorIndex];
      const initial = item.name.charAt(0).toUpperCase();

      // Last item shouldn't have border-bottom usually, but simplified for now
      return `
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #eeeeee;">
                <tr>
                    <td width="60" valign="middle" style="padding: 15px 0;">
                        <div style="width: 42px; height: 42px; border-radius: 50%; background-color: ${bgColor}; color: ${textColor}; font-size: 18px; font-weight: bold; text-align: center; line-height: 42px; font-family: sans-serif;">
                            ${initial}
                        </div>
                    </td>
                    <td valign="middle" style="padding: 15px 0;">
                        <div style="font-size: 16px; font-weight: bold; color: #333333; margin-bottom: 4px;">${item.name}</div>
                        <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">${item.category || 'SUBSCRIPTION'}</div>
                    </td>
                    <td align="right" valign="middle" style="padding: 15px 0;">
                        <div style="font-size: 16px; font-weight: bold; color: #333333; margin-bottom: 4px;">${item.amount} ${item.currency}</div>
                        <div style="font-size: 12px; color: #009688; font-weight: 500;">
                           📅 Renewing on: ${item.date.toLocaleDateString()} (${item.daysLeft} days left)
                        </div>
                    </td>
                </tr>
            </table>
            `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
          <center style="width: 100%; table-layout: fixed; background-color: #f4f6f8; padding-bottom: 40px;">
            <div style="max-width: 600px; background-color: #ffffff; margin-top: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; text-align: left;">
              
              <!-- Header -->
              <div style="padding: 32px 32px 10px 32px;">
                <h2 style="margin: 0; color: #111827; font-size: 24px; font-weight: 700;">Upcoming Subscription Renewals</h2>
              </div>

              <!-- Content -->
              <div style="padding: 0 32px 32px 32px;">
                <p style="margin-bottom: 24px; color: #4B5563; font-size: 16px; line-height: 24px;">
                  Hi ${userName},<br>
                  You have <strong style="color: #009688;">${renewals.length} subscription(s)</strong> renewing soon:
                </p>

                <!-- List Info Card -->
                <div style="background-color: #F9FAFB; border-radius: 12px; padding: 0 24px; border: 1px solid #f3f4f6;">
                  ${itemsHtml}
                </div>

                <!-- Verified Info -->
                <table border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
                  <tr>
                    <td valign="top" style="padding-right: 12px;">
                       <div style="width: 20px; height: 20px; background-color: #009688; border-radius: 50%; color: white; text-align: center; line-height: 20px; font-size: 12px;">✓</div>
                    </td>
                    <td valign="top">
                      <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 20px;">
                        We have automatically added these to your expense list so you can track your spending efficiently.
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Main Action Button -->
                <div style="margin-top: 32px; margin-bottom: 16px;">
                  <a href="${frontendUrl}/subscriptions" style="background-color: #009688; color: #ffffff; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                    ⚙ Manage Subscriptions
                  </a>
                </div>
                
                <p style="margin: 0; color: #9CA3AF; font-size: 13px;">
                  If you don't plan to renew, please cancel them via the link above.
                </p>
              </div>
            </div>
          </center>
        </body>
        </html>
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

