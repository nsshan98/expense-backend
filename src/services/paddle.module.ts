import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaddleService } from './paddle.service';

@Module({
    imports: [ConfigModule],
    providers: [PaddleService],
    exports: [PaddleService],
})
export class PaddleModule { }
