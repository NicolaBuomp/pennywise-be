import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { HttpExceptionFilter } from './http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // Ridotto rispetto a prima
  });

  const configService = app.get(ConfigService);

  // Middleware di sicurezza
  app.use(helmet());

  // Configura Swagger
  const config = new DocumentBuilder()
    .setTitle('Pennywise API')
    .setDescription("API per l'applicazione Pennywise")
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Abilita la validazione a livello globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Rimuove le proprietà non definite nel DTO
      forbidNonWhitelisted: true, // Lancia errori se vengono inviate proprietà non definite
      transform: true, // Trasforma automaticamente i tipi primitivi
    }),
  );
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());

  // Abilita CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  logger.log(`Applicazione avviata sulla porta ${port}`);
}
bootstrap();
