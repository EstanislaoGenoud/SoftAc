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

  // HU-07: Listar alumnos de un curso
  async findByCurso(cursoId: string) {
    const inscripciones = await this.inscripcionRepo.find({
      where: { estado: 'REGULAR', cursoMateria: { curso_id: cursoId } },
      relations: ['alumno', 'cursoMateria'] 
    });
    
    // Eliminamos duplicados si un alumno esta en multiples materias del mismo curso
    const alumnosUnicos = new Map();
    inscripciones.forEach(i => {
      if (i.alumno) {
        alumnosUnicos.set(i.alumno.id, i.alumno);
      }
    });

    return Array.from(alumnosUnicos.values());
  }

  // HU-08: Buscador universal de alumnos
  async search(query: string) {
    return this.alumnoRepo.find({
      where: [
        { nombre: Like(`%${query}%`) },
        { apellido: Like(`%${query}%`) }
      ],
      take: 10
    });
  }

  // Inscribir a un alumno
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

  // HU-09: Consultar perfil del alumno (#140, #149, #146, #145)
  async getProfile(alumnoId: string) {
    const alumno = await this.alumnoRepo.findOne({ where: { id: alumnoId } });
    if (!alumno) throw new Error('Alumno no encontrado');

    const inscripciones = await this.inscripcionRepo.find({
      where: { alumno_id: alumnoId },
      relations: ['cursoMateria', 'cursoMateria.curso', 'cursoMateria.materia']
    });

    return {
      ...alumno,
      resumen_academico: {
        total_materias: inscripciones.length,
        materias_activas: inscripciones.filter(i => i.estado === 'REGULAR').length
      },
      calificaciones_recientes: [] 
    };
  }

  // HU-10: Consultar historial academico (#151, #153, #154)
  async getHistorial(alumnoId: string) {
    const inscripciones = await this.inscripcionRepo.find({
      where: { alumno_id: alumnoId },
      relations: ['cursoMateria', 'cursoMateria.curso', 'cursoMateria.materia']
    });
    
    return inscripciones.map(insc => ({
      id_inscripcion: insc.id,
      estado: insc.estado,
      curso: insc.cursoMateria?.curso?.nombre || 'Desconocido',
      materia: insc.cursoMateria?.materia?.nombre || 'Desconocida',
      periodo: insc.cursoMateria?.periodo_lectivo_id || 'N/A'
    }));
  }
}
