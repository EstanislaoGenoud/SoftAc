import { IsString, IsNotEmpty, IsOptional, IsDateString, IsIn } from 'class-validator';

// HU-17 (#220): DTO de creación de clase
export class CreateClaseDto {
  @IsString({ message: 'El cursoMateriaId debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El ID del curso o materia es obligatorio' })
  cursoMateriaId: string;

  @IsDateString({}, { message: 'La fecha debe tener un formato de fecha válido (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  fecha: string;

  @IsString()
  @IsOptional()
  @IsIn(['DICTADA', 'SUSPENDIDA', 'FERIADO'], { message: 'El estado debe ser DICTADA, SUSPENDIDA o FERIADO' })
  estado?: string;

  @IsString()
  @IsOptional()
  tema?: string;

  // HU-19 (#234): Permitir registrar observaciones
  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsString()
  @IsOptional()
  horarioId?: string;
}
