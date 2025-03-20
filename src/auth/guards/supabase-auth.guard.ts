import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) throw new UnauthorizedException('Token mancante');

    const { data, error } = await this.supabaseService
      .getClient()
      .auth.getUser(token);
    if (error || !data.user)
      throw new UnauthorizedException('Token non valido');

    request.user = data.user;
    return true;
  }
}
