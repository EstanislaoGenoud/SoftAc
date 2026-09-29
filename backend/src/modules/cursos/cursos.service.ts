import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TENANT_CONNECTION } from '../../core/tenant/tenant.provider.js';
import { Curso } from './entities/curso.entity.js';
import { Materia } from './entities/materia.entity.js';
import { CursoMateria } from './entities/curso-materia.entity.js';
import { Escuela } from '../escuelas/entities/escuela.entity.js';
import { PeriodoLectivo } from '../escuelas/entities/periodo-lectivo.entity.js';
import { Inscripcion } from '../alumnos/entities/inscripcion.entity.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CursosService {
  private cursoRepo: Repository<Curso>;
  private materiaRepo: Repository<Materia>;
  private cursoMateriaRepo: Repository<CursoMateria>;
  private escuelaRepo: Repository<Escuela>;
  private periodoRepo: Repository<PeriodoLectivo>;
  private inscripcionRepo: Repository<Inscripcion>;

  constructor(@Inject(TENANT_CONNECTION) private dataSource: DataSource) {
    this.cursoRepo = this.dataSource.getRepository(Curso);
    this.materiaRepo = this.dataSource.getRepository(Materia);
    this.cursoMateriaRepo = this.dataSource.getRepository(CursoMateria);
    this.escuelaRepo = this.dataSource.getRepository(Escuela);
    this.periodoRepo = this.dataSource.getRepository(PeriodoLectivo);
    this.inscripcionRepo = this.dataSource.getRepository(Inscripcion);
  }

  // HU-04: Listar cursos
  async findByEscuela(escuelaId: string) {
    return this.cursoRepo.find({ 
      where: { escuela_id: escuelaId },
      relations: ['escuela'] // Trae los datos de la escuela asociada
    });
  }

  // HU-06: Obtener detalle del curso (Escuela y Alumnos)
  async findOne(id: string) {
    const curso = await this.cursoRepo.findOne({
      where: { id },
      relations: ['escuela'] // HU-06 #99: Obtener escuela asociada
    });

    if (!curso) {
      throw new NotFoundException('Curso no encontrado o no pertenece a tu entorno'); // HU-06 #104: Validar permisos
    }

    // HU-06 #101 / HU-45 #113: Obtener cantidad de alumnos a traves de Inscripcion
    const cursoMaterias = await this.cursoMateriaRepo.find({ where: { curso_id: curso.id } });
    const cursoMateriaIds = cursoMaterias.map(cm => cm.id);
    
    let cantidadAlumnos = 0;
    if (cursoMateriaIds.length > 0) {
      cantidadAlumnos = await this.inscripcionRepo
        .createQueryBuilder('inscripcion')
        .where('inscripcion.curso_materia_id IN (:...ids)', { ids: cursoMateriaIds })
        .getCount();
    }

    return { ...curso, cantidad_alumnos: cantidadAlumnos };
  }

  // HU-05: Crear un curso y asociarle una materia
  async createWithMateria(data: { escuelaId: string, nombreCurso: string, nombreMateria: string, periodoId: string }) {
    
    // HU-44 #109: Validar pertenencia de la escuela (seguridad)
    const escuela = await this.escuelaRepo.findOne({ where: { id: data.escuelaId } });
    if (!escuela) {
      throw new NotFoundException('La escuela no existe en tu entorno de trabajo');
    }

    // 1. Creamos el contenedor "Curso"
    let curso = this.cursoRepo.create({ id: uuidv4(), escuela_id: data.escuelaId, nombre: data.nombreCurso });
    await this.cursoRepo.save(curso);

    // 2. Buscamos o creamos la "Materia"
    let materia = await this.materiaRepo.findOne({ where: { nombre: data.nombreMateria } });
    if (!materia) {
      materia = this.materiaRepo.create({ id: uuidv4(), nombre: data.nombreMateria });
      await this.materiaRepo.save(materia);
    }

    // Solución al 500 FK Constraint: Asegurarnos de tener un periodo_lectivo real
    let periodoId = data.periodoId;
    if (!periodoId) {
      let periodo = await this.periodoRepo.findOne({ where: { escuela_id: escuela.id, actual: true } });
      if (!periodo) {
        periodo = this.periodoRepo.create({
          id: uuidv4(),
          escuela_id: escuela.id,
          nombre: 'Ciclo 2026',
          fecha_inicio: '2026-03-01',
          fecha_fin: '2026-12-15',
          actual: true
        });
        await this.periodoRepo.save(periodo);
      }
      periodoId = periodo.id;
    }

    // 3. Creamos el eslabon "CursoMateria"
    const cursoMateria = this.cursoMateriaRepo.create({
      id: uuidv4(),
      curso_id: curso.id,
      materia_id: materia.id,
      periodo_lectivo_id: periodoId
    });
    await this.cursoMateriaRepo.save(cursoMateria);

    return { curso, materia, cursoMateria };
  }
}
