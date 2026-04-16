// ============================================================
// MONDEGA DIGITAL — Card Service
// ============================================================

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('CardService');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  app.enableCors({
    origin: [
      process.env['APP_URL'] ?? 'http://localhost:3000',
      'https://mondega.io',
      'https://app.mondega.io',
    ],
    credentials: true,
  });

  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Mondega Card Service')
      .setDescription('Virtual & physical Mastercard issuance via Pomelo')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger docs at http://localhost:3007/api/docs');
  }

  const port = process.env['PORT'] ?? 3007;
  await app.listen(port);
  logger.log(`Card Service running on port ${port}`);
}

void bootstrap();
