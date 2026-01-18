import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export interface ManualInvoiceData {
    invoiceNumber: string;
    invoiceDate: Date;
    customerName: string;
    customerEmail: string;
    planName: string;
    amount: number;
    currency: string;
    duration: number; // in days
    transactionId?: string;
    provider?: string;
    paymentDate?: Date;
    status: string;
}

@Injectable()
export class InvoiceGenerationService {
    /**
     * Generate a PDF invoice for manual transactions
     */
    async generateManualInvoice(data: ManualInvoiceData): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on('error', reject);

            // Header
            doc
                .fontSize(20)
                .font('Helvetica-Bold')
                .text('INVOICE', 50, 50, { align: 'right' });

            doc
                .fontSize(10)
                .font('Helvetica')
                .text(`Invoice #: ${data.invoiceNumber}`, 50, 80, { align: 'right' });

            doc.text(`Date: ${this.formatDate(data.invoiceDate)}`, 50, 95, {
                align: 'right',
            });

            // Company Info (Left Side)
            doc
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('Your Company Name', 50, 50);

            doc
                .fontSize(10)
                .font('Helvetica')
                .text('Your Company Address', 50, 70)
                .text('City, State, ZIP', 50, 85)
                .text('Email: support@yourcompany.com', 50, 100);

            // Customer Info
            doc.moveDown(3);
            doc
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('Bill To:', 50, 150);

            doc
                .fontSize(10)
                .font('Helvetica')
                .text(data.customerName, 50, 170)
                .text(data.customerEmail, 50, 185);

            // Horizontal Line
            doc
                .moveTo(50, 220)
                .lineTo(550, 220)
                .stroke();

            // Table Header
            const tableTop = 240;
            doc
                .fontSize(11)
                .font('Helvetica-Bold')
                .text('Description', 50, tableTop)
                .text('Duration', 300, tableTop)
                .text('Amount', 450, tableTop, { align: 'right', width: 100 });

            // Table Row
            const itemTop = tableTop + 25;
            doc
                .fontSize(10)
                .font('Helvetica')
                .text(`${data.planName} Plan`, 50, itemTop)
                .text(`${data.duration} days`, 300, itemTop)
                .text(
                    `${data.currency} ${data.amount.toFixed(2)}`,
                    450,
                    itemTop,
                    { align: 'right', width: 100 }
                );

            // Horizontal Line
            doc
                .moveTo(50, itemTop + 30)
                .lineTo(550, itemTop + 30)
                .stroke();

            // Total
            const totalTop = itemTop + 50;
            doc
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('Total:', 400, totalTop)
                .text(
                    `${data.currency} ${data.amount.toFixed(2)}`,
                    450,
                    totalTop,
                    { align: 'right', width: 100 }
                );

            // Payment Details
            if (data.transactionId || data.provider) {
                doc.moveDown(3);
                const paymentTop = totalTop + 60;
                doc
                    .fontSize(11)
                    .font('Helvetica-Bold')
                    .text('Payment Details:', 50, paymentTop);

                let detailsTop = paymentTop + 20;
                if (data.transactionId) {
                    doc
                        .fontSize(10)
                        .font('Helvetica')
                        .text(`Transaction ID: ${data.transactionId}`, 50, detailsTop);
                    detailsTop += 15;
                }
                if (data.provider) {
                    doc.text(`Payment Provider: ${data.provider}`, 50, detailsTop);
                    detailsTop += 15;
                }
                if (data.paymentDate) {
                    doc.text(
                        `Payment Date: ${this.formatDate(data.paymentDate)}`,
                        50,
                        detailsTop
                    );
                }
            }

            // Status Badge
            const statusTop = doc.y + 40;
            const statusText = this.getStatusText(data.status);
            const statusColor = this.getStatusColor(data.status);

            doc
                .fontSize(10)
                .font('Helvetica-Bold')
                .fillColor(statusColor)
                .text(`Status: ${statusText}`, 50, statusTop)
                .fillColor('black');

            // Footer
            doc
                .fontSize(9)
                .font('Helvetica')
                .text(
                    'Thank you for your business!',
                    50,
                    doc.page.height - 100,
                    { align: 'center', width: 500 }
                );

            doc
                .fontSize(8)
                .text(
                    'For any questions regarding this invoice, please contact support@yourcompany.com',
                    50,
                    doc.page.height - 80,
                    { align: 'center', width: 500 }
                );

            doc.end();
        });
    }

    /**
     * Format date to readable string
     */
    private formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    /**
     * Get human-readable status text
     */
    private getStatusText(status: string): string {
        const statusMap: Record<string, string> = {
            completed: 'PAID',
            pending_verification: 'PENDING',
            rejected: 'REJECTED',
            draft: 'DRAFT',
        };
        return statusMap[status] || status.toUpperCase();
    }

    /**
     * Get color for status
     */
    private getStatusColor(status: string): string {
        const colorMap: Record<string, string> = {
            completed: '#10B981', // Green
            pending_verification: '#F59E0B', // Orange
            rejected: '#EF4444', // Red
            draft: '#6B7280', // Gray
        };
        return colorMap[status] || '#000000';
    }
}
