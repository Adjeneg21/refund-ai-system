import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Lets async route handlers throw. Express 4 does not catch rejected
 * promises, so without this a DB error inside an async handler becomes an
 * unhandled rejection (which can crash the process) instead of a 500.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => unknown
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** JSON 404 for unknown routes (instead of Express's HTML page). */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
};

interface HttpishError extends Error {
  type?: string;
  status?: number;
  statusCode?: number;
  expose?: boolean;
}

/**
 * Last-resort error handler. Every error leaves the API as JSON in the same
 * `{ error }` shape the frontend already understands, and internal error
 * details (stack traces, SQL messages) are logged but never sent to clients.
 */
export const errorHandler: ErrorRequestHandler = (err: HttpishError, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err.type === "entity.parse.failed") {
    res.status(400).json({ error: "Malformed JSON in request body." });
    return;
  }
  if (err.type === "entity.too.large") {
    res.status(413).json({ error: "Request body is too large." });
    return;
  }

  // Other client errors raised by middleware (http-errors marks 4xx messages
  // as safe to expose).
  const status = err.status ?? err.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500 && err.expose) {
    res.status(status).json({ error: err.message });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
};
