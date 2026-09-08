import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('materias')
export class Materia {
  @PrimaryColumn('uuid') id: string;
  
  @Column() nombre: string;
}
