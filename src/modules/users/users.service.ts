import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { users } from './entities/users.schema';
import { pendingRegistrations } from './entities/pending_registrations.schema';
import { userSettings } from './entities/user_settings.schema';
import { eq } from 'drizzle-orm';
import { EncryptionService } from '../../common/utils/encryption.service';
import { CurrencyUtil } from '../../common/utils/currency.util';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { hashPassword, comparePassword } from '../auth/utils/password.util';

@Injectable()
export class UsersService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly encryptionService: EncryptionService,
  ) { }

  async findById(id: string) {
    const [user] = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async getUserProfile(id: string) {
    const user = await this.findById(id);
    if (!user) return null;

    const [settings] = await this.drizzleService.db
      .select({
        apiKey: userSettings.gemini_api_key,
        weekendDays: userSettings.weekend_days,
        currency: userSettings.currency,
        timezone: userSettings.timezone,
        subscriptionAlertDays: userSettings.subscription_alert_days,
      })
      .from(userSettings)
      .where(eq(userSettings.user_id, id));

    let geminiApiKeyMasked: string | null = null;
    if (settings?.apiKey) {
      try {
        const decrypted = await this.encryptionService.decrypt(settings.apiKey);
        if (decrypted.length > 8) {
          geminiApiKeyMasked = `${decrypted.slice(0, 4)}...${decrypted.slice(-4)}`;
        } else {
          geminiApiKeyMasked = '********';
        }
      } catch (e) {
        geminiApiKeyMasked = 'Error decrypting';
      }
    }

    const hasGeminiKey = !!settings?.apiKey;
    const weekendDays = settings?.weekendDays || [];
    const currency = settings?.currency || 'USD';
    const timezone = settings?.timezone || 'UTC';
    const subscriptionAlertDays = settings?.subscriptionAlertDays || 3;
    const currencySymbol = CurrencyUtil.getSymbol(currency);
    const sanitized = this.sanitizeUser(user);
    return { ...sanitized, hasGeminiKey, geminiApiKeyMasked, weekendDays, currency, currencySymbol, timezone, subscriptionAlertDays };
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

  async initializeSettings(userId: string, timezone: string = 'UTC') {
    await this.drizzleService.db
      .insert(userSettings)
      .values({
        user_id: userId,
        timezone: timezone,
        currency: 'USD',
        subscription_alert_days: 3
      })
      .onConflictDoNothing();
  }

  async updateUser(id: string, data: UpdateUserProfileDto) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) {
      const existingUser = await this.findByEmail(data.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already in use');
      }
      updateData.email = data.email;
    }

    if (data.geminiApiKey !== undefined || data.weekendDays !== undefined || data.currency !== undefined || data.subscriptionAlertDays !== undefined || data.timezone !== undefined) {
      let encryptedKey: string | null = null;
      if (data.geminiApiKey) {
        encryptedKey = await this.encryptionService.encrypt(data.geminiApiKey);
      }

      const valuesToSet: any = {
        user_id: id,
        updated_at: new Date()
      };

      if (data.geminiApiKey !== undefined) {
        valuesToSet.gemini_api_key = encryptedKey;
      }

      if (data.weekendDays !== undefined) {
        valuesToSet.weekend_days = data.weekendDays;
      }

      if (data.currency !== undefined) {
        valuesToSet.currency = data.currency;
      }

      if (data.timezone !== undefined) {
        valuesToSet.timezone = data.timezone;
      }

      if (data.subscriptionAlertDays !== undefined) {
        valuesToSet.subscription_alert_days = data.subscriptionAlertDays;
      }

      await this.drizzleService.db
        .insert(userSettings)
        .values(valuesToSet)
        .onConflictDoUpdate({
          target: userSettings.user_id,
          set: valuesToSet,
        });
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

    return this.getUserProfile(id);
  }

  async changePassword(id: string, data: ChangePasswordDto) {
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

    const newPasswordHash = await hashPassword(data.newPassword);

    const [user] = await this.drizzleService.db
      .update(users)
      .set({ password_hash: newPasswordHash })
      .where(eq(users.id, id))
      .returning();

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

  async updateOtpDetails(userId: string, otpHash: string, expiresAt: Date, lastSentAt: Date) {
    await this.drizzleService.db
      .update(users)
      .set({
        otp_hash: otpHash,
        otp_expires_at: expiresAt,
        otp_last_sent_at: lastSentAt,
      })
      .where(eq(users.id, userId));
  }

  async clearOtpDetails(userId: string) {
    await this.drizzleService.db
      .update(users)
      .set({
        otp_hash: null,
        otp_expires_at: null,
      })
      .where(eq(users.id, userId));
  }

  async updateResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    await this.drizzleService.db
      .update(users)
      .set({
        reset_token_hash: tokenHash,
        reset_token_expires_at: expiresAt,
      })
      .where(eq(users.id, userId));
  }

  async clearResetToken(userId: string) {
    await this.drizzleService.db
      .update(users)
      .set({
        reset_token_hash: null,
        reset_token_expires_at: null,
      })
      .where(eq(users.id, userId));
  }

  async updatePassword(userId: string, passwordHash: string) {
    await this.drizzleService.db
      .update(users)
      .set({ password_hash: passwordHash })
      .where(eq(users.id, userId));
  }

  // Pending Registration Methods

  async createPendingRegistration(data: typeof pendingRegistrations.$inferInsert) {
    // Upsert: if email exists in pending, update it
    await this.drizzleService.db
      .insert(pendingRegistrations)
      .values(data)
      .onConflictDoUpdate({
        target: pendingRegistrations.email,
        set: data,
      });
  }

  async findPendingRegistrationByEmail(email: string) {
    const [pending] = await this.drizzleService.db
      .select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.email, email));
    return pending;
  }

  async deletePendingRegistration(email: string) {
    await this.drizzleService.db
      .delete(pendingRegistrations)
      .where(eq(pendingRegistrations.email, email));
  }
}
