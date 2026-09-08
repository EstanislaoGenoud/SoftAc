import { Entity, Column, PrimaryColumn, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Usuario } from './usuario.entity.js';

@Entity('tenants')
export class Tenant {
  @PrimaryColumn('uuid') id: string;
  @Column() usuario_id: string;
  @Column({ unique: true }) db_name: string;
  @Column({ default: 'CREADO' }) estado: string;
  @CreateDateColumn() created_at: Date;

  @OneToOne(() => Usuario, usuario => usuario.tenant)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}
