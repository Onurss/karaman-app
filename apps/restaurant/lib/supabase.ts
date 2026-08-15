import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { Database } from '@karaman/shared-types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function getSupabaseBrowser() {
  return createBrowserClient<Database>(url, anonKey);
}

export function getSupabaseServer(cookies: {
  getAll: () => { name: string; value: string }[];
  setAll: (items: { name: string; value: string; options?: Record<string, unknown> }[]) => void;
}) {
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: cookies.getAll,
      setAll: cookies.setAll,
    },
  });
}
