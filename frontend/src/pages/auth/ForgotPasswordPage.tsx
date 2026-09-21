import { Link } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { forgotPasswordRequest } from '../../services/auth';

const schema = z.object({ email: z.string().email() });

type ForgotValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: ForgotValues) => {
    try {
      await forgotPasswordRequest(values);
      toast.success('If the account exists, reset instructions were sent.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send reset link');
    }
  };

  return (
    <AuthLayout eyebrow="Get in touch" title="Reset your password" description="Enter your email and we’ll send a secure reset link so you can get back into your account." icon="🔐">
      <Card className="w-full max-w-md overflow-hidden border-0 shadow-lg dark:border-slate-800 dark:bg-slate-800 lg:shadow-lg bg-white rounded-2xl">
        <CardHeader className="space-y-3 pb-6 pt-8 text-center bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50">
          <CardTitle className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Forgot password?</CardTitle>
          <CardDescription className="text-sm text-slate-600 dark:text-slate-300">We'll send a reset link to your email</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8 pt-6 bg-slate-50/50 dark:bg-slate-800/50">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2.5 bg-white dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 transition-all hover:border-slate-300 dark:hover:border-slate-500">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="email">Email Address</label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                className="h-10 rounded-lg border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-none transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400 dark:focus-visible:border-blue-400" 
                {...register('email')} 
              />
              {errors.email && <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">⚠ {errors.email.message || 'Invalid email'}</p>}
            </div>

            <Button 
              className="h-11 w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-base font-semibold text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 active:scale-95 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800" 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending reset link...' : 'Send Reset Link'}
            </Button>

            <div className="text-center text-sm text-slate-600 dark:text-slate-400 pt-2">
              Remembered your password?{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors dark:text-blue-400 dark:hover:text-blue-300">
                Back to sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
