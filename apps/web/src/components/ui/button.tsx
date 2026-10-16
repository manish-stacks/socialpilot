import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const variants = cva('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: {
      default: 'bg-indigo-600 text-white hover:bg-indigo-700',
      outline: 'border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
      ghost: 'hover:bg-neutral-100 dark:hover:bg-neutral-800',
    },
    size: { default: 'h-9 px-4 py-2', sm: 'h-8 px-3 text-xs' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...p }, ref) => {
  const C = asChild ? Slot : 'button';
  return <C ref={ref} className={cn(variants({ variant, size }), className)} {...p} />;
});
Button.displayName = 'Button';
