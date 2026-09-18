import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err.name === 'MulterError') {
    let status = 400;
    let msg = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') {
      status = 413;
      msg = 'Video file size exceeds the allowed limit (1GB). Please choose a compressed video or external stream URL.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      msg = `Unexpected field "${err.field}". File must be uploaded using the "file" field name.`;
    }
    res.status(status).json({
      error: {
        code: err.code || 'UPLOAD_ERROR',
        message: msg
      }
    });
    return;
  }

  const statusCode = typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600
    ? err.statusCode
    : 500;

  // Server-side error logging (keeps useful diagnostics on server)
  if (statusCode >= 500) {
    console.error(`[SERVER ERROR] ${err.name || 'Error'}: ${err.message || 'Internal error'}`);
    if (err.stack) {
      console.error(err.stack);
    }
  } else {
    console.warn(`[CLIENT ERROR ${statusCode}] ${err.message}`);
  }

  // Map common HTTP status codes to clean error codes, preserving specific domain codes (e.g. SUBSCRIPTION_REQUIRED)
  let code = err.code || 'INTERNAL_ERROR';
  if (!err.code) {
    if (statusCode === 400) code = 'BAD_REQUEST';
    else if (statusCode === 401) code = 'UNAUTHORIZED';
    else if (statusCode === 403) code = 'FORBIDDEN';
    else if (statusCode === 404) code = 'NOT_FOUND';
    else if (statusCode === 409) code = 'CONFLICT';
  }

  // Do not expose stack traces, db queries, or internal details in public responses
  const message = (statusCode >= 500 && config.isProd)
    ? 'An unexpected server error occurred.'
    : (err.message || 'An unexpected server error occurred.');

  res.status(statusCode).json({
    code,
    message,
    error: {
      code,
      message
    }
  });
}
