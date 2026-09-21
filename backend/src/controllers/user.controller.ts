import type { Request, Response } from 'express';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ApiError } from '../utils/api-error.js';
import { logAudit } from '../services/audit.service.js';
import { rotateUserRole, createUserWithRole } from '../services/auth.service.js';

function safeUser(user: any) {
  const plain = user?.toObject ? user.toObject() : user;
  const safePlain = plain as Record<string, unknown>;
  delete safePlain.passwordHash;
  delete safePlain.refreshTokenHash;
  delete safePlain.passwordResetTokenHash;
  return safePlain;
}

const ALLOWED_USER_UPDATE_FIELDS = ['fullName', 'email', 'phoneNumber', 'companyName', 'whatsappPhone', 'departmentId', 'status'];

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().sort({ createdAt: -1 }).populate('departmentId');
  res.json({ items: users.map(safeUser) });
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await createUserWithRole({
    fullName: req.body.fullName,
    companyName: req.body.companyName,
    phoneNumber: req.body.phoneNumber,
    email: req.body.email,
    password: req.body.password,
    roleKey: req.body.roleKey,
    departmentId: req.body.departmentId
  });
  await logAudit({ actorId: req.user?._id.toString(), action: 'create_user', entityType: 'User', entityId: user._id.toString(), after: user, ip: req.ip, userAgent: req.get('user-agent') ?? '' });
  res.status(201).json({ user: safeUser(user) });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).populate('departmentId');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  res.json({ user: safeUser(user) });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (req.body.roleKey) {
    await rotateUserRole(user._id.toString(), req.body.roleKey);
  }

  const updateData: Record<string, unknown> = {};
  for (const field of ALLOWED_USER_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  if (Object.keys(updateData).length > 0) {
    Object.assign(user, updateData);
    await user.save();
  }

  await logAudit({ actorId: req.user?._id.toString(), action: 'update_user', entityType: 'User', entityId: user._id.toString(), after: user, ip: req.ip, userAgent: req.get('user-agent') ?? '' });
  res.json({ user: safeUser(user) });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id, { status: 'disabled' }, { new: true });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  await logAudit({ actorId: req.user?._id.toString(), action: 'disable_user', entityType: 'User', entityId: user._id.toString(), after: user, ip: req.ip, userAgent: req.get('user-agent') ?? '' });
  res.json({ message: 'User disabled' });
});

export const profile = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: safeUser(req.user) });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (req.body.fullName) {
    user.fullName = String(req.body.fullName).trim();
  }
  if (req.body.email) {
    const nextEmail = String(req.body.email).toLowerCase().trim();
    const existing = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
    if (existing) {
      throw new ApiError(409, 'Email already in use');
    }
    user.email = nextEmail;
  }
  if (req.body.companyName !== undefined) {
    user.companyName = String(req.body.companyName).trim();
  }
  if (req.body.phoneNumber !== undefined) {
    user.phoneNumber = String(req.body.phoneNumber).trim();
  }
  if (req.body.whatsappPhone !== undefined) {
    user.whatsappPhone = String(req.body.whatsappPhone).trim();
  }
  if (req.body.avatarUrl !== undefined) {
    user.avatarUrl = String(req.body.avatarUrl);
  }

  await user.save();
  await logAudit({ actorId: req.user?._id.toString(), action: 'update_profile', entityType: 'User', entityId: user._id.toString(), after: user, ip: req.ip, userAgent: req.get('user-agent') ?? '' });
  res.json({ user: safeUser(user) });
});

export const uploadAvatarController = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (req.file) {
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    user.avatarUrl = avatarUrl;
    await user.save();
  }

  await logAudit({ actorId: req.user?._id.toString(), action: 'update_avatar', entityType: 'User', entityId: user._id.toString(), after: user, ip: req.ip, userAgent: req.get('user-agent') ?? '' });
  res.json({ user: safeUser(user) });
});
