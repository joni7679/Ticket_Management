import { useEffect, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { listDepartments } from '../services/users';
import { api } from '../services/api';

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional()
});

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setDepartments(await listDepartments());
    } catch {
      setLoadError('Failed to load departments');
      toast.error('Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      if (editingId) {
        await api.patch(`/api/departments/${editingId}`, values);
        toast.success('Department updated');
      } else {
        await api.post('/api/departments', values);
        toast.success('Department created');
      }
      reset();
      setEditingId(null);
      await load();
    } catch {
      toast.error('Failed to save department');
    }
  };

  const handleEdit = (dept: any) => {
    setEditingId(dept._id);
    setValue('name', dept.name);
    setValue('description', dept.description || '');
  };

  const handleDelete = async (deptId: string, deptName: string) => {
    if (!confirm(`Are you sure you want to delete department "${deptName}"?`)) return;
    try {
      await api.delete(`/api/departments/${deptId}`);
      toast.success('Department deleted');
      await load();
    } catch {
      toast.error('Failed to delete department');
    }
  };

  const handleCancel = () => {
    reset();
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description="Define routing and SLA buckets for support queues." />
      <Card>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
            <Input placeholder="Department name" {...register('name')} />
            <Input placeholder="Optional description" {...register('description')} />
            <div className="md:col-span-2 flex justify-end gap-2">
              {editingId && (
                <Button type="button" variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingId ? 'Update Department' : 'Create Department'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-sm text-slate-500">Loading departments...</CardContent></Card>
        ) : loadError && departments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm font-semibold">{loadError}</p>
              <Button className="mt-4" onClick={() => void load()}>Retry</Button>
            </CardContent>
          </Card>
        ) : (
        departments.map((department) => (
          <Card key={department._id} className={editingId === department._id ? 'ring-2 ring-blue-500' : ''}>
            <CardContent>
              <h3 className="text-lg font-semibold">{department.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{department.slug}</p>
              <p className="mt-2 text-sm text-slate-500">{department.description}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(department)}>
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(department._id, department.name)}>
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
