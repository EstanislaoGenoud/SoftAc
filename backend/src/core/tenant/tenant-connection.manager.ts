import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { tenantBaseConfig } from '../../config/database.config.js';

@Injectable()
export class TenantConnectionManager {
  private readonly logger = new Logger(TenantConnectionManager.name);
  private tenantDataSources: Map<string, DataSource> = new Map();

  async getTenantConnection(tenantDbName: string): Promise<DataSource> {
    if (this.tenantDataSources.has(tenantDbName)) {
      const dataSource = this.tenantDataSources.get(tenantDbName);
      if (dataSource?.isInitialized) {
        return dataSource;
      }
    }

    this.logger.log(`Inicializando nueva conexión para el tenant: ${tenantDbName}`);
    
    const dataSource = new DataSource({
      ...tenantBaseConfig,
      type: 'mysql', // Forzamos el discriminador para TypeScript
      database: tenantDbName,
    } as any);

    try {
      await dataSource.initialize();
      this.tenantDataSources.set(tenantDbName, dataSource);
      this.logger.log(`Conexión exitosa al tenant: ${tenantDbName}`);
      return dataSource;
    } catch (error) {
      this.logger.error(`Error al conectar con tenant ${tenantDbName}`, error);
      throw error;
    }
  }
}
