import {
  BadRequestException,
  ConflictException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TENANT_CONNECTION } from '../../core/tenant/tenant.provider.js';
import { Alumno } from '../alumnos/entities/alumno.entity.js';
import { Inscripcion } from '../alumnos/entities/inscripcion.entity.js';
import { Curso } from '../cursos/entities/curso.entity.js';
import {
  CATEGORIAS_CUALITATIVAS,
  EQUIVALENCIAS_CUALITATIVAS,
  ModeloCalificacion,
  ModoRecuperatorio,
  TipoEvaluacion,
} from './evaluation.enums.js';
import { ActualizarConfiguracionEvaluacionDto } from './dto/actualizar-configuracion-evaluacion.dto.js';
import { ActualizarEvaluacionDto } from './dto/actualizar-evaluacion.dto.js';
import { CalificacionItemDto } from './dto/guardar-calificaciones.dto.js';
import { CrearEvaluacionDto } from './dto/crear-evaluacion.dto.js';
import { CrearRecuperatorioDto } from './dto/crear-recuperatorio.dto.js';
import { Calificacion } from './entities/calificacion.entity.js';
import { ConfiguracionEvaluacion } from './entities/configuracion-evaluacion.entity.js';
import { Evaluacion } from './entities/evaluacion.entity.js';

const EPSILON_PONDERACION = 0.001;

@Injectable()
export class EvaluacionesService {
  private readonly evaluacionRepo: Repository<Evaluacion>;
  private readonly calificacionRepo: Repository<Calificacion>;
  private readonly configuracionRepo: Repository<ConfiguracionEvaluacion>;
  private readonly cursoRepo: Repository<Curso>;
  private readonly alumnoRepo: Repository<Alumno>;
  private readonly inscripcionRepo: Repository<Inscripcion>;

  constructor(@Inject(TENANT_CONNECTION) private readonly dataSource: DataSource) {
    this.evaluacionRepo = dataSource.getRepository(Evaluacion);
    this.calificacionRepo = dataSource.getRepository(Calificacion);
    this.configuracionRepo = dataSource.getRepository(ConfiguracionEvaluacion);
    this.cursoRepo = dataSource.getRepository(Curso);
    this.alumnoRepo = dataSource.getRepository(Alumno);
    this.inscripcionRepo = dataSource.getRepository(Inscripcion);
  }

  getTipos() {
    return Object.values(TipoEvaluacion);
  }

  async findByCurso(cursoId: string) {
    await this.ensureCourse(cursoId);
    return this.evaluacionRepo.find({
      where: { curso_id: cursoId },
      relations: ['evaluacionOriginal'],
      order: { fecha: 'DESC', created_at: 'DESC' },
    });
  }

  async findOne(id: string) {
    const evaluation = await this.evaluacionRepo.findOne({
      where: { id },
      relations: ['curso', 'evaluacionOriginal'],
    });
    if (!evaluation) throw new NotFoundException('Evaluación no encontrada');
    return evaluation;
  }

  async create(dto: CrearEvaluacionDto) {
    await this.ensureCourse(dto.cursoId);
    const original = await this.validateEvaluationFields(dto);
    const normalizedName = dto.nombre.trim();
    if (!normalizedName) throw new BadRequestException('El nombre de la evaluación es obligatorio.');

    const duplicate = await this.evaluacionRepo.findOne({
      where: { curso_id: dto.cursoId, nombre: normalizedName, fecha: dto.fecha },
    });
    if (duplicate) {
      throw new ConflictException('Ya existe una evaluación con ese nombre y fecha en el curso.');
    }

    const weight = Number(dto.ponderacion);
    if (dto.tipo === TipoEvaluacion.RECUPERATORIO && weight !== 0) {
      throw new BadRequestException('Los recuperatorios no llevan ponderación propia.');
    }
    if (dto.tipo !== TipoEvaluacion.RECUPERATORIO) {
      const currentWeight = await this.getOriginalWeightTotal(dto.cursoId);
      if (currentWeight + weight > 100 + EPSILON_PONDERACION) {
        throw new BadRequestException('La suma de ponderaciones no puede superar el 100%.');
      }
    }

    return this.evaluacionRepo.save(
      this.evaluacionRepo.create({
        id: uuidv4(),
        curso_id: dto.cursoId,
        nombre: normalizedName,
        tipo: dto.tipo,
        fecha: dto.fecha,
        descripcion: dto.descripcion?.trim() || null,
        ponderacion: weight,
        evaluacion_original_id: original?.id ?? null,
      }),
    );
  }

