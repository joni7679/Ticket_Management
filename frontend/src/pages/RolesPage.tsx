import { useEffect, useState } from 'react';
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
import { listRoles } from '../services/users';
import { api } from '../services/api';
import { Checkbox } from '../components/ui/checkbox';

const schema = z.object({
  key: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional()
});

type RoleFormValues = z.infer<typeof schema>;

export function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<RoleFormValues>({ resolver: zodResolver(schema) });

  const loadPermissions = async () => {
    try {
      const res = await api.get('/api/permissions');
      setPermissions(res.data.items ?? []);
    } catch {
      console.error('Failed to load permissions');
    }
  };

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setRoles(await listRoles());
    } catch {
      setLoadError('Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void loadPermissions();
  }, []);

  const onSubmit = async (values: RoleFormValues) => {
    try {
      const payload = { ...values, permissions: selectedPermissions };
      
      if (editingId) {
        await api.patch(`/api/roles/${editingId}`, payload);
        toast.success('Role updated');
      } else {
        await api.post('/api/roles', payload);
        toast.success('Role created');
      }
      
      reset();
      setSelectedPermissions([]);
      setEditingId(null);
      await load();
    } catch {
      toast.error('Failed to save role');
    }
  };

  const handleEdit = (role: any) => {
    setEditingId(role._id);
    setValue('key', role.key);
    setValue('name', role.name);
    setValue('description', role.description || '');
    setSelectedPermissions(role.permissions ?? []);
  };

  const handleDelete = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete role "${roleName}"?`)) return;
    try {
      await api.delete(`/api/roles/${roleId}`);
      toast.success('Role deleted');
      await load();
    } catch {
      toast.error('Failed to delete role');
    }
  };

  const handleCancel = () => {
    reset();
    setSelectedPermissions([]);
    setEditingId(null);
  };

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Roles" description="Manage role definitions and permission bundles." />
      <Card>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Role key" {...register('key')} disabled={!!editingId} />
              <Input placeholder="Role name" {...register('name')} />
            </div>
            <Textarea placeholder="Description" {...register('description')} />
            
            <div className="space-y-3">
              <label className="block text-sm font-semibold">Permissions</label>
              {permissions.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  No permissions available. Create permissions first.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  {permissions.map((permission) => (
                    <label key={permission._id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedPermissions.includes(permission.key)}
                        onChange={() => togglePermission(permission.key)}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{permission.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{permission.key}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {selectedPermissions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedPermissions.map((perm) => (
                    <Badge key={perm} className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
                      {perm}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editingId && (
                <Button type="button" variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingId ? 'Update Role' : 'Create Role'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-sm text-slate-500">Loading roles...</CardContent></Card>
        ) : loadError && roles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm font-semibold">{loadError}</p>
              <Button className="mt-4" onClick={() => void load()}>Retry</Button>
            </CardContent>
          </Card>
        ) : (
        roles.map((role) => (
          <Card key={role._id} className={editingId === role._id ? 'ring-2 ring-blue-500' : ''}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{role.name}</h3>
                  <p className="text-sm text-slate-500">{role.key}</p>
                </div>
                <Badge className="bg-slate-100 text-slate-700">{role.permissions.length} permissions</Badge>
              </div>
              <p className="mt-3 text-sm text-slate-500">{role.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {role.permissions.map((permission: string) => <Badge key={permission} className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">{permission}</Badge>)}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(role)}>
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(role._id, role.name)} disabled={Boolean(role.isSystem)}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
        )}
      </div>
    </div>
  );
}
