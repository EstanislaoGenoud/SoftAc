import { DataSourceOptions } from 'typeorm';

export const tenantBaseConfig: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  // Nota: entities se cargarán de forma global o indicando el path
  entities: [import.meta.dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: false, // ¡Muy importante en multi-tenant no sincronizar en auto!
  logging: true,
};
