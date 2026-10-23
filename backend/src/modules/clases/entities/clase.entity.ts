import { Entity, Column, PrimaryColumn, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { CursoMateria } from '../../cursos/entities/curso-materia.entity.js';
import { Asistencia } from '../../asistencias/entities/asistencia.entity.js';

@Entity('clases')
export class Clase {
  @PrimaryColumn('uuid') id: string;
  
  @Column() curso_materia_id: string;

  @Column({ nullable: true }) horario_id?: string | null;
  
  @Column({ type: 'date' }) fecha: string;
  
  // DICTADA, SUSPENDIDA, FERIADO (Esto impacta en las métricas de % de asistencia)
  @Column({ default: 'DICTADA' }) estado: string; 
  
  @Column({ nullable: true, type: 'text' }) tema?: string | null;

  // HU-19 (#234, #236): Registrar y relacionar observaciones de la clase
  @Column({ nullable: true, type: 'text' }) observaciones?: string | null;

  @CreateDateColumn({ name: 'created_at' }) created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  // HU-17 (#215): Relación clase-curso a través de CursoMateria
  @ManyToOne(() => CursoMateria)
  @JoinColumn({ name: 'curso_materia_id' })
  cursoMateria: CursoMateria;

  // HU-13 (#182): Relacionar clase con asistencias
  @OneToMany(() => Asistencia, (asistencia) => asistencia.clase)
  asistencias: Asistencia[];
}

