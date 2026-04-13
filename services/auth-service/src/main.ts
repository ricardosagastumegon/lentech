// ============================================================
// MONDEGA DIGITAL — Auth Service
// Handles: registration, login, OTP, PIN, KYC, JWT
// ============================================================

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AuthService');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Global validation pipe — strict mode
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // Strip unknown fields
    forbidNonWhitelisted: true, // Throw on unknown fields
    transform: true,            // Auto-transform to DTO types
    transformOptions: { enableImplicitConversion: true },
  }));

  // CORS — allow only our own origins
  app.enableCors({
    origin: [
      process.env['APP_URL'] ?? 'http://localhost:3000',
      'https://mondega.io',
      'https://app.mondega.io',
    ],
    credentials: true,
  });

  // Swagger API docs (disabled in production)
  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Mondega Auth Service')
      .setDescription('Authentication, KYC and user management API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger docs at http://localhost:3001/api/docs');
  }

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  logger.log(`Auth Service running on port ${port}`);
}

void bootstrap();
