-- Push bildirim durumu + hata sayacı.
--
-- İlk şemada (20260513001700_push_notifications.sql) bu iki kolon eksikti; oysa
-- hem admin paneli geçmiş tablosu hem de send-push Edge Function bunları
-- okuyup yazıyor. Eksiklik yüzünden admin'in "Gönderim Geçmişi" sorgusu
-- (status, failed_count seçtiği için) hata veriyordu. Bu migration tamamlıyor.

alter table push_notifications
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed')),
  add column if not exists failed_count integer not null default 0;

-- Mevcut (eski) kayıtlar: gönderim tarihi varsa "sent" kabul et.
update push_notifications
  set status = 'sent'
  where sent_at is not null and status = 'pending';
