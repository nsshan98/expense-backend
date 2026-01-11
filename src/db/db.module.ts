import { Module } from '@nestjs/common';
import { DrizzleService } from './db.service';

@Module({
  providers: [
    DrizzleService,
    {
      provide: 'DB',
      useFactory: (drizzleService: DrizzleService) => drizzleService.db,
      inject: [DrizzleService],
    },
  ],
  exports: [DrizzleService, 'DB'],
})
export class DbModule { }
