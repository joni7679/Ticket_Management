import type { NextFunction, Request, Response } from 'express';
import { User, type IUserDocument } from '../models/User.js';
import { ApiError } from '../utils/api-error.js';
import { verifyAccessToken } from '../utils/jwt.js';

function getTokenFromRequest(req: Request) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return req.cookies?.accessToken as string | undefined;
}

export async function protect(req: Request, _res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) {
    next(new ApiError(401, 'Authentication required'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId).populate('departmentId') as IUserDocument | null;
    if (!user || user.status !== 'active') {
      next(new ApiError(401, 'Session expired or user inactive'));
      return;
    }

    // If the user record does not have explicit permissions stored, fall back
    // to the permissions defined by their role. This ensures role-based
    // permission checks work even for users that don't have permissions array set.
    if ((!user.permissions || user.permissions.length === 0) && user.roleKey) {
      try {
        // Lazy-load Role model here to avoid circular imports at module top-level
        const { Role } = await import('../models/Role.js');
        const role = await Role.findOne({ key: user.roleKey });
        if (role && role.permissions) {
          user.permissions = role.permissions;
        }
      } catch {
        // swallow - permission checks will continue with whatever is present on user
      }
    }

    req.user = user;
    req.auth = { userId: String(user._id), role: user.roleKey };
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token'));
  }
}

export function permitRoles(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.roleKey) && req.user.roleKey !== 'super_admin') {
      next(new ApiError(403, 'Insufficient role permissions'));
      return;
    }

    next();
  };
}

export function permitPermissions(...allowedPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    const hasPermission = allowedPermissions.every((permission) => req.user?.permissions.includes(permission) || req.user?.roleKey === 'super_admin');
    if (!hasPermission) {
      next(new ApiError(403, 'Insufficient permission scope'));
      return;
    }

    next();
  };
}
