import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class UpdateClaseDto {
  @IsDateString({}, { message: 'La fecha debe tener un formato válido (YYYY-MM-DD)' })
  @IsOptional()
  fecha?: string;

  @IsString()
  @IsOptional()
  @IsIn(['DICTADA', 'SUSPENDIDA', 'FERIADO'], { message: 'El estado debe ser DICTADA, SUSPENDIDA o FERIADO' })
  estado?: string;

  @IsString()
  @IsOptional()
  tema?: string;

  // HU-19 (#234): Modificar observaciones de la clase
  @IsString()
  @IsOptional()
  observaciones?: string;
}
