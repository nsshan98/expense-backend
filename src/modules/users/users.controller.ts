import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get(':id')
  @Roles(Role.User, Role.SuperAdmin)
  findOne(@Param('id') id: string, @Request() req) {
    if (req.user.role !== Role.SuperAdmin && req.user.id !== id) {
      throw new ForbiddenException('You can only view your own profile');
    }
    return this.usersService.getUserProfile(id);
  }

  @Patch(':id')
  @Roles(Role.User, Role.SuperAdmin)
  update(
    @Param('id') id: string,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
    @Request() req,
  ) {
    if (req.user.role !== Role.SuperAdmin && req.user.id !== id) {
      throw new ForbiddenException('You can only update your own account');
    }
    return this.usersService.updateUser(id, updateUserProfileDto);
  }

  @Patch(':id/password')
  @Roles(Role.User, Role.SuperAdmin)
  changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req,
  ) {
    if (req.user.role !== Role.SuperAdmin && req.user.id !== id) {
      throw new ForbiddenException('You can only update your own account');
    }
    return this.usersService.changePassword(id, changePasswordDto);
  }
}
