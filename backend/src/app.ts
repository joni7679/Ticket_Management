import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { roleRouter } from './routes/role.routes.js';
import { permissionRouter } from './routes/permission.routes.js';
import { departmentRouter } from './routes/department.routes.js';
import { ticketRouter } from './routes/ticket.routes.js';
import { reportRouter } from './routes/report.routes.js';
import { notificationRouter } from './routes/notification.routes.js';
import { auditLogRouter } from './routes/audit-log.routes.js';
import { errorHandler, notFound } from './middleware/error.js';
import { env } from './config/env.js';
import { uploadsDir } from './config/uploads.js';

export const app = express();

app.set('trust proxy', 1); // Trust first proxy (nginx, load balancer, etc.)
app.disable('etag');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
if (env.ALLOW_ALL_ORIGINS) {
  // Allow requests from any origin (reflect origin) — useful when binding to 0.0.0.0
  app.use(cors({ origin: true, credentials: true }));
} else {
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
}
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
// Rate limiting: more generous in development, stricter in production
const rateLimitConfig = env.NODE_ENV === 'development' 
  ? { windowMs: 15 * 60 * 1000, limit: 10000 } // 10,000 requests per 15 minutes for development
  : { windowMs: 15 * 60 * 1000, limit: 200 };   // 200 requests per 15 minutes for production
app.use(rateLimit(rateLimitConfig));

// Prevent browser/proxy caching for all API responses so GET requests do not revalidate as 304s.
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Serve uploaded files with proper caching headers
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '7d',  // Cache for 7 days
  etag: false,
  setHeaders: (res, filePath) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    // Add security headers for file downloads
    if (filePath.endsWith('.pdf') || filePath.endsWith('.doc') || filePath.endsWith('.docx')) {
      res.setHeader('Content-Disposition', 'inline');
    }
    // Prevent script execution on image files
    if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }
}));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'helpdesk-api' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/roles', roleRouter);
app.use('/api/permissions', permissionRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/tickets', ticketRouter);
app.use('/api/reports', reportRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/audit-logs', auditLogRouter);

app.use(notFound);
app.use(errorHandler);
