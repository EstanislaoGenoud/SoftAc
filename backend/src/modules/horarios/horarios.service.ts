import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TENANT_CONNECTION } from '../../core/tenant/tenant.provider.js';
import { Horario } from './entities/horario.entity.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HorariosService {
  private horarioRepo: Repository<Horario>;

  constructor(@Inject(TENANT_CONNECTION) private dataSource: DataSource) {
    this.horarioRepo = this.dataSource.getRepository(Horario);
  }

  async create(data: { cursoMateriaId: string; diaSemana: string; horaInicio: string; horaFin: string }) {
    const horario = this.horarioRepo.create({
      id: uuidv4(),
      curso_materia_id: data.cursoMateriaId,
      dia_semana: data.diaSemana,
      hora_inicio: data.horaInicio,
      hora_fin: data.horaFin,
    });
    return this.horarioRepo.save(horario);
  }

  async findByCursoMateria(cursoMateriaId: string) {
    return this.horarioRepo.find({ where: { curso_materia_id: cursoMateriaId } });
  }
}
