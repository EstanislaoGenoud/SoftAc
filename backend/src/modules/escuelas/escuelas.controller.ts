import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { EscuelasService } from './escuelas.service';
import { JwtAuthGuard } from '../../system/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard) // 🔒 Ruta protegida: Solo si manda JWT pasará
@Controller('escuelas')
export class EscuelasController {
  constructor(private readonly escuelasService: EscuelasService) {}

  @Post()
  create(@Body() createEscuelaDto: Record<string, any>) {
    return this.escuelasService.create(createEscuelaDto);
  }

  @Get()
  findAll(@Request() req: any) {
    // req.user ya tiene los datos del docente gracias al AuthGuard
    return this.escuelasService.findAll();
  }
}
