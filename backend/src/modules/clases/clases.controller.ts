import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ClasesService } from './clases.service.js';
import { CreateClaseDto } from './dto/create-clase.dto.js';
import { UpdateClaseDto } from './dto/update-clase.dto.js';
import { UpdateObservacionesDto } from './dto/update-observaciones.dto.js';
import { JwtAuthGuard } from '../../system/auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('clases')
export class ClasesController {
  constructor(private readonly clasesService: ClasesService) {}

  // HU-17 (#220): Endpoint para registrar una clase
  @Post()
  create(@Body() createClaseDto: CreateClaseDto) {
    return this.clasesService.create(createClaseDto);
  }

  // HU-18 (#226): Consultar la última clase por cursoMateria
  @Get('curso-materia/:id/ultima')
  findUltimaPorCursoMateria(@Param('id') id: string) {
    return this.clasesService.findUltimaClase(id);
  }

  // HU-18 (#226): Consultar la última clase por curso
  @Get('curso/:id/ultima')
  findUltimaPorCurso(@Param('id') id: string) {
    return this.clasesService.findUltimaClase(id);
  }

  @Get('curso-materia/:id')
  findByCursoMateria(@Param('id') id: string) {
    return this.clasesService.findByCursoMateria(id);
  }

  @Get('curso/:id')
  findByCurso(@Param('id') id: string) {
    return this.clasesService.findByCurso(id);
  }

  // HU-19 (#233, #234, #236): Endpoint para registrar/actualizar observaciones de la clase
  @Patch(':id/observaciones')
  updateObservaciones(@Param('id') id: string, @Body() dto: UpdateObservacionesDto) {
    return this.clasesService.updateObservaciones(id, dto);
  }

  // Actualización general de la clase
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClaseDto) {
    return this.clasesService.update(id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clasesService.findOne(id);
  }
}

