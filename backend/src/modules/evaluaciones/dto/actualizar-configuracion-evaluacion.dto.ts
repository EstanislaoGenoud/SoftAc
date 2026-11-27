import { IsEnum, IsOptional } from 'class-validator';
import { ModeloCalificacion, ModoRecuperatorio } from '../evaluation.enums.js';

export class ActualizarConfiguracionEvaluacionDto {
  @IsOptional()
  @IsEnum(ModeloCalificacion)
  modelo?: ModeloCalificacion;

  @IsOptional()
  @IsEnum(ModoRecuperatorio)
  modoRecuperatorio?: ModoRecuperatorio;
}
