'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Composer } from '@/components/composer';
import { useApp } from '@/lib/app-context';

function Inner() {
  const sp = useSearchParams();
  const { workspace } = useApp();
  if (!workspace) return <p className="text-sm text-neutral-500">Create a workspace first.</p>;
  const date = sp.get('date');
  return <Composer prefill={{ caption: sp.get('caption') ?? '', hashtags: sp.get('hashtags') ?? '', cta: sp.get('cta') ?? '', when: date ? `${date}T09:00` : '' }} />;
}
export default function NewPost() { return <Suspense><Inner /></Suspense>; }
