'use client';

import { useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase';

export function useSupabase(): SupabaseClient {
  return useMemo(() => getSupabaseBrowser() as unknown as SupabaseClient, []);
}
