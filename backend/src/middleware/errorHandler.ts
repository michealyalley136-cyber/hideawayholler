import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error('[api] Unhandled request error', {
    method: req.method,
    path: req.originalUrl,
    errorName: err.name,
    errorMessage: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
  if (err.message === 'Invalid file type') {
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Uploaded file exceeds the maximum allowed size.' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, error: 'Invalid request body format.' });
  }
  res.status(500).json({ success: false, error: 'Internal server error' });
}
