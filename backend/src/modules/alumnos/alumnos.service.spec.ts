import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CursoMateria } from '../cursos/entities/curso-materia.entity.js';
import { Alumno } from './entities/alumno.entity.js';
import { Inscripcion } from './entities/inscripcion.entity.js';
import { AlumnosService } from './alumnos.service.js';

describe('AlumnosService.enroll', () => {
  let service: AlumnosService;

  const alumnoRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn((data) => ({ ...data })),
  };
  const inscripcionRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn((data) => ({ ...data })),
  };
  const cursoMateriaRepo = { find: vi.fn(), findOne: vi.fn() };
  const manager = { save: vi.fn((_entity, data) => data) };

  const dataSource = {
    getRepository: vi.fn((entity) => {
      if (entity === Alumno) return alumnoRepo;
      if (entity === Inscripcion) return inscripcionRepo;
      if (entity === CursoMateria) return cursoMateriaRepo;
      return {};
    }),
    transaction: vi.fn((work) => work(manager)),
  };

  const cursoMateria = { id: 'cm-1', curso_id: 'curso-1', materia_id: 'materia-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    cursoMateriaRepo.find.mockResolvedValue([cursoMateria]);
    cursoMateriaRepo.findOne.mockResolvedValue(null);
    alumnoRepo.findOne.mockResolvedValue(null);
    inscripcionRepo.findOne.mockResolvedValue(null);
    service = new AlumnosService(dataSource as any);
  });

  it('inscribe en la materia del curso cuando solo llega cursoId', async () => {
    const result = await service.enroll({
      nombre: '  Martina ',
      apellido: ' López ',
      identificacion: '44123987',
      cursoId: 'curso-1',
    });

    expect(cursoMateriaRepo.find).toHaveBeenCalledWith({ where: { curso_id: 'curso-1' } });
    expect(result.alumno).toMatchObject({ nombre: 'Martina', apellido: 'López', identificacion: '44123987' });
    expect(result.inscripcion).toMatchObject({
      alumno_id: result.alumno.id,
      curso_materia_id: 'cm-1',
      estado: 'REGULAR',
    });
    expect(result.alumno_existente).toBe(false);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.save).toHaveBeenCalledWith(Alumno, result.alumno);
    expect(manager.save).toHaveBeenCalledWith(Inscripcion, result.inscripcion);
  });

  it('acepta cursoMateriaId directo y valida que exista', async () => {
    cursoMateriaRepo.findOne.mockResolvedValue(cursoMateria);
    const result = await service.enroll({ nombre: 'Ana', apellido: 'Paz', cursoMateriaId: 'cm-1' });
    expect(result.inscripcion.curso_materia_id).toBe('cm-1');

    cursoMateriaRepo.findOne.mockResolvedValue(null);
    await expect(service.enroll({ nombre: 'Ana', apellido: 'Paz', cursoMateriaId: 'nope' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('explica el problema si el curso no tiene materia (antes daba error 500 y dejaba un alumno huérfano)', async () => {
    cursoMateriaRepo.find.mockResolvedValue([]);

    await expect(service.enroll({ nombre: 'Ana', apellido: 'Paz', cursoId: 'curso-sin-materia' }))
      .rejects.toThrow(/no tiene una materia asociada/);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('pide materiaId cuando el curso tiene varias materias', async () => {
    cursoMateriaRepo.find.mockResolvedValue([cursoMateria, { ...cursoMateria, id: 'cm-2', materia_id: 'materia-2' }]);

    await expect(service.enroll({ nombre: 'Ana', apellido: 'Paz', cursoId: 'curso-1' }))
      .rejects.toThrow(/varias materias/);
  });

  it('filtra por materiaId cuando se indica', async () => {
    await service.enroll({ nombre: 'Ana', apellido: 'Paz', cursoId: 'curso-1', materiaId: 'materia-1' });
    expect(cursoMateriaRepo.find).toHaveBeenCalledWith({ where: { curso_id: 'curso-1', materia_id: 'materia-1' } });
  });

  it('exige curso y datos del alumno', async () => {
    await expect(service.enroll({ nombre: 'Ana', apellido: 'Paz' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.enroll({ nombre: '  ', apellido: 'Paz', cursoId: 'curso-1' }))
      .rejects.toThrow(/nombre y el apellido/);
  });

  it('reutiliza un alumno existente con el mismo DNI y lo inscribe en el nuevo curso', async () => {
    const existente = { id: 'alumno-1', nombre: 'Martina', apellido: 'López', identificacion: '44123987' };
    alumnoRepo.findOne.mockResolvedValue(existente);

    const result = await service.enroll({ nombre: 'Otro', apellido: 'Nombre', identificacion: '44123987', cursoId: 'curso-1' });

    expect(alumnoRepo.findOne).toHaveBeenCalledWith({ where: { identificacion: '44123987' } });
    expect(result.alumno).toBe(existente);
    expect(result.alumno_existente).toBe(true);
    expect(manager.save).not.toHaveBeenCalledWith(Alumno, expect.anything());
    expect(result.inscripcion).toMatchObject({ alumno_id: 'alumno-1', curso_materia_id: 'cm-1' });
  });

  it('rechaza inscribir dos veces al mismo alumno en el curso', async () => {
    alumnoRepo.findOne.mockResolvedValue({ id: 'alumno-1', nombre: 'Martina', apellido: 'López' });
    inscripcionRepo.findOne.mockResolvedValue({ id: 'insc-1', estado: 'REGULAR' });

    await expect(service.enroll({ alumnoId: 'alumno-1', cursoId: 'curso-1' }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('reactiva una inscripción dada de baja en lugar de duplicarla', async () => {
    alumnoRepo.findOne.mockResolvedValue({ id: 'alumno-1', nombre: 'Martina', apellido: 'López' });
    inscripcionRepo.findOne.mockResolvedValue({ id: 'insc-1', alumno_id: 'alumno-1', curso_materia_id: 'cm-1', estado: 'BAJA' });

    const result = await service.enroll({ alumnoId: 'alumno-1', cursoId: 'curso-1' });

    expect(result.inscripcion).toMatchObject({ id: 'insc-1', estado: 'REGULAR' });
    expect(inscripcionRepo.create).not.toHaveBeenCalled();
  });

  it('responde 404 si el alumnoId no existe', async () => {
    await expect(service.enroll({ alumnoId: 'nope', cursoId: 'curso-1' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
