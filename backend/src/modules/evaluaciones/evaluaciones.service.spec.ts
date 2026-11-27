import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Curso } from '../cursos/entities/curso.entity.js';
import { Alumno } from '../alumnos/entities/alumno.entity.js';
import { Inscripcion } from '../alumnos/entities/inscripcion.entity.js';
import {
  ModeloCalificacion,
  ModoRecuperatorio,
  TipoEvaluacion,
} from './evaluation.enums.js';
import { Calificacion } from './entities/calificacion.entity.js';
import { ConfiguracionEvaluacion } from './entities/configuracion-evaluacion.entity.js';
import { Evaluacion } from './entities/evaluacion.entity.js';
import { EvaluacionesService } from './evaluaciones.service.js';

describe('EvaluacionesService', () => {
  let service: EvaluacionesService;

  const evaluationRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn((data) => ({ ...data })),
    save: vi.fn((data) => data),
  };
  const gradeRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn((data) => ({ ...data })),
    save: vi.fn((data) => data),
  };
  const configRepo = { findOne: vi.fn(), create: vi.fn((data) => ({ ...data })), save: vi.fn((data) => data) };
  const courseRepo = { findOne: vi.fn() };
  const studentRepo = { find: vi.fn(), findOne: vi.fn() };
  const enrollmentRepo = { find: vi.fn() };

  const dataSource = {
    getRepository: vi.fn((entity) => {
      if (entity === Evaluacion) return evaluationRepo;
      if (entity === Calificacion) return gradeRepo;
      if (entity === ConfiguracionEvaluacion) return configRepo;
      if (entity === Curso) return courseRepo;
      if (entity === Alumno) return studentRepo;
      if (entity === Inscripcion) return enrollmentRepo;
      return {};
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    evaluationRepo.find.mockResolvedValue([]);
    evaluationRepo.findOne.mockResolvedValue(null);
    gradeRepo.find.mockResolvedValue([]);
    configRepo.findOne.mockResolvedValue(null);
    courseRepo.findOne.mockResolvedValue({ id: 'course-1' });
    enrollmentRepo.find.mockResolvedValue([{ alumno_id: 'student-1' }]);
    studentRepo.find.mockResolvedValue([]);
    studentRepo.findOne.mockResolvedValue({
      id: 'student-1',
      nombre: 'Ana',
      apellido: 'Pérez',
      identificacion: '123',
    });
    service = new EvaluacionesService(dataSource as any);
  });

  it('expone el catálogo inicial de tipos', () => {
    expect(service.getTipos()).toEqual([
      TipoEvaluacion.EXAMEN,
      TipoEvaluacion.TRABAJO_PRACTICO,
      TipoEvaluacion.ORAL,
      TipoEvaluacion.RECUPERATORIO,
    ]);
  });

  it('crea una evaluación con curso, fecha, descripción y ponderación', async () => {
    const result = await service.create({
      cursoId: 'course-1',
      nombre: '  Examen inicial  ',
      tipo: TipoEvaluacion.EXAMEN,
      fecha: '2026-04-10',
      descripcion: '  Unidad 1  ',
      ponderacion: 40,
    });

    expect(result).toMatchObject({
      curso_id: 'course-1',
      nombre: 'Examen inicial',
      fecha: '2026-04-10',
      descripcion: 'Unidad 1',
      ponderacion: 40,
      evaluacion_original_id: null,
    });
    expect(result.id).toBeTruthy();
  });

  it('rechaza ponderaciones que superen el 100%', async () => {
    evaluationRepo.find.mockResolvedValue([
      { id: 'existing', tipo: TipoEvaluacion.EXAMEN, ponderacion: '75' },
    ]);

    await expect(service.create({
      cursoId: 'course-1',
      nombre: 'Examen final',
      tipo: TipoEvaluacion.EXAMEN,
      fecha: '2026-06-10',
      ponderacion: 30,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('guarda notas cuantitativas y actualiza la fila existente para el mismo alumno', async () => {
    evaluationRepo.findOne.mockResolvedValue({
      id: 'evaluation-1',
      curso_id: 'course-1',
      tipo: TipoEvaluacion.EXAMEN,
    });
    gradeRepo.find.mockResolvedValue([{
      id: 'grade-1',
      evaluacion_id: 'evaluation-1',
      alumno_id: 'student-1',
    }]);

    const result = await service.saveCalificaciones('evaluation-1', [
      { alumnoId: 'student-1', nota: 8.5 },
    ]);

    expect(result[0]).toMatchObject({
      id: 'grade-1',
      evaluacion_id: 'evaluation-1',
      alumno_id: 'student-1',
      modelo: ModeloCalificacion.CUANTITATIVO,
      valor_numerico: 8.5,
      valor_conceptual: null,
    });
  });

  it('guarda calificaciones cualitativas con su equivalencia disponible para el promedio', async () => {
    evaluationRepo.findOne.mockResolvedValue({
      id: 'evaluation-1',
      curso_id: 'course-1',
      tipo: TipoEvaluacion.ORAL,
    });

    const result = await service.saveCalificaciones('evaluation-1', [
      { alumnoId: 'student-1', nota: 'Muy bueno', modelo: ModeloCalificacion.CUALITATIVO },
    ]);

    expect(result[0]).toMatchObject({
      modelo: ModeloCalificacion.CUALITATIVO,
      valor_numerico: null,
      valor_conceptual: 'Muy bueno',
    });
  });

  it('rechaza notas fuera del rango cuantitativo', async () => {
    evaluationRepo.findOne.mockResolvedValue({
      id: 'evaluation-1',
      curso_id: 'course-1',
      tipo: TipoEvaluacion.EXAMEN,
    });

    await expect(service.saveCalificaciones('evaluation-1', [
      { alumnoId: 'student-1', nota: 11 },
    ])).rejects.toBeInstanceOf(BadRequestException);
    expect(gradeRepo.save).not.toHaveBeenCalled();
  });

  it('calcula promedio ponderado y aplica la nota mayor del recuperatorio', async () => {
    const evaluations = [
      {
        id: 'original',
        nombre: 'Examen',
        curso_id: 'course-1',
        tipo: TipoEvaluacion.EXAMEN,
        ponderacion: '100',
        evaluacion_original_id: null,
        fecha: '2026-04-01',
      },
      {
        id: 'recovery',
        nombre: 'Recuperatorio',
        curso_id: 'course-1',
        tipo: TipoEvaluacion.RECUPERATORIO,
        ponderacion: '0',
        evaluacion_original_id: 'original',
        fecha: '2026-04-15',
      },
    ];
    evaluationRepo.find.mockResolvedValue(evaluations);
    gradeRepo.find.mockResolvedValue([
      { evaluacion_id: 'original', alumno_id: 'student-1', modelo: ModeloCalificacion.CUANTITATIVO, valor_numerico: '5', valor_conceptual: null },
      { evaluacion_id: 'recovery', alumno_id: 'student-1', modelo: ModeloCalificacion.CUANTITATIVO, valor_numerico: '8', valor_conceptual: null },
    ]);
    studentRepo.find.mockResolvedValue([{
      id: 'student-1', nombre: 'Ana', apellido: 'Pérez', identificacion: '123',
    }]);
    configRepo.findOne.mockResolvedValue({
      curso_id: 'course-1',
      modelo: ModeloCalificacion.CUANTITATIVO,
      modo_recuperatorio: ModoRecuperatorio.MAYOR,
    });

    const result = await service.calcularPromedios('course-1');

    expect(result.ponderaciones_configuradas).toBe(true);
    expect(result.promedio_curso).toBe(8);
    expect(result.alumnos[0].promedio).toBe(8);
  });

  it('crea un recuperatorio enlazado, con fecha y sin ponderación propia', async () => {
    const original = {
      id: 'original',
      curso_id: 'course-1',
      nombre: 'Examen',
      tipo: TipoEvaluacion.EXAMEN,
      fecha: '2026-04-01',
    };
    evaluationRepo.findOne.mockImplementation(({ where }) => where.id === 'original' ? original : null);

    const result = await service.createRecovery('original', {
      nombre: 'Recuperatorio de examen',
      fecha: '2026-04-15',
      descripcion: 'Segunda instancia',
    });

    expect(result).toMatchObject({
      curso_id: 'course-1',
      tipo: TipoEvaluacion.RECUPERATORIO,
      evaluacion_original_id: 'original',
      fecha: '2026-04-15',
      ponderacion: 0,
    });
  });

  it('deja el promedio vacío cuando faltan notas o la ponderación no suma 100', async () => {
    evaluationRepo.find.mockResolvedValue([{
      id: 'evaluation-1',
      curso_id: 'course-1',
      tipo: TipoEvaluacion.EXAMEN,
      ponderacion: '60',
    }]);
    studentRepo.find.mockResolvedValue([{
      id: 'student-1', nombre: 'Ana', apellido: 'Pérez', identificacion: '123',
    }]);
    gradeRepo.find.mockResolvedValue([]);

    const result = await service.calcularPromedios('course-1');

    expect(result.ponderaciones_configuradas).toBe(false);
    expect(result.promedio_curso).toBeNull();
    expect(result.alumnos[0].promedio).toBeNull();
    expect(result.alumnos[0].promedio_parcial).toBeNull();
  });
});
