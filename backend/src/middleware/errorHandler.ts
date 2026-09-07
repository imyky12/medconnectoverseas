import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

/**
 * Global error handler — catches all errors and returns consistent JSON responses.
 * Must be registered as the LAST middleware in Express.
 *
 * Anything that is not an `ApiError` used to fall straight through to a generic
 * 500 "Internal server error". That threw away messages the models had already
 * written — "Percentage discount cannot exceed 100%" reached the admin as
 * "Internal server error", so they had no idea which field to fix, and a 500
 * wrongly says "the server is broken" rather than "your input was rejected".
 *
 * The three branches below cover every way a Mongoose write can legitimately
 * refuse input, so model-level validation is now worth writing: it surfaces.
 */

interface MongooseValidationError extends Error {
  name: 'ValidationError';
  errors: Record<string, { path?: string; message: string }>;
}

interface MongoDuplicateKeyError extends Error {
  code: number;
  keyValue?: Record<string, unknown>;
}

interface MongooseCastError extends Error {
  name: 'CastError';
  path: string;
  value: unknown;
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  // A model said no. Every failing field is named, because a form with eight
  // inputs needs to know which one to highlight.
  if (err.name === 'ValidationError' && 'errors' in err) {
    const validation = err as MongooseValidationError;
    const errors = Object.values(validation.errors).map((e) => ({
      field: e.path ?? 'unknown',
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      message: errors.length === 1 ? errors[0].message : 'Some fields need fixing',
      errors,
    });
    return;
  }

  // A unique index rejected the write. 409 rather than 400: the input is
  // well-formed, it just collides with something that already exists.
  if ('code' in err && (err as MongoDuplicateKeyError).code === 11000) {
    const duplicate = err as MongoDuplicateKeyError;
    const field = Object.keys(duplicate.keyValue ?? {})[0] ?? 'value';
    const value = duplicate.keyValue?.[field];
    res.status(409).json({
      success: false,
      message: `That ${field}${value !== undefined ? ` (${String(value)})` : ''} is already taken.`,
      errors: [{ field, message: 'Already in use' }],
    });
    return;
  }

  // An id (or other typed field) could not be parsed — a malformed ObjectId in
  // a URL is the usual cause, and that is the caller's mistake, not ours.
  if (err.name === 'CastError') {
    const cast = err as MongooseCastError;
    res.status(400).json({
      success: false,
      message: `"${String(cast.value)}" is not a valid ${cast.path}.`,
      errors: [{ field: cast.path, message: 'Invalid value' }],
    });
    return;
  }

  // Genuinely unexpected. This one really is our fault, so it stays a 500 and
  // its detail is never sent to the client.
  if (process.env.NODE_ENV === 'development') {
    console.error('Unhandled error:', err);
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
