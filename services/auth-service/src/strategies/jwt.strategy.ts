import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;       // externalId (usr_...)
  sessionId: string;
  kycLevel: number;
  country: string;
  status: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      issuer: config.get<string>('JWT_ISSUER', 'mondega.io'),
    });
  }

  validate(payload: JwtPayload) {
    if (!payload.sub || !payload.sessionId) {
      throw new UnauthorizedException('Invalid token payload.');
    }
    // Attach to req.user
    return {
      userId: payload.sub,
      sessionId: payload.sessionId,
      kycLevel: payload.kycLevel,
      country: payload.country,
      status: payload.status,
    };
  }
}
