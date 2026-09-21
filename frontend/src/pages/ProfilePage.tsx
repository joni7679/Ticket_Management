import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { changePasswordRequest, updateProfileRequest } from '../services/auth';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { setUser } from '../store/authSlice';
import { formatDateTime } from '../utils/date';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  phoneNumber: z.string().regex(/^[0-9]{7,20}$/, 'Phone must be 7-20 digits only'),
  companyName: z.string().min(2, 'Company name is required').max(100, 'Company name cannot exceed 100 characters')
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password')
}).refine((values) => values.newPassword === values.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export function ProfilePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

  const userInitials = `${user?.fullName?.trim().charAt(0) ?? 'U'}${user?.companyName?.trim().charAt(0) ?? ''}`.trim().slice(0, 2).toUpperCase();

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
    window.requestAnimationFrame(() => setIsProfileModalVisible(true));
  };

  const closeProfileModal = () => {
    setIsProfileModalVisible(false);
    window.setTimeout(() => setIsProfileModalOpen(false), 150);
  };
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting }
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
      phoneNumber: user?.phoneNumber ?? '',
      companyName: user?.companyName ?? ''
    }
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting }
  } = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    resetProfile({
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
      phoneNumber: user?.phoneNumber ?? '',
      companyName: user?.companyName ?? ''
    });
  }, [resetProfile, user?.companyName, user?.email, user?.fullName, user?.phoneNumber]);

  useEffect(() => {
    if (!isProfileModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeProfileModal();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileModalOpen]);

  const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
    try {
      const response = await updateProfileRequest(values);
      dispatch(setUser(response.user));
      resetProfile({ fullName: response.user.fullName, email: response.user.email, phoneNumber: response.user.phoneNumber ?? '', companyName: response.user.companyName ?? '' });
      toast.success('Profile updated');
      closeProfileModal();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update profile');
    }
  };

  const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    try {
      await changePasswordRequest({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      toast.success('Password changed');
      resetPassword();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile Settings"
        description="Update your account, contact, and company details from one place."
        actions={(
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        )}
      />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">Account Overview</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">These details are used for ticket routing and profile identification.</p>
          </CardContent>
          <CardContent className="space-y-4 p-5">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Display Name</p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{user?.fullName ?? '—'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{user?.email ?? '—'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Company</p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{user?.companyName ?? '—'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Phone</p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{user?.phoneNumber ?? '—'}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</p>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{user?.roleKey?.replace(/_/g, ' ') ?? '—'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</p>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{user?.status ?? 'active'}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Last Login</p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">Account Details</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Edit the information shown on your profile and used in ticket creation.</p>
                </div>
                <Button type="button" variant="outline" onClick={openProfileModal}>
                  Edit profile
                </Button>
              </div>
            </CardContent>
            <CardContent className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Full name</p>
                  <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{user?.fullName ?? '—'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</p>
                  <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{user?.email ?? '—'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Phone</p>
                  <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{user?.phoneNumber ?? '—'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Company</p>
                  <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{user?.companyName ?? '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">Password</p>
            </CardContent>
            <CardContent className="space-y-5 p-5">
              <p className="text-sm text-slate-600 dark:text-slate-300">Change your password whenever you need to secure your account.</p>

              <form className="space-y-4" onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Current password</label>
                    <Input type="password" placeholder="Enter current password" {...registerPassword('currentPassword')} />
                    {passwordErrors.currentPassword ? <p className="text-xs text-red-500">{passwordErrors.currentPassword.message}</p> : null}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">New password</label>
                    <Input type="password" placeholder="Enter new password" {...registerPassword('newPassword')} />
                    {passwordErrors.newPassword ? <p className="text-xs text-red-500">{passwordErrors.newPassword.message}</p> : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Confirm new password</label>
                    <Input type="password" placeholder="Re-enter new password" {...registerPassword('confirmPassword')} />
                    {passwordErrors.confirmPassword ? <p className="text-xs text-red-500">{passwordErrors.confirmPassword.message}</p> : null}
                  </div>

                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                    Password must be at least 8 characters long and match the confirmation field.
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isPasswordSubmitting}>
                    {isPasswordSubmitting ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {isProfileModalOpen ? (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity duration-150 ${isProfileModalVisible ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeProfileModal}
        >
          <Card
            className={`w-full max-w-2xl overflow-hidden border-slate-200 bg-white shadow-2xl transition-all duration-150 dark:border-slate-800 dark:bg-slate-950 ${isProfileModalVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <CardContent className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white shadow-sm dark:bg-blue-500">
                    {userInitials}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">Edit profile</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update your account, contact, and company details.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeProfileModal}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardContent>
            <CardContent className="p-5">
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleProfileSubmit(onProfileSubmit)}>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Full name</label>
                  <Input placeholder="Enter your full name" {...registerProfile('fullName')} />
                  {profileErrors.fullName ? <p className="text-xs text-red-500">{profileErrors.fullName.message}</p> : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Email address</label>
                  <Input type="email" placeholder="name@example.com" {...registerProfile('email')} />
                  {profileErrors.email ? <p className="text-xs text-red-500">{profileErrors.email.message}</p> : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Phone number</label>
                  <Input type="tel" inputMode="numeric" placeholder="9876543210" {...registerProfile('phoneNumber')} />
                  {profileErrors.phoneNumber ? <p className="text-xs text-red-500">{profileErrors.phoneNumber.message}</p> : null}
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Company name</label>
                  <Input placeholder="Acme Corp" {...registerProfile('companyName')} />
                  {profileErrors.companyName ? <p className="text-xs text-red-500">{profileErrors.companyName.message}</p> : null}
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={closeProfileModal}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isProfileSubmitting}>
                    {isProfileSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving changes...
                      </>
                    ) : (
                      'Save changes'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
