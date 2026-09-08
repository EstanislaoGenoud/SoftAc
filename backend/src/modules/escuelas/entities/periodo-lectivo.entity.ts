import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Escuela } from './escuela.entity.js';

@Entity('periodos_lectivos')
export class PeriodoLectivo {
  @PrimaryColumn('uuid') id: string;
  
  @Column() escuela_id: string;
  
  @Column() nombre: string;
  
  @Column({ type: 'date' }) fecha_inicio: string;
  
  @Column({ type: 'date' }) fecha_fin: string;
  
  @Column({ default: false }) actual: boolean;

  @ManyToOne(() => Escuela)
  @JoinColumn({ name: 'escuela_id' })
  escuela: Escuela;
}
