import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Alumno } from './alumno.entity.js';
import { CursoMateria } from '../../cursos/entities/curso-materia.entity.js';

@Entity('inscripciones')
export class Inscripcion {
  @PrimaryColumn('uuid') id: string;
  
  @Column() alumno_id: string;
  
  @Column() curso_materia_id: string;
  
  @Column({ default: 'REGULAR' }) estado: string;

  @ManyToOne(() => Alumno)
  @JoinColumn({ name: 'alumno_id' })
  alumno: Alumno;

  @ManyToOne(() => CursoMateria)
  @JoinColumn({ name: 'curso_materia_id' })
  cursoMateria: CursoMateria;
}
