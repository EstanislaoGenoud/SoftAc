import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { EstadoAsistencia } from '../entities/asistencia.entity.js';

// HU-11 (#168), HU-12 (#173, #175-#178)
export class RegistroAsistenciaItemDto {
  @IsString({ message: 'El ID del alumno es obligatorio' })
  @IsNotEmpty({ message: 'El ID del alumno no puede estar vacío' })
  alumnoId: string;

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
