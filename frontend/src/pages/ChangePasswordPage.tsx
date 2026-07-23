import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Shield } from 'lucide-react';
import { authApi } from '../services/auth';
import { Alert, Button, Card, FieldError, Input, Label, PageHeader } from '../components/ui';
import { getErrorMessage } from '../utils/helpers';

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string().min(8),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setError('');
    setMessage('');
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword);
      setMessage('Password updated successfully');
      reset();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  });

  return (
    <div>
      <PageHeader title="Change Password" subtitle="Keep your account secure with a strong password" />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="max-w-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <KeyRound size={20} />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Update credentials</p>
              <p className="text-sm text-slate-500">Use at least 8 characters for the new password</p>
            </div>
          </div>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <Label>Current Password</Label>
              <Input type="password" {...register('currentPassword')} />
              <FieldError message={errors.currentPassword?.message} />
            </div>
            <div>
              <Label>New Password</Label>
              <Input type="password" {...register('newPassword')} />
              <FieldError message={errors.newPassword?.message} />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input type="password" {...register('confirmPassword')} />
              <FieldError message={errors.confirmPassword?.message} />
            </div>
            {error ? <Alert tone="error">{error}</Alert> : null}
            {message ? <Alert tone="success">{message}</Alert> : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Update Password'}
            </Button>
          </form>
        </Card>

        <Card className="h-fit bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-teal-200">
            <Shield size={18} />
          </div>
          <p className="font-semibold">Security tip</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Prefer a unique password you don’t reuse elsewhere. Change it periodically if you share workstations.
          </p>
        </Card>
      </div>
    </div>
  );
}
