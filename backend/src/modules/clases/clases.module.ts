import { Module } from '@nestjs/common';
import { ClasesService } from './clases.service.js';
import { ClasesController } from './clases.controller.js';

@Module({
  controllers: [ClasesController],
  providers: [ClasesService],
})
export class ClasesModule {}
