import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { ensureUploadDirs } from './utils/storage';

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

ensureUploadDirs();

app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:3000'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hollerhub-api' });
});

app.use('/api', routes);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`HollerHub API running on http://localhost:${PORT}`);
});

export default app;
