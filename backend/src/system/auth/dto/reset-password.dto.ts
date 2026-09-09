import { IsString, IsNotEmpty, MinLength, IsJWT } from 'class-validator';

export class ResetPasswordDto {
  @IsJWT({ message: 'El token de recuperación no tiene un formato válido' })
  @IsNotEmpty({ message: 'El token es obligatorio' })
  token: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  newPassword: string;
}
