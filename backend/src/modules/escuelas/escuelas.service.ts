import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TENANT_CONNECTION } from '../../core/tenant/tenant.provider.js';
import { Escuela } from './entities/escuela.entity.js';
import { CreateEscuelaDto } from './dto/create-escuela.dto.js';
import { UpdateEscuelaDto } from './dto/update-escuela.dto.js';
import { Curso } from '../cursos/entities/curso.entity.js';
import { v4 as uuidv4 } from 'uuid'; // Generador de IDs únicos

@Injectable()
export class EscuelasService {
  private escuelaRepository: Repository<Escuela>;

  // Al usar TENANT_CONNECTION, esta clase se conecta a la base de datos específica del docente que hace la petición.
  constructor(@Inject(TENANT_CONNECTION) private dataSource: DataSource) {
    // Vinculamos nuestro "repositorio" (manipulador de la tabla) a la base de datos del docente
    this.escuelaRepository = this.dataSource.getRepository(Escuela);
  }

  // HU-39: Crear escuela
  async create(createEscuelaDto: CreateEscuelaDto) {
    // Preparamos el objeto en la memoria RAM
    const escuela = this.escuelaRepository.create({
      id: uuidv4(), // Le asignamos un ID único universal (Mejor que usar IDs auto-numéricos 1,2,3)
      nombre: createEscuelaDto.nombre,
      ciudad: createEscuelaDto.ciudad,
    });
    // Lo guardamos definitivamente en la base de datos
    return this.escuelaRepository.save(escuela);
  }

  // HU-40: Visualizar escuelas activas
  async findAll() {
    // Traemos TODAS las escuelas, pero filtramos para que NO traiga las que el profe "eliminó" (borrado lógico)
    return this.escuelaRepository.find({ where: { activa: true } });
  }

  // HU-41: Obtener detalle y cursos asociados
  async findOne(id: string) {
    const escuela = await this.escuelaRepository.findOne({ where: { id } });
    if (!escuela) throw new NotFoundException('La escuela no existe o no te pertenece');

    // Aquí traemos a un "invitado", el repositorio de Cursos, para buscar los cursos que pertenecen a esta escuela
    const cursoRepository = this.dataSource.getRepository(Curso);
    const cursos = await cursoRepository.find({ where: { escuela_id: id } });

    // Retornamos un objeto combinado: { ...datosDeLaEscuela, cursos: [curso1, curso2] }
    return { ...escuela, cursos };
  }

  // HU-42: Editar información
  async update(id: string, updateEscuelaDto: UpdateEscuelaDto) {
    const escuela = await this.escuelaRepository.findOne({ where: { id } });
    if (!escuela) throw new NotFoundException('Escuela no encontrada');

    // .merge mezcla los datos viejos de la base de datos con los nuevos que envió el usuario
    const actualizada = this.escuelaRepository.merge(escuela, updateEscuelaDto);
    return this.escuelaRepository.save(actualizada);
  }

  // HU-43: Eliminar (Borrado lógico / Desvinculación)
  async remove(id: string) {
    const escuela = await this.escuelaRepository.findOne({ where: { id } });
    if (!escuela) throw new NotFoundException('Escuela no encontrada');

    // BORRADO LÓGICO: En vez de hacer un DELETE en SQL que rompería nuestro historial de cursos y alumnos,
    // simplemente le bajamos el pulgar ("activa = false"). El sistema la ignorará de ahora en adelante.
    escuela.activa = false; 
    await this.escuelaRepository.save(escuela);
    return { message: 'Escuela desvinculada exitosamente' };
  }
}
