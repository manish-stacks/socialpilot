import { cn } from '@/lib/utils';
import * as React from 'react';

type D = React.HTMLAttributes<HTMLDivElement>;

export const Card = ({ className, ...p }: D) => (
  <div
    className={cn(
      'rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-slate-300/80 dark:border-slate-800/80 dark:bg-slate-900',
      className
    )}
    {...p}
  />
);

export const CardHeader = ({ className, ...p }: D) => (
  <div className={cn('mb-4 flex items-center justify-between gap-4', className)} {...p} />
);

export const CardTitle = ({ className, ...p }: D) => (
  <h3 className={cn('text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100', className)} {...p} />
);

export const CardDescription = ({ className, ...p }: D) => (
  <p className={cn('text-xs text-slate-500 dark:text-slate-400', className)} {...p} />
);

export const Empty = ({
  children,
  icon,
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400',
      className
    )}
  >
    {icon && <div className="mb-2 text-slate-400">{icon}</div>}
    {children}
  </div>
);

export const Stat = ({
  label,
  value,
  hint,
  icon,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  trend?: { value: string; positive?: boolean };
  className?: string;
}) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-blue-500/30 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900',
      className
    )}
  >
    <div className="flex items-start justify-between">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      {icon && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
          {icon}
        </div>
      )}
    </div>
    <div className="mt-2 flex items-baseline gap-2">
      <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        {value}
      </div>
      {trend && (
        <span
          className={cn(
            'text-xs font-semibold',
            trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          )}
        >
          {trend.positive ? '+' : ''}
          {trend.value}
        </span>
      )}
    </div>
    {hint && (
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
        {hint}
      </div>
    )}
  </div>
);
