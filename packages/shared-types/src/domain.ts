
import type {
  BannerPosition,
  FavoriteType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  RestaurantUserRole,
  SubscriptionTier,
  TransportType,
} from './enums';
import type { DayOfWeek, GeoPoint } from './karaman-api';

export type Uuid = string;
export type IsoDateTime = string;
export type IsoDate = string;

export interface Profile {
  id: Uuid;
  karaman_user_id: number;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  push_token?: string;
  notification_enabled: boolean;
  language: string;
  kvkk_accepted_at?: IsoDateTime;
  terms_accepted_at?: IsoDateTime;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface UserAddress {
  id: Uuid;
  user_id: Uuid;
  title: string;
  full_address: string;
  district?: string;
  building_no?: string;
  apartment_no?: string;
  floor?: string;
  note?: string;
  phone?: string;
  location: GeoPoint;
  is_default: boolean;
  created_at: IsoDateTime;
}

export interface UserFavorite {
  id: Uuid;
  user_id: Uuid;
  type: FavoriteType;
  external_id: string;
  metadata?: Record<string, unknown>;
  created_at: IsoDateTime;
}

export type WorkingHours = Partial<Record<DayOfWeek, string>>;

export interface Restaurant {
  id: Uuid;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  phone: string;
  email?: string;
  tax_office?: string;
  tax_number?: string;
  address: string;
  location: GeoPoint;
  district: string;
  cuisine_types: string[];
  rating: number;
  review_count: number;
  delivery_zone?: GeoPoint[];
  min_order_amount: number;
  delivery_fee: number;
  estimated_delivery_minutes: number;
  commission_rate: number;
  subscription_tier?: SubscriptionTier;
  subscription_active: boolean;
  is_active: boolean;
  is_open: boolean;
  working_hours: WorkingHours;
  accepts_cash: boolean;
  accepts_card_on_delivery: boolean;
  accepts_online_payment: boolean;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface RestaurantUserRelation {
  id: Uuid;
  restaurant_id: Uuid;
  user_id: Uuid;
  role: RestaurantUserRole;
  is_active: boolean;
  created_at: IsoDateTime;
}

export interface RestaurantCourier {
  id: Uuid;
  restaurant_id: Uuid;
  name: string;
  phone: string;
  plate_number?: string;
  is_active: boolean;
  created_at: IsoDateTime;
}

export interface MenuCategory {
  id: Uuid;
  restaurant_id: Uuid;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: IsoDateTime;
}

export interface MenuItemVariant {
  id: string;
  name: string;
  price_delta: number;
}

export interface MenuItemVariantGroup {
  id: string;
  name: string;
  required: boolean;
  multi_select: boolean;
  options: MenuItemVariant[];
}

export interface MenuItem {
  id: Uuid;
  restaurant_id: Uuid;
  category_id: Uuid;
  name: string;
  description?: string;
  price: number;
  /** Kampanya ürünlerinde üstü çizili "eski" fiyat (price = indirimli fiyat) */
  original_price?: number;
  image_url?: string;
  ingredients: string[];
  allergens: string[];
  is_available: boolean;
  display_order: number;
  /** true ise restoran detayında "Kampanyalar" bölümünde gösterilir */
  is_campaign: boolean;
  variants: MenuItemVariantGroup[];
  preparation_time_minutes?: number;
  calories?: number;
  is_spicy: boolean;
  is_vegetarian: boolean;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface OrderItemVariantSnapshot {
  group_id: string;
  group_name: string;
  option_id: string;
  option_name: string;
  price_delta: number;
}

export interface OrderItem {
  id: Uuid;
  order_id: Uuid;
  menu_item_id: Uuid;
  item_name_snapshot: string;
  item_image_snapshot?: string;
  item_price_snapshot: number;
  quantity: number;
  variants: OrderItemVariantSnapshot[];
  note?: string;
  total_price: number;
}

export interface DeliveryAddressSnapshot {
  title: string;
  full_address: string;
  district?: string;
  building_no?: string;
  apartment_no?: string;
  floor?: string;
  note?: string;
}

export interface Order {
  id: Uuid;
  order_number: string;
  user_id: Uuid;
  restaurant_id: Uuid;
  delivery_address_id?: Uuid;
  delivery_address_snapshot: DeliveryAddressSnapshot;
  delivery_location: GeoPoint;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  delivery_fee: number;
  commission_amount: number;
  vat_amount: number;
  total_amount: number;
  courier_id?: Uuid;
  estimated_delivery_minutes?: number;
  customer_note?: string;
  created_at: IsoDateTime;
  confirmed_at?: IsoDateTime;
  preparing_at?: IsoDateTime;
  ready_at?: IsoDateTime;
  on_the_way_at?: IsoDateTime;
  delivered_at?: IsoDateTime;
  cancelled_at?: IsoDateTime;
  cancellation_reason?: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface OrderStatusHistoryEntry {
  id: Uuid;
  order_id: Uuid;
  old_status?: OrderStatus;
  new_status: OrderStatus;
  changed_by?: Uuid;
  note?: string;
  created_at: IsoDateTime;
}

export interface Payment {
  id: Uuid;
  order_id: Uuid;
  provider: string;
  provider_payment_id?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  raw_response?: Record<string, unknown>;
  created_at: IsoDateTime;
}

export interface Commission {
  id: Uuid;
  order_id: Uuid;
  restaurant_id: Uuid;
  order_total: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  payout_date?: IsoDate;
  created_at: IsoDateTime;
}

export interface AdBanner {
  id: Uuid;
  title?: string;
  image_url: string;
  click_url?: string;
  position: BannerPosition;
  starts_at: IsoDateTime;
  ends_at: IsoDateTime;
  click_count: number;
  view_count: number;
  display_order: number;
  is_active: boolean;
  created_at: IsoDateTime;
}

export interface AppCampaign {
  id: Uuid;
  title: string;
  description?: string;
  image_url?: string;
  target_screen?: string;
  starts_at: IsoDateTime;
  ends_at: IsoDateTime;
  is_active: boolean;
  display_order: number;
  created_at: IsoDateTime;
}

export interface PushNotificationTargetSegment {
  all?: boolean;
  food_customers?: boolean;
  districts?: string[];
  user_ids?: Uuid[];
}

export interface PushNotification {
  id: Uuid;
  title: string;
  body: string;
  deep_link?: string;
  image_url?: string;
  target_segment: PushNotificationTargetSegment;
  scheduled_at?: IsoDateTime;
  sent_at?: IsoDateTime;
  status: PushNotificationStatus;
  total_recipients: number;
  delivered_count: number;
  failed_count: number;
  opened_count: number;
  created_by?: Uuid;
  created_at: IsoDateTime;
}

export type PushNotificationStatus = 'pending' | 'sending' | 'sent' | 'failed';

export interface TransportSchedule {
  id: Uuid;
  type: TransportType;
  route_name: string;
  from_location: string;
  to_location: string;
  departure_time: string;
  arrival_time?: string;
  days_of_week: number[];
  operator?: string;
  price?: number;
  notes?: string;
  is_active: boolean;
  created_at: IsoDateTime;
}

export interface AppVersion {
  id: Uuid;
  platform: 'ios' | 'android';
  version: string;
  build_number: number;
  is_force_update: boolean;
  is_maintenance_mode: boolean;
  release_notes?: string;
  created_at: IsoDateTime;
}

export interface WaterFountain {
  id: Uuid;
  name: string;
  address: string;
  district: string;
  location: GeoPoint;
  is_active: boolean;
  notes?: string;
  created_at: IsoDateTime;
}

export interface Atm {
  id: Uuid;
  bank_name: string;
  branch_name?: string;
  address: string;
  district: string;
  location: GeoPoint;
  is_24_7: boolean;
  is_active: boolean;
  notes?: string;
  created_at: IsoDateTime;
}

export type ChargingSocketType =
  | 'type1'
  | 'type2'
  | 'ccs'
  | 'chademo'
  | 'tesla';

export interface ChargingStation {
  id: Uuid;
  name: string;
  operator?: string;
  address: string;
  district: string;
  location: GeoPoint;
  socket_types: ChargingSocketType[];
  power_kw: number;
  is_active: boolean;
  notes?: string;
  created_at: IsoDateTime;
}

export interface CartLineVariant {
  group_id: string;
  group_name: string;
  option_id: string;
  option_name: string;
  price_delta: number;
}

export interface CartLine {
  line_id: string;
  menu_item_id: Uuid;
  name: string;
  image_url?: string;
  unit_price: number;
  quantity: number;
  variants: CartLineVariant[];
  note?: string;
}

export interface Cart {
  restaurant_id: Uuid;
  restaurant_name: string;
  restaurant_min_order_amount: number;
  restaurant_delivery_fee: number;
  lines: CartLine[];
}
