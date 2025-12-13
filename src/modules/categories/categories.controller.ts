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
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

  @Post()
  create(@Request() req, @Body() body: CreateCategoryDto) {
    return this.categoriesService.create(req.user.id, body);
  }

  @Get()
  findAll(@Request() req) {
    return this.categoriesService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.categoriesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.categoriesService.update(id, req.user.id, body);
  }

  @Delete(':id')
  remove(
    @Request() req,
    @Param('id') id: string,
    @Query('force') force: string,
  ) {
    return this.categoriesService.remove(id, req.user.id, force === 'true');
  }
}
