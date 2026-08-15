
export const OrderStatus = {
  Pending: 'pending',
  Confirmed: 'confirmed',
  Preparing: 'preparing',
  Ready: 'ready',
  OnTheWay: 'on_the_way',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentMethod = {
  Iyzico: 'iyzico',
  GarantiPos: 'garanti_pos',
  Paytr: 'paytr',
  CashOnDelivery: 'cash_on_delivery',
  CardOnDelivery: 'card_on_delivery',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  Pending: 'pending',
  Paid: 'paid',
  Failed: 'failed',
  Refunded: 'refunded',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const RestaurantUserRole = {
  Owner: 'owner',
  Manager: 'manager',
  Staff: 'staff',
} as const;

export type RestaurantUserRole = (typeof RestaurantUserRole)[keyof typeof RestaurantUserRole];

export const SubscriptionTier = {
  Bronze: 'bronze',
  Silver: 'silver',
  Gold: 'gold',
} as const;

export type SubscriptionTier = (typeof SubscriptionTier)[keyof typeof SubscriptionTier];

export const BannerPosition = {
  HomeHero: 'home_hero',
  NewsList: 'news_list',
  FoodTab: 'food_tab',
  Discover: 'discover',
} as const;

export type BannerPosition = (typeof BannerPosition)[keyof typeof BannerPosition];

export const TransportType = {
  Bus: 'bus',
  Train: 'train',
} as const;

export type TransportType = (typeof TransportType)[keyof typeof TransportType];

export const FavoriteType = {
  News: 'news',
  Company: 'company',
  Listing: 'listing',
  Event: 'event',
  Restaurant: 'restaurant',
} as const;

export type FavoriteType = (typeof FavoriteType)[keyof typeof FavoriteType];

export const orderStatusLabel: Record<OrderStatus, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  ready: 'Hazır',
  on_the_way: 'Yolda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal Edildi',
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  iyzico: 'Online Kart (iyzico)',
  garanti_pos: 'Online Kart (Garanti)',
  paytr: 'Online Kart (PayTR)',
  cash_on_delivery: 'Kapıda Nakit',
  card_on_delivery: 'Kapıda Kart',
};

/** Online POS sağlayıcıları (tek aktif olur) — payment_settings.active_pos_provider */
export const POS_PROVIDERS = ['iyzico', 'garanti_pos', 'paytr'] as const;
export type PosProvider = (typeof POS_PROVIDERS)[number];

export interface PaymentSettings {
  cash_enabled: boolean;
  card_on_delivery_enabled: boolean;
  online_enabled: boolean;
  active_pos_provider: PosProvider | null;
}
