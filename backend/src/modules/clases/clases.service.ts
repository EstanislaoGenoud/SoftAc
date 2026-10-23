import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository, In } from 'typeorm';
import { TENANT_CONNECTION } from '../../core/tenant/tenant.provider.js';
import { Clase } from './entities/clase.entity.js';
import { CursoMateria } from '../cursos/entities/curso-materia.entity.js';
import { CreateClaseDto } from './dto/create-clase.dto.js';
import { UpdateClaseDto } from './dto/update-clase.dto.js';
import { UpdateObservacionesDto } from './dto/update-observaciones.dto.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ClasesService {
  private claseRepo: Repository<Clase>;
  private cursoMateriaRepo: Repository<CursoMateria>;

  constructor(@Inject(TENANT_CONNECTION) private dataSource: DataSource) {
    this.claseRepo = this.dataSource.getRepository(Clase);
    this.cursoMateriaRepo = this.dataSource.getRepository(CursoMateria);
  }

  // HU-17 (#214, #215, #220): Registrar una clase
  async create(data: CreateClaseDto) {
    // #215: Definir relación clase-curso validando que exista CursoMateria o Curso
    let cursoMateria = await this.cursoMateriaRepo.findOne({ 
      where: { id: data.cursoMateriaId },
      relations: ['curso', 'materia']
    });

    if (!cursoMateria) {
      // Si enviaron el ID de curso, buscamos el primer cursoMateria asociado
      cursoMateria = await this.cursoMateriaRepo.findOne({
        where: { curso_id: data.cursoMateriaId },
        relations: ['curso', 'materia']
      });
    }

    if (!cursoMateria) {
      throw new NotFoundException('No se encontró el curso o materia correspondiente para registrar la clase.');
    }

    const clase = this.claseRepo.create({
      id: uuidv4(),
      curso_materia_id: cursoMateria.id,
      horario_id: data.horarioId || null,
      fecha: data.fecha,
      estado: data.estado || 'DICTADA',
      tema: data.tema || null,
      // HU-19 (#234, #236): Registrar observaciones de la clase
      observaciones: data.observaciones || null,
    });

    return this.claseRepo.save(clase);
  }

  // Obtener detalle de una clase específica
  async findOne(id: string) {
    const clase = await this.claseRepo.findOne({
      where: { id },
      relations: ['cursoMateria', 'cursoMateria.curso', 'cursoMateria.materia', 'asistencias', 'asistencias.alumno']
    });

    if (!clase) {
      throw new NotFoundException(`Clase con ID ${id} no encontrada`);
    }

    return clase;
  }

  // Listar clases por cursoMateria (o curso)
  async findByCursoMateria(cursoMateriaId: string) {
    const clases = await this.claseRepo.find({ 
      where: { curso_materia_id: cursoMateriaId },
      relations: ['cursoMateria', 'cursoMateria.curso', 'cursoMateria.materia'],
      order: { fecha: 'DESC', created_at: 'DESC' }
    });
    if (clases.length > 0) {
      return clases;
    }
    return this.findByCurso(cursoMateriaId);
  }

  // Listar clases por curso
  async findByCurso(cursoId: string) {
    const cursoMaterias = await this.cursoMateriaRepo.find({ where: { curso_id: cursoId } });
    if (cursoMaterias.length === 0) {
      return [];
    }
    const ids = cursoMaterias.map(cm => cm.id);
    return this.claseRepo.find({
      where: { curso_materia_id: In(ids) },
      relations: ['cursoMateria', 'cursoMateria.curso', 'cursoMateria.materia'],
      order: { fecha: 'DESC', created_at: 'DESC' }
    });
  }

  // HU-18 (#224): Crear consulta de última clase
  async findUltimaClase(cursoOcursoMateriaId: string) {
    // 1. Intentamos buscar directo por curso_materia_id
    let ultima = await this.claseRepo.findOne({
      where: { curso_materia_id: cursoOcursoMateriaId },
      relations: ['cursoMateria', 'cursoMateria.curso', 'cursoMateria.materia', 'asistencias'],
      order: { fecha: 'DESC', created_at: 'DESC' }
    });

    // 2. Si no encontró, buscamos por curso_id
    if (!ultima) {
      const cursoMaterias = await this.cursoMateriaRepo.find({ where: { curso_id: cursoOcursoMateriaId } });
      if (cursoMaterias.length > 0) {
        const ids = cursoMaterias.map(cm => cm.id);
        ultima = await this.claseRepo.findOne({
          where: { curso_materia_id: In(ids) },
          relations: ['cursoMateria', 'cursoMateria.curso', 'cursoMateria.materia', 'asistencias'],
          order: { fecha: 'DESC', created_at: 'DESC' }
        });
      }
    }

    if (!ultima) {
      throw new NotFoundException('No se encontraron clases registradas para este curso o materia');
    }

    return ultima;
  }

  // HU-19 (#233, #234, #236): Registrar/modificar observaciones de la clase
  async updateObservaciones(id: string, dto: UpdateObservacionesDto) {
    const clase = await this.claseRepo.findOne({ where: { id } });
    if (!clase) {
      throw new NotFoundException(`Clase con ID ${id} no encontrada`);
    }

    clase.observaciones = dto.observaciones;
    return this.claseRepo.save(clase);
  }

  // Actualización general de la clase
  async update(id: string, dto: UpdateClaseDto) {
    const clase = await this.claseRepo.findOne({ where: { id } });
    if (!clase) {
      throw new NotFoundException(`Clase con ID ${id} no encontrada`);
    }

    if (dto.fecha !== undefined) clase.fecha = dto.fecha;
    if (dto.estado !== undefined) clase.estado = dto.estado;
    if (dto.tema !== undefined) clase.tema = dto.tema;
    if (dto.observaciones !== undefined) clase.observaciones = dto.observaciones;

    return this.claseRepo.save(clase);
  }
}

