import { Module, Global } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../users/entities/usuario.entity.js';
import { Tenant } from '../users/entities/tenant.entity.js';
import { TokenBlacklistService } from './token-blacklist.service.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, Tenant]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key-development',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, JwtStrategy, TokenBlacklistService, JwtAuthGuard],
  controllers: [AuthController],
  exports: [PassportModule, JwtModule, JwtStrategy, JwtAuthGuard],
})
export class AuthModule {}
