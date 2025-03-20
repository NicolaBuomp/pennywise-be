import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // 1️⃣ Registrazione utente (auth.users)
  async register(dto: RegisterDto) {
    const { data, error } = await this.supabaseService.getClient().auth.signUp({
      email: dto.email,
      password: dto.password,
    });

    if (error) throw new BadRequestException(error.message);

    // Check if email confirmation is required
    const emailConfirmationRequired = !data.session;

    return {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      user: data.user,
      emailConfirmationRequired,
      message: emailConfirmationRequired
        ? 'Registrazione completata. Conferma la tua email per accedere.'
        : 'Registrazione completata. Completa il profilo.',
    };
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (error) throw new UnauthorizedException(error.message);

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user,
    };
  }

  // Resend verification email
  async resendVerificationEmail(email: string) {
    const { data, error } = await this.supabaseService.getClient().auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) throw new BadRequestException(error.message);
    return { message: 'Email di verifica inviata nuovamente.' };
  }
}
