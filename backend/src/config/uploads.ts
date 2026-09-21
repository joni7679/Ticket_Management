import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url)); // .../backend/src/config
// backend/src/config -> backend/src -> backend -> repo root
const candidates = [
  path.resolve(here, '../../../uploads'),
  path.resolve(here, '../../uploads'),
  path.resolve(process.cwd(), 'uploads'),
  path.resolve(process.cwd(), '../uploads')
];

function pickUploadsDir() {
  if (process.env.UPLOADS_DIR) {
    fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });
    return process.env.UPLOADS_DIR;
  }
  for (const dir of candidates) {
    try {
      const parent = path.dirname(dir);
      if (fs.existsSync(parent)) {
        fs.mkdirSync(dir, { recursive: true });
        return dir;
      }
    } catch {
      // try next candidate
    }
  }
  const fallback = candidates[0] as string;
  fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}

export const uploadsDir = pickUploadsDir();
export const uploadsSubdir = (sub: string) => {
  const dir = path.join(uploadsDir, sub);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
