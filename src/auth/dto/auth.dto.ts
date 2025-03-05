import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  firstName?: string;
  lastName?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;
}

export class UpdatePasswordDto {
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
