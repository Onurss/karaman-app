-- ============================================================
-- 20260604130000 — SECURITY DEFINER fonksiyonlara sabit search_path
-- ============================================================
-- Güvenlik: search_path injection'a karşı koruma.
-- SECURITY DEFINER fonksiyonlar sahibinin (yüksek) yetkisiyle çalışır;
-- search_path sabitlenmezse saldırgan kendi şemasını öne alıp niteliksiz
-- isimleri (örn. `restaurant_users`) sahte nesnelere yönlendirebilir.
-- (Supabase Security Advisor: "Function Search Path Mutable".)
--
-- Body'ler şema-niteliksiz isim kullandığından `= ''` yerine sabit
-- `public, extensions` listesi kullanıyoruz: yol sabitlenir (injection
-- imkânsız) ama mevcut gövdeler bozulmadan çalışır.
--
-- Dinamik: search_path'i HENÜZ set edilmemiş tüm public SECURITY DEFINER
-- fonksiyonları yakalanır (hiçbiri atlanmasın). Zaten set olanlar (örn.
-- is_restaurant_member) atlanır.
-- ============================================================

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.prosecdef                                  -- security definer
      and n.nspname = 'public'                         -- yalnızca kendi şemamız
      and not exists (                                 -- extension'a AİT OLMASIN
        select 1 from pg_depend d                      -- (PostGIS st_* vb. — sahibi değiliz)
        where d.objid = p.oid and d.deptype = 'e'
      )
      and not exists (                                 -- search_path zaten yoksa
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) as cfg
        where cfg like 'search_path=%'
      )
  loop
    execute format('alter function %s set search_path = public, extensions', r.sig);
    raise notice 'search_path sabitlendi: %', r.sig;
  end loop;
end $$;
