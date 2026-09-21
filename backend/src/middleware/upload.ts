import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { uploadsDir, uploadsSubdir } from '../config/uploads.js';

// Allowed MIME types for attachments
const ALLOWED_MIME_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'],
  documents: ['application/pdf', 'text/plain', 'application/msword', 
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024,      // 5MB for images
  document: 10 * 1024 * 1024,  // 10MB for documents
  default: 10 * 1024 * 1024    // 10MB default
};

// Create upload directories (single source of truth: config/uploads.ts)
const uploadDirs = {
  root: uploadsDir,
  images: uploadsSubdir('images'),
  documents: uploadsSubdir('documents'),
  avatars: uploadsSubdir('avatars')
};

// Sanitize filename to prevent directory traversal
function sanitizeFilename(originalname: string): string {
  const ext = path.extname(originalname).toLowerCase();
  const name = path.basename(originalname, ext).replace(/[^a-z0-9]/gi, '_').substring(0, 30);
  const hash = crypto.randomBytes(6).toString('hex');
  return `${name}-${hash}${ext}`;
}

// Determine subdirectory based on MIME type
function getUploadSubdir(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('application/') || mimeType.startsWith('text/')) return 'documents';
  return 'documents';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subdir = getUploadSubdir(file.mimetype);
    const uploadDir = uploadDirs[subdir as keyof typeof uploadDirs] || uploadDirs.documents;
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const sanitized = sanitizeFilename(file.originalname);
    cb(null, sanitized);
  }
});

// File filter with MIME type validation
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.all.includes(file.mimetype)) {
    const error = new Error(`Invalid file type: ${file.mimetype}. Allowed types: images (JPEG, PNG, GIF, WebP), documents (PDF, Word, Excel, TXT)`);
    return cb(error as any);
  }

  // Additional validation for image files
  if (file.mimetype.startsWith('image/')) {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
    if (!validImageTypes.includes(file.mimetype)) {
      const error = new Error(`Invalid image format. Supported: JPEG, PNG, GIF, WebP, BMP, SVG`);
      return cb(error as any);
    }
  }

  cb(null, true);
};

// Calculate file size limit based on MIME type
export const getFileSizeLimit = (mimeType: string): number => {
  if (mimeType.startsWith('image/')) return FILE_SIZE_LIMITS.image;
  if (mimeType.startsWith('application/pdf')) return FILE_SIZE_LIMITS.document;
  return FILE_SIZE_LIMITS.default;
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: FILE_SIZE_LIMITS.default }
});

// Export for avatar uploads (single file, smaller size limit)
export const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDirs.avatars);
    },
    filename: (_req, file, cb) => {
      const sanitized = sanitizeFilename(file.originalname);
      cb(null, sanitized);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Only allow images for avatars
    if (!ALLOWED_MIME_TYPES.images.includes(file.mimetype)) {
      return cb(new Error('Only image files are allowed for avatars'));
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB for avatars
});

// Export file type validators
export const isValidImageType = (mimeType: string): boolean => {
  return ALLOWED_MIME_TYPES.images.includes(mimeType);
};

export const isValidDocumentType = (mimeType: string): boolean => {
  return ALLOWED_MIME_TYPES.documents.includes(mimeType);
};

export const getFileTypeFromMime = (mimeType: string): 'image' | 'document' | 'unknown' => {
  if (isValidImageType(mimeType)) return 'image';
  if (isValidDocumentType(mimeType)) return 'document';
  return 'unknown';
};
