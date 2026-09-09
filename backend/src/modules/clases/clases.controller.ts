import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ClasesService } from './clases.service.js';
import { JwtAuthGuard } from '../../system/auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('clases')
export class ClasesController {
  constructor(private readonly clasesService: ClasesService) {}

  @Post()
  create(@Body() body: Record<string, any>) {
    return this.clasesService.create(body as any);
  }

  @Get('curso-materia/:id')
  findByCursoMateria(@Param('id') id: string) {
    return this.clasesService.findByCursoMateria(id);
  }
}
