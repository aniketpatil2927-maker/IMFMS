import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { authApi } from '../services/auth';
import { Alert, Button, Card, FieldError, Input, Label, PageHeader } from '../components/ui';
import { getErrorMessage } from '../utils/helpers';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your new password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

function PasswordInput({
  id,
  label,
  placeholder,
  error,
  registration,
}: {
  id: string;
  label: string;
  placeholder?: string;
  error?: string;
  registration: ReturnType<ReturnType<typeof useForm<FormValues>>['register']>;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <Label htmlFor={id} required>{label}</Label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
          <Lock size={16} />
        </div>
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder ?? '••••••••'}
          className="pl-10 pr-11"
          {...registration}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-teal-600 cursor-pointer"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <FieldError message={error} />
    </div>
  );
}

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
      setMessage('Your password has been successfully updated.');
      reset();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  });

  return (
    <div>
      <PageHeader
        title="Security & Password"
        subtitle="Update your security credentials and maintain authorized access to the facility management system"
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-200/60">
              <KeyRound size={17} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Update Credentials</p>
              <p className="text-xs text-slate-500">
                Choose a strong passphrase with at least 8 characters
              </p>
            </div>
          </div>

          <form className="space-y-3.5" onSubmit={onSubmit}>
            <PasswordInput
              id="currentPassword"
              label="Current Password"
              placeholder="Enter current password"
              error={errors.currentPassword?.message}
              registration={register('currentPassword')}
            />

            <PasswordInput
              id="newPassword"
              label="New Password"
              placeholder="Minimum 8 characters"
              error={errors.newPassword?.message}
              registration={register('newPassword')}
            />

            <PasswordInput
              id="confirmPassword"
              label="Confirm New Password"
              placeholder="Re-enter new password"
              error={errors.confirmPassword?.message}
              registration={register('confirmPassword')}
            />

            {error ? <Alert tone="error">{error}</Alert> : null}
            {message ? <Alert tone="success">{message}</Alert> : null}

            <div className="pt-1.5">
              <Button size="sm" type="submit" loading={isSubmitting} disabled={isSubmitting} className="w-full sm:w-auto">
                Update Password
              </Button>
            </div>
          </form>
        </Card>

        <Card className="h-fit bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white p-4 sm:p-5 border-slate-800 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-teal-300 ring-1 ring-white/15">
            <ShieldCheck size={18} />
          </div>
          <p className="font-bold text-sm">Account Security Advice</p>
          <div className="mt-2 space-y-2 text-xs leading-relaxed text-slate-300">
            <p>
              • Use a unique password not shared with personal email accounts or other platforms.
            </p>
            <p>
              • Keep your login credentials confidential. Facility attendance registers and tax invoices are sensitive corporate documents.
            </p>
            <p>
              • If you share workstations with other supervisors or office staff, always log out before stepping away.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
