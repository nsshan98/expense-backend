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
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

  @Roles(Role.User, Role.SuperAdmin)
  @Post('create')
  create(@Request() req, @Body() body: CreateCategoryDto) {
    return this.categoriesService.create(req.user.id, body);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Get('all')
  findAll(@Request() req) {
    return this.categoriesService.findAll(req.user.id);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.categoriesService.findOne(id, req.user.id);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, req.user.id, body);
  }

  @Roles(Role.User, Role.SuperAdmin)
  @Delete(':id')
  remove(
    @Request() req,
    @Param('id') id: string
  ) {
    return this.categoriesService.remove(id, req.user.id);
  }
}
