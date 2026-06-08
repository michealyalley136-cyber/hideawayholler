import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || (process.env.VERCEL === '1' ? '/tmp/uploads' : './uploads');
const maxSize = (parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) || 10) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: maxSize },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|pdf|mp4|mov)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxSize },
});
