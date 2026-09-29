import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CursosService } from './cursos.service.js';
import { JwtAuthGuard } from '../../system/auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('cursos')
export class CursosController {
  constructor(private readonly cursosService: CursosService) {}

  @Get('escuela/:escuelaId')
  findByEscuela(@Param('escuelaId') escuelaId: string) {
    return this.cursosService.findByEscuela(escuelaId);
  }

  // HU-06 #97: Crear endpoint de detalle
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cursosService.findOne(id);
  }

  @Post()
  createWithMateria(@Body() body: Record<string, any>) {
    return this.cursosService.createWithMateria(body as any);
  }
}
