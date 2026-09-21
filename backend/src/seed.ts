import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { PERMISSIONS, ROLE_KEYS } from './constants/roles.js';
import { Department } from './models/Department.js';
import { Permission } from './models/Permission.js';
import { Role } from './models/Role.js';
import { User } from './models/User.js';
import { hashValue } from './utils/crypto.js';

async function seed() {
  await connectDatabase();

  const permissions = [
    { key: PERMISSIONS.USER_READ, name: 'View Users', description: 'Read user records', module: 'user' },
    { key: PERMISSIONS.USER_WRITE, name: 'Manage Users', description: 'Create/update users', module: 'user' },
    { key: PERMISSIONS.ROLE_READ, name: 'View Roles', description: 'Read role data', module: 'role' },
    { key: PERMISSIONS.ROLE_WRITE, name: 'Manage Roles', description: 'Create/update roles', module: 'role' },
    { key: PERMISSIONS.PERMISSION_READ, name: 'View Permissions', description: 'Read permissions', module: 'permission' },
    { key: PERMISSIONS.PERMISSION_WRITE, name: 'Manage Permissions', description: 'Create/update permissions', module: 'permission' },
    { key: PERMISSIONS.DEPARTMENT_READ, name: 'View Departments', description: 'Read departments', module: 'department' },
    { key: PERMISSIONS.DEPARTMENT_WRITE, name: 'Manage Departments', description: 'Create/update departments', module: 'department' },
    { key: PERMISSIONS.TICKET_READ, name: 'View Tickets', description: 'Read tickets', module: 'ticket' },
    { key: PERMISSIONS.TICKET_WRITE, name: 'Manage Tickets', description: 'Create/update tickets', module: 'ticket' },
    { key: PERMISSIONS.TICKET_ASSIGN, name: 'Assign Tickets', description: 'Assign tickets to agents', module: 'ticket' },
    { key: PERMISSIONS.TICKET_INTERNAL_NOTE, name: 'Internal Ticket Notes', description: 'Add private notes', module: 'ticket' },
    { key: PERMISSIONS.REPORT_READ, name: 'View Reports', description: 'Read reports and analytics', module: 'report' },
    { key: PERMISSIONS.AUDIT_READ, name: 'View Audit Logs', description: 'Read audit logs', module: 'audit' },
    { key: PERMISSIONS.NOTIFICATION_READ, name: 'View Notifications', description: 'Read notifications', module: 'notification' }
  ];

  await Permission.deleteMany({});
  await Role.deleteMany({});
  await Department.deleteMany({});
  await User.deleteMany({});

  await Permission.insertMany(permissions);

  const allPermissionKeys = permissions.map((permission) => permission.key);

  const roles = [
    { key: ROLE_KEYS.SUPER_ADMIN, name: 'Super Admin', description: 'Full access', permissions: allPermissionKeys, isSystem: true },
    {
      key: ROLE_KEYS.ADMIN,
      name: 'Admin',
      description: 'Department and agent management',
      permissions: [PERMISSIONS.USER_READ, PERMISSIONS.DEPARTMENT_READ, PERMISSIONS.DEPARTMENT_WRITE, PERMISSIONS.TICKET_READ, PERMISSIONS.TICKET_WRITE, PERMISSIONS.TICKET_ASSIGN, PERMISSIONS.REPORT_READ, PERMISSIONS.AUDIT_READ, PERMISSIONS.NOTIFICATION_READ],
      isSystem: true
    },
    {
      key: ROLE_KEYS.SUPPORT_AGENT,
      name: 'Support Agent',
      description: 'Handle assigned tickets',
      permissions: [PERMISSIONS.TICKET_READ, PERMISSIONS.TICKET_WRITE, PERMISSIONS.TICKET_INTERNAL_NOTE, PERMISSIONS.NOTIFICATION_READ],
      isSystem: true
    },
    {
      key: ROLE_KEYS.USER,
      name: 'User',
      description: 'Create and track tickets',
      permissions: [PERMISSIONS.TICKET_READ, PERMISSIONS.TICKET_WRITE, PERMISSIONS.NOTIFICATION_READ],
      isSystem: true
    }
  ];

  await Role.insertMany(roles);

  const support = await Department.create([
    { name: 'IT Support', slug: 'it-support', description: 'Technical support requests' },
    { name: 'HR', slug: 'hr', description: 'People and policy requests' },
    { name: 'Finance', slug: 'finance', description: 'Billing and finance requests' }
  ]);

  const superAdminPassword = await hashValue(env.SUPER_ADMIN_PASSWORD);
  await User.create({
    fullName: env.SUPER_ADMIN_NAME,
    email: env.SUPER_ADMIN_EMAIL.toLowerCase().trim(),
    passwordHash: superAdminPassword,
    roleKey: ROLE_KEYS.SUPER_ADMIN,
    permissions: allPermissionKeys,
    departmentId: support[0]?._id
  });

  console.log('Seed complete');
}

void seed();
