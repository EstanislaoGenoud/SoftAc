import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateEscuelaDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre de la escuela es obligatorio' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder los 100 caracteres' })
  nombre: string;

  @IsString({ message: 'La ciudad debe ser un texto' })
  @IsOptional()
  @MaxLength(100, { message: 'La ciudad no puede exceder los 100 caracteres' })
  ciudad?: string;
}
