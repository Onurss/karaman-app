'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, PageHeader } from '@/components/ui';
import { useSupabase } from '@/lib/hooks/use-supabase';
import { POS_PROVIDERS, paymentMethodLabel, type PosProvider } from '@karaman/shared-types';

export default function PaymentSettingsPage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('id', true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [cashEnabled, setCashEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [onlineEnabled, setOnlineEnabled] = useState(false);
  const [activePos, setActivePos] = useState<PosProvider | null>(null);

  useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    setCashEnabled(s.cash_enabled);
    setCardEnabled(s.card_on_delivery_enabled);
    setOnlineEnabled(s.online_enabled);
    setActivePos((s.active_pos_provider as PosProvider | null) ?? null);
  }, [settingsQuery.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (onlineEnabled && !activePos) {
        throw new Error('Online ödeme açıkken bir POS sağlayıcı seçmelisiniz.');
      }
      if (!cashEnabled && !cardEnabled && !onlineEnabled) {
        throw new Error('En az bir ödeme yöntemi açık olmalı.');
      }
      const { error } = await supabase
        .from('payment_settings')
        .update({
          cash_enabled: cashEnabled,
          card_on_delivery_enabled: cardEnabled,
          online_enabled: onlineEnabled,
          active_pos_provider: onlineEnabled ? activePos : null,
        })
        .eq('id', true);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ödeme ayarları kaydedildi.');
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Ödeme Ayarları"
        description="Hangi ödeme yöntemleri aktif? Online ödemede tek POS sağlayıcı seçilir."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ödeme Yöntemleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={cashEnabled}
                onChange={(e) => setCashEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Kapıda Nakit</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={cardEnabled}
                onChange={(e) => setCardEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Kapıda Kart</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={onlineEnabled}
                onChange={(e) => setOnlineEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Online Kart (POS)</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktif POS Sağlayıcı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {onlineEnabled ? (
              <>
                {POS_PROVIDERS.map((p) => (
                  <label key={p} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="active_pos"
                      checked={activePos === p}
                      onChange={() => setActivePos(p)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium">{paymentMethodLabel[p]}</span>
                  </label>
                ))}
                <p className="text-xs text-gray-500">
                  Aynı anda yalnızca bir POS aktif olur. Sağlayıcı anahtarları sistemde tanımlı
                  olmalıdır; aksi halde online ödeme başarısız olur.
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Online ödeme kapalı. POS seçmek için &ldquo;Online Kart (POS)&rdquo;yı açın.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Button onClick={() => save.mutate()} disabled={save.isPending || settingsQuery.isLoading}>
          {save.isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </div>
    </div>
  );
}
