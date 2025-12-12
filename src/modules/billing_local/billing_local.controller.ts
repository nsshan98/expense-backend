import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { BillingLocalService } from './billing_local.service';
import { CreateLocalPaymentDto } from './dto/create-local-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('billing_local')
export class BillingLocalController {
  constructor(private readonly billingService: BillingLocalService) {}

  @Post('pay')
  pay(@Body() dto: CreateLocalPaymentDto) {
    return this.billingService.processPayment(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('subscriptions/:userId')
  getSubscriptions(@Param('userId', ParseIntPipe) userId: number) {
    return this.billingService.getSubscriptions(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  cancel(@Request() req) {
    return this.billingService.cancelSubscription(req.user.id);
  }
}
