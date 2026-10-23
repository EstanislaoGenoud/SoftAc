import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, Repository, In } from 'typeorm';
import { TENANT_CONNECTION } from '../../core/tenant/tenant.provider.js';
import { Asistencia, EstadoAsistencia, CATALOGO_ESTADOS_ASISTENCIA } from './entities/asistencia.entity.js';
import { Clase } from '../clases/entities/clase.entity.js';
import { Alumno } from '../alumnos/entities/alumno.entity.js';
import { Inscripcion } from '../alumnos/entities/inscripcion.entity.js';
import { CursoMateria } from '../cursos/entities/curso-materia.entity.js';
import { RegistroAsistenciaItemDto } from './dto/registro-asistencia-item.dto.js';
import { ModificarAsistenciaDto } from './dto/modificar-asistencia.dto.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AsistenciasService {
  private asistenciaRepo: Repository<Asistencia>;
  private claseRepo: Repository<Clase>;
  private alumnoRepo: Repository<Alumno>;
  private inscripcionRepo: Repository<Inscripcion>;
  private cursoMateriaRepo: Repository<CursoMateria>;

  constructor(@Inject(TENANT_CONNECTION) private dataSource: DataSource) {
    this.asistenciaRepo = this.dataSource.getRepository(Asistencia);
    this.claseRepo = this.dataSource.getRepository(Clase);
    this.alumnoRepo = this.dataSource.getRepository(Alumno);
    this.inscripcionRepo = this.dataSource.getRepository(Inscripcion);
    this.cursoMateriaRepo = this.dataSource.getRepository(CursoMateria);
  }

  // HU-12 (#173): Obtener catálogo de estados
  getCatalogoEstados() {
    return CATALOGO_ESTADOS_ASISTENCIA;
  }

  // HU-11 (#162): Obtener alumnos del curso listos para tomar asistencia
  async obtenerAlumnosParaAsistencia(cursoOClaseId: string) {
    // 1. Verificamos si es una clase
    const clase = await this.claseRepo.findOne({
      where: { id: cursoOClaseId },
      relations: ['cursoMateria']
    });

    let cursoMateriaId: string | null = null;
    let cursoId: string | null = null;

    if (clase) {
      cursoMateriaId = clase.curso_materia_id;
      cursoId = clase.cursoMateria?.curso_id || null;
    } else {
      // Si no es clase, verificamos si es cursoMateria o curso
      const cm = await this.cursoMateriaRepo.findOne({ where: { id: cursoOClaseId } });
      if (cm) {
        cursoMateriaId = cm.id;
        cursoId = cm.curso_id;
      } else {
        cursoId = cursoOClaseId;
      }
    }

    // Buscamos inscripciones regulares
    const whereCondition: any = { estado: 'REGULAR' };
    if (cursoMateriaId) {
      whereCondition.curso_materia_id = cursoMateriaId;
    } else if (cursoId) {
      whereCondition.cursoMateria = { curso_id: cursoId };
    }

    const inscripciones = await this.inscripcionRepo.find({
      where: whereCondition,
      relations: ['alumno', 'cursoMateria', 'cursoMateria.curso']
    });

    // Filtramos alumnos únicos
    const alumnosMap = new Map<string, any>();
    for (const insc of inscripciones) {
      if (insc.alumno && !alumnosMap.has(insc.alumno.id)) {
        alumnosMap.set(insc.alumno.id, {
          id: insc.alumno.id,
          nombre: insc.alumno.nombre,
          apellido: insc.alumno.apellido,
          identificacion: insc.alumno.identificacion,
          inscripcion_id: insc.id
        });
      }
    }

    const alumnos = Array.from(alumnosMap.values());

    // Si se consultó por clase, traemos las asistencias ya registradas (si existen)
    if (clase) {
      const asistenciasExistentes = await this.asistenciaRepo.find({
        where: { clase_id: clase.id }
      });
      const asistenciasMap = new Map(asistenciasExistentes.map(a => [a.alumno_id, a]));

      return alumnos.map(alumno => {
        const asistencia = asistenciasMap.get(alumno.id);
        return {
          ...alumno,
          asistencia: asistencia ? {
            id: asistencia.id,
            estado: asistencia.estado,
            presente: asistencia.presente,
            observacion: asistencia.observacion,
            updated_at: asistencia.updated_at
          } : null
        };
      });
    }

    return alumnos;
  }

  // HU-11 (#164, #166, #167, #168): Implementar guardado masivo con validaciones y sin duplicados
  async registrarMasiva(claseId: string, registros: RegistroAsistenciaItemDto[]) {
    // #166: Validar existencia de la clase
    const clase = await this.claseRepo.findOne({ where: { id: claseId } });
    if (!clase) {
      throw new NotFoundException(`Clase con ID ${claseId} no encontrada`);
    }

    // #166: Validar que la clase no esté suspendida
    if (clase.estado === 'SUSPENDIDA') {
      throw new BadRequestException('No se puede registrar asistencia en una clase con estado SUSPENDIDA');
    }

    if (!registros || registros.length === 0) {
      throw new BadRequestException('Debe proporcionar al menos un registro de asistencia');
    }

    // #167: Evitar duplicados dentro del lote recibido (conserva el último estado enviado)
    const registrosUnicosMap = new Map<string, RegistroAsistenciaItemDto>();
    for (const reg of registros) {
      registrosUnicosMap.set(reg.alumnoId, reg);
    }
    const registrosUnicos = Array.from(registrosUnicosMap.values());
    const alumnoIds = registrosUnicos.map(r => r.alumnoId);

    // #167: Buscar registros ya existentes en la base de datos para esta clase y estos alumnos
    const asistenciasExistentes = await this.asistenciaRepo.find({
      where: {
        clase_id: claseId,
        alumno_id: In(alumnoIds)
      }
    });
    const mapaExistentes = new Map(asistenciasExistentes.map(a => [a.alumno_id, a]));

    const entidadesAGuardar: Asistencia[] = [];

    for (const reg of registrosUnicos) {
      // HU-12 (#173, #175, #176, #177, #178): Determinar estado y booleano presente
      let estado = reg.estado;
      if (!estado) {
        estado = reg.presente === false ? EstadoAsistencia.AUSENTE : EstadoAsistencia.PRESENTE;
      }

      // Si presente no fue provisto explícitamente, lo calculamos según el estado
      const presente = reg.presente !== undefined 
        ? reg.presente 
        : (estado === EstadoAsistencia.PRESENTE || estado === EstadoAsistencia.MEDIA_FALTA || estado === EstadoAsistencia.AUSENTE_CON_CERTIFICADO);

      const existente = mapaExistentes.get(reg.alumnoId);

      if (existente) {
        // Actualizamos registro existente (evitando error de duplicados)
        existente.estado = estado;
        existente.presente = presente;
        existente.observacion = reg.observacion !== undefined ? reg.observacion : existente.observacion;
        entidadesAGuardar.push(existente);
      } else {
        // Creamos nuevo registro
        const nueva = this.asistenciaRepo.create({
          id: uuidv4(),
          clase_id: claseId,
          alumno_id: reg.alumnoId,
          estado: estado,
          presente: presente,
          observacion: reg.observacion || null
        });
        entidadesAGuardar.push(nueva);
      }
    }

    // #168: Guardado masivo optimizado en una sola operación
    return this.asistenciaRepo.save(entidadesAGuardar);
  }

  // HU-13 (#187): Consultar asistencia por clase
  async findByClase(claseId: string) {
    const clase = await this.claseRepo.findOne({
      where: { id: claseId },
      relations: ['cursoMateria', 'cursoMateria.curso', 'cursoMateria.materia']
    });

    if (!clase) {
      throw new NotFoundException(`Clase con ID ${claseId} no encontrada`);
    }

    const asistencias = await this.asistenciaRepo.find({ 
      where: { clase_id: claseId },
      relations: ['alumno'] 
    });

    return {
      clase: {
        id: clase.id,
        fecha: clase.fecha,
        tema: clase.tema,
        estado: clase.estado,
        observaciones: clase.observaciones,
        curso: clase.cursoMateria?.curso?.nombre || 'Desconocido',
        materia: clase.cursoMateria?.materia?.nombre || 'Desconocida'
      },
      total_registros: asistencias.length,
      asistencias
    };
  }

  // HU-13 (#186): Crear historial cronológico de asistencias de un alumno
  async getHistorialAlumno(alumnoId: string, cursoMateriaId?: string) {
    const alumno = await this.alumnoRepo.findOne({ where: { id: alumnoId } });
    if (!alumno) {
      throw new NotFoundException(`Alumno con ID ${alumnoId} no encontrado`);
    }

    const whereCondition: any = { alumno_id: alumnoId };

    const asistencias = await this.asistenciaRepo.find({
      where: whereCondition,
      relations: ['clase', 'clase.cursoMateria', 'clase.cursoMateria.curso', 'clase.cursoMateria.materia'],
      order: {
        created_at: 'DESC'
      }
    });

    // Filtramos por cursoMateria si se especificó y ordenamos cronológicamente por fecha de clase
    const filtradas = cursoMateriaId 
      ? asistencias.filter(a => a.clase && a.clase.curso_materia_id === cursoMateriaId)
      : asistencias;

    filtradas.sort((a, b) => {
      const fechaA = a.clase?.fecha || '';
      const fechaB = b.clase?.fecha || '';
      return fechaB.localeCompare(fechaA);
    });

    return filtradas.map(a => ({
      id: a.id,
      clase_id: a.clase_id,
      fecha: a.clase?.fecha,
      estado_asistencia: a.estado,
      presente: a.presente,
      observacion: a.observacion,
      tema_clase: a.clase?.tema,
      estado_clase: a.clase?.estado,
      curso: a.clase?.cursoMateria?.curso?.nombre,
      materia: a.clase?.cursoMateria?.materia?.nombre,
      updated_at: a.updated_at
    }));
  }

  // HU-14 (#190, #191, #194, #195): Modificar una asistencia específica
  async modificarAsistencia(id: string, dto: ModificarAsistenciaDto) {
    // #191: Validar existencia y pertenencia
    const asistencia = await this.asistenciaRepo.findOne({
      where: { id },
      relations: ['clase', 'alumno']
    });

    if (!asistencia) {
      throw new NotFoundException(`Registro de asistencia con ID ${id} no encontrado`);
    }

    // #194: Permitir modificar estado
    if (dto.estado !== undefined) {
      asistencia.estado = dto.estado;
      if (dto.presente === undefined) {
        asistencia.presente = (dto.estado === EstadoAsistencia.PRESENTE || dto.estado === EstadoAsistencia.MEDIA_FALTA || dto.estado === EstadoAsistencia.AUSENTE_CON_CERTIFICADO);
      }
    }

    if (dto.presente !== undefined) {
      asistencia.presente = dto.presente;
      if (dto.estado === undefined) {
        asistencia.estado = dto.presente ? EstadoAsistencia.PRESENTE : EstadoAsistencia.AUSENTE;
      }
    }

    if (dto.observacion !== undefined) {
      asistencia.observacion = dto.observacion;
    }

    // #195: TypeORM @UpdateDateColumn registrará automáticamente la fecha de modificación
    return this.asistenciaRepo.save(asistencia);
  }

  // HU-15 (#198, #199, #200, #201): Definir fórmula y calcular porcentaje de asistencia de un alumno
  // Fórmula (#198, #200):
  // Cada PRESENTE suma 1.0 punto
  // Cada MEDIA_FALTA suma 0.5 puntos
  // Cada AUSENTE_CON_CERTIFICADO suma 1.0 punto (justificada)
  // Cada AUSENTE suma 0.0 puntos
  // Porcentaje = (Puntos Obtenidos / Total Clases Dictadas) * 100
  async calcularPorcentajeAlumno(alumnoId: string, cursoMateriaId?: string) {
    const alumno = await this.alumnoRepo.findOne({ where: { id: alumnoId } });
    if (!alumno) {
      throw new NotFoundException(`Alumno con ID ${alumnoId} no encontrado`);
    }

    const asistencias = await this.asistenciaRepo.find({
      where: { alumno_id: alumnoId },
      relations: ['clase']
    });

    // Filtramos solo clases dictadas y (si aplica) del cursoMateria especificado
    const asistenciasValidas = asistencias.filter(a => {
      if (!a.clase || a.clase.estado === 'SUSPENDIDA') return false;
      if (cursoMateriaId && a.clase.curso_materia_id !== cursoMateriaId) return false;
      return true;
    });

    let presentes = 0;
    let mediasFaltas = 0;
    let ausentes = 0;
    let ausentesConCertificado = 0;

    for (const a of asistenciasValidas) {
      switch (a.estado) {
        case EstadoAsistencia.PRESENTE:
          presentes++;
          break;
        case EstadoAsistencia.MEDIA_FALTA:
          mediasFaltas++;
          break;
        case EstadoAsistencia.AUSENTE_CON_CERTIFICADO:
          ausentesConCertificado++;
          break;
        case EstadoAsistencia.AUSENTE:
        default:
          ausentes++;
          break;
      }
    }

    const totalClases = asistenciasValidas.length;
    const puntosAsistencia = (presentes * 1.0) + (mediasFaltas * 0.5) + (ausentesConCertificado * 1.0);
    const faltasAcumuladas = (ausentes * 1.0) + (mediasFaltas * 0.5);

    const porcentaje = totalClases > 0 
      ? Number(((puntosAsistencia / totalClases) * 100).toFixed(2)) 
      : 100.0;

    return {
      alumno: {
        id: alumno.id,
        nombre: alumno.nombre,
        apellido: alumno.apellido,
        identificacion: alumno.identificacion
      },
      totalClases,
      presentes,
      mediasFaltas,
      ausentes,
      ausentesConCertificado,
      puntosAsistencia,
      faltasAcumuladas,
      porcentaje,
      formula: '((presentes * 1.0) + (mediasFaltas * 0.5) + (ausentesConCertificado * 1.0)) / totalClases * 100'
    };
  }

  // HU-15 (#201): Calcular porcentajes de todos los alumnos de un curso o materia
  async calcularPorcentajesCurso(cursoOcursoMateriaId: string) {
    // 1. Buscamos todas las cursoMateria IDs involucradas
    let cursoMateriaIds: string[] = [];

    const cursoMateria = await this.cursoMateriaRepo.findOne({ where: { id: cursoOcursoMateriaId } });
    if (cursoMateria) {
      cursoMateriaIds = [cursoMateria.id];
    } else {
      const cms = await this.cursoMateriaRepo.find({ where: { curso_id: cursoOcursoMateriaId } });
      cursoMateriaIds = cms.map(cm => cm.id);
    }

    if (cursoMateriaIds.length === 0) {
      return [];
    }

    // Buscamos alumnos inscriptos
    const inscripciones = await this.inscripcionRepo.find({
      where: {
        curso_materia_id: In(cursoMateriaIds),
        estado: 'REGULAR'
      },
      relations: ['alumno']
    });

    const alumnoIds = Array.from(new Set(inscripciones.map(i => i.alumno_id)));
    const resultados = [];

    for (const alumnoId of alumnoIds) {
      const calculo = await this.calcularPorcentajeAlumno(alumnoId, cursoMateriaIds[0]);
      resultados.push(calculo);
    }

    return resultados;
  }

  // HU-16 (#205, #206, #207, #208, #209): Detección y consulta de alumnos en riesgo de inasistencia
  async getRiesgoInasistencia(cursoOcursoMateriaId: string, umbralConfigurable?: number) {
    // #206, #207: Porcentaje configurable del límite, por defecto 75%
    const umbral = (umbralConfigurable !== undefined && !isNaN(Number(umbralConfigurable))) 
      ? Number(umbralConfigurable) 
      : 75.0;

    const todosLosCalculos = await this.calcularPorcentajesCurso(cursoOcursoMateriaId);

    // #208: Detectar alumnos cuyo porcentaje es menor al umbral configurado
    const alumnosEnRiesgo = todosLosCalculos.map(item => {
      const enRiesgo = item.porcentaje < umbral;
      let estadoRiesgo = 'REGULAR';

      if (item.porcentaje < 60) {
        estadoRiesgo = 'LIBRE';
      } else if (item.porcentaje < umbral - 5) {
        estadoRiesgo = 'CRITICO';
      } else if (enRiesgo) {
        estadoRiesgo = 'EN_RIESGO';
      }

      return {
        ...item,
        umbralConfigurado: umbral,
        enRiesgo,
        estadoRiesgo
      };
    });

    // #209: Filtrar los alumnos en riesgo y ordenar por menor porcentaje (mayor gravedad primero)
    return alumnosEnRiesgo
      .filter(a => a.enRiesgo)
      .sort((a, b) => a.porcentaje - b.porcentaje);
  }
}

