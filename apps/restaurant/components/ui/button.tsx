'use client';

import { cn } from '@/lib/cn';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-900',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-900',
  danger: 'bg-danger text-white hover:bg-danger/90',
  success: 'bg-success text-white hover:bg-success/90',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', isLoading, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/40',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
});
