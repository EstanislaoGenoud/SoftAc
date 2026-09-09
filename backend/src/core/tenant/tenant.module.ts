import { Global, Module } from '@nestjs/common';
import { TenantConnectionManager } from './tenant-connection.manager.js';
import { TenantConnectionProvider, TENANT_CONNECTION } from './tenant.provider.js';

@Global()
@Module({
  providers: [TenantConnectionManager, TenantConnectionProvider],
  exports: [TENANT_CONNECTION, TenantConnectionManager],
})
export class TenantModule {}
