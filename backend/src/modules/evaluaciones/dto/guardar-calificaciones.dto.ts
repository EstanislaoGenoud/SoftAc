import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ModeloCalificacion } from '../evaluation.enums.js';

export class CalificacionItemDto {
  @IsUUID()
  alumnoId: string;

  // El tipo de nota es dependiente de `modelo`; el servicio valida el valor
  // numérico o la categoría cualitativa correspondiente.
  @IsNotEmpty()
  nota: number | string;

  @IsOptional()
  @IsEnum(ModeloCalificacion)
  modelo?: ModeloCalificacion;
}

export class GuardarCalificacionesDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CalificacionItemDto)
  calificaciones: CalificacionItemDto[];
}
