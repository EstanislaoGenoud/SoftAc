import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TENANT_CONNECTION } from '../../core/tenant/tenant.provider.js';
import { Clase } from './entities/clase.entity.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ClasesService {
  private claseRepo: Repository<Clase>;

  constructor(@Inject(TENANT_CONNECTION) private dataSource: DataSource) {
    this.claseRepo = this.dataSource.getRepository(Clase);
  }

  async create(data: { cursoMateriaId: string; fecha: string; estado?: string; tema?: string }) {
    const clase = this.claseRepo.create({
      id: uuidv4(),
      curso_materia_id: data.cursoMateriaId,
      fecha: data.fecha,
      estado: data.estado || 'DICTADA',
      tema: data.tema,
    });
    return this.claseRepo.save(clase);
  }

  async findByCursoMateria(cursoMateriaId: string) {
    return this.claseRepo.find({ 
      where: { curso_materia_id: cursoMateriaId },
      order: { fecha: 'DESC' }
    });
  }
}
