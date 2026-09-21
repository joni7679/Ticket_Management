import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to handle multer upload errors
 */
export const handleUploadError = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: `File too large. Maximum file size is ${err.limit / (1024 * 1024)}MB`,
      error: err.code
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files. Maximum 5 files allowed',
      error: err.code
    });
  }

  if (err.code === 'LIMIT_PART_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Form has too many parts',
      error: err.code
    });
  }

  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      error: 'INVALID_FILE_TYPE'
    });
  }

  if (err.message && err.message.includes('Only image files are allowed')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      error: 'INVALID_AVATAR_TYPE'
    });
  }

  // Pass through other errors to error handler
  next(err);
};
