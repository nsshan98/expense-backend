import { ForbiddenException, Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { hashPassword, comparePassword } from './utils/password.util';
import { ConfigService } from '@nestjs/config';
import { BillingLocalService } from '../billing_local/billing_local.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as crypto from 'crypto';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private billingService: BillingLocalService,
    private notificationsService: NotificationsService,
  ) { }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await hashPassword(registerDto.password);
    const user = await this.usersService.createUser({
      ...registerDto,
      password_hash: hashedPassword,
    });

    // Assign default subscription (Free plan)
    await this.billingService.createDefaultSubscription(user.id);

    // Initialize Settings (Timezone etc)
    if (registerDto.timezone) {
      await this.usersService.initializeSettings(user.id, registerDto.timezone);
    } else {
      await this.usersService.initializeSettings(user.id, 'UTC');
    }

    const tokens = await this.getTokens(user.id, user.email!);
    await this.hashAndUpdateRefreshToken(user.id, tokens.refreshToken as string);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (
      !user ||
      !user.password_hash ||
      !(await comparePassword(loginDto.password, user.password_hash))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.getTokens(user.id, user.email!);
    await this.hashAndUpdateRefreshToken(user.id, tokens.refreshToken as string);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      ...tokens
    }
  }

  async logout(userId: string) {
    return this.usersService.updateRefreshToken(userId, null);
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.hashed_refresh_token)
      throw new ForbiddenException('Access Denied');

    const refreshTokenMatches = await comparePassword(
      refreshToken,
      user.hashed_refresh_token,
    );
    if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id, user.email!);
    await this.hashAndUpdateRefreshToken(user.id, tokens.refreshToken as string);
    return tokens;
  }

  async hashAndUpdateRefreshToken(userId: string, refreshToken: string) {
    const hash = await hashPassword(refreshToken);
    await this.usersService.updateRefreshToken(userId, hash);
  }

  async getTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.get<string>('REFRESH_JWT_SECRET'),
          expiresIn: this.configService.get<string>('REFRESH_JWT_EXPIRES_IN') || '7d',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      // Don't reveal if user exists or not, just return success or fake it
      // But for this use case, we might want to throw or return normally.
      // Usually good security practice is to just return "If that email exists, we sent a code."
      return { message: 'If a user with this email exists, an OTP has been sent.' };
    }

    // Check rate limit (3 minutes)
    if (user.otp_last_sent_at) {
      const now = new Date();
      const diff = now.getTime() - user.otp_last_sent_at.getTime();
      const threeMinutes = 3 * 60 * 1000;
      if (diff < threeMinutes) {
        throw new BadRequestException('Please wait 3 minutes before requesting a new OTP.');
      }
    }

    const otp = this.generateOtp();
    const otpHash = await hashPassword(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.usersService.updateOtpDetails(user.id, otpHash, expiresAt, new Date());
    await this.notificationsService.sendOtpEmail(user.email!, otp);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const user = await this.usersService.findByEmail(verifyOtpDto.email);
    if (!user || !user.otp_hash || !user.otp_expires_at) {
      throw new BadRequestException('Invalid OTP or email');
    }

    if (new Date() > user.otp_expires_at) {
      throw new BadRequestException('OTP has expired');
    }

    const isValid = await comparePassword(verifyOtpDto.otp, user.otp_hash);
    if (!isValid) {
      throw new BadRequestException('Invalid OTP');
    }

    // OTP is valid. Now generate a Reset Token.
    const resetToken = crypto.randomUUID();
    const resetTokenHash = await hashPassword(resetToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity for setting password

    // Save reset token and clear OTP (one-time use)
    await this.usersService.updateResetToken(user.id, resetTokenHash, expiresAt);
    await this.usersService.clearOtpDetails(user.id);

    return {
      message: 'OTP verified successfully',
      resetToken: resetToken
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(resetPasswordDto.email);
    if (!user || !user.reset_token_hash || !user.reset_token_expires_at) {
      throw new BadRequestException('Invalid request or token expired');
    }

    if (new Date() > user.reset_token_expires_at) {
      throw new BadRequestException('Reset token has expired. Please start over.');
    }

    const isValid = await comparePassword(resetPasswordDto.resetToken, user.reset_token_hash);
    if (!isValid) {
      throw new BadRequestException('Invalid Reset Token');
    }

    const hashedPassword = await hashPassword(resetPasswordDto.newPassword);
    await this.usersService.updatePassword(user.id, hashedPassword);

    // Cleanup
    await this.usersService.clearResetToken(user.id);

    return { message: 'Password reset successfully' };
  }

  private generateOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
  }
}
