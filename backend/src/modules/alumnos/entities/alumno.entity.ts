import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('alumnos')
export class Alumno {
  @PrimaryColumn('uuid') id: string;
  
  @Column() nombre: string;
  
  @Column() apellido: string;
  
  @Column({ nullable: true }) identificacion: string;
  
  @CreateDateColumn() created_at: Date;
}
