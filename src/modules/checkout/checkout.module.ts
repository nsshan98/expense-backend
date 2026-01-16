import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { DbModule } from '../../db/db.module';
import { PaddleModule } from '../../services/paddle.module';

@Module({
    imports: [DbModule, PaddleModule],
    providers: [CheckoutService],
    controllers: [CheckoutController],
    exports: [CheckoutService],
})
export class CheckoutModule { }
