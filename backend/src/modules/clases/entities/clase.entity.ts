import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CursoMateria } from '../../cursos/entities/curso-materia.entity.js';

@Entity('clases')
export class Clase {
  @PrimaryColumn('uuid') id: string;
  
  @Column() curso_materia_id: string;
  
  @Column({ type: 'date' }) fecha: string;
  
  // DICTADA, SUSPENDIDA, FERIADO (Esto impacta en las métricas de % de asistencia)
  @Column({ default: 'DICTADA' }) estado: string; 
  
  @Column({ nullable: true, type: 'text' }) tema: string;

  @ManyToOne(() => CursoMateria)
  @JoinColumn({ name: 'curso_materia_id' })
  cursoMateria: CursoMateria;
}
