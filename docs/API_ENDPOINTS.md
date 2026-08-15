# karaman.com API Endpoint Spec

> Müşterinin PHP'de yazacağı endpoint'lerin TAM şartnamesi. Bu doküman REFERANS, geliştirme MSW mocks üzerinden yapılır.

## Base

- URL: `https://karaman.com/api/v1`
- Auth: `X-API-Key` header (tüm endpoint'ler)
- Bearer token: `/auth/me`, `/auth/logout`, `/auth/refresh` için ek `Authorization: Bearer <jwt>`
- Format: JSON UTF-8
- Tarih: ISO 8601 UTC

## Standart Response

Başarılı (liste):
```json
{ "status": "success", "data": [...], "pagination": { ... } }
```

Başarılı (tek):
```json
{ "status": "success", "data": { ... } }
```

Hata:
```json
{ "status": "error", "error": { "code": "...", "message": "..." } }
```

## Endpoint Listesi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | /news | Haber listesi |
| GET | /news/{id} | Haber detay |
| GET | /news/categories | Haber kategorileri |
| GET | /companies | Firma rehberi (lat/lng/radius destekli) |
| GET | /companies/{id} | Firma detay |
| GET | /companies/categories | Firma kategorileri |
| GET | /listings | İlanlar |
| GET | /listings/{id} | İlan detay |
| GET | /listings/categories | İlan kategorileri |
| GET | /events | Etkinlikler |
| GET | /events/{id} | Etkinlik detay |
| GET | /pharmacies/today | Bugünkü nöbetçi eczaneler |
| GET | /pharmacies | Tüm eczaneler |
| GET | /campaigns | Sıcak fırsatlar |
| GET | /campaigns/{id} | Kampanya detay |
| GET | /tourism/places | Turistik yerler |
| GET | /tourism/places/{id} | Turistik yer detay |
| GET | /tourism/recipes | Yöresel tarifler |
| GET | /tourism/recipes/{id} | Tarif detay |
| POST | /auth/login | Telefon + şifre |
| POST | /auth/register | Yeni kayıt (ad + telefon + şifre) |
| POST | /auth/verify-phone | SMS kodu ile telefon doğrulama |
| POST | /auth/resend-code | Doğrulama kodunu yeniden gönder |
| POST | /auth/forgot-password | Telefona şifre sıfırlama kodu |
| GET | /auth/me | Mevcut kullanıcı |
| POST | /auth/logout | Çıkış |
| POST | /auth/refresh | Token yenileme |

> Tam JSON şemaları Adım 2'de `packages/shared-types/src/karaman-api.ts`'e taşınacak. PDF (Karaman_API_Spec_v1.pdf) okunup detaylar doldurulacak.
