import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AlumnosService } from './alumnos.service.js';
import { JwtAuthGuard } from '../../system/auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('alumnos')
export class AlumnosController {
  constructor(private readonly alumnosService: AlumnosService) {}

  @Get('curso/:id')
  findByCurso(@Param('id') cursoId: string) {
    return this.alumnosService.findByCurso(cursoId);
  }

  @Get('buscar')
  search(@Query('q') query: string) {
    return this.alumnosService.search(query);
  }

  @Post('inscribir')
  enroll(@Body() body: Record<string, any>) {
    return this.alumnosService.enroll(body as any);
  }

  // HU-09: Endpoint de perfil (#140)
  @Get(':id/perfil')
  getProfile(@Param('id') id: string) {
    return this.alumnosService.getProfile(id);
  }

  // HU-10: Endpoint de historial (#154)
  @Get(':id/historial')
  getHistorial(@Param('id') id: string) {
    return this.alumnosService.getHistorial(id);
  }
}
