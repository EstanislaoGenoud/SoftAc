import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { Tenant } from './tenant.entity.js';

@Entity('usuarios')
export class Usuario {
  @PrimaryColumn('uuid') id: string;
  @Column({ unique: true }) email: string;
  @Column() password_hash: string;
  @Column() nombre: string;
  @Column({ default: 'America/Argentina/Buenos_Aires' }) zona_horaria: string;
  @Column({ default: true }) activo: boolean;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;

  @OneToOne(() => Tenant, (tenant) => tenant.usuario)
  tenant: Relation<Tenant>;
}
