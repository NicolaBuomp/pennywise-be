# Sistema di Autenticazione con Supabase

Questo modulo implementa l'autenticazione utilizzando Supabase JWT.

## Endpoints disponibili

- `POST /api/auth/register`: Registrazione nuovo utente
- `POST /api/auth/login`: Login utente
- `POST /api/auth/logout`: Logout utente (richiede autenticazione)
- `GET /api/auth/me`: Ottiene il profilo utente corrente (richiede autenticazione)
- `POST /api/auth/reset-password`: Invia email per reset password
- `POST /api/auth/update-password`: Aggiorna password (richiede autenticazione)

## Esempio di utilizzo

### Registrazione
```typescript
// Client-side
const response = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'utente@example.com',
    password: 'password123',
    firstName: 'Nome',
    lastName: 'Cognome'
  }),
});

const data = await response.json();
// Salva il token JWT per le richieste autenticate
localStorage.setItem('token', data.token);
```

### Login
```typescript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'utente@example.com',
    password: 'password123',
  }),
});

const data = await response.json();
localStorage.setItem('token', data.token);
```

### Richieste autenticate
```typescript
// Usa il token per le richieste autenticate
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:3000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const profile = await response.json();
```

## Protezione delle rotte nel backend

```typescript
// Esempio di controller con rotta protetta
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/interfaces/user.interface';

@Controller('example')
export class ExampleController {
  @UseGuards(JwtAuthGuard)
  @Get()
  getProtectedData(@CurrentUser() user: User) {
    // Solo utenti autenticati possono accedere
    return { message: `Hello ${user.email}!`, data: 'Protected data' };
  }
}
```
