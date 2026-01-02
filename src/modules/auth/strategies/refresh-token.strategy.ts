import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
    Strategy,
    'jwt-refresh',
) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    return request?.cookies?.Refresh;
                },
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                ExtractJwt.fromBodyField('refreshToken'),
            ]),
            secretOrKey: configService.get<string>('REFRESH_JWT_SECRET')!,
            passReqToCallback: true,
        } as any);
    }

    validate(req: Request, payload: any) {
        let refreshToken = req.cookies?.Refresh;
        if (!refreshToken) {
            const authHeader = req.get('Authorization');
            if (authHeader) {
                refreshToken = authHeader.replace('Bearer', '').trim();
            }
        }
        if (!refreshToken && req.body?.refreshToken) {
            refreshToken = req.body.refreshToken;
        }
        return { ...payload, refreshToken };
    }
}
