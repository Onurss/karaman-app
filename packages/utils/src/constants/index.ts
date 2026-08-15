import type { GeoPoint } from '@karaman/shared-types';

export const KARAMAN_CENTER: GeoPoint = { lat: 37.1759, lng: 33.2287 };

export const KARAMAN_BOUNDS = {
  north: 37.45,
  south: 36.85,
  east: 33.6,
  west: 32.9,
} as const;

export const DEFAULT_RADIUS_KM = 5;
export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 30;

export const RADIUS_OPTIONS_KM = [1, 3, 5, 10, 15, 20, 30] as const;

export const KARAMAN_DISTRICTS = [
  'Merkez',
  'Ayrancı',
  'Başyayla',
  'Ermenek',
  'Kazımkarabekir',
  'Sarıveliler',
] as const;

export type KaramanDistrict = (typeof KARAMAN_DISTRICTS)[number];

export const BUS_OPERATORS = [
  'AKE Karaman',
  'Metro Turizm',
  'Pamukkale',
  'Kamil Koç',
  'Lüks Karaman',
] as const;

export const BRAND = {
  name: 'Karaman.com',
  domain: 'karaman.com',
  website: 'https://karaman.com',
  email: 'iletisim@karaman.com',
  supportPhone: '+903380000000',
  developer: 'GSAM Solution — Ali Mert Güleç',
  developerEmail: 'alimertgulec38@gmail.com',
} as const;

export const LEGAL_URLS = {
  privacy: 'https://karaman.com/kvkk',
  terms: 'https://karaman.com/kullanim-kosullari',
  distanceContract: 'https://karaman.com/mesafeli-satis',
  preInfo: 'https://karaman.com/on-bilgilendirme',
} as const;

export const APP_STORE_URL = 'https://apps.apple.com/tr/app/karaman-com/idTODO';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.karaman.mobile';

export const VAT_RATES = {
  standard: 0.2,
  food: 0.1,
  reduced: 0.01,
} as const;

export const ORDER_RULES = {
  maxLineQuantity: 99,
  maxNoteLength: 280,
  userCancellableStatuses: ['pending', 'confirmed'] as const,
  prepDurationOptions: [15, 30, 45, 60] as const,
  newOrderAlertDurationMs: 3000,
  activeStatusPollIntervalMs: 15_000,
} as const;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const HALF_DAY = 12 * HOUR;
const DAY = 24 * HOUR;

// karaman.com REST API (haber/firma/ilan/etkinlik/kampanya/eczane/turizm)
// Imunify360 bot-koruması, aynı IP'den çok sık istek gelince bağlantıyı
// kesiyor. Bu yüzden bu uç noktalar AGRESİF cache'lenir: staleTime 12 saat →
// uygulama bu veriyi günde en fazla ~2 kez tazeler. gcTime 24 saat: diske
// kalıcı yazılan cache (bkz. src/lib/query.ts persist) bu süre boyunca geçerli
// kalır; böylece her uygulama açılışında yeniden istek atılmaz.
// Supabase kaynaklı veriler (cityServices/authMe) realtime ile tazelendiği ve
// bot-koruması arkasında olmadığı için kısa tutulur.
export const CACHE = {
  newsList: { staleTime: HALF_DAY, gcTime: DAY },
  newsDetail: { staleTime: HALF_DAY, gcTime: DAY },
  companyList: { staleTime: HALF_DAY, gcTime: DAY },
  companyDetail: { staleTime: HALF_DAY, gcTime: DAY },
  listingList: { staleTime: HALF_DAY, gcTime: DAY },
  eventList: { staleTime: HALF_DAY, gcTime: DAY },
  pharmacy: { staleTime: HALF_DAY, gcTime: DAY },
  campaign: { staleTime: HALF_DAY, gcTime: DAY },
  tourism: { staleTime: DAY, gcTime: 7 * DAY },
  categories: { staleTime: DAY, gcTime: 7 * DAY },
  authMe: { staleTime: 5 * MINUTE, gcTime: Infinity },
  cityServices: { staleTime: 30 * MINUTE, gcTime: 2 * HOUR },
  // Admin panelden yönetilen reklam bannerları + uygulama kampanyaları
  // (Supabase ad_banners / app_campaigns). Bot-koruması arkasında DEĞİL ve
  // realtime (useMarketingRealtime) ile anında invalidate edilir; bu yüzden
  // kısa tutulur — admin değişiklikleri hızlı yansısın. NOT: karaman.com firma
  // kampanyaları (CACHE.campaign) bundan ayrıdır ve 12 saat cache'lenir.
  marketing: { staleTime: 5 * MINUTE, gcTime: 30 * MINUTE },
} as const;

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
  adminTableLimit: 200,
  ordersAdminLimit: 500,
  commissionsAdminLimit: 500,
  pushHistoryLimit: 100,
  dashboardRecentLimit: 10,
  restaurantDetailOrdersLimit: 20,
} as const;

export const ANALYTICS = {
  restaurantReportDays: 30,
  adminDashboardDays: 7,
} as const;

export const ORDER_SOUND = {
  frequencyHz: 880,
  beepDurationSec: 0.18,
  beepIntervalMs: 600,
  totalDurationMs: 3000,
} as const;
