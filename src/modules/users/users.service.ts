import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { users } from './entities/users.schema';
import { eq } from 'drizzle-orm';
import { UpdateUserDto } from './dto/update-user.dto';
import { hashPassword, comparePassword } from '../auth/utils/password.util';

@Injectable()
export class UsersService {
  constructor(private readonly drizzleService: DrizzleService) { }

  async findById(id: string) {
    const [user] = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async getUserProfile(id: string) {
    const user = await this.findById(id);
    return user ? this.sanitizeUser(user) : null;
  }

  async findByEmail(email: string) {
    const [user] = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async createUser(data: typeof users.$inferInsert) {
    const [user] = await this.drizzleService.db
      .insert(users)
      .values(data)
      .returning();
    return user;
  }

  async updateUser(id: string, data: UpdateUserDto) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) {
      const existingUser = await this.findByEmail(data.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already in use');
      }
      updateData.email = data.email;
    }
    if (data.password) {
      if (!data.oldPassword) {
        throw new BadRequestException('Previous password is required to set a new password');
      }

      const currentUser = await this.findById(id);
      if (!currentUser) {
        throw new NotFoundException('User not found');
      }

      if (!currentUser.password_hash) {
        throw new BadRequestException('User has no password set');
      }

      const isPasswordValid = await comparePassword(data.oldPassword, currentUser.password_hash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Previous password is incorrect');
      }

      updateData.password_hash = await hashPassword(data.password);
    }

    if (Object.keys(updateData).length === 0) {
      return this.getUserProfile(id);
    }

    const [user] = await this.drizzleService.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: typeof users.$inferSelect) {
    const { password_hash, hashed_refresh_token, ...safeUser } = user;
    return safeUser;
  }

  async updateRefreshToken(userId: string, hashedRefreshToken: string | null) {
    await this.drizzleService.db
      .update(users)
      .set({ hashed_refresh_token: hashedRefreshToken })
      .where(eq(users.id, userId));
  }
}
