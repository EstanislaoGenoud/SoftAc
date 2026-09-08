import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TenantModule } from './core/tenant/tenant.module.js';
import { AuthModule } from './system/auth/auth.module.js';
import { EscuelasModule } from './modules/escuelas/escuelas.module.js';
import { CursosModule } from './modules/cursos/cursos.module.js';
import { AlumnosModule } from './modules/alumnos/alumnos.module.js';
import { Usuario } from './system/users/entities/usuario.entity.js';
import { Tenant } from './system/users/entities/tenant.entity.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'sistema_db',
      entities: [Usuario, Tenant],
      synchronize: false, 
    }),
    TenantModule,
    AuthModule,
    EscuelasModule,
    CursosModule,
    AlumnosModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
