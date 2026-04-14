// ============================================================
// LEN Fiat Bridge — Entry Point
// ============================================================

import { NestFactory }        from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { FiatBridgeModule }   from './fiat-bridge.module';

async function bootstrap() {
  const app    = await NestFactory.create(FiatBridgeModule, {
    rawBody: true,   // Required to verify webhook HMAC signatures
    logger: ['error', 'warn', 'log'],
  });
  const logger = new Logger('Bootstrap');

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist:        true,
    forbidNonWhitelisted: true,
    transform:        true,
  }));

  // CORS — only allow requests from wallet-service and web app
  app.enableCors({
    origin: [
      process.env['WEB_APP_URL']    ?? 'http://localhost:3000',
      process.env['WALLET_SERVICE'] ?? 'http://localhost:3001',
    ],
    credentials: true,
  });

  const port = parseInt(process.env['PORT'] ?? '3004');
  await app.listen(port);

  logger.log(`LEN Fiat Bridge running on port ${port}`);
  logger.log(`Webhooks: /api/fiat/webhook/{gt,mx,mx/codi,hn}`);
}

bootstrap();
