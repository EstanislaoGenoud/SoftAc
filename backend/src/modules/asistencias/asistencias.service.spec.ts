import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AsistenciasService } from './asistencias.service.js';
import { Asistencia, EstadoAsistencia } from './entities/asistencia.entity.js';
import { Clase } from '../clases/entities/clase.entity.js';
import { Alumno } from '../alumnos/entities/alumno.entity.js';
import { Inscripcion } from '../alumnos/entities/inscripcion.entity.js';
import { CursoMateria } from '../cursos/entities/curso-materia.entity.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AsistenciasService', () => {
  let service: AsistenciasService;

  const mockAsistenciaRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn((dto) => ({ ...dto })),
    save: vi.fn((entities) => Array.isArray(entities) ? entities : entities),
  };

  const mockClaseRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
  };

  const mockAlumnoRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
  };

  const mockInscripcionRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
  };

  const mockCursoMateriaRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
  };

  const mockDataSource = {
    getRepository: vi.fn((entity) => {
      if (entity === Asistencia) return mockAsistenciaRepo;
      if (entity === Clase) return mockClaseRepo;
      if (entity === Alumno) return mockAlumnoRepo;
      if (entity === Inscripcion) return mockInscripcionRepo;
      if (entity === CursoMateria) return mockCursoMateriaRepo;
      return {};
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AsistenciasService(mockDataSource as any);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  // HU-12: Estados (#173, #175, #176, #177, #178)
  describe('HU-12: Catálogo de estados', () => {
    it('#173: Debería retornar el catálogo de estados con sus valores y propiedades', () => {
      const catalogo = service.getCatalogoEstados();
      expect(catalogo).toHaveProperty(EstadoAsistencia.PRESENTE);
      expect(catalogo).toHaveProperty(EstadoAsistencia.MEDIA_FALTA);
      expect(catalogo).toHaveProperty(EstadoAsistencia.AUSENTE);
      expect(catalogo).toHaveProperty(EstadoAsistencia.AUSENTE_CON_CERTIFICADO);

      // #175
      expect(catalogo[EstadoAsistencia.PRESENTE].valor).toBe(1.0);
      // #176
      expect(catalogo[EstadoAsistencia.MEDIA_FALTA].valor).toBe(0.5);
      // #177
      expect(catalogo[EstadoAsistencia.AUSENTE].valor).toBe(0.0);
      // #178
      expect(catalogo[EstadoAsistencia.AUSENTE_CON_CERTIFICADO].valor).toBe(1.0);
      expect(catalogo[EstadoAsistencia.AUSENTE_CON_CERTIFICADO].justificada).toBe(true);
    });
  });

  // HU-11: Registrar Asistencia (#160, #162, #164, #166, #167, #168, #170)
  describe('HU-11: Registrar asistencia', () => {
    it('#162: Debería obtener los alumnos regulares para tomar asistencia', async () => {
      mockClaseRepo.findOne.mockResolvedValue({ id: 'clase-1', curso_materia_id: 'cm-1' });
      mockInscripcionRepo.find.mockResolvedValue([
        {
          id: 'insc-1',
          estado: 'REGULAR',
          alumno: { id: 'alumno-1', nombre: 'Juan', apellido: 'Perez', identificacion: '123' },
          cursoMateria: { id: 'cm-1', curso_id: 'curso-1' }
        }
      ]);
      mockAsistenciaRepo.find.mockResolvedValue([]);

      const result = await service.obtenerAlumnosParaAsistencia('clase-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('alumno-1');
      expect(result[0].nombre).toBe('Juan');
    });

    it('#166: Debería lanzar NotFoundException si la clase no existe', async () => {
      mockClaseRepo.findOne.mockResolvedValue(null);

      await expect(
        service.registrarMasiva('clase-inexistente', [{ alumnoId: 'alumno-1', presente: true }])
      ).rejects.toThrow(NotFoundException);
    });

    it('#166: Debería lanzar BadRequestException si la clase está SUSPENDIDA', async () => {
      mockClaseRepo.findOne.mockResolvedValue({ id: 'clase-susp', estado: 'SUSPENDIDA' });

      await expect(
        service.registrarMasiva('clase-susp', [{ alumnoId: 'alumno-1', presente: true }])
      ).rejects.toThrow(BadRequestException);
    });

    it('#167, #168, #170: Debería guardar masivamente evitando registros duplicados', async () => {
      mockClaseRepo.findOne.mockResolvedValue({ id: 'clase-1', estado: 'DICTADA' });
      // Simulamos que alumno-1 ya tenía asistencia registrada previamente
      mockAsistenciaRepo.find.mockResolvedValue([
        {
          id: 'asist-1',
          clase_id: 'clase-1',
          alumno_id: 'alumno-1',
          estado: EstadoAsistencia.AUSENTE,
          presente: false
        }
      ]);

      const registros = [
        { alumnoId: 'alumno-1', estado: EstadoAsistencia.PRESENTE },
        { alumnoId: 'alumno-2', estado: EstadoAsistencia.MEDIA_FALTA, observacion: 'Llegó 20 min tarde' }
      ];

      const resultado = await service.registrarMasiva('clase-1', registros);

      expect(resultado).toHaveLength(2);
      // El alumno-1 fue actualizado sin duplicar la fila (#167)
      expect(resultado[0].id).toBe('asist-1');
      expect(resultado[0].estado).toBe(EstadoAsistencia.PRESENTE);
      // El alumno-2 fue creado nuevo (#168)
      expect(resultado[1].alumno_id).toBe('alumno-2');
      expect(resultado[1].estado).toBe(EstadoAsistencia.MEDIA_FALTA);
      expect(mockAsistenciaRepo.save).toHaveBeenCalled();
    });
  });

  // HU-13: Registrar asistencia por clase (#181, #182, #184, #185, #186, #187)
  describe('HU-13: Consultar asistencia por clase e historial cronológico', () => {
    it('#187: Debería consultar la asistencia de una clase con datos de alumno y curso', async () => {
      mockClaseRepo.findOne.mockResolvedValue({
        id: 'clase-1',
        fecha: '2026-03-10',
        tema: 'Introducción a NestJS',
        estado: 'DICTADA',
        cursoMateria: { curso: { nombre: 'Programación III' }, materia: { nombre: 'Backend' } }
      });
      mockAsistenciaRepo.find.mockResolvedValue([
        {
          id: 'asist-1',
          clase_id: 'clase-1',
          alumno_id: 'alumno-1',
          estado: EstadoAsistencia.PRESENTE,
          alumno: { id: 'alumno-1', nombre: 'Estanislao', apellido: 'Geno' }
        }
      ]);

      const resultado = await service.findByClase('clase-1');
      expect(resultado.clase.curso).toBe('Programación III');
      expect(resultado.total_registros).toBe(1);
      expect(resultado.asistencias[0].alumno.nombre).toBe('Estanislao');
    });

    it('#186: Debería retornar el historial cronológico de un alumno', async () => {
      mockAlumnoRepo.findOne.mockResolvedValue({ id: 'alumno-1', nombre: 'Estani' });
      mockAsistenciaRepo.find.mockResolvedValue([
        {
          id: 'asist-1',
          clase_id: 'c1',
          estado: EstadoAsistencia.PRESENTE,
          clase: { fecha: '2026-03-01', tema: 'Clase 1', cursoMateria: { curso: { nombre: 'Matemática' } } }
        },
        {
          id: 'asist-2',
          clase_id: 'c2',
          estado: EstadoAsistencia.AUSENTE,
          clase: { fecha: '2026-03-08', tema: 'Clase 2', cursoMateria: { curso: { nombre: 'Matemática' } } }
        }
      ]);

      const historial = await service.getHistorialAlumno('alumno-1');
      expect(historial).toHaveLength(2);
      expect(historial[0].fecha).toBe('2026-03-08'); // Orden cronológico descendente
      expect(historial[1].fecha).toBe('2026-03-01');
    });
  });

  // HU-14: Modificar asistencia (#189, #190, #191, #194, #195)
  describe('HU-14: Modificar asistencia', () => {
    it('#191: Debería lanzar NotFoundException si no existe el registro de asistencia', async () => {
      mockAsistenciaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.modificarAsistencia('inexistente', { estado: EstadoAsistencia.PRESENTE })
      ).rejects.toThrow(NotFoundException);
    });

    it('#190, #194, #195: Debería permitir modificar estado y observación', async () => {
      const registroExistente = {
        id: 'asist-1',
        clase_id: 'clase-1',
        alumno_id: 'alumno-1',
        estado: EstadoAsistencia.AUSENTE,
        presente: false,
        observacion: null
      };
      mockAsistenciaRepo.findOne.mockResolvedValue(registroExistente);

      const modificado = await service.modificarAsistencia('asist-1', {
        estado: EstadoAsistencia.AUSENTE_CON_CERTIFICADO,
        observacion: 'Certificado médico presentado'
      });

      expect(modificado.estado).toBe(EstadoAsistencia.AUSENTE_CON_CERTIFICADO);
      expect(modificado.presente).toBe(true);
      expect(modificado.observacion).toBe('Certificado médico presentado');
      expect(mockAsistenciaRepo.save).toHaveBeenCalled();
    });
  });

  // HU-15: Calcular porcentaje de asistencia (#197, #198, #199, #200, #201)
  describe('HU-15: Calcular porcentaje de asistencia', () => {
    it('#198, #200, #201: Debería calcular porcentaje aplicando la ponderación de cada estado', async () => {
      mockAlumnoRepo.findOne.mockResolvedValue({ id: 'alumno-1', nombre: 'Juan', apellido: 'Perez' });
      // 4 clases:
      // 1 PRESENTE (1.0)
      // 1 MEDIA_FALTA (0.5)
      // 1 AUSENTE_CON_CERTIFICADO (1.0)
      // 1 AUSENTE (0.0)
      // Total puntos = 1.0 + 0.5 + 1.0 + 0.0 = 2.5
      // Total clases = 4
      // Porcentaje = 2.5 / 4 * 100 = 62.5%
      mockAsistenciaRepo.find.mockResolvedValue([
        { estado: EstadoAsistencia.PRESENTE, clase: { estado: 'DICTADA' } },
        { estado: EstadoAsistencia.MEDIA_FALTA, clase: { estado: 'DICTADA' } },
        { estado: EstadoAsistencia.AUSENTE_CON_CERTIFICADO, clase: { estado: 'DICTADA' } },
        { estado: EstadoAsistencia.AUSENTE, clase: { estado: 'DICTADA' } },
      ]);

      const resultado = await service.calcularPorcentajeAlumno('alumno-1');
      expect(resultado.totalClases).toBe(4);
      expect(resultado.presentes).toBe(1);
      expect(resultado.mediasFaltas).toBe(1);
      expect(resultado.ausentesConCertificado).toBe(1);
      expect(resultado.ausentes).toBe(1);
      expect(resultado.puntosAsistencia).toBe(2.5);
      expect(resultado.porcentaje).toBe(62.5);
    });

    it('Debería retornar 100% si no hubo clases dictadas aún', async () => {
      mockAlumnoRepo.findOne.mockResolvedValue({ id: 'alumno-1' });
      mockAsistenciaRepo.find.mockResolvedValue([]);

      const resultado = await service.calcularPorcentajeAlumno('alumno-1');
      expect(resultado.totalClases).toBe(0);
      expect(resultado.porcentaje).toBe(100);
    });
  });

  // HU-16: Visualizar alumnos con riesgo de inasistencia (#205, #206, #207, #208, #209)
  describe('HU-16: Visualizar alumnos con riesgo de inasistencia', () => {
    it('#206, #207, #208, #209: Debería detectar y ordenar alumnos en riesgo según el umbral configurable', async () => {
      mockCursoMateriaRepo.findOne.mockResolvedValue({ id: 'cm-1', curso_id: 'c-1' });
      mockInscripcionRepo.find.mockResolvedValue([
        { alumno_id: 'a1', estado: 'REGULAR', alumno: { id: 'a1', nombre: 'Alumno Riesgo' } },
        { alumno_id: 'a2', estado: 'REGULAR', alumno: { id: 'a2', nombre: 'Alumno Regular' } }
      ]);

      mockAlumnoRepo.findOne
        .mockResolvedValueOnce({ id: 'a1', nombre: 'Alumno Riesgo' })
        .mockResolvedValueOnce({ id: 'a2', nombre: 'Alumno Regular' });

      // a1 tiene 50% de asistencia (1 de 2)
      // a2 tiene 100% de asistencia (2 de 2)
      mockAsistenciaRepo.find
        .mockResolvedValueOnce([
          { estado: EstadoAsistencia.PRESENTE, clase: { estado: 'DICTADA', curso_materia_id: 'cm-1' } },
          { estado: EstadoAsistencia.AUSENTE, clase: { estado: 'DICTADA', curso_materia_id: 'cm-1' } }
        ])
        .mockResolvedValueOnce([
          { estado: EstadoAsistencia.PRESENTE, clase: { estado: 'DICTADA', curso_materia_id: 'cm-1' } },
          { estado: EstadoAsistencia.PRESENTE, clase: { estado: 'DICTADA', curso_materia_id: 'cm-1' } }
        ]);

      // Consultamos con umbral del 75% (#206, #207)
      const riesgo = await service.getRiesgoInasistencia('cm-1', 75);

      // Solo a1 debe aparecer como alumno en riesgo (#208)
      expect(riesgo).toHaveLength(1);
      expect(riesgo[0].alumno.id).toBe('a1');
      expect(riesgo[0].porcentaje).toBe(50);
      expect(riesgo[0].enRiesgo).toBe(true);
      expect(riesgo[0].estadoRiesgo).toBe('LIBRE');
    });
  });
});
