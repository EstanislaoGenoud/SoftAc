import { Module } from '@nestjs/common';
import { HorariosService } from './horarios.service.js';
import { HorariosController } from './horarios.controller.js';

@Module({
  controllers: [HorariosController],
  providers: [HorariosService],
})
export class HorariosModule {}
