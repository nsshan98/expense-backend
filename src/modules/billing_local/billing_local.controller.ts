import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { BillingLocalService } from './billing_local.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';

@Controller('billing-local')
export class BillingLocalController {
  constructor(private readonly billingService: BillingLocalService) { }

  /**
   * PHASE 1: User Selects Plan -> Create Order
   */
  @UseGuards(JwtAuthGuard)
  @Post('orders')
  async createOrder(@Request() req, @Body() dto: CreateOrderDto) {
    return this.billingService.createOrder(req.user.id, dto);
  }

  /**
   * PHASE 3: User Submits Payment Info
   */
  @UseGuards(JwtAuthGuard)
  @Post('payments')
  async submitPayment(@Request() req, @Body() dto: SubmitPaymentDto) {
    return this.billingService.submitPayment(req.user.id, dto);
  }

  // Admin Phase: Review Submission
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
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@Request() req) {
    // Return active subscription or latest pending order
    return this.billingService.getSubscriptionStatus(req.user.id);
  }
}
