import * as React from 'react';
import { cn } from '@/lib/utils';
const base = 'w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-neutral-700 disabled:opacity-50';
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, r) => <input ref={r} className={cn(base, className)} {...p} />);
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, r) => <textarea ref={r} className={cn(base, 'min-h-[90px]', className)} {...p} />);
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, r) => <select ref={r} className={cn(base, className)} {...p} />);
export const Label = ({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label className={cn('mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400', className)} {...p} />;
Input.displayName = 'Input'; Textarea.displayName = 'Textarea'; Select.displayName = 'Select';
