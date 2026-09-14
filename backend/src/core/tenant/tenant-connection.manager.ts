import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export class TenantConnectionManager {
  // 🧠 CACHÉ DE CONEXIONES
  // Mantener una conexión a base de datos abierta consume mucha memoria. 
  // Usamos este Mapa para "recordar" las conexiones. Si el profe Juan ya se conectó hoy,
  // reutilizamos su conexión en lugar de crear una nueva, optimizando el servidor al máximo.
  private static connections = new Map<string, DataSource>();

  static async getTenantConnection(tenantDbName: string): Promise<DataSource> {
    if (this.connections.has(tenantDbName)) {
      const connection = this.connections.get(tenantDbName);
      if (connection && connection.isInitialized) {
        return connection; 
      }
    }

    // Leemos las credenciales AHORA, para asegurarnos de que ConfigModule ya cargó el .env
    const dataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: tenantDbName,
      entities: [import.meta.dirname + '/../../modules/**/*.entity{.ts,.js}'],
      synchronize: true, // Auto-crear tablas en desarrollo
      logging: true,
    } as any);

    try {
      await dataSource.initialize();
      // En desarrollo, forzamos la sincronización de tablas para el tenant nuevo
      await dataSource.synchronize();
      
      // 3. La guardamos en nuestra memoria caché para la próxima vez
      this.connections.set(tenantDbName, dataSource);
      console.log(`✅ Éxito: Conexión establecida con el tenant -> ${tenantDbName}`);
      return dataSource;
    } catch (error) {
      console.error(`❌ Error fatal conectando al tenant ${tenantDbName}:`, error);
      throw error;
    }
  }
}
