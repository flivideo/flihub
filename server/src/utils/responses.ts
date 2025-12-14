/**
 * NFR-67: Standardized Response Utilities
 *
 * Consistent error and success response formats across all routes.
 * All errors return: { success: false, error: string }
 * All successes include: { success: true, ... }
 */

import type { Response } from 'express';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: string;
}

/**
 * Send a standardized error response.
 * Always logs to console for debugging.
 *
 * @param res - Express response object
 * @param status - HTTP status code (400, 404, 500, etc.)
 * @param message - Error message for the client
 * @param logDetails - Optional additional details to log (not sent to client)
 */
export function sendErrorResponse(
  res: Response,
  status: number,
  message: string,
  logDetails?: unknown
): void {
  // Log error for debugging
  console.error(`[${status}] ${message}`, logDetails ?? '');

  res.status(status).json({
    success: false,
    error: message,
  } as ErrorResponse);
}

/**
 * Send a 400 Bad Request error
 */
export function sendBadRequest(res: Response, message: string): void {
  sendErrorResponse(res, 400, message);
}

/**
 * Send a 404 Not Found error
 */
export function sendNotFound(res: Response, message: string): void {
  sendErrorResponse(res, 404, message);
}

/**
 * Send a 500 Internal Server Error
 */
export function sendServerError(res: Response, message: string, error?: unknown): void {
  sendErrorResponse(res, 500, message, error);
}

/**
 * Wrap an async route handler with error catching.
 * Automatically sends 500 response for unhandled errors.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => {
 *     // ... your code
 *   }))
 */
export function asyncHandler(
  fn: (req: any, res: Response) => Promise<void>
) {
  return (req: any, res: Response) => {
    Promise.resolve(fn(req, res)).catch((err) => {
      sendServerError(res, 'Internal server error', err);
    });
  };
}
