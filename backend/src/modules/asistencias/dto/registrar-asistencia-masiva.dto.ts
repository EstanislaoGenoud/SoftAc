import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { RegistroAsistenciaItemDto } from './registro-asistencia-item.dto.js';

// HU-11 (#164, #168): DTO para guardado masivo de asistencias
export class RegistrarAsistenciaMasivaDto {
  @IsArray({ message: 'Los registros deben enviarse como una lista' })
  @ValidateNested({ each: true })
  @Type(() => RegistroAsistenciaItemDto)
  @ArrayMinSize(1, { message: 'Debe incluir al menos un registro de alumno' })
  registros: RegistroAsistenciaItemDto[];
}
