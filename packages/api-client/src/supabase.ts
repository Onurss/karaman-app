import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@karaman/shared-types';

export interface SupabaseAuthStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export interface CreateSupabaseOptions {
  url: string;
  anonKey: string;
  storage?: SupabaseAuthStorage;
  detectSessionInUrl?: boolean;
  autoRefreshToken?: boolean;
  persistSession?: boolean;
}

export type KaramanSupabaseClient = SupabaseClient<Database>;

export function createKaramanSupabaseClient(
  options: CreateSupabaseOptions,
): KaramanSupabaseClient {
  return createClient<Database>(options.url, options.anonKey, {
    auth: {
      storage: options.storage,
      autoRefreshToken: options.autoRefreshToken ?? true,
      persistSession: options.persistSession ?? true,
      detectSessionInUrl: options.detectSessionInUrl ?? false,
    },
    db: { schema: 'public' },
  });
}
