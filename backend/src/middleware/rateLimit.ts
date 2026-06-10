import { Request, Response, NextFunction } from 'express';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientKey(req: Request, prefix: string) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
  return `${prefix}:${ip}`;
}

function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = clientKey(req, `${req.method}:${req.baseUrl}${req.path}`);
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (existing.count >= options.max) {
      return res.status(429).json({ error: options.message });
    }

    existing.count += 1;
    return next();
  };
}

const windowMs = 15 * 60 * 1000;

export const authRateLimiter = createRateLimiter({
  windowMs,
  max: 20,
  message: 'Too many authentication attempts. Please try again later.',
});

export const registerRateLimiter = createRateLimiter({
  windowMs,
  max: 10,
  message: 'Too many registration attempts. Please try again later.',
});

export const sosTriggerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many SOS alerts submitted. Please contact staff if you need help.',
});

export const uploadRateLimiter = createRateLimiter({
  windowMs,
  max: 40,
  message: 'Too many uploads. Please wait and try again.',
});

export const generalApiRateLimiter = createRateLimiter({
  windowMs,
  max: 600,
  message: 'Too many requests. Please slow down and try again.',
});
