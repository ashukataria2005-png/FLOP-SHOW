import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected server error occurred.';

  // Map common HTTP status codes to clean error codes
  let code = 'INTERNAL_ERROR';
  if (statusCode === 400) code = 'BAD_REQUEST';
  else if (statusCode === 401) code = 'UNAUTHORIZED';
  else if (statusCode === 403) code = 'FORBIDDEN';
  else if (statusCode === 404) code = 'NOT_FOUND';
  else if (statusCode === 409) code = 'CONFLICT';

  // Do not expose sensitive internal error stacks to clients
  res.status(statusCode).json({
    error: {
      code,
      message
    }
  });
}
