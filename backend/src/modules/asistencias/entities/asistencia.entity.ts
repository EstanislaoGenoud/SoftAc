import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Clase } from '../../clases/entities/clase.entity.js';
import { Alumno } from '../../alumnos/entities/alumno.entity.js';

@Entity('asistencias')
export class Asistencia {
  @PrimaryColumn('uuid') id: string;
  
  @Column() clase_id: string;
  
  @Column() alumno_id: string;
  
  // True = Presente, False = Ausente
  @Column() presente: boolean;
  
  // Justificaciones o llegadas tarde
  @Column({ nullable: true }) observacion: string;

  @ManyToOne(() => Clase)
  @JoinColumn({ name: 'clase_id' })
  clase: Clase;

  @ManyToOne(() => Alumno)
  @JoinColumn({ name: 'alumno_id' })
  alumno: Alumno;
}
