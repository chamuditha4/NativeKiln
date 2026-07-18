import { Global, Module } from '@nestjs/common';
import { API_CONFIG, loadApiConfig } from './api-config.js';

/**
 * Global config module. Validation happens once at startup; a missing or
 * invalid value throws a ConfigurationError before the app can serve traffic.
 */
@Global()
@Module({
  providers: [
    {
      provide: API_CONFIG,
      useFactory: () => loadApiConfig(),
    },
  ],
  exports: [API_CONFIG],
})
export class ConfigModule {}
