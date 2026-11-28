import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository, Like } from 'typeorm';
import { TENANT_CONNECTION } from '../../core/tenant/tenant.provider.js';
import { Alumno } from './entities/alumno.entity.js';
import { Inscripcion } from './entities/inscripcion.entity.js';
import { CursoMateria } from '../cursos/entities/curso-materia.entity.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AlumnosService {
  private alumnoRepo: Repository<Alumno>;
  private inscripcionRepo: Repository<Inscripcion>;
  private cursoMateriaRepo: Repository<CursoMateria>;

  constructor(@Inject(TENANT_CONNECTION) private dataSource: DataSource) {
    this.alumnoRepo = this.dataSource.getRepository(Alumno);
    this.inscripcionRepo = this.dataSource.getRepository(Inscripcion);
    this.cursoMateriaRepo = this.dataSource.getRepository(CursoMateria);
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

  /**
   * Inscribe un alumno en un curso.
   * - Acepta `cursoId` (lo habitual desde el frontend) o `cursoMateriaId`.
   *   Si el curso tiene más de una materia, hay que indicar `materiaId`.
   * - Si llega `alumnoId`, o una `identificacion` que ya existe, reutiliza ese
   *   alumno en lugar de crear un duplicado (sirve para asignar un alumno
   *   existente a otro curso o institución).
   * - Alumno e inscripción se guardan en una transacción: si falla la
   *   inscripción no queda un alumno huérfano.
   */
  async enroll(data: {
    nombre?: string;
    apellido?: string;
    identificacion?: string;
    alumnoId?: string;
    cursoId?: string;
    cursoMateriaId?: string;
    materiaId?: string;
  }) {
    const cursoMateria = await this.resolveCursoMateria(data);
    const identificacion = data.identificacion?.toString().trim() || undefined;

    let alumno: Alumno | null = null;
    if (data.alumnoId) {
      alumno = await this.alumnoRepo.findOne({ where: { id: data.alumnoId } });
      if (!alumno) throw new NotFoundException('Alumno no encontrado.');
    } else if (identificacion) {
      alumno = await this.alumnoRepo.findOne({ where: { identificacion } });
    }
    const alumnoExistente = Boolean(alumno);

    if (!alumno) {
      const nombre = data.nombre?.trim();
      const apellido = data.apellido?.trim();
      if (!nombre || !apellido) {
        throw new BadRequestException('El nombre y el apellido del alumno son obligatorios.');
      }
      alumno = this.alumnoRepo.create({ id: uuidv4(), nombre, apellido, identificacion });
    }

    const previa = alumnoExistente
      ? await this.inscripcionRepo.findOne({
          where: { alumno_id: alumno.id, curso_materia_id: cursoMateria.id },
        })
      : null;
    if (previa?.estado === 'REGULAR') {
      throw new ConflictException(`${alumno.nombre} ${alumno.apellido} ya está inscripto en este curso.`);
    }

    const alumnoFinal = alumno;
    return this.dataSource.transaction(async (manager) => {
      if (!alumnoExistente) await manager.save(Alumno, alumnoFinal);
      const inscripcion = previa
        ? { ...previa, estado: 'REGULAR' }
        : this.inscripcionRepo.create({
            id: uuidv4(),
            alumno_id: alumnoFinal.id,
            curso_materia_id: cursoMateria.id,
            estado: 'REGULAR',
          });
      await manager.save(Inscripcion, inscripcion);
      return { alumno: alumnoFinal, inscripcion, alumno_existente: alumnoExistente };
    });
  }

  private async resolveCursoMateria(data: { cursoId?: string; cursoMateriaId?: string; materiaId?: string }) {
    if (data.cursoMateriaId) {
      const cursoMateria = await this.cursoMateriaRepo.findOne({ where: { id: data.cursoMateriaId } });
      if (!cursoMateria) throw new NotFoundException('La materia del curso no existe.');
      return cursoMateria;
    }
    if (!data.cursoId) {
      throw new BadRequestException('Debe indicar el curso donde inscribir al alumno.');
    }
    const cursoMaterias = await this.cursoMateriaRepo.find({
      where: data.materiaId
        ? { curso_id: data.cursoId, materia_id: data.materiaId }
        : { curso_id: data.cursoId },
    });
    if (cursoMaterias.length === 0) {
      throw new BadRequestException(
        'El curso no existe o no tiene una materia asociada. Creá el curso con su materia antes de inscribir alumnos.',
      );
    }
    if (cursoMaterias.length > 1) {
      throw new BadRequestException('El curso tiene varias materias: indicá en cuál inscribir al alumno (materiaId).');
    }
    return cursoMaterias[0];
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
