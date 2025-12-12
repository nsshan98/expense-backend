import { Module } from '@nestjs/common';
import { MergeService } from './merge.service';
import { MergeController } from './merge.controller';
import { DbModule } from '../../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [MergeController],
  providers: [MergeService],
  exports: [MergeService],
})
export class MergeModule {}
