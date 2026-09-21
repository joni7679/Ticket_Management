import { Role } from '../models/Role.js';
import { User } from '../models/User.js';
import { compareValue, createRandomToken, hashToken, hashValue } from '../utils/crypto.js';
import { signAccessToken, signRefreshToken, type TokenPayload } from '../utils/jwt.js';
import { ApiError } from '../utils/api-error.js';
import { ROLE_KEYS } from '../constants/roles.js';

export async function resolveRolePermissions(roleKey: string) {
  const role = await Role.findOne({ key: roleKey });
  return role?.permissions ?? [];
}

const VALID_ROLE_KEYS = [ROLE_KEYS.SUPER_ADMIN, ROLE_KEYS.ADMIN, ROLE_KEYS.SUPPORT_AGENT, ROLE_KEYS.USER];

export async function createUserWithRole(input: {
  fullName: string;
  companyName?: string;
  phoneNumber?: string;
  email: string;
  password: string;
  roleKey?: string;
  departmentId?: string;
}) {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new ApiError(409, 'Email already in use');
  }

  const roleKey = (input.roleKey ?? ROLE_KEYS.USER) as string;
  if (!VALID_ROLE_KEYS.includes(roleKey as any)) {
    throw new ApiError(400, 'Invalid role');
  }
  const permissions = await resolveRolePermissions(roleKey);
  const passwordHash = await hashValue(input.password);

  return User.create({
    fullName: input.fullName,
    companyName: input.companyName ?? '',
    phoneNumber: input.phoneNumber ?? '',
    email: input.email,
    passwordHash,
    roleKey,
    permissions,
    departmentId: input.departmentId
  });
}

export async function issueTokens(user: { _id: { toString(): string }; roleKey: string }) {
  const payload: TokenPayload = { userId: user._id.toString(), role: user.roleKey as TokenPayload['role'] };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  return { accessToken, refreshToken };
}

export async function verifyUserPassword(userId: string, password: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const valid = await compareValue(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  return user;
}

export async function storeRefreshToken(userId: string, refreshToken: string) {
  await User.findByIdAndUpdate(userId, { refreshTokenHash: hashToken(refreshToken) });
}

export async function clearRefreshToken(userId: string) {
  await User.findByIdAndUpdate(userId, { refreshTokenHash: '' });
}

export function createPasswordResetToken() {
  const resetToken = createRandomToken();
  return { resetToken, resetTokenHash: hashToken(resetToken) };
}

export async function rotateUserRole(userId: string, roleKey: string) {
  const permissions = await resolveRolePermissions(roleKey);
  return User.findByIdAndUpdate(userId, { roleKey, permissions }, { new: true });
}
