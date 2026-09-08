import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TENANT_CONNECTION } from '../../core/tenant/tenant.provider.js';
import { Curso } from './entities/curso.entity.js';
import { Materia } from './entities/materia.entity.js';
import { CursoMateria } from './entities/curso-materia.entity.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CursosService {
  private cursoRepo: Repository<Curso>;
  private materiaRepo: Repository<Materia>;
  private cursoMateriaRepo: Repository<CursoMateria>;

  constructor(@Inject(TENANT_CONNECTION) private dataSource: DataSource) {
    this.cursoRepo = this.dataSource.getRepository(Curso);
    this.materiaRepo = this.dataSource.getRepository(Materia);
    this.cursoMateriaRepo = this.dataSource.getRepository(CursoMateria);
  }

  // HU-04: Visualizar mis cursos por escuela
  async findByEscuela(escuelaId: string) {
    return this.cursoRepo.find({ where: { escuela_id: escuelaId } });
  }

  // HU-05: Crear un curso y asociarle una materia en un período
  async createWithMateria(data: { escuelaId: string, nombreCurso: string, nombreMateria: string, periodoId: string }) {
    let curso = this.cursoRepo.create({ id: uuidv4(), escuela_id: data.escuelaId, nombre: data.nombreCurso });
    await this.cursoRepo.save(curso);

    // Reutilizar materia si ya existe (Evitar duplicados)
    let materia = await this.materiaRepo.findOne({ where: { nombre: data.nombreMateria } });
    if (!materia) {
      materia = this.materiaRepo.create({ id: uuidv4(), nombre: data.nombreMateria });
      await this.materiaRepo.save(materia);
    }

    // Crear la relación (La comisión real donde se toma lista)
    const cursoMateria = this.cursoMateriaRepo.create({
      id: uuidv4(),
      curso_id: curso.id,
      materia_id: materia.id,
      periodo_lectivo_id: data.periodoId
    });
    await this.cursoMateriaRepo.save(cursoMateria);

    return { curso, materia, cursoMateria };
  }
}
