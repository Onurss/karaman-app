# Geliştirici Onboarding

## 1) Sistem Gereksinimleri

- Node.js ≥ 20
- pnpm ≥ 10 (`corepack enable && corepack prepare pnpm@latest --activate`)
- Xcode ≥ 26 (iOS build için)
- CocoaPods 1.16+ (`brew install cocoapods`)
- Android Studio + Android SDK 35
- Supabase CLI
- EAS CLI (`pnpm dlx eas-cli`)

## 2) Bağımlılıklar

```bash
git clone <repo>
cd karaman-app
pnpm install
```

## 3) Env

```bash
cp .env.example apps/mobile/.env.local
# Değerleri doldur (admin'den iste)
```

## 4) Mobile çalıştır

```bash
cd apps/mobile
npx expo prebuild --clean   # native projeleri üret (ilk seferinde)
npx expo run:ios            # iOS simulator
```

## 5) Sorun Giderme

- **CocoaPods hatası:** `cd apps/mobile/ios && pod install`
- **Metro cache:** `npx expo start --clear`
- **Type errors:** `pnpm --filter @karaman/mobile type-check`
- **Reanimated worklets uyumsuzluğu:** `react-native-worklets@0.7.x` pin'li olduğundan emin ol.
