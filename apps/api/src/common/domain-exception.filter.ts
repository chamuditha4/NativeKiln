import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { isDomainError } from '@native-kiln/shared';

/**
 * Maps typed domain errors and Nest HttpExceptions to safe API responses.
 * Unknown errors become a generic 500 — their details never reach the client.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (isDomainError(exception)) {
      response.status(exception.httpStatus).json(exception.toSafeResponse());
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response
        .status(status)
        .json(
          typeof body === 'string'
            ? { error: { code: 'HTTP', message: body } }
            : { error: { code: 'HTTP', ...(body as object) } },
        );
      return;
    }

    // Never leak internal details.
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    response.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  }
}