  async createRecovery(originalId: string, dto: CrearRecuperatorioDto) {
    const original = await this.findOne(originalId);
    if (original.tipo === TipoEvaluacion.RECUPERATORIO) {
      throw new BadRequestException('Un recuperatorio no puede tener otro recuperatorio asociado.');
    }
    return this.create({
      cursoId: original.curso_id,
      nombre: dto.nombre,
      tipo: TipoEvaluacion.RECUPERATORIO,
      fecha: dto.fecha,
      descripcion: dto.descripcion,
      ponderacion: 0,
      evaluacionOriginalId: original.id,
    });
  }

  async update(id: string, dto: ActualizarEvaluacionDto) {
    const evaluation = await this.findOne(id);
    if (dto.cursoId !== undefined && dto.cursoId !== evaluation.curso_id) {
      throw new BadRequestException('No se puede cambiar el curso de una evaluación creada.');
    }
    if (dto.evaluacionOriginalId !== undefined && dto.evaluacionOriginalId !== evaluation.evaluacion_original_id) {
      throw new BadRequestException('La evaluación original no se puede cambiar luego de crearla.');
    }

    const nextType = dto.tipo ?? evaluation.tipo;
    if ((nextType === TipoEvaluacion.RECUPERATORIO) !== Boolean(evaluation.evaluacion_original_id)) {
      throw new BadRequestException('El tipo de evaluación y la referencia al recuperatorio no coinciden.');
    }
    if (dto.nombre !== undefined) {
      const nextName = dto.nombre.trim();
      if (!nextName) throw new BadRequestException('El nombre de la evaluación es obligatorio.');
      const nextDate = dto.fecha ?? evaluation.fecha;
      const duplicate = await this.evaluacionRepo.findOne({
        where: { curso_id: evaluation.curso_id, nombre: nextName, fecha: nextDate },
      });
      if (duplicate && duplicate.id !== evaluation.id) {
        throw new ConflictException('Ya existe una evaluación con ese nombre y fecha en el curso.');
      }
      evaluation.nombre = nextName;
    } else if (dto.fecha !== undefined) {
      const duplicate = await this.evaluacionRepo.findOne({
        where: { curso_id: evaluation.curso_id, nombre: evaluation.nombre, fecha: dto.fecha },
      });
      if (duplicate && duplicate.id !== evaluation.id) {
        throw new ConflictException('Ya existe una evaluación con ese nombre y fecha en el curso.');
      }
    }
    if (dto.tipo !== undefined) evaluation.tipo = dto.tipo;
    if (dto.fecha !== undefined) evaluation.fecha = dto.fecha;
    if (dto.descripcion !== undefined) evaluation.descripcion = dto.descripcion.trim() || null;

    if (dto.ponderacion !== undefined) {
      const weight = Number(dto.ponderacion);
      if (evaluation.tipo === TipoEvaluacion.RECUPERATORIO && weight !== 0) {
        throw new BadRequestException('Los recuperatorios no llevan ponderación propia.');
      }
      if (evaluation.tipo !== TipoEvaluacion.RECUPERATORIO) {
        const currentWeight = await this.getOriginalWeightTotal(evaluation.curso_id, evaluation.id);
        if (currentWeight + weight > 100 + EPSILON_PONDERACION) {
          throw new BadRequestException('La suma de ponderaciones no puede superar el 100%.');
        }
      }
      evaluation.ponderacion = weight;
    }

    if (evaluation.evaluacion_original_id) {
      const original = await this.findOne(evaluation.evaluacion_original_id);
      if (evaluation.fecha < original.fecha) {
        throw new BadRequestException('La fecha del recuperatorio no puede ser anterior a la evaluación original.');
      }
    } else if (dto.fecha !== undefined) {
      const recoveries = await this.findRecoveries(evaluation.id);
      if (recoveries.some((recovery) => recovery.fecha < evaluation.fecha)) {
        throw new BadRequestException(
          'La evaluación original no puede quedar con fecha posterior a la de sus recuperatorios.',
        );
      }
    }
    return this.evaluacionRepo.save(evaluation);
  }

