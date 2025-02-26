import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { SupabaseService } from '../supabase/supabase.service';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly JWT_SECRET: string;
  private readonly logger = new Logger(AuthMiddleware.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly profilesService: ProfilesService,
  ) {
    this.JWT_SECRET =
      this.configService.get<string>('SUPABASE_JWT_SECRET') || '';
  }

  // Metodo per definire le rotte pubbliche
  private isPublicRoute(path: string): boolean {
    const publicRoutes = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/reset-password',
      '/public',
    ];
    return publicRoutes.some((route) => path.startsWith(route));
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Controlla se la richiesta è verso una rotta pubblica
      const isPublicRoute = this.isPublicRoute(req.path);

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        if (isPublicRoute) {
          return next();
        }
        throw new UnauthorizedException('Missing Authorization header');
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        if (isPublicRoute) {
          return next();
        }
        throw new UnauthorizedException('Invalid token format');
      }

      try {
        // Verifica il token JWT
        const decoded = jwt.verify(token, this.JWT_SECRET, {
          algorithms: ['HS256'],
        }) as { [key: string]: any }; // Aggiunta di una tipizzazione che permette lo spread

        // Verifica l'utente su Supabase
        const {
          data: { user },
          error,
        } = await this.supabaseService.getClient().auth.getUser(token);

        if (error || !user) {
          throw new UnauthorizedException('User not found');
        }

        // Assicura l'esistenza del profilo
        const profile = await this.profilesService.ensureProfileExists(
          user.id,
          user,
        );

        // Aggiorna l'ultima attività in background
        this.profilesService.updateLastActive(user.id).catch((err) => {
          this.logger.warn(
            `Errore nell'aggiornamento di lastActive: ${err.message}`,
          );
        });

        // Arricchisci l'oggetto utente
        req['user'] = {
          id: user.id,
          email: user.email,
          profile: profile,
          roles: [], // Puoi aggiungere la logica per i ruoli qui
          ...decoded,
        };

        next();
      } catch (jwtError) {
        // Gestione degli errori di JWT
        if (isPublicRoute) {
          return next();
        }

        this.logger.error('JWT Verification Error', jwtError);
        throw new UnauthorizedException('Invalid or expired token');
      }
    } catch (error) {
      // Gestione degli errori globale
      this.logger.error('Authentication Middleware Error', error);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Authentication failed');
    }
  }
}
