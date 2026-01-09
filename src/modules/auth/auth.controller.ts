import { Throttle } from '@nestjs/throttler';
import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenAuthGuard } from './guards/refresh-token-auth.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { VerifyRegistrationDto } from './dto/verify-registration.dto';

@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) { }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-registration')
  async verifyRegistration(@Body() verifyDto: VerifyRegistrationDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.verifyRegistration(verifyDto);
    this.setRefreshTokenCookie(res, data.refreshToken);
    return {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  }

  @Post('resend-registration-otp')
  async resendRegistrationOtp(@Body() resendDto: ResendOtpDto) {
    return this.authService.resendRegistrationOtp(resendDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.login(loginDto);
    this.setRefreshTokenCookie(res, data.refreshToken);
    return {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('resend-otp')
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.forgotPassword(resendOtpDto); // Reuse logic
  }

  @Post('verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.id);
    res.clearCookie('Refresh');
    return { message: 'Logged out successfully' };
  }

  @UseGuards(RefreshTokenAuthGuard)
  @Post('refresh')
  async refresh(@Request() req, @Res({ passthrough: true }) res: Response) {
    const userId = req.user['sub'];
    const refreshToken = req.user['refreshToken'];
    const tokens = await this.authService.refreshTokens(userId, refreshToken);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return this.usersService.getUserProfile(req.user.id);
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie('Refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