  /**
   * Elimina una evaluación y sus calificaciones. Si es una evaluación original,
   * también elimina sus recuperatorios (no pueden existir sin la original).
   * Todo ocurre en una transacción para no dejar datos a medio borrar.
   */
  async remove(id: string) {
    const evaluation = await this.findOne(id);
    const recoveryIds = evaluation.tipo === TipoEvaluacion.RECUPERATORIO
      ? []
      : (await this.findRecoveries(evaluation.id)).map((recovery) => recovery.id);
    const evaluationIds = [evaluation.id, ...recoveryIds];

    const calificacionesEliminadas = await this.dataSource.transaction(async (manager) => {
      const gradeResult = await manager.delete(Calificacion, { evaluacion_id: In(evaluationIds) });
      if (recoveryIds.length) await manager.delete(Evaluacion, { id: In(recoveryIds) });
      await manager.delete(Evaluacion, { id: evaluation.id });
      return gradeResult.affected ?? 0;
    });

    return {
      id: evaluation.id,
      curso_id: evaluation.curso_id,
      recuperatorios_eliminados: recoveryIds,
      calificaciones_eliminadas: calificacionesEliminadas,
    };
  }

  async getConfiguracion(cursoId: string) {
    await this.ensureCourse(cursoId);
    const config = await this.configuracionRepo.findOne({ where: { curso_id: cursoId } });
    return config ?? {
      curso_id: cursoId,
      modelo: ModeloCalificacion.CUANTITATIVO,
      modo_recuperatorio: ModoRecuperatorio.MAYOR,
    };
  }

  async updateConfiguracion(cursoId: string, dto: ActualizarConfiguracionEvaluacionDto) {
    await this.ensureCourse(cursoId);
    if (dto.modelo === undefined && dto.modoRecuperatorio === undefined) {
      throw new BadRequestException('Debe indicar al menos una opción de configuración.');
    }
    const current = await this.configuracionRepo.findOne({ where: { curso_id: cursoId } });
    const config = current ?? this.configuracionRepo.create({
      curso_id: cursoId,
      modelo: ModeloCalificacion.CUANTITATIVO,
      modo_recuperatorio: ModoRecuperatorio.MAYOR,
    });
    if (dto.modelo !== undefined) config.modelo = dto.modelo;
    if (dto.modoRecuperatorio !== undefined) config.modo_recuperatorio = dto.modoRecuperatorio;
    return this.configuracionRepo.save(config);
  }

  async getCalificaciones(evaluacionId: string) {
    await this.findOne(evaluacionId);
    const grades = await this.calificacionRepo.find({ where: { evaluacion_id: evaluacionId } });
    return grades.reduce<Record<string, number | string>>((result, grade) => {
      result[grade.alumno_id] = grade.modelo === ModeloCalificacion.CUANTITATIVO
        ? Number(grade.valor_numerico)
        : String(grade.valor_conceptual);
      return result;
    }, {});
  }

