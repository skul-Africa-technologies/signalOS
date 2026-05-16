import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // URI-based versioning: /api/v1/... and /api/v2/...
  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableShutdownHooks();

  const isProd = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: isProd ? (process.env.CORS_ORIGIN ?? false) : '*',
  });

  if (!isProd) setupSwagger(app);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`signalOS backend running on http://localhost:${port}/api`);
  logger.log(`API v1: http://localhost:${port}/api/v1`);
  logger.log(`API v2: http://localhost:${port}/api/v2`);
  if (!isProd) logger.log(`API docs available at http://localhost:${port}/docs`);
}

bootstrap();
