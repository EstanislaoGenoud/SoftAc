import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { TipoEvaluacion } from '../evaluation.enums.js';

export class CrearEvaluacionDto {
  @IsUUID()
  cursoId: string;

  @IsString()
  @Length(1, 120)
  nombre: string;

  @IsEnum(TipoEvaluacion)
  tipo: TipoEvaluacion;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  ponderacion: number;

  @IsOptional()
  @IsUUID()
  evaluacionOriginalId?: string;
}
