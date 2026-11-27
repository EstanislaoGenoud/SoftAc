import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Curso } from '../../cursos/entities/curso.entity.js';
import { ModeloCalificacion, ModoRecuperatorio } from '../evaluation.enums.js';

@Entity('configuracion_evaluaciones')
export class ConfiguracionEvaluacion {
  @PrimaryColumn('char', { length: 36 }) curso_id: string;

  @Column({
    type: 'enum',
    enum: ModeloCalificacion,
    default: ModeloCalificacion.CUANTITATIVO,
  })
  modelo: ModeloCalificacion;

  @Column({
    type: 'enum',
    enum: ModoRecuperatorio,
    default: ModoRecuperatorio.MAYOR,
  })
  modo_recuperatorio: ModoRecuperatorio;

  @OneToOne(() => Curso, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'curso_id' })
  curso: Relation<Curso>;

  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
