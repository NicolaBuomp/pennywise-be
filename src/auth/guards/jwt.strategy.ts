import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {
    const jwtSecret = configService.get<string>('SUPABASE_JWT_SECRET');

    if (!jwtSecret) {
      console.error('JWT Secret non configurato!');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret!,
    });
  }

  async validate(payload: any) {
    // Payload.sub è l'ID utente nei token Supabase
    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .select('*')
      .eq('id', payload.sub)
      .single();

    if (error || !data) {
      throw new UnauthorizedException('Utente non trovato');
    }

    return data;
  }
}
