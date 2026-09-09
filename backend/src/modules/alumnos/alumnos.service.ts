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

  // HU-07: Listar alumnos de una materia
  async findByCursoMateria(cursoMateriaId: string) {
    // Buscamos todas las "inscripciones" activas para esta comisión (Curso + Materia)
    const inscripciones = await this.inscripcionRepo.find({
      where: { curso_materia_id: cursoMateriaId, estado: 'REGULAR' },
      relations: ['alumno'] // El JOIN: Le decimos a SQL que también traiga los datos del alumno pegados a la inscripción
    });
    
    // El frontend solo quiere la lista de alumnos, así que extraemos ".alumno" del array de inscripciones
    // usando la función map de JavaScript y limpiamos la respuesta.
    return inscripciones.map(i => i.alumno);
  }

  // HU-08: Buscador universal de alumnos
  async search(query: string) {
    // Permite al profesor buscar un alumno tipeando "Juan" o "Perez" en un buscador global
    return this.alumnoRepo.find({
      where: [
        { nombre: Like(`%${query}%`) }, // %juan% buscará cualquier nombre que contenga "juan"
        { apellido: Like(`%${query}%`) }
      ],
      take: 10 // Limitamos a 10 resultados para no sobrecargar el frontend si hay muchos "Juan"
    });
  }

  // Inscribir a un alumno rápidamente
  async enroll(data: { nombre: string, apellido: string, identificacion?: string, cursoMateriaId: string }) {
    
    // 1. Damos de alta al alumno en el padrón global del colegio
    const alumno = this.alumnoRepo.create({
      id: uuidv4(),
      nombre: data.nombre,
      apellido: data.apellido,
      identificacion: data.identificacion
    });
    await this.alumnoRepo.save(alumno);

    // 2. Lo vinculamos (inscribimos) específicamente a esta comisión (CursoMateria)
    const inscripcion = this.inscripcionRepo.create({
      id: uuidv4(),
      alumno_id: alumno.id,
      curso_materia_id: data.cursoMateriaId
    });
    await this.inscripcionRepo.save(inscripcion);

    return { alumno, inscripcion };
  }
}
