import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { api } from '../services/api';
import { createTicket } from '../services/tickets';

const schema = z.object({
  lineOrStation: z.string().min(2, 'Line/Station must be at least 2 characters').max(50, 'Cannot exceed 50 characters'),
  ip: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'Please enter a valid IP address (e.g., 192.168.1.1)'),
  currentOperatorPhoneNumber: z.string().regex(/^[0-9]{7,20}$/, 'Phone must be 7-20 digits only'),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(100, 'Cannot exceed 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Cannot exceed 5000 characters'),
  category: z.string().min(2, 'Category must be at least 2 characters').max(50, 'Cannot exceed 50 characters'),
  departmentId: z.string().min(1, 'Please select a department'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'])
});

type CreateTicketValues = z.infer<typeof schema>;

export function TicketCreatePage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [deptError, setDeptError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<CreateTicketValues>({ resolver: zodResolver(schema), defaultValues: { priority: 'medium' } });

  const loadDepartments = async () => {
    setLoading(true);
    setDeptError(null);
    try {
      const response = await api.get('/api/departments');
      const depts = response.data.items ?? [];
      setDepartments(depts);
      if (depts.length === 0) {
        setDeptError('No departments found. Ask an admin to create one, then retry.');
      }
    } catch (error: any) {
      console.error('Failed to load departments:', error);
      const message = error?.response?.data?.message || 'Failed to load departments. Check your connection and retry.';
      setDeptError(message);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDepartments();
  }, []);

  const onSubmit = async (values: CreateTicketValues) => {
    setSubmitError(null);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => formData.append(key, String(value)));
      const fileInput = document.getElementById('ticket-attachments') as HTMLInputElement | null;
      if (fileInput?.files) {
        const files = Array.from(fileInput.files);
        const oversized = files.filter((file) => file.size > 10 * 1024 * 1024);
        if (oversized.length > 0) {
          const message = `${oversized.length} file(s) exceed 10MB: ${oversized.slice(0, 2).map((f) => f.name).join(', ')}`;
          setSubmitError(message);
          toast.error(message);
          return;
        }
        if (files.length > 5) {
          const message = 'Maximum 5 files allowed';
          setSubmitError(message);
          toast.error(message);
          return;
        }
        files.forEach((file) => formData.append('attachments', file));
      }
      const response = await createTicket(formData);
      toast.success('Ticket created successfully');
      navigate(`/tickets/${response.ticket._id}`);
    } catch (error: any) {
      const data = error?.response?.data;
      // Backend zod errors arrive as { message: 'Validation failed', details: { fieldErrors } } —
      // surface the per-field reasons instead of the generic message.
      const fieldErrors = data?.details?.fieldErrors as Record<string, string[]> | undefined;
      if (fieldErrors && typeof fieldErrors === 'object') {
        Object.entries(fieldErrors).forEach(([field, messages]) => {
          const message = Array.isArray(messages) ? messages[0] : String(messages);
          if (message) {
            try {
              setError(field as keyof CreateTicketValues, { type: 'server', message });
            } catch {
              // ignore unknown fields
            }
          }
        });
        const summary = Object.entries(fieldErrors)
          .slice(0, 3)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages[0] : messages}`)
          .join('; ');
        const message = summary ? `Please fix: ${summary}` : 'Validation failed. Please check the form.';
        setSubmitError(message);
        toast.error(message);
        return;
      }
      const message = data?.message || 'Failed to create ticket';
      setSubmitError(message);
      toast.error(message);
    }
  };

  // handleSubmit() silently skips onSubmit when client validation fails —
  // without this, a missed inline message looks like "nothing happens".
  const onInvalid = (formErrors: Record<string, { message?: string }>) => {
    const entries = Object.entries(formErrors);
    if (entries.length === 0) return;
    const [firstField] = entries[0];
    const message = `Please fix ${entries.length} highlighted field${entries.length === 1 ? '' : 's'} before submitting`;
    setSubmitError(message);
    toast.error(message);
    requestAnimationFrame(() => {
      document.querySelector(`[name="${firstField}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Create ticket" description="Capture the request with enough context to route it correctly." actions={<Button variant="outline" onClick={() => navigate('/tickets')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>} />
      {submitError ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {submitError}
        </div>
      ) : null}
      <Card>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit, onInvalid)}>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Line / Station</label>
              <Input placeholder="e.g., Main Line A" className={errors.lineOrStation ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-950/20' : ''} {...register('lineOrStation')} />
              {errors.lineOrStation ? <p className="mt-1 text-xs text-red-500 font-medium">{errors.lineOrStation.message}</p> : <p className="mt-1 text-xs text-slate-500">Identify the service line or station</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">IP Address</label>
              <Input placeholder="e.g., 192.168.1.1" className={errors.ip ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-950/20' : ''} {...register('ip')} />
              {errors.ip ? <p className="mt-1 text-xs text-red-500 font-medium">{errors.ip.message}</p> : <p className="mt-1 text-xs text-slate-500">Device or service IP address</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Operator Phone</label>
              <Input placeholder="e.g., 5551234567" type="tel" inputMode="numeric" pattern="[0-9]{7,20}" autoComplete="tel" className={errors.currentOperatorPhoneNumber ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-950/20' : ''} {...register('currentOperatorPhoneNumber')} />
              {errors.currentOperatorPhoneNumber ? <p className="mt-1 text-xs text-red-500 font-medium">{errors.currentOperatorPhoneNumber.message}</p> : <p className="mt-1 text-xs text-slate-500">Current operator contact number</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Category</label>
              <Input placeholder="e.g., Network Issue" className={errors.category ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-950/20' : ''} {...register('category')} />
              {errors.category ? <p className="mt-1 text-xs text-red-500 font-medium">{errors.category.message}</p> : <p className="mt-1 text-xs text-slate-500">Ticket category or type</p>}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Subject</label>
              <Input placeholder="Brief description of the issue" className={errors.subject ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-950/20' : ''} {...register('subject')} />
              {errors.subject ? <p className="mt-1 text-xs text-red-500 font-medium">{errors.subject.message}</p> : <p className="mt-1 text-xs text-slate-500">Short title of the issue</p>}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Description</label>
              <Textarea placeholder="Provide detailed information about the issue..." className={errors.description ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-950/20' : ''} {...register('description')} />
              {errors.description ? <p className="mt-1 text-xs text-red-500 font-medium">{errors.description.message}</p> : <p className="mt-1 text-xs text-slate-500">At least 10 characters with full context</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Department</label>
              {loading ? (
                <Select disabled>
                  <option>Loading departments...</option>
                </Select>
              ) : departments.length === 0 ? (
                <Select disabled>
                  <option>No departments available</option>
                </Select>
              ) : (
                <Select {...register('departmentId')}>
                  <option value="">Select a department</option>
                  {departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}
                </Select>
              )}
              {deptError ? (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {deptError}{' '}
                  <button type="button" onClick={() => void loadDepartments()} className="font-semibold underline hover:text-red-600">
                    Retry
                  </button>
                </p>
              ) : errors.departmentId ? (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.departmentId.message}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Route to appropriate team</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Priority</label>
              <Select {...register('priority')}>
                <option value="low">🟢 Low - Can wait</option>
                <option value="medium">🟡 Medium - Normal</option>
                <option value="high">🟠 High - Urgent</option>
                <option value="urgent">🔴 Urgent - Critical</option>
              </Select>
              <p className="mt-1 text-xs text-slate-500">Severity level of the issue</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Attachments</label>
              <div className="flex items-center gap-2">
                <Input 
                  id="ticket-attachments" 
                  type="file" 
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp,.pdf,.txt,.doc,.docx,.xls,.xlsx"
                  className="flex-1"
                />
                <span className="text-xs text-slate-500">Max 5 files, 10MB each</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Images: JPEG, PNG, GIF, WebP | Docs: PDF, Word, Excel, TXT</p>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-3">
              {deptError && !loading ? (
                <Button type="button" variant="outline" onClick={() => void loadDepartments()}>
                  Retry departments
                </Button>
              ) : null}
              <Button type="submit" disabled={isSubmitting || loading} title={departments.length === 0 && !loading ? 'No departments available — retry loading departments first' : undefined}>{isSubmitting ? 'Creating...' : 'Create Ticket'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
