import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Escuela } from '../../escuelas/entities/escuela.entity.js';

@Entity('cursos')
export class Curso {
  @PrimaryColumn('uuid') id: string;
  
  @Column() escuela_id: string;
  
  @Column() nombre: string;

  @ManyToOne(() => Escuela)
  @JoinColumn({ name: 'escuela_id' })
  escuela: Escuela;
}
