import { IsString, IsNotEmpty } from 'class-validator';

// HU-19 (#233, #234): DTO para actualizar exclusivamente observaciones
export class UpdateObservacionesDto {
  @IsString({ message: 'Las observaciones deben ser texto' })
  @IsNotEmpty({ message: 'Las observaciones no pueden estar vacías' })
  observaciones: string;
}