  async saveCalificaciones(evaluacionId: string, items: CalificacionItemDto[]) {
    const evaluation = await this.findOne(evaluacionId);
    if (!items?.length) throw new BadRequestException('Debe enviar al menos una calificación.');

    const duplicateStudent = items.find((item, index) => items.findIndex((other) => other.alumnoId === item.alumnoId) !== index);
    if (duplicateStudent) throw new BadRequestException('No repita un alumno dentro del mismo lote.');

    const [enrolledIds, config] = await Promise.all([
      this.getEnrolledStudentIds(evaluation.curso_id),
      this.getConfiguracion(evaluation.curso_id),
    ]);
    for (const item of items) {
      if (!enrolledIds.has(item.alumnoId)) {
        throw new BadRequestException(`El alumno ${item.alumnoId} no está inscripto en el curso de esta evaluación.`);
      }
      this.validateGrade(item.nota, item.modelo ?? config.modelo);
    }

    const existing = await this.calificacionRepo.find({
      where: {
        evaluacion_id: evaluacionId,
        alumno_id: In(items.map((item) => item.alumnoId)),
      },
    });
    const existingByStudent = new Map(existing.map((grade) => [grade.alumno_id, grade]));
    const saved = items.map((item) => {
      const modelo = item.modelo ?? config.modelo;
      const grade = existingByStudent.get(item.alumnoId) ?? this.calificacionRepo.create({
        id: uuidv4(),
        evaluacion_id: evaluacionId,
        alumno_id: item.alumnoId,
      });
      grade.modelo = modelo;
      grade.valor_numerico = modelo === ModeloCalificacion.CUANTITATIVO ? Number(item.nota) : null;
      grade.valor_conceptual = modelo === ModeloCalificacion.CUALITATIVO ? String(item.nota) : null;
      return grade;
    });
    return this.calificacionRepo.save(saved);
  }

  /** Deja al alumno sin calificar en esa evaluación. */
  async removeCalificacion(evaluacionId: string, alumnoId: string) {
    await this.findOne(evaluacionId);
    const grade = await this.calificacionRepo.findOne({
      where: { evaluacion_id: evaluacionId, alumno_id: alumnoId },
    });
    if (!grade) throw new NotFoundException('El alumno no tiene calificación en esta evaluación.');
    await this.calificacionRepo.delete({ id: grade.id });
    return { evaluacion_id: evaluacionId, alumno_id: alumnoId };
  }

  async updateCalificacion(evaluacionId: string, alumnoId: string, item: Omit<CalificacionItemDto, 'alumnoId'>) {
    return this.saveCalificaciones(evaluacionId, [{ ...item, alumnoId }]);
  }

  async calcularPromedios(cursoId: string) {
    await this.ensureCourse(cursoId);
    const [evaluations, studentIds, config] = await Promise.all([
      this.evaluacionRepo.find({ where: { curso_id: cursoId }, order: { fecha: 'ASC' } }),
      this.getEnrolledStudentIds(cursoId),
      this.getConfiguracion(cursoId),
    ]);
    const originals = evaluations.filter((item) => item.tipo !== TipoEvaluacion.RECUPERATORIO);
    const recoveryEvaluations = evaluations.filter((item) => item.tipo === TipoEvaluacion.RECUPERATORIO);
    const totalPonderacion = originals.reduce((sum, item) => sum + Number(item.ponderacion), 0);
    const ponderacionesConfiguradas = Math.abs(totalPonderacion - 100) < EPSILON_PONDERACION;
    const evaluationIds = evaluations.map((item) => item.id);
    const grades = evaluationIds.length
      ? await this.calificacionRepo.find({ where: { evaluacion_id: In(evaluationIds) } })
      : [];
    const gradeMap = new Map(grades.map((grade) => [this.gradeKey(grade.evaluacion_id, grade.alumno_id), this.gradeValue(grade)]));
    const students = await this.getStudentsByIds([...studentIds]);

    const resultados = students.map((alumno) => {
      let totalPonderado = 0;
      let ponderacionValida = 0;
      for (const original of originals) {
        const originalGrade = gradeMap.get(this.gradeKey(original.id, alumno.id));
        const recovery = recoveryEvaluations
          .filter((item) => item.evaluacion_original_id === original.id)
          .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
        const recoveryGrade = recovery ? gradeMap.get(this.gradeKey(recovery.id, alumno.id)) : undefined;
        let effectiveGrade = originalGrade;
        if (recoveryGrade !== undefined && originalGrade === undefined) effectiveGrade = recoveryGrade;
        else if (recoveryGrade !== undefined && originalGrade !== undefined) {
          effectiveGrade = config.modo_recuperatorio === ModoRecuperatorio.PROMEDIO
            ? (originalGrade + recoveryGrade) / 2
            : Math.max(originalGrade, recoveryGrade);
        }
        const weight = Number(original.ponderacion);
        if (effectiveGrade !== undefined && weight > 0) {
          totalPonderado += effectiveGrade * weight;
          ponderacionValida += weight;
        }
      }
      const promedioParcial = ponderacionValida > 0
        ? Number((totalPonderado / ponderacionValida).toFixed(2))
        : null;
      return {
        alumno: this.studentSummary(alumno),
        promedio: ponderacionesConfiguradas ? promedioParcial : null,
        promedio_parcial: promedioParcial,
        ponderacion_valida: Number(ponderacionValida.toFixed(2)),
      };
    });
    const validAverages = resultados.map((item) => item.promedio).filter((value): value is number => value !== null);
    const promedioCurso = ponderacionesConfiguradas && validAverages.length
      ? Number((validAverages.reduce((sum, value) => sum + value, 0) / validAverages.length).toFixed(2))
      : null;

    return {
      curso_id: cursoId,
      total_ponderacion: Number(totalPonderacion.toFixed(2)),
      ponderaciones_configuradas: ponderacionesConfiguradas,
      promedio_curso: promedioCurso,
      modelo: config.modelo,
      modo_recuperatorio: config.modo_recuperatorio,
      alumnos: resultados,
    };
  }

