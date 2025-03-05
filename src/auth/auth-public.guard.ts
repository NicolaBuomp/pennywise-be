import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractJwtFromRequest(request);

    if (!token) {
      // Se non c'è token, consideriamo la richiesta come proveniente da utente non autenticato
      // ma lasciamo passare la richiesta
      return true;
    }

    // Altrimenti eseguiamo la logica standard di AuthGuard
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // Non lanciare un'eccezione se l'autenticazione fallisce
    return user || null; // Restituisce l'utente se autenticato, null altrimenti
  }

  private extractJwtFromRequest(request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
