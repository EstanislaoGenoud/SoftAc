import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Alumno } from '../../alumnos/entities/alumno.entity.js';
import { Evaluacion } from './evaluacion.entity.js';
import { ModeloCalificacion } from '../evaluation.enums.js';

@Entity('calificaciones')
@Unique('uq_calificacion_evaluacion_alumno', ['evaluacion_id', 'alumno_id'])
export class Calificacion {
  @PrimaryColumn('uuid') id: string;

  @Column({ type: 'char', length: 36 }) evaluacion_id: string;

  @Column({ type: 'char', length: 36 }) alumno_id: string;

  @Column({ type: 'enum', enum: ModeloCalificacion }) modelo: ModeloCalificacion;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  valor_numerico: number | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  valor_conceptual: string | null;

  @ManyToOne(() => Evaluacion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluacion_id' })
  evaluacion: Relation<Evaluacion>;

  @ManyToOne(() => Alumno, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'alumno_id' })
  alumno: Relation<Alumno>;

  @CreateDateColumn({ name: 'created_at' }) created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
