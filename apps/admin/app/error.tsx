'use client';

import { useEffect } from 'react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[admin:error-boundary]', error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Bir şeyler ters gitti</h2>
        <p className="mt-2 text-sm text-gray-600">
          Beklenmedik bir hata oluştu. Sayfayı yenilemeyi deneyin; sorun sürerse
          destek ekibine bildirin.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-gray-400">
            Referans: {error.digest}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            onClick={reset}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Tekrar Dene
          </button>
          <a
            href="/dashboard"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
