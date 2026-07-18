import { type PipeTransform } from '@nestjs/common';
import { type ZodTypeAny, type infer as ZodInfer } from 'zod';
import { ValidationError } from '@native-kiln/shared';

/** Validates request payloads with a Zod schema, mapping failures to a typed
 * ValidationError (which the exception filter renders as a safe 400). */
export class ZodValidationPipe<T extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): ZodInfer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ValidationError('Invalid request payload', {
        issues: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    return result.data;
  }
}
