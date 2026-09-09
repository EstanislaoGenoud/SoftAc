import { IsString, IsOptional, MinLength, MaxLength, IsBoolean } from 'class-validator';

export class UpdateEscuelaDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsOptional()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder los 100 caracteres' })
  nombre?: string;

  @IsBoolean({ message: 'Activa debe ser verdadero o falso' })
  @IsOptional()
  activa?: boolean;
}
