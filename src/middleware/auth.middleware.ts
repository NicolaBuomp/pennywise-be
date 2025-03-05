import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly supabaseService: SupabaseService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Authorization token is required');
    }

    try {
      const {
        data: { user },
        error,
      } = await this.supabaseService.getClient().auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Invalid authorization token');
      }

      // Add user info to request object
      if (!user.email) {
        throw new UnauthorizedException('User email is missing');
      }

      req['user'] = {
        id: user.id,
        email: user.email,
        role: user.role || 'defaultRole',
      };
      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid authorization token');
    }
  }
}
