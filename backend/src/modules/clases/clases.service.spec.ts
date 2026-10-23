import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClasesService } from './clases.service.js';
import { Clase } from './entities/clase.entity.js';
import { CursoMateria } from '../cursos/entities/curso-materia.entity.js';
import { NotFoundException } from '@nestjs/common';

describe('ClasesService', () => {
  let service: ClasesService;

  const mockClaseRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn((dto) => ({ ...dto })),
    save: vi.fn((entity) => entity),
  };

  const mockCursoMateriaRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
  };

  const mockDataSource = {
    getRepository: vi.fn((entity) => {
      if (entity === Clase) return mockClaseRepo;
      if (entity === CursoMateria) return mockCursoMateriaRepo;
      return {};
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClasesService(mockDataSource as any);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  // HU-17: Registrar una clase (#213, #214, #215, #220)
  describe('HU-17: Registrar una clase', () => {
    it('#214, #215, #220: Debería registrar una clase validando la relación curso-materia', async () => {
      mockCursoMateriaRepo.findOne.mockResolvedValue({
        id: 'cm-1',
        curso: { id: 'c-1', nombre: '1ro A' },
        materia: { id: 'm-1', nombre: 'Historia' }
      });

      const nuevaClase = await service.create({
        cursoMateriaId: 'cm-1',
        fecha: '2026-04-15',
        tema: 'Revolución de Mayo',
        observaciones: 'Participación activa de los alumnos'
      });

      expect(nuevaClase).toBeDefined();
      expect(nuevaClase.curso_materia_id).toBe('cm-1');
      expect(nuevaClase.fecha).toBe('2026-04-15');
      expect(nuevaClase.tema).toBe('Revolución de Mayo');
      expect(nuevaClase.observaciones).toBe('Participación activa de los alumnos');
      expect(mockClaseRepo.save).toHaveBeenCalled();
    });

    it('#215: Debería lanzar NotFoundException si no existe el curso o cursoMateria', async () => {
      mockCursoMateriaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          cursoMateriaId: 'inexistente',
          fecha: '2026-04-15'
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  // HU-18: Consultar la última clase (#223, #224, #226)
  describe('HU-18: Consultar la última clase', () => {
    it('#224, #226: Debería retornar la última clase registrada ordenada cronológicamente', async () => {
      const mockUltima = {
        id: 'clase-ultima',
        fecha: '2026-04-20',
        tema: 'Último tema dictado',
        estado: 'DICTADA',
        observaciones: 'Sin observaciones',
        cursoMateria: { curso: { nombre: '1ro A' } }
      };

      mockClaseRepo.findOne.mockResolvedValue(mockUltima);

      const resultado = await service.findUltimaClase('cm-1');
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe('clase-ultima');
      expect(resultado.fecha).toBe('2026-04-20');
      expect(mockClaseRepo.findOne).toHaveBeenCalled();
    });

    it('#224: Debería lanzar NotFoundException si no hay clases para el curso', async () => {
      mockClaseRepo.findOne.mockResolvedValue(null);
      mockCursoMateriaRepo.find.mockResolvedValue([]);

      await expect(
        service.findUltimaClase('cm-sin-clases')
      ).rejects.toThrow(NotFoundException);
    });
  });

  // HU-19: Registrar observaciones de la clase (#231, #233, #234, #236)
  describe('HU-19: Registrar observaciones de la clase', () => {
    it('#233, #234, #236: Debería actualizar y persistir las observaciones en la clase', async () => {
      const claseExistente = {
        id: 'clase-1',
        tema: 'Matemática básica',
        observaciones: null
      };

      mockClaseRepo.findOne.mockResolvedValue(claseExistente);

      const resultado = await service.updateObservaciones('clase-1', {
        observaciones: 'Se reprogramó el examen para la próxima semana'
      });

      expect(resultado.observaciones).toBe('Se reprogramó el examen para la próxima semana');
      expect(mockClaseRepo.save).toHaveBeenCalled();
    });

    it('Debería lanzar NotFoundException si la clase a actualizar no existe', async () => {
      mockClaseRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateObservaciones('inexistente', { observaciones: 'Test' })
      ).rejects.toThrow(NotFoundException);
    });
  });
});
