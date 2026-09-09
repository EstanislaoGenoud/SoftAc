import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TENANT_CONNECTION } from '../../core/tenant/tenant.provider.js';
import { Curso } from './entities/curso.entity.js';
import { Materia } from './entities/materia.entity.js';
import { CursoMateria } from './entities/curso-materia.entity.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CursosService {
  private cursoRepo: Repository<Curso>;
  private materiaRepo: Repository<Materia>;
  private cursoMateriaRepo: Repository<CursoMateria>;

  constructor(@Inject(TENANT_CONNECTION) private dataSource: DataSource) {
    // Inicializamos 3 repositorios para poder manipular 3 tablas distintas en la misma función
    this.cursoRepo = this.dataSource.getRepository(Curso);
    this.materiaRepo = this.dataSource.getRepository(Materia);
    this.cursoMateriaRepo = this.dataSource.getRepository(CursoMateria);
  }

  // HU-04: Listar cursos
  async findByEscuela(escuelaId: string) {
    return this.cursoRepo.find({ where: { escuela_id: escuelaId } });
  }

  // HU-05: Crear un curso y asociarle una materia
  // Esta es una función "Combo". En vez de hacerle la vida difícil al Frontend obligándolo a hacer
  // 3 peticiones distintas, armamos toda la relación lógica (Curso -> Materia -> Intersección) de un solo golpe.
  async createWithMateria(data: { escuelaId: string, nombreCurso: string, nombreMateria: string, periodoId: string }) {
    
    // 1. Creamos el contenedor "Curso" (Ej: "4° A")
    let curso = this.cursoRepo.create({ id: uuidv4(), escuela_id: data.escuelaId, nombre: data.nombreCurso });
    await this.cursoRepo.save(curso);

    // 2. Buscamos si la "Materia" (Ej: "Matemática") ya existe en el catálogo del profesor.
    // Así evitamos tener 5 materias "Matemática" repetidas en la base de datos.
    let materia = await this.materiaRepo.findOne({ where: { nombre: data.nombreMateria } });
    
    if (!materia) {
      // Si no existe, la creamos desde cero.
      materia = this.materiaRepo.create({ id: uuidv4(), nombre: data.nombreMateria });
      await this.materiaRepo.save(materia);
    }

    // 3. Creamos el eslabón de oro: "CursoMateria". 
    // Es la entidad intermedia que dice: "El curso 4°A dicta Matemática durante el Ciclo Lectivo 2024".
    const cursoMateria = this.cursoMateriaRepo.create({
      id: uuidv4(),
      curso_id: curso.id,
      materia_id: materia.id,
      periodo_lectivo_id: data.periodoId
    });
    await this.cursoMateriaRepo.save(cursoMateria);

    return { curso, materia, cursoMateria };
  }
}
