import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error('[api] Unhandled request error', {
    method: req.method,
    path: req.originalUrl,
    errorName: err.name,
    errorMessage: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
  if (err.message === 'Invalid file type') {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
}
