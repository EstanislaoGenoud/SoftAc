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

  @Post()
  createWithMateria(@Body() body: Record<string, any>) {
    return this.cursosService.createWithMateria(body as any);
  }
}
