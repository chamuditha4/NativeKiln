import type { Request } from 'express';
import type { SessionContext } from './session.service.js';

export interface AuthenticatedRequest extends Request {
  session?: SessionContext;
}
