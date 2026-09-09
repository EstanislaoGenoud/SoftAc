import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { HorariosService } from './horarios.service.js';
import { JwtAuthGuard } from '../../system/auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('horarios')
export class HorariosController {
  constructor(private readonly horariosService: HorariosService) {}

  @Post()
  create(@Body() body: Record<string, any>) {
    return this.horariosService.create(body as any);
  }

  @Get('curso-materia/:id')
  findByCursoMateria(@Param('id') id: string) {
    return this.horariosService.findByCursoMateria(id);
  }
}
