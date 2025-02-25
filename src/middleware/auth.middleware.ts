import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly JWT_SECRET: string;

  constructor(private readonly configService: ConfigService) {
    // Modifica il nome della variabile d'ambiente
    this.JWT_SECRET =
      this.configService.get<string>('SUPABASE_JWT_SECRET') || '';
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedException('Missing Authorization header');
      }

      const token = authHeader.split(' ')[1];

      // Modifica l'algoritmo e usa il secret corretto
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256'],
      });

      req['user'] = decoded;
      next();
    } catch (error) {
      console.error('JWT verification error:', error.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