  async getEvolucion(cursoId: string, alumnoId: string, desde?: string, hasta?: string) {
    await this.ensureCourse(cursoId);
    if ((desde && Number.isNaN(Date.parse(desde))) || (hasta && Number.isNaN(Date.parse(hasta)))) {
      throw new BadRequestException('Las fechas del rango deben ser válidas.');
    }
    if (desde && hasta && desde > hasta) {
      throw new BadRequestException('La fecha inicial no puede ser posterior a la fecha final.');
    }
    if (!(await this.getEnrolledStudentIds(cursoId)).has(alumnoId)) {
      throw new NotFoundException('El alumno no está inscripto en este curso.');
    }
    const evaluations = await this.evaluacionRepo.find({
      where: { curso_id: cursoId },
      relations: ['evaluacionOriginal'],
      order: { fecha: 'ASC', created_at: 'ASC' },
    });
    const filtered = evaluations.filter((item) => (!desde || item.fecha >= desde) && (!hasta || item.fecha <= hasta));
    const grades = filtered.length
      ? await this.calificacionRepo.find({
          where: { evaluacion_id: In(filtered.map((item) => item.id)), alumno_id: alumnoId },
        })
      : [];
    const gradeByEvaluation = new Map(grades.map((grade) => [grade.evaluacion_id, grade]));
    const alumno = await this.alumnoRepo.findOne({ where: { id: alumnoId } });
    if (!alumno) throw new NotFoundException('Alumno no encontrado.');
    return {
      alumno: this.studentSummary(alumno),
      desde: desde ?? null,
      hasta: hasta ?? null,
      evaluaciones: filtered.flatMap((evaluation) => {
        const grade = gradeByEvaluation.get(evaluation.id);
        if (!grade) return [];
        return [{
          evaluacion_id: evaluation.id,
          nombre: evaluation.nombre,
          tipo: evaluation.tipo,
          fecha: evaluation.fecha,
          ponderacion: Number(evaluation.ponderacion),
          evaluacion_original_id: evaluation.evaluacion_original_id,
          evaluacion_original_nombre: evaluation.evaluacionOriginal?.nombre ?? null,
          modelo: grade.modelo,
          nota: grade.modelo === ModeloCalificacion.CUANTITATIVO
            ? Number(grade.valor_numerico)
            : grade.valor_conceptual,
          equivalente_numerico: this.gradeValue(grade),
        }];
      }),
    };
  }

