import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdatePasswordDto,
} from './dto/auth.dto';
import { User } from './interfaces/user.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ user: User; token: string }> {
    try {
      const { user, session, error } = await this.supabaseService.auth.signUp({
        email: registerDto.email,
        password: registerDto.password,
        options: {
          data: {
            first_name: registerDto.firstName,
            last_name: registerDto.lastName,
          },
        },
      });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return {
        user: user as unknown as User,
        token: session.access_token,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Registrazione fallita');
    }
  }

  async login(loginDto: LoginDto): Promise<{ user: User; token: string }> {
    try {
      const { user, session, error } =
        await this.supabaseService.auth.signInWithPassword({
          email: loginDto.email,
          password: loginDto.password,
        });

      if (error) {
        throw new UnauthorizedException(error.message);
      }

      return {
        user: user as unknown as User,
        token: session.access_token,
      };
    } catch (error) {
      throw new UnauthorizedException('Credenziali non valide');
    }
  }

  async logout(token: string): Promise<void> {
    try {
      const { error } = await this.supabaseService.auth.signOut();
      if (error) {
        throw new BadRequestException(error.message);
      }
    } catch (error) {
      throw new BadRequestException('Logout fallito');
    }
  }

  async getUserById(userId: string): Promise<User> {
    try {
      const user = await this.supabaseService.getUserById(userId);
      return user as User;
    } catch (error) {
      throw new BadRequestException('Utente non trovato');
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    try {
      const { error } = await this.supabaseService.auth.resetPasswordForEmail(
        resetPasswordDto.email,
        { redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL },
      );

      if (error) {
        throw new BadRequestException(error.message);
      }
    } catch (error) {
      throw new BadRequestException('Reset password fallito');
    }
  }

  async updatePassword(
    userId: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    try {
      const { error } = await this.supabaseService.auth.updateUser({
        password: updatePasswordDto.password,
      });

      if (error) {
        throw new BadRequestException(error.message);
      }
    } catch (error) {
      throw new BadRequestException('Aggiornamento password fallito');
    }
  }

  async validateUser(payload: any): Promise<User> {
    const user = await this.getUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
