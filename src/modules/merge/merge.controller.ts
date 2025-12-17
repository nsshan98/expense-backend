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
import { ApplyMergeDto } from './dto/apply-merge.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('merge')
@UseGuards(JwtAuthGuard)
export class MergeController {
  constructor(private readonly mergeService: MergeService) { }

  @Get('suggestions')
  getSuggestions(@Request() req, @Query('name') name: string) {
    return this.mergeService.getSuggestions(req.user.id, name);
  }

  @Post()
  applyMerge(
    @Request() req,
    @Body() body: ApplyMergeDto,
  ) {
    return this.mergeService.applyMerge(
      req.user.id,
      body.sourceNames,
      body.targetName,
    );
  }
}
