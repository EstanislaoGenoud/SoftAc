import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { EscuelasService } from './escuelas.service.js';
import { CreateEscuelaDto } from './dto/create-escuela.dto.js';
import { UpdateEscuelaDto } from './dto/update-escuela.dto.js';
import { JwtAuthGuard } from '../../system/auth/guards/jwt-auth.guard.js';

// @UseGuards actúa como un portero de discoteca. Nadie pasa a NINGUNA de estas rutas si no trae su Token JWT válido.
@UseGuards(JwtAuthGuard)
@Controller('escuelas')
export class EscuelasController {
  constructor(private readonly escuelasService: EscuelasService) {}

  // Recibe la petición POST /escuelas. El Body pasa automáticamente por las reglas que definimos en CreateEscuelaDto
  @Post()
  create(@Body() createEscuelaDto: CreateEscuelaDto) {
    return this.escuelasService.create(createEscuelaDto);
  }

  // GET /escuelas
  @Get()
  findAll(@Request() req: any) {
    return this.escuelasService.findAll();
  }

  // GET /escuelas/1234-abcd (El :id es una variable dinámica)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.escuelasService.findOne(id);
  }

  // PATCH /escuelas/1234-abcd (Se usa PATCH en lugar de PUT porque solo actualizamos parcialmente, ej: solo cambiar nombre)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEscuelaDto: UpdateEscuelaDto) {
    return this.escuelasService.update(id, updateEscuelaDto);
  }

  // DELETE /escuelas/1234-abcd
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.escuelasService.remove(id);
  }
}
