import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { users } from './entities/users.schema';
import { eq } from 'drizzle-orm';
import { UpdateUserDto } from './dto/update-user.dto';

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
    const [user] = await this.drizzleService.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateRefreshToken(userId: string, hashedRefreshToken: string | null) {
    await this.drizzleService.db
      .update(users)
      .set({ hashed_refresh_token: hashedRefreshToken })
      .where(eq(users.id, userId));
  }
}
