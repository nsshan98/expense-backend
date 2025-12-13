import { ForbiddenException, Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { hashPassword, comparePassword } from './utils/password.util';
import { ConfigService } from '@nestjs/config';
import { BillingLocalService } from '../billing_local/billing_local.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private billingService: BillingLocalService,
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
}
