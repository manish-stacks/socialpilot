import { cn } from '@/lib/utils';
import * as React from 'react';
type D = React.HTMLAttributes<HTMLDivElement>;
export const Card = ({ className, ...p }: D) => <div className={cn('rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950', className)} {...p} />;
export const CardTitle = ({ className, ...p }: D) => <h3 className={cn('text-sm font-semibold', className)} {...p} />;
export const Empty = ({ children }: { children: React.ReactNode }) => <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">{children}</div>;
export const Stat = ({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) => (
  <Card><div className="text-xs text-neutral-500">{label}</div><div className="mt-1 text-2xl font-semibold">{value}</div>{hint && <div className="mt-1 text-xs text-neutral-500">{hint}</div>}</Card>
);
