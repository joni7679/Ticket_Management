import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { api } from '../services/api';
import { listRoles, updateRolePermissions, type Role } from '../services/permissions';

const schema = z.object({
  key: z.string().min(2),
  name: z.string().min(2),
  module: z.string().min(2),
  description: z.string().optional()
});

type PermissionFormValues = z.infer<typeof schema>;

export function PermissionsPage() {
  const [activeTab, setActiveTab] = useState<'permissions' | 'roles'>('roles');
  const [permissions, setPermissions] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<PermissionFormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    void loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Permissions & Roles" description="Manage permissions and assign them to roles for access control." />
        <Card><CardContent className="py-12 text-center text-sm text-slate-500">Loading permissions...</CardContent></Card>
      </div>
    );
  }

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [permsRes, rolesData] = await Promise.all([
        api.get('/api/permissions'),
        listRoles()
      ]);
      setPermissions(permsRes.data.items ?? []);
      setRoles(rolesData);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: PermissionFormValues) => {
    try {
      if (editingId) {
        await api.patch(`/api/permissions/${editingId}`, values);
        toast.success('Permission updated');
      } else {
        await api.post('/api/permissions', values);
        toast.success('Permission created');
      }
      
      reset();
      setEditingId(null);
      await loadData();
    } catch {
      toast.error('Failed to save permission');
    }
  };

  const handleEdit = (permission: any) => {
    setEditingId(permission._id);
    setValue('key', permission.key);
    setValue('name', permission.name);
    setValue('module', permission.module || '');
    setValue('description', permission.description || '');
  };

  const handleDelete = async (permissionId: string, permissionName: string) => {
    if (!confirm(`Are you sure you want to delete permission "${permissionName}"?`)) return;
    try {
      await api.delete(`/api/permissions/${permissionId}`);
      toast.success('Permission deleted');
      await loadData();
    } catch {
      toast.error('Failed to delete permission');
    }
  };

  const handleCancel = () => {
    reset();
    setEditingId(null);
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions(new Set(role.permissions));
  };

  const handlePermissionToggle = (permissionKey: string) => {
    const newPerms = new Set(selectedPermissions);
    if (newPerms.has(permissionKey)) {
      newPerms.delete(permissionKey);
    } else {
      newPerms.add(permissionKey);
    }
    setSelectedPermissions(newPerms);
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;

    try {
      setIsSaving(true);
      await updateRolePermissions(selectedRole._id, Array.from(selectedPermissions));
      toast.success('Role permissions updated successfully');
      await loadData();
      setSelectedRole(null);
      setSelectedPermissions(new Set());
    } catch (error) {
      toast.error((error as any)?.message || 'Failed to update permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const permissionsByModule = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    permissions.forEach((perm) => {
      const module = perm.module || 'other';
      if (!grouped[module]) grouped[module] = [];
      grouped[module].push(perm);
    });
    return grouped;
  }, [permissions]);

  const modules = Object.keys(permissionsByModule).sort();

  return (
    <div className="space-y-6">
      <PageHeader title="Permissions & Roles" description="Manage permissions and assign them to roles for access control." />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition ${
            activeTab === 'roles'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Role Permissions
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition ${
            activeTab === 'permissions'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Permission List
        </button>
      </div>

      {/* Role Permissions Tab */}
      {activeTab === 'roles' && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left: Roles List */}
          <Card className="border-slate-200 dark:border-slate-800 md:col-span-1">
            <CardContent className="p-4">
              <h3 className="mb-4 text-sm font-bold uppercase text-slate-700 dark:text-slate-300">Roles ({roles.length})</h3>
              <div className="space-y-2">
                {roles.map((role) => (
                  <button
                    key={role._id}
                    onClick={() => handleRoleSelect(role)}
                    className={`w-full text-left rounded-lg border-2 p-3 transition ${
                      selectedRole?._id === role._id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{role.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{role.permissions.length} permissions</p>
                      </div>
                      {role.isSystem && (
                        <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs">System</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Right: Permissions Assignment */}
          <Card className="border-slate-200 dark:border-slate-800 md:col-span-2">
            <CardContent className="p-4">
              {selectedRole ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-sm font-bold uppercase text-slate-700 dark:text-slate-300">
                      Permissions for <span className="text-blue-600 dark:text-blue-400">{selectedRole.name}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{selectedPermissions.size} of {permissions.length} assigned</p>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {modules.map((module) => (
                      <div key={module} className="border-b border-slate-200 pb-3 dark:border-slate-700 last:border-b-0">
                        <h4 className="mb-2 text-xs font-bold uppercase text-slate-600 dark:text-slate-400">{module}</h4>
                        <div className="grid gap-2">
                          {permissionsByModule[module]?.map((perm) => (
                            <label
                              key={perm.key}
                              className="flex items-start gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPermissions.has(perm.key)}
                                onChange={() => handlePermissionToggle(perm.key)}
                                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                disabled={selectedRole.isSystem && selectedRole.key === 'super_admin'}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{perm.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{perm.description}</p>
                              </div>
                              <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs whitespace-nowrap">
                                {perm.key}
                              </Badge>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedRole(null);
                        setSelectedPermissions(new Set());
                      }}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveRolePermissions}
                      disabled={isSaving || (selectedRole.isSystem && selectedRole.key === 'super_admin')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSaving ? 'Saving...' : 'Save Permissions'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Select a role from the left to manage its permissions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Permissions List Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-4 font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Permission' : 'Create New Permission'}
              </h3>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
                <Input placeholder="Permission key (e.g., ticket_read)" {...register('key')} disabled={!!editingId} />
                <Input placeholder="Permission name" {...register('name')} />
                <Input placeholder="Module (e.g., ticket)" {...register('module')} />
                <Textarea className="md:col-span-2" placeholder="Description" {...register('description')} />
                <div className="md:col-span-2 flex justify-end gap-2">
                  {editingId && (
                    <Button type="button" variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {isSubmitting ? 'Saving...' : editingId ? 'Update Permission' : 'Create Permission'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Key</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Module</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Description</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {permissions.map((permission) => (
                    <tr key={permission._id} className={editingId === permission._id ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-mono text-xs">{permission.key}</Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{permission.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{permission.module || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{permission.description || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(permission)}>
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(permission._id, permission.name)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {permissions.length === 0 && (
                <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  No permissions found. Create one to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
