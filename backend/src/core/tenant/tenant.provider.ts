import { Scope, UnauthorizedException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { TenantConnectionManager } from './tenant-connection.manager.js';

export const TENANT_CONNECTION = 'TENANT_CONNECTION';

export const TenantConnectionProvider = {
  provide: TENANT_CONNECTION,
  
  // Scope.REQUEST significa que este código se ejecutará CADA VEZ que alguien haga una petición HTTP.
  // Es la magia que permite que cada profesor se conecte a su propia base de datos dinámicamente.
  scope: Scope.REQUEST, 
  
  // Inyectamos el objeto REQUEST de Express/NestJS para poder leer las cabeceras (headers)
  inject: [REQUEST],
  
  useFactory: async (request: any) => {
    // Cuando la petición pasa por el JwtAuthGuard, este decodifica el token y guarda los datos en request.user.
    // De ahí sacamos el nombre exacto de la base de datos de ESTE docente.
    const tenantDbName = request.user?.tenantDbName;
    
    if (!tenantDbName) {
      throw new UnauthorizedException('No se pudo identificar el entorno del docente en el request.');
    }

    // Como getTenantConnection es un método ESTÁTICO (Global), no usamos "this", 
    // llamamos directamente a la Clase.
    return TenantConnectionManager.getTenantConnection(tenantDbName);
  },
};
