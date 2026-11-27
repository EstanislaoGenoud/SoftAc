import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Curso } from '../../cursos/entities/curso.entity.js';
import { TipoEvaluacion } from '../evaluation.enums.js';

@Entity('evaluaciones')
export class Evaluacion {
  @PrimaryColumn('uuid') id: string;

  @Column({ type: 'char', length: 36 }) curso_id: string;

  @Column({ type: 'varchar', length: 120 }) nombre: string;

  @Column({ type: 'enum', enum: TipoEvaluacion }) tipo: TipoEvaluacion;

  @Column({ type: 'date' }) fecha: string;

  @Column({ type: 'text', nullable: true }) descripcion: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  ponderacion: number;

  @Column({ type: 'char', length: 36, nullable: true })
  evaluacion_original_id: string | null;

  @ManyToOne(() => Curso, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'curso_id' })
  curso: Relation<Curso>;

  @ManyToOne(() => Evaluacion, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluacion_original_id' })
  evaluacionOriginal: Relation<Evaluacion | null>;

  @CreateDateColumn({ name: 'created_at' }) created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
