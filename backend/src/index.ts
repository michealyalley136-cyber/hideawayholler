import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { ensureUploadDirs } from './utils/storage';

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const configuredCorsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  FRONTEND_URL,
  'https://hollerhub.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...configuredCorsOrigins,
]);

ensureUploadDirs();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hollerhub-api' });
});

app.get('/', (_req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>HollerHub API</title>
        <style>
          body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
          main { max-width: 560px; padding: 24px; margin: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: white; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08); }
          a { color: #047857; font-weight: 700; }
          p { line-height: 1.6; color: #475569; }
        </style>
      </head>
      <body>
        <main>
          <h1>HollerHub API is running</h1>
          <p>This is the backend API. Open the resident portal frontend at <a href="${FRONTEND_URL}">${FRONTEND_URL}</a>.</p>
          <p>API health check: <a href="/api/health">/api/health</a></p>
        </main>
      </body>
    </html>
  `);
});

app.use('/api', routes);
app.use(errorHandler);

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`HollerHub API running on http://localhost:${PORT}`);
  });
}

export default app;
