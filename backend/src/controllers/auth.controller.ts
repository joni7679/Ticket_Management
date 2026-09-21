import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { ROLE_KEYS } from '../constants/roles.js';
import { User, type IUserDocument } from '../models/User.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ApiError } from '../utils/api-error.js';
import { clearAuthCookies, setAuthCookies } from '../utils/cookie.js';
import { hashToken, hashValue, createRandomToken } from '../utils/crypto.js';
import { sendEmail } from '../services/email.service.js';
import {
  clearRefreshToken,
  createPasswordResetToken,
  createUserWithRole,
  issueTokens,
  storeRefreshToken
} from '../services/auth.service.js';
import { verifyRefreshToken } from '../utils/jwt.js';

function sanitizeUser(user: any) {
  const plain = user?.toObject ? user.toObject() : user;
  const safePlain = plain as Record<string, unknown>;
  delete safePlain.passwordHash;
  delete safePlain.refreshTokenHash;
  delete safePlain.passwordResetTokenHash;
  return safePlain;
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await createUserWithRole({
    fullName: req.body.fullName,
    companyName: req.body.companyName,
    phoneNumber: req.body.phoneNumber,
    email: req.body.email,
    password: req.body.password,
    departmentId: req.body.departmentId,
    roleKey: ROLE_KEYS.USER
  });

  const { accessToken, refreshToken } = await issueTokens(user);
  await storeRefreshToken(String(user._id), refreshToken);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ message: 'Registered successfully', user: sanitizeUser(user), accessToken, refreshToken });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const email = String(req.body.email).toLowerCase().trim();
  const user = await User.findOne({ email }) as IUserDocument | null;
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isValid = await user.comparePassword(req.body.password);
  if (!isValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const { accessToken, refreshToken } = await issueTokens(user);
  await storeRefreshToken(String(user._id), refreshToken);
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ message: 'Logged in successfully', user: sanitizeUser(user), accessToken, refreshToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    const user = await User.findOne({ refreshTokenHash: hashToken(refreshToken) }) as IUserDocument | null;
    if (user) {
      await clearRefreshToken(String(user._id));
    }
  }
  clearAuthCookies(res);
  res.json({ message: 'Logged out successfully' });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken ?? req.body.refreshToken;
  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token required');
  }

  const user = await User.findOne({ refreshTokenHash: hashToken(refreshToken) }) as IUserDocument | null;
  if (!user) {
    throw new ApiError(401, 'Invalid refresh session');
  }

  // Verify refresh token payload to check expiration
  // (DB lookup above already confirmed the session; verify() enforces expiry/signature)
  try {
    verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const { accessToken, refreshToken: nextRefreshToken } = await issueTokens(user);
  await storeRefreshToken(String(user._id), nextRefreshToken);
  setAuthCookies(res, accessToken, nextRefreshToken);
  res.json({ accessToken, refreshToken: nextRefreshToken });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: sanitizeUser(req.user) });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const email = String(req.body.email).toLowerCase().trim();
  const user = await User.findOne({ email });
  if (!user) {
    res.json({ message: 'If the account exists, reset instructions were sent' });
    return;
  }

  const { resetToken, resetTokenHash } = createPasswordResetToken();
  user.passwordResetTokenHash = resetTokenHash;
  user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail(user.email, 'Reset your Helpdesk password', `<p>Reset your password using this link:</p><p><a href="${resetLink}">${resetLink}</a></p>`);
  res.json({ message: 'If the account exists, reset instructions were sent' });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const tokenHash = hashToken(req.body.token);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  user.passwordHash = await hashValue(req.body.password);
  user.passwordResetTokenHash = '';
  user.passwordResetExpiresAt = undefined;
  user.refreshTokenHash = '';
  await user.save();

  res.json({ message: 'Password updated successfully' });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id) as IUserDocument | null;
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isValid = await user.comparePassword(req.body.currentPassword);
  if (!isValid) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  user.passwordHash = await hashValue(req.body.newPassword);
  user.refreshTokenHash = '';
  await user.save();
  res.json({ message: 'Password changed successfully' });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    throw new ApiError(400, 'Verification token required');
  }

  const tokenHash = hashToken(token);
  const user = await User.findOne({
    emailVerificationToken: tokenHash,
    emailVerificationExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired verification token');
  }

  user.isVerified = true;
  user.emailVerificationToken = '';
  user.emailVerificationExpiresAt = undefined;
  await user.save();

  res.json({ message: 'Email verified successfully' });
});

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id) as IUserDocument | null;
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.isVerified) {
    res.json({ message: 'Already verified' });
    return;
  }

  const verificationToken = createRandomToken();
  user.emailVerificationToken = hashToken(verificationToken);
  user.emailVerificationExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const verifyLink = `${env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  await sendEmail(user.email, 'Verify your email', `<p>Verify your email using this link:</p><p><a href="${verifyLink}">${verifyLink}</a></p>`);
  res.json({ message: 'Verification email sent' });
});
