import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { BillingLocalService } from './billing_local.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSubscriptionRequestDto } from './dto/create-subscription-request.dto';
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
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
   * PHASE 3: User Submits Payment Info
   */
  @Roles(Role.SuperAdmin, Role.User)
  @UseGuards(JwtAuthGuard)
  @Post('payments')
  async submitPayment(@Request() req, @Body() dto: SubmitPaymentDto) {
    return this.billingService.submitPayment(req.user.id, dto);
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
}
