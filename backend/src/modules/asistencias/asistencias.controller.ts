import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AsistenciasService, RegistroAsistencia } from './asistencias.service.js';
import { JwtAuthGuard } from '../../system/auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('asistencias')
export class AsistenciasController {
  constructor(private readonly asistenciasService: AsistenciasService) {}

  @Post('clase/:claseId')
  registrarMasiva(
    @Param('claseId') claseId: string, 
    @Body('registros') registros: RegistroAsistencia[]
  ) {
    return this.asistenciasService.registrarMasiva(claseId, registros);
  }

  @Get('clase/:claseId')
  findByClase(@Param('claseId') claseId: string) {
    return this.asistenciasService.findByClase(claseId);
  }
}
