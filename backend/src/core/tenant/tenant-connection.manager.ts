import { DataSource, DataSourceOptions } from 'typeorm';
import { tenantBaseConfig } from '../../config/database.config.js';

export class TenantConnectionManager {
  // 🧠 CACHÉ DE CONEXIONES
  // Mantener una conexión a base de datos abierta consume mucha memoria. 
  // Usamos este Mapa para "recordar" las conexiones. Si el profe Juan ya se conectó hoy,
  // reutilizamos su conexión en lugar de crear una nueva, optimizando el servidor al máximo.
  private static connections = new Map<string, DataSource>();

  static async getTenantConnection(tenantDbName: string): Promise<DataSource> {
    // 1. Verificamos si ya tenemos una conexión activa y conectada para este docente
    if (this.connections.has(tenantDbName)) {
      const connection = this.connections.get(tenantDbName);
      if (connection && connection.isInitialized) {
        return connection; // ¡Reutilizamos la conexión!
      }
    }

    // 2. Si no existe, creamos una conexión nueva configurada exclusivamente hacia la BD de este profe
    const dataSource = new DataSource({
      ...tenantBaseConfig,
      type: 'mysql', // Forzamos el discriminador para que TypeScript no se confunda
      database: tenantDbName,
    } as any);

    try {
      await dataSource.initialize();
      // 3. La guardamos en nuestra memoria caché para la próxima vez
      this.connections.set(tenantDbName, dataSource);
      console.log(`🔌 Éxito: Conexión establecida con el tenant -> ${tenantDbName}`);
      return dataSource;
    } catch (error) {
      console.error(`❌ Error fatal conectando al tenant ${tenantDbName}:`, error);
      throw error;
    }
  }
}
