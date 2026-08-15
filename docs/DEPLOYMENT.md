# Deployment

> Adım 12'de detaylandırılacak. Genel hatlar:

## Mobile (Expo)

- **EAS Build:** iOS + Android binary
- **Channels:**
  - `production` → App Store, Play Store
  - `preview` → TestFlight, Internal Testing
- **OTA Updates:** `expo-updates`
- **Submit:** `eas submit --profile production`

## Web Panels (Next.js)

- **Vercel** auto deploy
- `main` → production
- PR'lar → preview URL

## Supabase

- Migrations: GitHub Actions workflow ile `supabase db push`
- Edge Functions: `supabase functions deploy <name>`

## Environment

Tüm secret'lar GitHub Actions ve Vercel/EAS env'lerine elden eklenir. `.env.example` referans alınır.
