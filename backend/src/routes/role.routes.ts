import { Router } from 'express';
import { createRole, deleteRole, listPermissions, listRoles, updateRole } from '../controllers/role.controller.js';
import { protect, permitPermissions } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { roleSchema } from '../validators/role.validator.js';
import { PERMISSIONS } from '../constants/roles.js';

export const roleRouter = Router();

roleRouter.get('/', protect, permitPermissions(PERMISSIONS.ROLE_READ), listRoles);
roleRouter.post('/', protect, permitPermissions(PERMISSIONS.ROLE_WRITE), validateBody(roleSchema), createRole);
roleRouter.patch('/:id', protect, permitPermissions(PERMISSIONS.ROLE_WRITE), validateBody(roleSchema.partial()), updateRole);
roleRouter.delete('/:id', protect, permitPermissions(PERMISSIONS.ROLE_WRITE), deleteRole);
roleRouter.get('/permissions', protect, permitPermissions(PERMISSIONS.PERMISSION_READ), listPermissions);
