import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('escuelas')
export class Escuela {
  @PrimaryColumn('uuid') id: string;
  @Column() nombre: string;
  @Column({ nullable: true }) ciudad: string;
  @Column({ default: true }) activa: boolean;
  @CreateDateColumn() created_at: Date;
}
