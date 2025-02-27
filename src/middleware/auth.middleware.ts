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
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        throw new UnauthorizedException('Missing Authorization header');
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException('Invalid Authorization header format');
      }

      // Verify JWT with Supabase
      const { data, error } = await this.supabaseService.authVerifyToken(token);

      if (error || !data?.user) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Attach user info to the request object
      req.user = {
        id: data.user.id,
        email: (data.user.email as string) || '',
        role: (data.user.app_metadata?.role as string) || 'user',
      };

      next();
    } catch (error) {
      next(new UnauthorizedException(error.message));
    }
  }
}
