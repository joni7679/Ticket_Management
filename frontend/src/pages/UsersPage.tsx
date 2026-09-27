import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/table';
import { listRoles, listUsers, updateUser, createUser } from '../services/users';
import { api } from '../services/api';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      companyName: '',
      phoneNumber: '',
      roleKey: 'user',
      departmentId: ''
    }
  });

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [nextUsers, nextRoles, nextDepartments] = await Promise.all([
        listUsers(),
        listRoles(),
        api.get('/api/departments').then(res => res.data.items ?? []).catch(() => [])
      ]);
      setUsers(nextUsers);
      setRoles(nextRoles);
      setDepartments(nextDepartments);
    } catch (error: any) {
      setLoadError(error?.response?.data?.message || 'Failed to load users');
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredUsers = useMemo(
    () => users.filter((user) => {
      const matchesQuery = [user.fullName, user.email, user.phoneNumber, user.companyName, user.roleKey, user.departmentId?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query.toLowerCase()));
      const matchesRole = roleFilter ? user.roleKey === roleFilter : true;
      const matchesStatus = statusFilter ? user.status === statusFilter : true;
      return matchesQuery && matchesRole && matchesStatus;
    }),
    [query, roleFilter, statusFilter, users]
  );

  const activeCount = users.filter((user) => user.status === 'active').length;
  const roleCount = new Set(users.map((user) => user.roleKey)).size;

  const saveRole = async (userId: string, roleKey: string) => {
    await updateUser(userId, { roleKey });
    toast.success('Role updated');
    await load();
  };

  const saveDepartment = async (userId: string, departmentId: string) => {
    await updateUser(userId, { departmentId: departmentId || null });
    toast.success('Department updated');
    await load();
  };

  const onCreateUserSubmit = async (data: any) => {
    try {
      // Basic validation
      if (!data.fullName || data.fullName.length < 2) {
        toast.error('Full name is required (min 2 characters)');
        return;
      }
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        toast.error('Valid email is required');
        return;
      }
      if (!data.password || data.password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
      if (data.phoneNumber && !/^[0-9]{7,20}$/.test(data.phoneNumber)) {
        toast.error('Phone must be 7-20 digits (or leave empty)');
        return;
      }

      setIsCreating(true);
      await createUser({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        companyName: data.companyName || undefined,
        phoneNumber: data.phoneNumber || undefined,
        roleKey: data.roleKey || 'user',
        departmentId: data.departmentId || undefined
      });
      toast.success('User created successfully');
      reset();
      setShowCreateModal(false);
      await load();
    } catch (error) {
      toast.error((error as any)?.message || 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Manage system users, statuses, and role assignments." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Users</p>
            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{users.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Active Users</p>
            <p className="mt-2 text-3xl font-black text-green-600 dark:text-green-400">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Roles Assigned</p>
            <p className="mt-2 text-3xl font-black text-blue-600 dark:text-blue-400">{roleCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="grid gap-3 border-b border-slate-200 p-4 dark:border-slate-800 md:grid-cols-5">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, company, phone, email, role, department" />
          <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="">All Roles</option>
            {roles.map((role) => <option key={role.key} value={role.key}>{role.name}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </Select>
          <Button variant="secondary" onClick={() => { setQuery(''); setRoleFilter(''); setStatusFilter(''); }}>
            Clear Filters
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            Create User
          </Button>
        </CardContent>

        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <p className="px-4 py-12 text-center text-sm text-slate-500">Loading users...</p>
          ) : loadError && users.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{loadError}</p>
              <Button className="mt-4" onClick={() => void load()}>Retry</Button>
            </div>
          ) : (
          <Table>
            <TableHead>
              <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b-2 border-slate-200 dark:border-slate-600">
                <TableHeaderCell className="text-slate-700 dark:text-slate-200">Name</TableHeaderCell>
                <TableHeaderCell className="text-slate-700 dark:text-slate-200">Phone</TableHeaderCell>
                <TableHeaderCell className="text-slate-700 dark:text-slate-200">Company</TableHeaderCell>
                <TableHeaderCell className="text-slate-700 dark:text-slate-200">Email</TableHeaderCell>
                <TableHeaderCell className="text-slate-700 dark:text-slate-200">Role</TableHeaderCell>
                <TableHeaderCell className="text-slate-700 dark:text-slate-200">Department</TableHeaderCell>
                <TableHeaderCell className="text-slate-700 dark:text-slate-200">Status</TableHeaderCell>
                <TableHeaderCell className="text-slate-700 dark:text-slate-200">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user._id} className="hover:bg-blue-50 dark:hover:bg-blue-900/10 border-b border-slate-100 dark:border-slate-800 transition">
                  <TableCell className="font-semibold text-slate-900 dark:text-white">{user.fullName}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">{user.phoneNumber || '—'}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">{user.companyName || '—'}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">{user.email}</TableCell>
                  <TableCell>
                    <Badge className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {user.roleKey}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">{user.departmentId?.name || '—'}</TableCell>
                  <TableCell>
                    <Badge className={user.status === 'active' ? 'rounded-full bg-green-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300'}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-[21rem] align-top">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Quick Actions</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">Role, department, and access controls</p>
                        </div>
                        <Badge className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Admin
                        </Badge>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <div className="space-y-1.5 md:col-span-1 xl:col-span-1">
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</label>
                          <Select
                            defaultValue={user.roleKey}
                            onChange={(event) => void saveRole(user._id, event.target.value)}
                            className="h-11 w-full rounded-xl border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-950"
                          >
                            {roles.map((role) => <option key={role.key} value={role.key}>{role.name}</option>)}
                          </Select>
                        </div>

                        <div className="space-y-1.5 md:col-span-1 xl:col-span-1">
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Department</label>
                          <Select
                            defaultValue={user.departmentId?._id || ''}
                            onChange={(event) => void saveDepartment(user._id, event.target.value)}
                            className="h-11 w-full rounded-xl border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-950"
                          >
                            <option value="">No Department</option>
                            {departments.map((dept) => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
                          </Select>
                        </div>

                        <div className="space-y-1.5 md:col-span-2 xl:col-span-1">
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
                          <Button
                            variant="secondary"
                            className={`h-11 w-full rounded-xl border ${user.status === 'active' ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                            onClick={() => updateUser(user._id, { status: user.status === 'active' ? 'disabled' : 'active' }).then(load)}
                          >
                            {user.status === 'active' ? 'Disable User' : 'Enable User'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md border-slate-200 dark:border-slate-800">
            <CardContent className="space-y-4 p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New User</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Add a new user to the system</p>
              </div>

              <form onSubmit={handleSubmit(onCreateUserSubmit)} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
                  <Input {...register('fullName')} placeholder="John Doe" className="mt-1" />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email *</label>
                  <Input {...register('email')} type="email" placeholder="john@example.com" className="mt-1" />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password *</label>
                  <Input {...register('password')} type="password" placeholder="••••••••" className="mt-1" />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Company Name</label>
                  <Input {...register('companyName')} placeholder="ACME Corp" className="mt-1" />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
                  <Input {...register('phoneNumber')} type="tel" inputMode="numeric" placeholder="9876543210" className="mt-1" />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Role</label>
                  <Select {...register('roleKey')} className="mt-1">
                    <option value="user">User</option>
                    <option value="support_agent">Support Agent</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Department</label>
                  <Select {...register('departmentId')} className="mt-1">
                    <option value="">No Department</option>
                    {departments.map((dept) => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowCreateModal(false);
                      reset();
                    }}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isCreating}
                  >
                    {isCreating ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
