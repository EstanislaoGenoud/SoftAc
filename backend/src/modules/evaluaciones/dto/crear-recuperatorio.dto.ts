import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class CrearRecuperatorioDto {
  @IsString()
  @Length(1, 120)
  nombre: string;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
