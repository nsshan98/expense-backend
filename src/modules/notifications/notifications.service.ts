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
    const isMultiple = pendingItems.length > 1;

    // Generate the items HTML
    const itemsHtml = pendingItems.map((item, index) => {
      // visual styles for icons
      const bgColors = ['#ffebee', '#e8f5e9', '#e3f2fd', '#f3e5f5', '#fff3e0'];
      const textColors = ['#c62828', '#2e7d32', '#1565c0', '#6a1b9a', '#ef6c00'];
      const colorIndex = (item.name.length + index) % bgColors.length;
      const bgColor = bgColors[colorIndex];
      const textColor = textColors[colorIndex];
      const initial = item.name.charAt(0).toUpperCase();

      // console.log(item);


      return `
             <div style="background-color: #FFF7ED; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #ffedd5;">
                 <table width="100%" border="0" cellspacing="0" cellpadding="0">
                     <tr>
                         <td width="60" valign="middle">
                             <div style="width: 42px; height: 42px; border-radius: 50%; background-color: #ffffff; color: ${textColor}; font-size: 18px; font-weight: bold; text-align: center; line-height: 42px; font-family: sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                 ${item.id !== 'dummy' ? initial : ''}
                                 <!-- If you have real icons, use <img> here -->
                                 ${item.name.charAt(0).toUpperCase()} 
                             </div>
                         </td>
                         <td valign="middle">
                             <div style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 4px;">${item.name}</div>
                             <div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;">${item.amount} ${item.currency}</div>
                             <div style="font-size: 12px; color: #6b7280;">Due: ${item.date.toLocaleDateString()}</div>
                         </td>
                         <td align="right" valign="middle">
                              <a href="${frontendUrl}/subscriptions?action=confirm&id=${item.id}" 
                              style="background-color: #009688; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; display: inline-block; white-space: nowrap;">
                                ✓ Confirm Paid
                              </a>
                         </td>
                     </tr>
                 </table>
             </div>
             `;
    }).join('');

    // "Confirm All" link - assumes frontend can handle query param or just goes to list
    const confirmAllIds = pendingItems.map(i => i.id).join(',');
    // Using a hypothetical bulk confirm URL or just pointing to subscriptions page with a query
    const confirmAllUrl = `${frontendUrl}/subscriptions?action=confirm_batch&ids=${confirmAllIds}`;

    const confirmAllLink = isMultiple ? `
            <div style="text-align: right; margin-bottom: 15px;">
                <a href="${confirmAllUrl}" style="color: #009688; text-decoration: none; font-size: 13px; font-weight: 600;">
                    ✓ Confirm All Paid
                </a>
            </div>
        ` : '';

    return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
          <center style="width: 100%; table-layout: fixed; background-color: #ffffff; padding-bottom: 40px;">
            <div style="max-width: 600px; text-align: left; margin-top: 20px;">
              
              <!-- Top Accent Bar -->
              <div style="height: 4px; background-color: #009688; width: 100%; margin-bottom: 30px;"></div>

              <!-- Content Container -->
              <div style="padding: 0 20px;">
                  
                  <h2 style="color: #D97706; font-size: 24px; font-weight: 700; margin-bottom: 10px; font-family: sans-serif;">Did you pay these subscriptions?</h2>
                  
                  <p style="color: #4B5563; font-size: 15px; line-height: 24px; margin-bottom: 25px;">
                    Hi ${userName},<br>
                    The following subscriptions were scheduled for renewal recently, but we haven't received a confirmation yet.
                  </p>

                  ${confirmAllLink}

                  <!-- Items List -->
                  ${itemsHtml}

                  <!-- Warning Box -->
                  <div style="background-color: #FEF2F2; border-radius: 8px; padding: 15px; margin-top: 25px; display: flex; align-items: flex-start; border: 1px solid #FFE4E6;">
                    <div style="margin-right: 12px; font-size: 18px;">⚠️</div> <!-- Using emoji or could be an image -->
                    <div style="color: #B91C1C; font-size: 14px; font-weight: 500; line-height: 20px;">
                        Warning: Your expense tracking may be inaccurate if you don't confirm these payments.
                    </div>
                  </div>

                  <!-- Footer -->
                  <p style="color: #6B7280; font-size: 13px; margin-top: 25px; line-height: 20px;">
                    If you cancelled these or didn't pay, you can ignore this notification or remove them from your active subscriptions list.
                  </p>

                  <div style="margin-top: 25px; margin-bottom: 40px;">
                    <a href="${frontendUrl}/subscriptions" style="color: #009688; text-decoration: none; font-weight: 600; font-size: 14px;">
                        View All Subscriptions →
                    </a>
                  </div>

              </div>
            </div>
          </center>
        </body>
        </html>
      `;
  }
  sendOtpEmail(to: string, otp: string) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Use the code below to reset your password:</p>
        <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code expires in 5 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `;
    return this.sendEmail(to, 'Password Reset OTP', html);
  }

  sendRegistrationOtpEmail(to: string, otp: string) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Verify Your Email</h2>
        <p>Welcome to Expense Tracker! Please verify your email address to complete your registration.</p>
        <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code expires in 5 minutes.</p>
        <p>If you didn't sign up for Expense Tracker, please ignore this email.</p>
      </div>
    `;
    return this.sendEmail(to, 'Verify Your Email', html);
  }
}
