import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CursoMateria } from '../../cursos/entities/curso-materia.entity.js';

@Entity('horarios')
export class Horario {
  @PrimaryColumn('uuid') id: string;
  
  @Column() curso_materia_id: string;
  
  // Guardaremos el día como texto (LUNES, MARTES, etc.) o número (1-7). Usamos texto para simplificar MVPs.
  @Column({ length: 15 }) dia_semana: string; 
  
  @Column({ type: 'time' }) hora_inicio: string;
  
  @Column({ type: 'time' }) hora_fin: string;

  @ManyToOne(() => CursoMateria)
  @JoinColumn({ name: 'curso_materia_id' })
  cursoMateria: CursoMateria;
}
