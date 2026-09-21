import { Router } from 'express';
import { createUser, deleteUser, getUser, listUsers, profile, updateProfile, updateUser, uploadAvatarController } from '../controllers/user.controller.js';
import { protect, permitPermissions } from '../middleware/auth.js';
import { PERMISSIONS } from '../constants/roles.js';
import { validateBody } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/auth.validator.js';
import { createUserSchema } from '../validators/user.validator.js';
import { uploadAvatar } from '../middleware/upload.js';

export const userRouter = Router();

userRouter.get('/me', protect, profile);
userRouter.patch('/me', protect, validateBody(updateProfileSchema), updateProfile);
userRouter.patch('/me/avatar', protect, uploadAvatar.single('avatar'), uploadAvatarController);
userRouter.get('/', protect, permitPermissions(PERMISSIONS.USER_READ), listUsers);
userRouter.post('/', protect, permitPermissions(PERMISSIONS.USER_WRITE), validateBody(createUserSchema), createUser);
userRouter.get('/:id', protect, permitPermissions(PERMISSIONS.USER_READ), getUser);
userRouter.patch('/:id', protect, permitPermissions(PERMISSIONS.USER_WRITE), updateUser);
userRouter.delete('/:id', protect, permitPermissions(PERMISSIONS.USER_WRITE), deleteUser);
