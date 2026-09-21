import { Router } from 'express';
import { createDepartment, deleteDepartment, listDepartments, updateDepartment } from '../controllers/department.controller.js';
import { protect, permitPermissions } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { departmentSchema } from '../validators/department.validator.js';
import { PERMISSIONS } from '../constants/roles.js';

export const departmentRouter = Router();

departmentRouter.get('/', protect, listDepartments);
departmentRouter.post('/', protect, permitPermissions(PERMISSIONS.DEPARTMENT_WRITE), validateBody(departmentSchema), createDepartment);
departmentRouter.patch('/:id', protect, permitPermissions(PERMISSIONS.DEPARTMENT_WRITE), validateBody(departmentSchema.partial()), updateDepartment);
departmentRouter.delete('/:id', protect, permitPermissions(PERMISSIONS.DEPARTMENT_WRITE), deleteDepartment);
