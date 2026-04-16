import {
  Injectable, ExecutionContext, UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = { userId: string; sessionId: string }>(
    err: Error | null,
    user: TUser | false,
    info: Error | null,
  ): TUser {
    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException('Access token expired. Please refresh.');
    }
    if (info instanceof JsonWebTokenError) {
      throw new UnauthorizedException('Invalid access token.');
    }
    if (err || !user) {
      throw new UnauthorizedException('Unauthorized.');
    }
    return user;
  }
}
