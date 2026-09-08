import { Scope, UnauthorizedException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { TenantConnectionManager } from './tenant-connection.manager';

export const TENANT_CONNECTION = 'TENANT_CONNECTION';

export const TenantConnectionProvider = {
  provide: TENANT_CONNECTION,
  scope: Scope.REQUEST, 
  inject: [REQUEST, TenantConnectionManager],
  useFactory: async (request: any, connectionManager: TenantConnectionManager) => {
    // Aquí el request.user será inyectado previamente por el AuthGuard (JWT)
    // Para desarrollo, si no hay user, tiramos error (o podríamos mockear uno temporal)
    const tenantDbName = request.user?.tenantDbName;
    
    if (!tenantDbName) {
      throw new UnauthorizedException('No se pudo identificar el entorno del docente en el request.');
    }

    return connectionManager.getTenantConnection(tenantDbName);
  },
};
