import { cn } from '@/lib/cn';
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...rest} />
    </div>
  );
}

export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500',
        className,
      )}
      {...rest}
    />
  );
}

export function TBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...rest} />;
}

export function TR({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('border-b border-gray-100 transition-colors hover:bg-gray-50', className)}
      {...rest}
    />
  );
}

export function TH({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('h-10 px-3 text-left align-middle font-medium', className)} {...rest} />;
}

export function TD({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-3 py-2 align-middle text-gray-900', className)} {...rest} />;
}
