'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from './use-supabase';

export function useCurrentRestaurant() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['current-restaurant'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return null;

      const { data: link, error: linkErr } = await supabase
        .from('restaurant_users')
        .select('restaurant_id, role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (linkErr) throw linkErr;
      if (!link) return null;

      const { data: restaurant, error: restErr } = await supabase
        .from('restaurants_view')
        .select('*')
        .eq('id', link.restaurant_id)
        .maybeSingle();
      if (restErr) throw restErr;

      return {
        restaurant_id: link.restaurant_id,
        role: link.role,
        restaurants: restaurant,
      };
    },
    staleTime: 60_000,
  });
}
