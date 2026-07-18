import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { createLogger } from '@native-kiln/shared';
import { AppModule } from './app.module.js';
import { loadApiConfig } from './config/api-config.js';

const logger = createLogger('api');

async function bootstrap(): Promise<void> {
  // Validate configuration up front so we fail fast with a clear message.
  const config = loadApiConfig();

  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1', {
    // Health probes live at the root for simple orchestrator checks.
    exclude: ['healthz', 'readyz'],
  });

  // The browser origin is the dashboard; credentials (cookies) must be allowed.
  app.enableCors({
    origin: config.APP_BASE_URL,
    credentials: true,
  });

  app.enableShutdownHooks();

  await app.listen(config.API_PORT, '0.0.0.0');
  logger.info({ port: config.API_PORT }, 'API listening');
}

bootstrap().catch((err) => {
  logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to start API');
  process.exit(1);
});
