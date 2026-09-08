import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository, Like } from 'typeorm';
import { TENANT_CONNECTION } from '../../core/tenant/tenant.provider.js';
import { Alumno } from './entities/alumno.entity.js';
import { Inscripcion } from './entities/inscripcion.entity.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AlumnosService {
  private alumnoRepo: Repository<Alumno>;
  private inscripcionRepo: Repository<Inscripcion>;

  constructor(@Inject(TENANT_CONNECTION) private dataSource: DataSource) {
    this.alumnoRepo = this.dataSource.getRepository(Alumno);
    this.inscripcionRepo = this.dataSource.getRepository(Inscripcion);
  }

  // HU-07: Visualizar listado de alumnos (de una materia/curso específica)
  async findByCursoMateria(cursoMateriaId: string) {
    const inscripciones = await this.inscripcionRepo.find({
      where: { curso_materia_id: cursoMateriaId, estado: 'REGULAR' },
      relations: ['alumno']
    });
    // Retornamos directamente los alumnos extraídos de la inscripción
    return inscripciones.map(i => i.alumno);
  }

  // HU-08: Buscar alumno por nombre o apellido
  async search(query: string) {
    return this.alumnoRepo.find({
      where: [
        { nombre: Like(`%${query}%`) },
        { apellido: Like(`%${query}%`) }
      ],
      take: 10
    });
  }

  // Helper para inscribir rápidamente a un alumno
  async enroll(data: { nombre: string, apellido: string, identificacion?: string, cursoMateriaId: string }) {
    const alumno = this.alumnoRepo.create({
      id: uuidv4(),
      nombre: data.nombre,
      apellido: data.apellido,
      identificacion: data.identificacion
    });
    await this.alumnoRepo.save(alumno);

    const inscripcion = this.inscripcionRepo.create({
      id: uuidv4(),
      alumno_id: alumno.id,
      curso_materia_id: data.cursoMateriaId
    });
    await this.inscripcionRepo.save(inscripcion);

    return { alumno, inscripcion };
  }
}
