'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { api, setToken } from './api';
import { loginSchema, registerSchema } from './schemas';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const isReg = mode === 'register';
  const router = useRouter();
  const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ name?: string; email: string; password: string }>({
    resolver: zodResolver(isReg ? registerSchema : loginSchema) as any,
  });
  const submit = handleSubmit(async (v) => {
    setErr('');
    try {
      const r = await api<{ accessToken: string }>(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(v) });
      setToken(r.accessToken); router.push('/dashboard');
    } catch (e) { setErr((e as Error).message); }
  });
  return (
    <main className="mx-auto max-w-sm px-6 py-20">
      <h1 className="mb-6 text-2xl font-semibold">{isReg ? 'Create your account' : 'Log in'}</h1>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {isReg && <div><input className="input" placeholder="Name" {...register('name')} /><p className="text-xs text-red-600">{errors.name?.message}</p></div>}
        <div><input className="input" type="email" placeholder="Email" {...register('email')} /><p className="text-xs text-red-600">{errors.email?.message}</p></div>
        <div><input className="input" type="password" placeholder="Password" {...register('password')} /><p className="text-xs text-red-600">{errors.password?.message}</p></div>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        <button className="btn w-full" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : isReg ? 'Sign up' : 'Log in'}</button>
      </form>
      <p className="mt-4 text-sm text-neutral-500">{isReg ? <>Have an account? <Link className="underline" href="/login">Log in</Link></> : <>New here? <Link className="underline" href="/register">Create account</Link></>}</p>
    </main>
  );
}
