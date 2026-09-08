import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AlumnosService } from './alumnos.service.js';
import { JwtAuthGuard } from '../../system/auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('alumnos')
export class AlumnosController {
  constructor(private readonly alumnosService: AlumnosService) {}

  @Get('curso-materia/:id')
  findByCursoMateria(@Param('id') cursoMateriaId: string) {
    return this.alumnosService.findByCursoMateria(cursoMateriaId);
  }

  @Get('buscar')
  search(@Query('q') query: string) {
    return this.alumnosService.search(query);
  }

  @Post('inscribir')
  enroll(@Body() body: Record<string, any>) {
    return this.alumnosService.enroll(body as any);
  }
}
