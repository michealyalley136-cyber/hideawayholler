import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const PRIVATE_UPLOAD_DIR = process.env.PRIVATE_UPLOAD_DIR || './private_uploads';

export function ensureUploadDirs() {
  const dirs = ['documents', 'receipts', 'maintenance', 'gallery', 'checkin', 'checkout', 'avatars'];
  const privateDirs = ['community', 'leases', 'signed-leases'];

  for (const dir of dirs) {
    const full = path.join(UPLOAD_DIR, dir);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  }

  for (const dir of privateDirs) {
    const full = path.join(PRIVATE_UPLOAD_DIR, dir);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  }
}

export function saveFile(
  buffer: Buffer,
  originalName: string,
  subfolder: string
): { filePath: string; fileName: string } {
  ensureUploadDirs();
  const ext = path.extname(originalName);
  const fileName = `${uuidv4()}${ext}`;
  const relativePath = path.join(subfolder, fileName);
  const fullPath = path.join(UPLOAD_DIR, relativePath);
  fs.writeFileSync(fullPath, buffer);
  return { filePath: relativePath.replace(/\\/g, '/'), fileName: originalName };
}

export function savePrivateFile(
  buffer: Buffer,
  originalName: string,
  subfolder: string
): { filePath: string; fileName: string } {
  ensureUploadDirs();
  const ext = path.extname(originalName);
  const fileName = `${uuidv4()}${ext}`;
  const relativePath = path.join(subfolder, fileName);
  const fullPath = path.join(PRIVATE_UPLOAD_DIR, relativePath);
  fs.writeFileSync(fullPath, buffer);
  return { filePath: relativePath.replace(/\\/g, '/'), fileName: originalName };
}

export function getPublicUrl(relativePath: string): string {
  return `/uploads/${relativePath}`;
}

export function getPrivateUrl(relativePath: string): string {
  return `/api/community/files/${encodeURIComponent(relativePath)}`;
}

export function deleteFile(relativePath: string) {
  const fullPath = path.join(UPLOAD_DIR, relativePath);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}

export function deletePrivateFile(relativePath: string) {
  const fullPath = path.join(PRIVATE_UPLOAD_DIR, relativePath);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}

// Future S3 adapter placeholder
export interface StorageAdapter {
  save(buffer: Buffer, originalName: string, subfolder: string): Promise<{ filePath: string; fileName: string }>;
  delete(filePath: string): Promise<void>;
  getUrl(filePath: string): string;
}

export const localStorage: StorageAdapter = {
  async save(buffer, originalName, subfolder) {
    return saveFile(buffer, originalName, subfolder);
  },
  async delete(filePath) {
    deleteFile(filePath);
  },
  getUrl(filePath) {
    return getPublicUrl(filePath);
  },
};