  private async validateEvaluationFields(dto: CrearEvaluacionDto): Promise<Evaluacion | null> {
    if (dto.tipo === TipoEvaluacion.RECUPERATORIO) {
      if (!dto.evaluacionOriginalId) {
        throw new BadRequestException('Debe indicar la evaluación original del recuperatorio.');
      }
      const original = await this.findOne(dto.evaluacionOriginalId);
      if (original.tipo === TipoEvaluacion.RECUPERATORIO || original.curso_id !== dto.cursoId) {
        throw new BadRequestException('El recuperatorio debe corresponder a una evaluación original del mismo curso.');
      }
      if (dto.fecha < original.fecha) {
        throw new BadRequestException('La fecha del recuperatorio no puede ser anterior a la evaluación original.');
      }
      return original;
    }
    if (dto.evaluacionOriginalId) {
      throw new BadRequestException('Solo un recuperatorio puede asociarse a una evaluación original.');
    }
    return null;
  }

  private validateGrade(value: number | string, modelo: ModeloCalificacion) {
    if (modelo === ModeloCalificacion.CUANTITATIVO) {
      if (typeof value !== 'number' && typeof value !== 'string') {
        throw new BadRequestException('La nota cuantitativa debe ser un número.');
      }
      if (typeof value === 'string' && value.trim() === '') {
        throw new BadRequestException('La nota cuantitativa no puede estar vacía.');
      }
      const numberValue = Number(value);
      const scaled = numberValue * 100;
      if (!Number.isFinite(numberValue) || numberValue < 1 || numberValue > 10 || Math.abs(scaled - Math.round(scaled)) > 1e-8) {
        throw new BadRequestException('La nota cuantitativa debe estar entre 1 y 10, con hasta dos decimales.');
      }
      return;
    }
    if (typeof value !== 'string' || !CATEGORIAS_CUALITATIVAS.includes(value as (typeof CATEGORIAS_CUALITATIVAS)[number])) {
      throw new BadRequestException(`La nota conceptual debe ser una de: ${CATEGORIAS_CUALITATIVAS.join(', ')}.`);
    }
  }

  private async ensureCourse(cursoId: string) {
    const course = await this.cursoRepo.findOne({ where: { id: cursoId } });
    if (!course) throw new NotFoundException('Curso no encontrado.');
    return course;
  }

  private findRecoveries(originalId: string) {
    return this.evaluacionRepo.find({
      where: { evaluacion_original_id: originalId, tipo: TipoEvaluacion.RECUPERATORIO },
    });
  }

  private async getOriginalWeightTotal(cursoId: string, excludeId?: string) {
    const evaluations = await this.evaluacionRepo.find({ where: { curso_id: cursoId } });
    return evaluations
      .filter((item) => item.tipo !== TipoEvaluacion.RECUPERATORIO && item.id !== excludeId)
      .reduce((sum, item) => sum + Number(item.ponderacion), 0);
  }

  private async getEnrolledStudentIds(cursoId: string) {
    const enrollments = await this.inscripcionRepo.find({
      where: { estado: 'REGULAR', cursoMateria: { curso_id: cursoId } },
      relations: ['alumno', 'cursoMateria'],
    });
    return new Set(enrollments.map((enrollment) => enrollment.alumno_id));
  }

  private async getStudentsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return this.alumnoRepo.find({ where: { id: In(ids) }, order: { apellido: 'ASC', nombre: 'ASC' } });
  }

  private studentSummary(alumno: Alumno) {
    return {
      id: alumno.id,
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      identificacion: alumno.identificacion,
    };
  }

  private gradeKey(evaluationId: string, studentId: string) {
    return `${evaluationId}:${studentId}`;
  }

  private gradeValue(grade: Calificacion) {
    return grade.modelo === ModeloCalificacion.CUANTITATIVO
      ? Number(grade.valor_numerico)
      : EQUIVALENCIAS_CUALITATIVAS[String(grade.valor_conceptual)] ?? Number.NaN;
  }
}
