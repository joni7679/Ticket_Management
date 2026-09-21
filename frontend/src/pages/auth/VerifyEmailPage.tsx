import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { verifyEmailRequest } from '../../services/auth';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(token ? 'loading' : 'idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    const verify = async () => {
      try {
        const response = await verifyEmailRequest({ token });
        if (!mounted) return;
        setStatus('success');
        setMessage(response?.message ?? 'Email verified successfully');
        toast.success('Email verified successfully');
      } catch (error: any) {
        if (!mounted) return;
        setStatus('error');
        const msg = error?.response?.data?.message || 'Invalid or expired verification token';
        setMessage(msg);
        toast.error(msg);
      }
    };
    void verify();
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <AuthLayout eyebrow="Get in touch" title="Verify your email" description="Confirm your email address to finish setting up your helpdesk account." icon="✉️">
      <Card className="w-full max-w-md overflow-hidden border-0 shadow-lg dark:border-slate-800 dark:bg-slate-800 bg-white rounded-2xl">
        <CardHeader className="space-y-3 pb-6 pt-8 text-center">
          <CardTitle className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Email verification</CardTitle>
          <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
            {status === 'loading' && 'Verifying your email…'}
            {status === 'success' && (message || 'Your email has been verified.')}
            {status === 'error' && (message || 'Verification failed.')}
            {status === 'idle' && 'No verification token was provided. Check the link in your email.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8 pt-2 text-center">
          <Link to="/login">
            <Button className="h-11 w-full">Back to sign in</Button>
          </Link>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
