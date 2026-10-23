import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AsistenciasService } from './asistencias.service.js';
import { RegistrarAsistenciaMasivaDto } from './dto/registrar-asistencia-masiva.dto.js';
import { ModificarAsistenciaDto } from './dto/modificar-asistencia.dto.js';
import { JwtAuthGuard } from '../../system/auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('asistencias')
export class AsistenciasController {
  constructor(private readonly asistenciasService: AsistenciasService) {}

  // HU-12 (#173): Catálogo de estados de asistencia
  @Get('estados')
  getEstados() {
    return this.asistenciasService.getCatalogoEstados();
  }

  // HU-11 (#162): Obtener alumnos del curso listos para tomar asistencia
  @Get('curso/:id/alumnos')
  obtenerAlumnosPorCurso(@Param('id') cursoId: string) {
    return this.asistenciasService.obtenerAlumnosParaAsistencia(cursoId);
  }

  // HU-11 (#162): Obtener alumnos y su estado previo para una clase específica
  @Get('clase/:claseId/alumnos')
  obtenerAlumnosPorClase(@Param('claseId') claseId: string) {
    return this.asistenciasService.obtenerAlumnosParaAsistencia(claseId);
  }

  // HU-11 (#164, #168): Registrar asistencia masiva
  @Post('clase/:claseId')
  registrarMasiva(
    @Param('claseId') claseId: string, 
    @Body() dto: RegistrarAsistenciaMasivaDto
  ) {
    return this.asistenciasService.registrarMasiva(claseId, dto.registros);
  }

  // HU-13 (#187): Consultar asistencia por clase
  @Get('clase/:claseId')
  findByClase(@Param('claseId') claseId: string) {
    return this.asistenciasService.findByClase(claseId);
  }

  // HU-13 (#186): Historial cronológico de asistencias de un alumno
  @Get('alumno/:alumnoId/historial')
  getHistorialAlumno(
    @Param('alumnoId') alumnoId: string,
    @Query('cursoMateriaId') cursoMateriaId?: string
  ) {
    return this.asistenciasService.getHistorialAlumno(alumnoId, cursoMateriaId);
  }

  // HU-14 (#190, #191, #194, #195): Modificar una asistencia específica
  @Patch(':id')
  modificarAsistencia(
    @Param('id') id: string,
    @Body() dto: ModificarAsistenciaDto
  ) {
    return this.asistenciasService.modificarAsistencia(id, dto);
  }

  // HU-14 (#190): Modificar o actualizar todas las asistencias de una clase
  @Put('clase/:claseId')
  modificarMasivaClase(
    @Param('claseId') claseId: string,
    @Body() dto: RegistrarAsistenciaMasivaDto
  ) {
    return this.asistenciasService.registrarMasiva(claseId, dto.registros);
  }

  // HU-15 (#201): Consultar porcentaje de asistencia calculado de un alumno
  @Get('porcentaje/alumno/:alumnoId')
  calcularPorcentajeAlumno(
    @Param('alumnoId') alumnoId: string,
    @Query('cursoMateriaId') cursoMateriaId?: string
  ) {
    return this.asistenciasService.calcularPorcentajeAlumno(alumnoId, cursoMateriaId);
  }

  // HU-15 (#201): Consultar porcentajes de asistencia de todos los alumnos de un curso
  @Get('porcentaje/curso/:cursoId')
  calcularPorcentajesCurso(@Param('cursoId') cursoId: string) {
    return this.asistenciasService.calcularPorcentajesCurso(cursoId);
  }

  // HU-16 (#209): Consultar alumnos con riesgo de inasistencia (umbral configurable, default 75%)
  @Get('riesgo/curso/:cursoId')
  getRiesgoInasistencia(
    @Param('cursoId') cursoId: string,
    @Query('umbral') umbral?: number
  ) {
    return this.asistenciasService.getRiesgoInasistencia(cursoId, umbral);
  }
}

