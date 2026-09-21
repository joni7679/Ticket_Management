import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { registerRequest } from '../../services/auth';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { setCredentials } from '../../store/authSlice';
import { AuthLayout } from '../../components/layout/AuthLayout';

const schema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(50, 'Full name cannot exceed 50 characters').trim(),
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(100, 'Company name cannot exceed 100 characters').trim(),
  phoneNumber: z.string().regex(/^[0-9]{7,20}$/, 'Phone must be 7-20 digits only').trim(),
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain a number')
});

type RegisterValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: RegisterValues) => {
    try {
      const response = await registerRequest(values);
      dispatch(setCredentials({ user: response.user, accessToken: response.accessToken }));
      toast.success('Account created');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <AuthLayout eyebrow="Get in touch" title="Create your account" description="Join the platform to raise tickets, follow progress, and stay connected with support updates." icon="🚀">
      <Card className="w-full max-w-md overflow-hidden border-0 shadow-lg dark:border-slate-800 dark:bg-slate-800 lg:shadow-lg bg-white rounded-2xl">
        <CardHeader className="space-y-3 pb-6 pt-8 text-center bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50">
          <CardTitle className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Create account</CardTitle>
          <CardDescription className="text-sm text-slate-600 dark:text-slate-300">Register to raise and track tickets</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8 pt-6 bg-slate-50/50 dark:bg-slate-800/50">
          <form className="space-y-3.5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2 bg-white dark:bg-slate-700/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-600 transition-all hover:border-slate-300 dark:hover:border-slate-500">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="fullName">Full Name</label>
              <Input 
                id="fullName" 
                placeholder="John Doe" 
                className={`h-9 rounded-lg shadow-none transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-300 ${errors.fullName ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-950/20' : 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-700'}`} 
                {...register('fullName')} 
              />
              {errors.fullName && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">⚠ {errors.fullName.message}</p>}
            </div>

            <div className="space-y-2 bg-white dark:bg-slate-700/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-600 transition-all hover:border-slate-300 dark:hover:border-slate-500">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="companyName">Company Name</label>
              <Input 
                id="companyName" 
                placeholder="Acme Corp" 
                className={`h-9 rounded-lg shadow-none transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-300 ${errors.companyName ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-950/20' : 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-700'}`} 
                {...register('companyName')} 
              />
              {errors.companyName && <p className="text-xs font-medium text-red-600 dark:text-red-400">⚠ {errors.companyName.message}</p>}
            </div>

            <div className="space-y-2 bg-white dark:bg-slate-700/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-600 transition-all hover:border-slate-300 dark:hover:border-slate-500">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="phoneNumber">Phone Number</label>
              <Input 
                id="phoneNumber" 
                type="tel" 
                placeholder="5551234567" 
                inputMode="numeric" 
                pattern="[0-9]{7,20}" 
                className={`h-9 rounded-lg shadow-none transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-300 ${errors.phoneNumber ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-950/20' : 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-700'}`} 
                {...register('phoneNumber')} 
              />
              {errors.phoneNumber && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">⚠ {errors.phoneNumber.message}</p>}
            </div>

            <div className="space-y-2 bg-white dark:bg-slate-700/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-600 transition-all hover:border-slate-300 dark:hover:border-slate-500">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="email">Email Address</label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                className={`h-9 rounded-lg shadow-none transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-300 ${errors.email ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-950/20' : 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-700'}`} 
                {...register('email')} 
              />
              {errors.email && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">⚠ {errors.email.message}</p>}
            </div>

            <div className="space-y-2 bg-white dark:bg-slate-700/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-600 transition-all hover:border-slate-300 dark:hover:border-slate-500">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="password">Password</label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className={`h-9 rounded-lg shadow-none transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-300 ${errors.password ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-950/20' : 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-700'}`} 
                {...register('password')} 
              />
              {errors.password && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">⚠ {errors.password.message}</p>}
              {!errors.password && <p className="text-xs text-slate-500 dark:text-slate-400">Min 8 chars with uppercase & number</p>}
            </div>

            <Button 
              className="h-11 w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-base font-semibold text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 active:scale-95 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800" 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </Button>

            <div className="flex items-center justify-center gap-2 text-sm pt-2\">
              <span className="text-slate-600 dark:text-slate-400\">Already have an account?</span>
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors dark:text-blue-400 dark:hover:text-blue-300\">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
