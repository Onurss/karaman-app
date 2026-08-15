# Karaman.com Mobile + Web Suite

Karaman şehri için tek monorepo: iOS/Android mobil uygulama, restoran yönetim paneli (PWA) ve admin paneli.

## Mimari

```
karaman-app/
├── apps/
│   ├── mobile/         # iOS + Android (React Native + Expo SDK 55)
│   ├── restaurant/     # Restoran paneli (Next.js 14 PWA)  — Adım 9'da eklenecek
│   └── admin/          # Admin paneli (Next.js 14)         — Adım 10'da eklenecek
├── packages/
│   ├── shared-types/   # Cross-app TypeScript domain types
│   ├── api-client/     # axios + Supabase wrapper
│   └── utils/          # format/validation/locale yardımcıları
├── supabase/
│   ├── migrations/     # SQL — tarih sıralı
│   ├── functions/      # Edge Functions (create-order, iyzico-webhook, ...)
│   └── seed.sql
└── docs/               # ARCHITECTURE, API_ENDPOINTS, DEPLOYMENT, ...
```

## Stack

**Mobile:** React Native 0.83, Expo SDK 55, Expo Router, TanStack Query v5, Zustand, React Hook Form + Zod, Reanimated 3, MSW.

**Web panels:** Next.js 14 App Router, Tailwind + shadcn/ui, TanStack Query v5, Zustand, Supabase client, Recharts.

**Backend:** Supabase (PostgreSQL 15 + PostGIS, Auth, Realtime, Storage, Edge Functions).

**Tooling:** pnpm 10, Turborepo, ESLint 8, Prettier 3, Husky 9, Commitlint, GitHub Actions, EAS Build.

## Hızlı Başlangıç

```bash
# 1) Bağımlılıkları yükle
pnpm install

# 2) Ortam değişkenlerini ayarla
cp .env.example apps/mobile/.env.local
# .env.local içindeki REPLACE değerlerini doldur

# 3) Mobile uygulamayı geliştirme modunda çalıştır
pnpm --filter @karaman/mobile dev
# veya iOS simulator
pnpm --filter @karaman/mobile ios
```

## Geliştirme Akışı

### Mobile

```bash
cd apps/mobile

# Geliştirme
pnpm dev                 # Metro bundler
pnpm ios                 # iOS simulator
pnpm android             # Android emulator
pnpm web                 # Tarayıcı

# Native build (prebuild gerekli)
npx expo prebuild --clean
npx expo run:ios
```

### Lint / Type-check / Test

```bash
# Tüm workspace
pnpm lint
pnpm type-check
pnpm test

# Tek workspace
pnpm --filter @karaman/mobile type-check
```

### Format

```bash
pnpm format          # Tüm dosyaları formatla
pnpm format:check    # Sadece kontrol et
```

## Commit Konvansiyonu

[Conventional Commits](https://www.conventionalcommits.org/) zorunlu. Husky + commitlint ile pre-commit hook'larla doğrulanır.

Tipler:
- `feat` — yeni özellik
- `fix` — hata düzeltme
- `docs` — dokümantasyon
- `refactor` — yeniden düzenleme
- `perf` — performans
- `test` — test
- `chore` — bağımlılık/araç güncelleme
- `style` — kod biçimi (whitespace, semicolon)
- `build` — build sistemi
- `ci` — CI/CD
- `revert` — geri al

Scope'lar: `mobile`, `admin`, `restaurant`, `shared-types`, `api-client`, `utils`, `supabase`, `docs`, `deps`, `ci`, `config`.

Örnek:
```
feat(mobile): haber detay ekranı eklendi
fix(admin): banner upload hatası giderildi
refactor(api-client): retry interceptor'u eklendi
```

## Mock-First Geliştirme

karaman.com REST API'si henüz hazır değil. Mobile uygulama MSW (Mock Service Worker) ile mock data üzerinden geliştirilir. Müşteri endpoint'leri canlıya aldığında tek satırlık env değişikliği ile gerçek API'ye geçilir:

```bash
# .env.local
EXPO_PUBLIC_USE_MOCKS=false
EXPO_PUBLIC_KARAMAN_API_URL=https://karaman.com/api/v1
EXPO_PUBLIC_KARAMAN_API_KEY=<gerçek_key>
```

Service layer ve hook'lar değişmez (abstraction korunur).

## Veritabanı (Supabase)

```bash
# Supabase CLI ile local geliştirme
supabase start
supabase db reset       # Migrations + seed çalışır
supabase functions serve

# Migration ekle
supabase migration new <isim>

# Production'a deploy
supabase db push
supabase functions deploy <isim>
```

## EAS Build (Mobile)

```bash
# Preview build (TestFlight / Internal Testing)
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all
eas submit --profile production --platform all
```

## Lisans

UNLICENSED — Kapalı kaynak proje.

## İletişim

Müşteri: Karaman.com sahibi
Geliştirici: Mert
