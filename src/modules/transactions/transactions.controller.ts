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
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) { }

  @Roles(Role.User, Role.SuperAdmin)
  @Post('create')
  create(@Request() req, @Body() body: CreateTransactionDto) {
    return this.transactionsService.create(req.user.id, body);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Get('all')
  findAll(
    @Request() req,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
  ) {
    return this.transactionsService.findAll(
      req.user.id,
      +limit || 5,
      +offset || 0,
    );
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.transactionsService.findOne(id, req.user.id);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() body: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, req.user.id, body);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.transactionsService.remove(id, req.user.id);
  }
}
