import { Scope, UnauthorizedException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { TenantConnectionManager } from './tenant-connection.manager.js';

export const TENANT_CONNECTION = 'TENANT_CONNECTION';

export const TenantConnectionProvider = {
  provide: TENANT_CONNECTION,
  scope: Scope.REQUEST, 
  inject: [REQUEST],
  
  useFactory: async (request: any) => {
    // EN NESTJS, la Inyección de Dependencias ocurre ANTES de que los Guards validen.
    // Por lo tanto, request.user aún no existe. Debemos decodificar el token manualmente aquí.
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Falta el token de autorización.');
    }

    const token = authHeader.split(' ')[1];
    
    // Decodificar Base64 del JWT sin dependencias externas
    let tenantDbName;
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadBuffer = Buffer.from(payloadBase64, 'base64');
      const decoded = JSON.parse(payloadBuffer.toString());
      tenantDbName = decoded?.tenantDbName;
    } catch (error) {
      throw new UnauthorizedException('Token con formato inválido.');
    }
    
    if (!tenantDbName) {
      throw new UnauthorizedException('No se pudo identificar el entorno del docente en el request.');
    }

    return TenantConnectionManager.getTenantConnection(tenantDbName);
  },
};
