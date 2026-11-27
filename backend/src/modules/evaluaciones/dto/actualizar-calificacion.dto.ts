import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ModeloCalificacion } from '../evaluation.enums.js';

export class ActualizarCalificacionDto {
  @IsNotEmpty()
  nota: number | string;

  @IsOptional()
  @IsEnum(ModeloCalificacion)
  modelo?: ModeloCalificacion;
}
