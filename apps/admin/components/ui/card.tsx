import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-gray-200 bg-white shadow-sm', className)}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-1 border-b border-gray-200 p-4', className)} {...rest} />
  );
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold text-gray-900', className)} {...rest} />;
}

export function CardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-gray-500', className)} {...rest} />;
}

export function CardContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-2 border-t border-gray-200 p-4', className)}
      {...rest}
    />
  );
}
