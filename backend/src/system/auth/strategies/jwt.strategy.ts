import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

export type JwtPayload = { sub: string; email: string; tenantDbName: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key-development', // TODO: Mover a variable de entorno
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.tenantDbName) {
      throw new UnauthorizedException('Token inválido: Falta el contexto del tenant');
    }
    
    // IMPORTANTE: Este objeto es el que NestJS inyecta como `request.user`
    // De aquí nuestro TenantProvider extraerá el 'tenantDbName' para rutear la DB
    return { 
      userId: payload.sub, 
      email: payload.email, 
      tenantDbName: payload.tenantDbName 
    };
  }
}
