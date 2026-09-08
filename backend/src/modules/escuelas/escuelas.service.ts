import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TENANT_CONNECTION } from '../../core/tenant/tenant.provider';
import { Escuela } from './entities/escuela.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EscuelasService {
  private escuelaRepository: Repository<Escuela>;

  constructor(
    @Inject(TENANT_CONNECTION) private dataSource: DataSource,
  ) {
    // Obtenemos el repositorio conectándolo AL VUELO a la BD del tenant actual
    this.escuelaRepository = this.dataSource.getRepository(Escuela);
  }

  async create(createEscuelaDto: Record<string, any>) {
    const escuela = this.escuelaRepository.create({
      id: uuidv4(),
      nombre: createEscuelaDto.nombre,
    });
    return this.escuelaRepository.save(escuela);
  }

  async findAll() {
    // Más adelante agregaremos aquí los JOINs (relaciones) para traer 
    // cantidad de alumnos y cursos como manda la HU-40
    return this.escuelaRepository.find({ where: { activa: true } });
  }
}
