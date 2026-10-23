import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { EstadoAsistencia } from '../entities/asistencia.entity.js';

// HU-14 (#190, #194): DTO de modificación de asistencia
export class ModificarAsistenciaDto {
  @IsEnum(EstadoAsistencia, { 
    message: 'El estado debe ser uno de: PRESENTE, MEDIA_FALTA, AUSENTE, AUSENTE_CON_CERTIFICADO' 
  })
  @IsOptional()
  estado?: EstadoAsistencia;

  @IsBoolean()
  @IsOptional()
  presente?: boolean;

  @IsString()
  @IsOptional()
  observacion?: string;
}
