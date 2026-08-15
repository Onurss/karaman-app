'use client';

import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Dialog({ open, onClose, title, description, children, size = 'md' }: DialogProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          'relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white p-6 shadow-xl',
          sizeClasses[size],
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {title ? <h2 className="text-lg font-semibold text-gray-900">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex items-center justify-end gap-2">{children}</div>;
}
