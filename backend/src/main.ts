import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  //  SEGURIDAD GLOBAL (ValidationPipe)
  // Le explicamos a NestJS que valide automáticamente todo lo que llegue del Frontend.
  // Si nos envían campos extra maliciosos, los limpiamos (whitelist) o bloqueamos la petición (forbidNonWhitelisted).
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  //  CORS
  // Permitimos que el frontend de React/Angular (que corre en otro puerto) pueda pedir datos sin que el navegador lo bloquee.
  app.enableCors();

  //  DOCUMENTACIÓN AUTOMÁTICA (Swagger)
  // Generamos una interfaz web gráfica para que el Frontend sepa exactamente qué endpoints existen.
  const config = new DocumentBuilder()
    .setTitle('SoftAcademic API')
    .setDescription('Motor del backend. Arquitectura Multi-Tenant: Cada docente tiene su propia base de datos aislada.')
    .setVersion('1.0')
    .addBearerAuth() // Agregamos el botón de candadito para que puedan probar con el JWT
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  // Al entrar a http://localhost:3000/api/docs verás toda la documentación
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
