import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Request() req, @Body() body: CreateTransactionDto) {
    return this.transactionsService.create(req.user.id, body);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
  ) {
    return this.transactionsService.findAll(
      req.user.id,
      +limit || 10,
      +offset || 0,
    );
  }

  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.transactionsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, req.user.id, body);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.transactionsService.remove(id, req.user.id);
  }
}
