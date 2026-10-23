import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';
import { Clase } from '../../clases/entities/clase.entity.js';
import { Alumno } from '../../alumnos/entities/alumno.entity.js';

// HU-12 (#173): Catálogo y Enum de estados de asistencia
export enum EstadoAsistencia {
  PRESENTE = 'PRESENTE',                         // #175
  MEDIA_FALTA = 'MEDIA_FALTA',                   // #176
  AUSENTE = 'AUSENTE',                           // #177
  AUSENTE_CON_CERTIFICADO = 'AUSENTE_CON_CERTIFICADO' // #178
}

// Catálogo enriquecido de estados con metadatos y ponderación para cálculos
export const CATALOGO_ESTADOS_ASISTENCIA = {
  [EstadoAsistencia.PRESENTE]: {
    id: EstadoAsistencia.PRESENTE,
    label: 'Presente',
    valor: 1.0,
    cuentaAsistencia: true,
    esFalta: false
  },
  [EstadoAsistencia.MEDIA_FALTA]: {
    id: EstadoAsistencia.MEDIA_FALTA,
    label: 'Media Falta',
    valor: 0.5,
    cuentaAsistencia: true,
    esFalta: true
  },
  [EstadoAsistencia.AUSENTE]: {
    id: EstadoAsistencia.AUSENTE,
    label: 'Ausente',
    valor: 0.0,
    cuentaAsistencia: false,
    esFalta: true
  },
  [EstadoAsistencia.AUSENTE_CON_CERTIFICADO]: {
    id: EstadoAsistencia.AUSENTE_CON_CERTIFICADO,
    label: 'Ausente con certificado (Justificada)',
    valor: 1.0,
    cuentaAsistencia: true,
    esFalta: false,
    justificada: true
  }
};

// HU-11 (#163, #167): Modelo de asistencia con prevención de duplicados
@Entity('asistencias')
@Unique('idx_clase_alumno_unique', ['clase_id', 'alumno_id'])
export class Asistencia {
  @PrimaryColumn('uuid') id: string;
  
  @Column() clase_id: string;
  
  @Column() alumno_id: string;
  
  // HU-12: Estados de asistencia
  @Column({ 
    type: 'varchar', 
    length: 30, 
    default: EstadoAsistencia.PRESENTE 
  }) 
  estado: EstadoAsistencia;

  // Compatibilidad booleana (True = Presente o justificado, False = Ausente)
  @Column({ default: true }) presente: boolean;
  
  // Justificaciones, certificados o llegadas tarde
  @Column({ nullable: true, type: 'text' }) observacion?: string | null;

  @CreateDateColumn({ name: 'created_at' }) created_at: Date;

  // HU-14 (#195): Registrar fecha de modificación si corresponde
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  // HU-13 (#182): Relacionar asistencia con clase
  @ManyToOne(() => Clase, (clase) => clase.asistencias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clase_id' })
  clase: Clase;

  // HU-13 (#185): Asociar alumno
  @ManyToOne(() => Alumno, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'alumno_id' })
  alumno: Alumno;
}

