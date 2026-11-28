import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../system/auth/guards/jwt-auth.guard.js';
import { ActualizarConfiguracionEvaluacionDto } from './dto/actualizar-configuracion-evaluacion.dto.js';
import { ActualizarCalificacionDto } from './dto/actualizar-calificacion.dto.js';
import { ActualizarEvaluacionDto } from './dto/actualizar-evaluacion.dto.js';
import { CrearEvaluacionDto } from './dto/crear-evaluacion.dto.js';
import { CrearRecuperatorioDto } from './dto/crear-recuperatorio.dto.js';
import { CalificacionItemDto, GuardarCalificacionesDto } from './dto/guardar-calificaciones.dto.js';
import { EvaluacionesService } from './evaluaciones.service.js';

@UseGuards(JwtAuthGuard)
@Controller('evaluaciones')
export class EvaluacionesController {
  constructor(private readonly evaluacionesService: EvaluacionesService) {}

  @Get('tipos')
  getTipos() {
    return this.evaluacionesService.getTipos();
  }

  @Get('curso/:cursoId/configuracion')
  getConfiguracion(@Param('cursoId') cursoId: string) {
    return this.evaluacionesService.getConfiguracion(cursoId);
  }

  @Put('curso/:cursoId/configuracion')
  updateConfiguracion(
    @Param('cursoId') cursoId: string,
    @Body() dto: ActualizarConfiguracionEvaluacionDto,
  ) {
    return this.evaluacionesService.updateConfiguracion(cursoId, dto);
  }

  @Get('curso/:cursoId/promedios')
  calcularPromedios(@Param('cursoId') cursoId: string) {
    return this.evaluacionesService.calcularPromedios(cursoId);
  }

  @Get('curso/:cursoId/evolucion/:alumnoId')
  getEvolucion(
    @Param('cursoId') cursoId: string,
    @Param('alumnoId') alumnoId: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.evaluacionesService.getEvolucion(cursoId, alumnoId, desde, hasta);
  }

  @Get('curso/:cursoId')
  findByCurso(@Param('cursoId') cursoId: string) {
    return this.evaluacionesService.findByCurso(cursoId);
  }

  @Post()
  create(@Body() dto: CrearEvaluacionDto) {
    return this.evaluacionesService.create(dto);
  }

  @Get(':id/calificaciones')
  getCalificaciones(@Param('id') id: string) {
    return this.evaluacionesService.getCalificaciones(id);
  }

  @Put(':id/calificaciones')
  saveCalificaciones(@Param('id') id: string, @Body() dto: GuardarCalificacionesDto) {
    return this.evaluacionesService.saveCalificaciones(id, dto.calificaciones);
  }

  @Patch(':id/calificaciones/:alumnoId')
  updateCalificacion(
    @Param('id') id: string,
    @Param('alumnoId') alumnoId: string,
    @Body() dto: ActualizarCalificacionDto,
  ) {
    return this.evaluacionesService.updateCalificacion(id, alumnoId, dto);
  }

  @Delete(':id/calificaciones/:alumnoId')
  removeCalificacion(@Param('id') id: string, @Param('alumnoId') alumnoId: string) {
    return this.evaluacionesService.removeCalificacion(id, alumnoId);
  }

  @Post(':id/recuperatorios')
  createRecovery(@Param('id') id: string, @Body() dto: CrearRecuperatorioDto) {
    return this.evaluacionesService.createRecovery(id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ActualizarEvaluacionDto) {
    return this.evaluacionesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.evaluacionesService.remove(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evaluacionesService.findOne(id);
  }
}
