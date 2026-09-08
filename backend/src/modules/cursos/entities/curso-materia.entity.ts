import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Curso } from './curso.entity.js';
import { Materia } from './materia.entity.js';
import { PeriodoLectivo } from '../../escuelas/entities/periodo-lectivo.entity.js';

@Entity('cursos_materias')
export class CursoMateria {
  @PrimaryColumn('uuid') id: string;
  
  @Column() curso_id: string;
  
  @Column() materia_id: string;
  
  @Column() periodo_lectivo_id: string;

  @ManyToOne(() => Curso)
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;

  @ManyToOne(() => Materia)
  @JoinColumn({ name: 'materia_id' })
  materia: Materia;

  @ManyToOne(() => PeriodoLectivo)
  @JoinColumn({ name: 'periodo_lectivo_id' })
  periodoLectivo: PeriodoLectivo;
}
