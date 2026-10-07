import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, Mail, Phone, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../services/auth';
import { Alert, Button, FieldError, Input, Label } from '../components/ui';
import { OpeningSplash } from '../components/OpeningSplash';
import { getErrorMessage } from '../utils/helpers';
import companyLogo from '../assets/company-logo.png';

const COMPANY_NAME = 'IMMACULATE MASTERS';
const COMPANY_TAGLINE = 'Facility Management Services';
const SUPPORT_EMAIL = 'Immculatefms2023@gmail.com';
const SUPPORT_PHONE = '9356418873';
const SPLASH_MS = 2500;

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type LoginValues = z.infer<typeof loginSchema>;
type ForgotValues = z.infer<typeof forgotSchema>;

function PasswordField({
  id,
  label,
  placeholder,
  autoComplete,
  className,
  error,
  registration,
}: {
  id: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
  error?: string;
  registration: ReturnType<ReturnType<typeof useForm>['register']>;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <Label htmlFor={id} className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
        {label}
      </Label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
          <Lock size={16} />
        </div>
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`${className ?? ''} pl-10 pr-11`}
          {...registration}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-teal-600 cursor-pointer"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          title={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <FieldError message={error} />
    </div>
  );
}

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSplash, setShowSplash] = useState(false);
  const [splashName, setSplashName] = useState('');

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const forgotForm = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) });

  useEffect(() => {
    if (!showSplash) return;
    const timer = window.setTimeout(() => {
      navigate('/', { replace: true });
    }, SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, [showSplash, navigate]);

  if (!loading && user && !showSplash) return <Navigate to="/" replace />;

  const onLogin = loginForm.handleSubmit(async (values) => {
    setError('');
    setSuccess('');
    try {
      await login(values.email, values.password);
      const raw = localStorage.getItem('hkbams_user');
      const name = raw ? (JSON.parse(raw) as { name?: string }).name : '';
      setSplashName(name ?? '');
      setShowSplash(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email or password'));
    }
  });

  const onForgot = forgotForm.handleSubmit(async (values) => {
    setError('');
    setSuccess('');
    try {
      const res = await authApi.forgotPassword(values.email, values.newPassword);
      setSuccess(res.data.message || res.data.data?.message || 'Password updated. You can sign in now.');
      forgotForm.reset();
      setMode('login');
      loginForm.setValue('email', values.email);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to reset password'));
    }
  });

  const fieldClass =
    'login-input !border-slate-300/80 !bg-white !text-slate-900 !placeholder:text-slate-400 !shadow-xs focus:!border-teal-500 focus:!ring-4 focus:!ring-teal-500/20';

  const switchToForgot = () => {
    setError('');
    setSuccess('');
    setMode('forgot');
    forgotForm.reset({
      email: loginForm.getValues('email') || '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const switchToLogin = () => {
    setError('');
    setSuccess('');
    setMode('login');
  };

  if (showSplash) {
    return <OpeningSplash userName={splashName} />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 sm:p-6">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-xl shadow-teal-950/40 ring-1 ring-white/20 transition hover:scale-105">
            <img src={companyLogo} alt="Immaculate Masters logo" className="h-full w-full object-contain" />
          </div>
          <div className="mt-3.5 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-300 ring-1 ring-teal-400/30">
              <Sparkles size={11} /> Enterprise Portal
            </span>
          </div>
          <h1 className="mt-2 text-xl font-extrabold tracking-wide text-white">{COMPANY_NAME}</h1>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-teal-300/90">
            {COMPANY_TAGLINE}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 shadow-2xl shadow-black/50 backdrop-blur-md">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold tracking-tight text-white">
              {mode === 'login' ? 'Welcome back' : 'Reset password'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {mode === 'login'
                ? 'Sign in with your authorized credentials to access workspace'
                : 'Enter your verified email and choose a new password'}
            </p>
          </div>

          {mode === 'login' ? (
            <form className="space-y-4" onSubmit={onLogin}>
              <div>
                <Label htmlFor="email" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  Email Address
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail size={16} />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="name@company.com"
                    className={`${fieldClass} pl-10`}
                    {...loginForm.register('email')}
                  />
                </div>
                <FieldError message={loginForm.formState.errors.email?.message} />
              </div>

              <PasswordField
                id="password"
                label="Password"
                placeholder="••••••••"
                autoComplete="current-password"
                className={fieldClass}
                error={loginForm.formState.errors.password?.message}
                registration={loginForm.register('password')}
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={switchToForgot}
                  className="text-xs font-semibold text-teal-300 transition hover:text-teal-200 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {error ? <Alert tone="error">{error}</Alert> : null}
              {success ? <Alert tone="success">{success}</Alert> : null}

              <Button
                className="w-full shadow-lg shadow-teal-950/40"
                size="lg"
                type="submit"
                loading={loginForm.formState.isSubmitting}
                disabled={loginForm.formState.isSubmitting}
              >
                {loginForm.formState.isSubmitting ? 'Signing in...' : 'Sign In to Workspace'}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={onForgot}>
              <div>
                <Label htmlFor="forgot-email" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  Email Address
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail size={16} />
                  </div>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="username"
                    placeholder="name@company.com"
                    className={`${fieldClass} pl-10`}
                    {...forgotForm.register('email')}
                  />
                </div>
                <FieldError message={forgotForm.formState.errors.email?.message} />
              </div>

              <PasswordField
                id="newPassword"
                label="New password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className={fieldClass}
                error={forgotForm.formState.errors.newPassword?.message}
                registration={forgotForm.register('newPassword')}
              />

              <PasswordField
                id="confirmPassword"
                label="Confirm new password"
                placeholder="••••••••"
                autoComplete="new-password"
                className={fieldClass}
                error={forgotForm.formState.errors.confirmPassword?.message}
                registration={forgotForm.register('confirmPassword')}
              />

              {error ? <Alert tone="error">{error}</Alert> : null}

              <Button
                className="w-full"
                size="lg"
                type="submit"
                loading={forgotForm.formState.isSubmitting}
                disabled={forgotForm.formState.isSubmitting}
              >
                {forgotForm.formState.isSubmitting ? 'Updating...' : 'Update Password'}
              </Button>

              <button
                type="button"
                onClick={switchToLogin}
                className="w-full text-center text-xs font-semibold text-slate-400 transition hover:text-teal-300 cursor-pointer"
              >
                ← Back to sign in
              </button>
            </form>
          )}

          {/* Support Info */}
          <div className="mt-6 border-t border-white/10 pt-4 text-center">
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Phone size={12} className="text-teal-400" />
              <span>Help Desk: {SUPPORT_PHONE}</span>
              <span className="text-slate-600">|</span>
              <span>{SUPPORT_EMAIL}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
