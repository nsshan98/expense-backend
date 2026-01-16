import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('checkout')
@UseGuards(JwtAuthGuard)
export class CheckoutController {
    constructor(private readonly checkoutService: CheckoutService) { }

    @Post()
    async createCheckout(@Request() req, @Body() dto: CreateCheckoutDto) {
        // req.user is populated by JwtAuthGuard
        return this.checkoutService.createCheckout(req.user.id, dto);
    }
}
