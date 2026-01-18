import { Body, Controller, Get, Param, Post, Query, Request, UseGuards, Res, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { BillingLocalService } from './billing_local.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSubscriptionRequestDto } from './dto/create-subscription-request.dto';
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { GetInvoiceDto } from './dto/get-invoice.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@Controller('billing-local')
export class BillingLocalController {
  constructor(private readonly billingService: BillingLocalService) { }

  /**
   * PHASE 1: User Selects Plan -> Create Order
   */
  @Roles(Role.SuperAdmin, Role.User)
  @UseGuards(JwtAuthGuard)
  @Post('requests')
  async createSubscriptionRequest(@Request() req, @Body() dto: CreateSubscriptionRequestDto) {
    return this.billingService.createSubscriptionRequest(req.user.id, dto);
  }

  /**
   * Validate Coupon - Check if coupon is valid and calculate discount
   */
  @Roles(Role.SuperAdmin, Role.User)
  @UseGuards(JwtAuthGuard)
  @Post('coupons/validate')
  async validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.billingService.validateCoupon(dto);
  }

  /**
   * PHASE 3: User Submits Payment Info
   */
  @Roles(Role.SuperAdmin, Role.User)
  @UseGuards(JwtAuthGuard)
  @Post('payments')
  async submitPayment(@Request() req, @Body() dto: SubmitPaymentDto) {
    return this.billingService.submitPayment(req.user.id, dto);
  }

  /**
   * Admin Phase: List Pending Submissions (For Dashboard)
   */
  @Roles(Role.SuperAdmin, Role.User)
  @UseGuards(JwtAuthGuard)
  @Get('submissions/pending')
  async getPendingSubmissions() {
    return this.billingService.getPendingSubmissions();
  }

  // Admin Phase: Get Subscription Request Details
  @UseGuards(JwtAuthGuard)
  @Get('requests/:id')
  async getSubscriptionRequestDetails(@Param('id') id: string) {
    return this.billingService.getSubscriptionRequestDetails(id);
  }

  // Admin Phase: Review Submission
  @Roles(Role.SuperAdmin, Role.User)
  @UseGuards(JwtAuthGuard) // Should be Admin Guard
  @Post('submissions/:id/review')
  async reviewSubmission(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    // Assuming req.user.id is the admin
    return this.billingService.reviewSubmission(req.user.id, id, dto.action, dto.reason);
  }

  // Helper for UI to check status
  // Used in Phase 4 (Pending state)
  @Roles(Role.SuperAdmin, Role.User)
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@Request() req) {
    // Return active subscription or latest pending order
    return this.billingService.getSubscriptionStatus(req.user.id);
  }

  // User Phase: Get Transaction History
  @Roles(Role.SuperAdmin, Role.User)
  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getMyTransactionHistory(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.billingService.getMyTransactionHistory(req.user.id, +page, +limit);
  }

  // Get Manual Invoice (Download/View PDF)
  @Roles(Role.SuperAdmin, Role.User)
  @UseGuards(JwtAuthGuard)
  @Get('invoices/manual/:orderId')
  async getManualInvoice(
    @Request() req,
    @Param('orderId') orderId: string,
    @Query() dto: GetInvoiceDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, filename } = await this.billingService.getManualInvoice(
      req.user.id,
      orderId,
      dto.disposition
    );

    // Set headers for PDF download/view
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${dto.disposition || 'attachment'}; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }

  // Get Paddle Invoice (Redirect to Paddle URL)
  @Roles(Role.SuperAdmin, Role.User)
  @UseGuards(JwtAuthGuard)
  @Get('invoices/paddle/:eventId')
  async getPaddleInvoice(
    @Request() req,
    @Param('eventId') eventId: string,
    @Query() dto: GetInvoiceDto,
    @Res() res: Response,
  ) {
    // Get the invoice URL from Paddle
    const { url } = await this.billingService.getPaddleInvoice(
      req.user.id,
      eventId,
      dto.disposition || 'attachment'
    );

    // Return the invoice URL
    return res.json({
      url,
      expiresIn: '1 hour',
      message: 'Invoice URL retrieved successfully. This URL expires in 1 hour.',
    });
  }

  // Check Invoice Availability
  @Roles(Role.SuperAdmin, Role.User)
  @UseGuards(JwtAuthGuard)
  @Get('invoices/check/:source/:transactionId')
  async checkInvoiceAvailability(
    @Request() req,
    @Param('source') source: 'manual' | 'paddle',
    @Param('transactionId') transactionId: string,
  ) {
    return this.billingService.checkInvoiceAvailability(req.user.id, transactionId, source);
  }
}
