import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MergeService } from './merge.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('merge')
@UseGuards(JwtAuthGuard)
export class MergeController {
  constructor(private readonly mergeService: MergeService) {}

  @Get('suggestions')
  getSuggestions(@Request() req, @Query('name') name: string) {
    return this.mergeService.getSuggestions(req.user.id, name);
  }

  @Post()
  applyMerge(
    @Request() req,
    @Body() body: { sourceNames: string[]; targetName: string },
  ) {
    return this.mergeService.applyMerge(
      req.user.id,
      body.sourceNames,
      body.targetName,
    );
  }
}
