import { Global, Module } from '@nestjs/common';
import { TenantConnectionManager } from './tenant-connection.manager';
import { TenantConnectionProvider, TENANT_CONNECTION } from './tenant.provider';

@Global()
@Module({
  providers: [TenantConnectionManager, TenantConnectionProvider],
  exports: [TENANT_CONNECTION, TenantConnectionManager],
})
export class TenantModule {}
