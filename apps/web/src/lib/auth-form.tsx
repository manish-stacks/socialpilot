'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  Shield,
  Sparkles,
  User,
} from 'lucide-react';
import { api, setToken } from './api';
import { loginSchema, registerSchema } from './schemas';
import { Logo } from '@/components/marketing/logo';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/form';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const isReg = mode === 'register';
  const router = useRouter();
  const [err, setErr] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<{ name?: string; email: string; password: string }>({
    resolver: zodResolver(isReg ? registerSchema : loginSchema) as any,
  });

  const submit = handleSubmit(async (v) => {
    setErr('');
    try {
      const r = await api<{ accessToken: string }>(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(v),
      });
      setToken(r.accessToken);
      router.push('/dashboard');
    } catch (e) {
      setErr((e as Error).message);
    }
  });

  const fillDemo = (role: 'user' | 'admin') => {
    setValue('email', role === 'admin' ? 'admin@example.test' : 'demo@example.test');
    setValue('password', 'TestPassword123!');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-slate-50/60 dark:bg-slate-950 overflow-hidden">
      {/* Ambient background glows matching brand colors */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl" />

      <main className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {/* Logo Brand Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block transition-transform hover:scale-105">
              <Logo size="lg" />
            </Link>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {isReg ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isReg
                ? 'Start automating your social media publishing today'
                : 'Sign in to access your social workspaces and queues'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4" noValidate>
            {isReg && (
              <div>
                <Label>Your Name</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input className="pl-10 text-xs" placeholder="Jane Doe" {...register('name')} />
                </div>
                {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
              </div>
            )}

            <div>
              <Label>Work Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-10 text-xs"
                  type="email"
                  placeholder="name@company.com"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Password</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-10 text-xs"
                  type="password"
                  placeholder="••••••••••••"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>}
            </div>

            {err && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{err}</span>
              </div>
            )}

            <Button variant="brand" className="w-full font-semibold" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Authenticating…</span>
                </div>
              ) : isReg ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Quick Demo Fill (Dev/Test Convenience) */}
          {!isReg && (
            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Quick Test Login
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('user')}
                  className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300 transition"
                >
                  Fill Demo User
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('admin')}
                  className="rounded-lg border border-purple-200 bg-purple-50 py-1.5 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-purple-300 transition"
                >
                  Fill Admin User
                </button>
              </div>
            </div>
          )}

          {/* Footer switcher */}
          <div className="mt-6 text-center text-xs text-slate-500">
            {isReg ? (
              <span>
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-blue-600 hover:underline">
                  Sign in
                </Link>
              </span>
            ) : (
              <span>
                New to SocialPilot-AI?{' '}
                <Link href="/register" className="font-semibold text-blue-600 hover:underline">
                  Create an account
                </Link>
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
