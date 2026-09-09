import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenBlacklistService } from './token-blacklist.service.js';
import { Request } from 'express';

export type JwtPayload = { sub: string; email: string; tenantDbName: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly blacklistService: TokenBlacklistService) {
    super({
      // Extraemos el Token del Header: "Authorization: Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // ¡Fundamental! Rechaza tokens vencidos automáticamente.
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key-development',
      passReqToCallback: true, // Nos permite ver el Token crudo en la validación
    });
  }

  // 🛡️ BARRERA DE SEGURIDAD (Se ejecuta en cada petición privada)
  async validate(req: Request, payload: JwtPayload) {
    
    // 1. CONTROL DE LOGOUT (Stateless)
    // Como JWT no tiene estado (no se guarda en BD), usamos una Lista Negra en memoria.
    // Si el profe cerró sesión, su token estará aquí y bloqueamos el paso al instante.
    const token = req.headers.authorization?.split(' ')[1];
    if (token && this.blacklistService.isRevoked(token)) {
      throw new UnauthorizedException('Sesión cerrada. Ingrese nuevamente.');
    }

    // 2. AISLAMIENTO MULTI-TENANT
    // Si algún token modificado maliciosamente llega hasta aquí sin el nombre de su BD, lo tiramos.
    if (!payload.tenantDbName) {
      throw new UnauthorizedException('Token inválido: Falta el contexto de la base de datos (Tenant)');
    }
    
    // Si pasa todas las validaciones, inyectamos estos datos seguros en "req.user"
    return { 
      userId: payload.sub, 
      email: payload.email, 
      tenantDbName: payload.tenantDbName 
    };
  }
}
