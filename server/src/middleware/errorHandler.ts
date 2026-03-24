import type { Request, Response, NextFunction } from 'express';

/**
 * NFR-6: Centralized error handling middleware
 *
 * Provides consistent error response format:
 * { success: false, error: string }
 *
 * Usage:
 * - Throw AppError for controlled errors with specific status codes
 * - Throw regular Error for unexpected errors (will return 500)
 * - Add as the last middleware in Express chain
 */

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

/**
 * Global error handler middleware
 * Must be registered after all routes
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Log error for debugging
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);

  // Handle known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Handle unexpected errors
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Unknown error occurred',
  });
}
