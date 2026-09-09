import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TENANT_CONNECTION } from '../../core/tenant/tenant.provider.js';
import { Asistencia } from './entities/asistencia.entity.js';
import { v4 as uuidv4 } from 'uuid';

export interface RegistroAsistencia {
  alumnoId: string;
  presente: boolean;
  observacion?: string;
}

@Injectable()
export class AsistenciasService {
  private asistenciaRepo: Repository<Asistencia>;

  // 💉 INYECCIÓN DE DEPENDENCIAS (Tenant)
  // Aquí no le decimos a qué BD conectarse. El "TENANT_CONNECTION" evalúa automáticamente
  // quién está haciendo la petición leyendo su JWT, y le inyecta SU base de datos al vuelo.
  constructor(@Inject(TENANT_CONNECTION) private dataSource: DataSource) {
    this.asistenciaRepo = this.dataSource.getRepository(Asistencia);
  }

  // ⚡ OPTIMIZACIÓN: BULK INSERT (Inserción Masiva)
  // En lugar de que el frontend haga 40 peticiones HTTP (una por cada alumno de la clase),
  // recibimos un solo Array gigante. Generamos todas las entidades en RAM y luego hacemos
  // un '.save(array)' que ejecuta un único comando SQL de inserción masiva.
  // Esto hace que tomar asistencia tarde 1 milisegundo incluso con internet lento.
  async registrarMasiva(claseId: string, registros: RegistroAsistencia[]) {
    const asistencias = registros.map(reg => this.asistenciaRepo.create({
      id: uuidv4(),
      clase_id: claseId,
      alumno_id: reg.alumnoId,
      presente: reg.presente,
      observacion: reg.observacion
    }));

    return this.asistenciaRepo.save(asistencias);
  }

  async findByClase(claseId: string) {
    // Al pedir la asistencia, también traemos los datos del alumno usando un JOIN (relations)
    return this.asistenciaRepo.find({ 
      where: { clase_id: claseId },
      relations: ['alumno'] 
    });
  }
}
