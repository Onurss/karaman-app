
import type {
  AdBanner,
  AppCampaign,
  AppVersion,
  Atm,
  ChargingStation,
  Commission,
  DeliveryAddressSnapshot,
  MenuCategory,
  MenuItem,
  Order,
  OrderItem,
  OrderItemVariantSnapshot,
  OrderStatusHistoryEntry,
  Payment,
  Profile,
  PushNotification,
  PushNotificationTargetSegment,
  Restaurant,
  RestaurantCourier,
  RestaurantUserRelation,
  TransportSchedule,
  UserAddress,
  UserFavorite,
  WaterFountain,
  WorkingHours,
} from './domain';
import type { GeoPoint } from './karaman-api';
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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type LocationInput = string | GeoPoint;

export type ProfileRow = Profile;
export interface UserAddressRow extends Omit<UserAddress, 'location'> {
  location: GeoPoint;
}
export type UserFavoriteRow = UserFavorite;
export interface RestaurantRow extends Omit<Restaurant, 'location' | 'delivery_zone'> {
  location: GeoPoint;
  delivery_zone:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] }
    | null;
}
export type RestaurantUserRow = RestaurantUserRelation;
export type RestaurantCourierRow = RestaurantCourier;
export type MenuCategoryRow = MenuCategory;
export type MenuItemRow = MenuItem;
export interface OrderRow extends Omit<Order, 'delivery_location'> {
  delivery_location: GeoPoint;
}
export type OrderItemRow = OrderItem;
export type OrderStatusHistoryRow = OrderStatusHistoryEntry;
export type PaymentRow = Payment;
export type CommissionRow = Commission;
export type AdBannerRow = AdBanner;
export type AppCampaignRow = AppCampaign;
export type PushNotificationRow = PushNotification;
export type TransportScheduleRow = TransportSchedule;
export type AppVersionRow = AppVersion;
export interface WaterFountainRow extends Omit<WaterFountain, 'location'> {
  location: GeoPoint;
}
export interface AtmRow extends Omit<Atm, 'location'> {
  location: GeoPoint;
}
export interface ChargingStationRow extends Omit<ChargingStation, 'location'> {
  location: GeoPoint;
}

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type ProfileInsert = Optional<
  Profile,
  'created_at' | 'updated_at' | 'notification_enabled' | 'language'
> & { push_token?: string | null };
export type ProfileUpdate = Partial<ProfileInsert>;

export type UserAddressInsert = Optional<
  Omit<UserAddress, 'id' | 'created_at' | 'location'> & { location: LocationInput },
  'is_default'
>;
export type UserAddressUpdate = Partial<UserAddressInsert>;

export type UserFavoriteInsert = Omit<UserFavorite, 'id' | 'created_at'>;
export type UserFavoriteUpdate = Partial<UserFavoriteInsert>;

export type RestaurantInsert = Optional<
  Omit<Restaurant, 'id' | 'created_at' | 'updated_at' | 'location' | 'delivery_zone'> & {
    location: LocationInput;
    delivery_zone?: LocationInput | null;
  },
  | 'rating'
  | 'review_count'
  | 'is_active'
  | 'is_open'
  | 'subscription_active'
  | 'accepts_cash'
  | 'accepts_card_on_delivery'
  | 'accepts_online_payment'
  | 'commission_rate'
  | 'estimated_delivery_minutes'
  | 'delivery_fee'
  | 'min_order_amount'
  | 'cuisine_types'
  | 'working_hours'
>;
export type RestaurantUpdate = Partial<RestaurantInsert>;

export type RestaurantUserInsert = Omit<RestaurantUserRelation, 'id' | 'created_at'>;
export type RestaurantUserUpdate = Partial<RestaurantUserInsert>;

export type RestaurantCourierInsert = Omit<RestaurantCourier, 'id' | 'created_at'>;
export type RestaurantCourierUpdate = Partial<RestaurantCourierInsert>;

export type MenuCategoryInsert = Omit<MenuCategory, 'id' | 'created_at'>;
export type MenuCategoryUpdate = Partial<MenuCategoryInsert>;

export type MenuItemInsert = Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>;
export type MenuItemUpdate = Partial<MenuItemInsert>;

export type OrderInsert = Optional<
  Omit<
    Order,
    | 'id'
    | 'order_number'
    | 'created_at'
    | 'confirmed_at'
    | 'preparing_at'
    | 'ready_at'
    | 'on_the_way_at'
    | 'delivered_at'
    | 'cancelled_at'
    | 'delivery_location'
  > & { delivery_location: LocationInput },
  | 'status'
  | 'payment_status'
  | 'commission_amount'
  | 'vat_amount'
  | 'delivery_fee'
>;
export type OrderUpdate = Partial<
  Omit<Order, 'delivery_address_snapshot'> & {
    delivery_address_snapshot?: DeliveryAddressSnapshot;
  }
>;

export type OrderItemInsert = Omit<OrderItem, 'id'>;
export type OrderItemUpdate = Partial<OrderItemInsert>;

export type PaymentInsert = Omit<Payment, 'id' | 'created_at'>;
export type CommissionInsert = Omit<Commission, 'id' | 'created_at'>;

export type AdBannerInsert = Optional<
  Omit<AdBanner, 'id' | 'created_at' | 'click_count' | 'view_count'>,
  'is_active' | 'display_order'
>;
export type AdBannerUpdate = Partial<AdBannerInsert>;

export type AppCampaignInsert = Optional<
  Omit<AppCampaign, 'id' | 'created_at'>,
  'is_active' | 'display_order'
>;
export type AppCampaignUpdate = Partial<AppCampaignInsert>;

export type PushNotificationInsert = Optional<
  Omit<PushNotification, 'id' | 'created_at' | 'total_recipients' | 'delivered_count' | 'opened_count'>,
  'target_segment'
>;
export type PushNotificationUpdate = Partial<PushNotificationInsert>;

export type TransportScheduleInsert = Optional<
  Omit<TransportSchedule, 'id' | 'created_at'>,
  'is_active'
>;
export type TransportScheduleUpdate = Partial<TransportScheduleInsert>;

export type AppVersionInsert = Optional<
  Omit<AppVersion, 'id' | 'created_at'>,
  'is_force_update' | 'is_maintenance_mode'
>;
export type AppVersionUpdate = Partial<AppVersionInsert>;

export type WaterFountainInsert = Optional<
  Omit<WaterFountain, 'id' | 'created_at' | 'location'> & { location: LocationInput },
  'is_active'
>;
export type WaterFountainUpdate = Partial<WaterFountainInsert>;

export type AtmInsert = Optional<
  Omit<Atm, 'id' | 'created_at' | 'location'> & { location: LocationInput },
  'is_24_7' | 'is_active'
>;
export type AtmUpdate = Partial<AtmInsert>;

export type ChargingStationInsert = Optional<
  Omit<ChargingStation, 'id' | 'created_at' | 'location'> & { location: LocationInput },
  'is_active'
>;
export type ChargingStationUpdate = Partial<ChargingStationInsert>;

export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: ProfileInsert; Update: ProfileUpdate };
      user_addresses: {
        Row: UserAddressRow;
        Insert: UserAddressInsert;
        Update: UserAddressUpdate;
      };
      user_favorites: {
        Row: UserFavoriteRow;
        Insert: UserFavoriteInsert;
        Update: UserFavoriteUpdate;
      };
      restaurants: {
        Row: RestaurantRow;
        Insert: RestaurantInsert;
        Update: RestaurantUpdate;
      };
      restaurant_users: {
        Row: RestaurantUserRow;
        Insert: RestaurantUserInsert;
        Update: RestaurantUserUpdate;
      };
      restaurant_couriers: {
        Row: RestaurantCourierRow;
        Insert: RestaurantCourierInsert;
        Update: RestaurantCourierUpdate;
      };
      menu_categories: {
        Row: MenuCategoryRow;
        Insert: MenuCategoryInsert;
        Update: MenuCategoryUpdate;
      };
      menu_items: { Row: MenuItemRow; Insert: MenuItemInsert; Update: MenuItemUpdate };
      orders: { Row: OrderRow; Insert: OrderInsert; Update: OrderUpdate };
      order_items: { Row: OrderItemRow; Insert: OrderItemInsert; Update: OrderItemUpdate };
      order_status_history: {
        Row: OrderStatusHistoryRow;
        Insert: Omit<OrderStatusHistoryEntry, 'id' | 'created_at'>;
        Update: Partial<Omit<OrderStatusHistoryEntry, 'id' | 'created_at'>>;
      };
      payments: {
        Row: PaymentRow;
        Insert: PaymentInsert;
        Update: Partial<PaymentInsert>;
      };
      commissions: {
        Row: CommissionRow;
        Insert: CommissionInsert;
        Update: Partial<CommissionInsert>;
      };
      ad_banners: { Row: AdBannerRow; Insert: AdBannerInsert; Update: AdBannerUpdate };
      app_campaigns: {
        Row: AppCampaignRow;
        Insert: AppCampaignInsert;
        Update: AppCampaignUpdate;
      };
      push_notifications: {
        Row: PushNotificationRow;
        Insert: PushNotificationInsert;
        Update: PushNotificationUpdate;
      };
      transport_schedules: {
        Row: TransportScheduleRow;
        Insert: TransportScheduleInsert;
        Update: TransportScheduleUpdate;
      };
      app_versions: {
        Row: AppVersionRow;
        Insert: AppVersionInsert;
        Update: AppVersionUpdate;
      };
      water_fountains: {
        Row: WaterFountainRow;
        Insert: WaterFountainInsert;
        Update: WaterFountainUpdate;
      };
      atms: { Row: AtmRow; Insert: AtmInsert; Update: AtmUpdate };
      charging_stations: {
        Row: ChargingStationRow;
        Insert: ChargingStationInsert;
        Update: ChargingStationUpdate;
      };
    };
    Views: {
      user_addresses_view: { Row: UserAddressRow };
      restaurants_view: { Row: RestaurantRow };
      orders_view: { Row: OrderRow };
      water_fountains_view: { Row: WaterFountainRow };
      atms_view: { Row: AtmRow };
      charging_stations_view: { Row: ChargingStationRow };
    };
    Functions: {
      restaurants_nearby: {
        Args: { user_lat: number; user_lng: number; radius_km?: number };
        Returns: Array<{
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          cover_image_url: string | null;
          rating: number;
          review_count: number;
          is_open: boolean;
          delivery_fee: number;
          min_order_amount: number;
          estimated_delivery_minutes: number;
          distance_meters: number;
        }>;
      };
      address_in_delivery_zone: {
        Args: { p_restaurant_id: string; p_lat: number; p_lng: number };
        Returns: boolean;
      };
      restaurant_is_open_now: {
        Args: { restaurant_id: string };
        Returns: boolean;
      };
      water_fountains_nearby: {
        Args: { user_lat: number; user_lng: number; radius_km?: number };
        Returns: Array<{
          id: string;
          name: string;
          address: string;
          district: string;
          distance_meters: number;
          notes: string | null;
        }>;
      };
      atms_nearby: {
        Args: {
          user_lat: number;
          user_lng: number;
          radius_km?: number;
          filter_bank?: string | null;
        };
        Returns: Array<{
          id: string;
          bank_name: string;
          branch_name: string | null;
          address: string;
          district: string;
          is_24_7: boolean;
          distance_meters: number;
        }>;
      };
      charging_stations_nearby: {
        Args: { user_lat: number; user_lng: number; radius_km?: number };
        Returns: Array<{
          id: string;
          name: string;
          operator: string | null;
          address: string;
          district: string;
          socket_types: string[];
          power_kw: number;
          distance_meters: number;
        }>;
      };
      restaurant_set_delivery_zone: {
        Args: {
          p_restaurant_id: string;
          p_polygon_geojson:
            | { type: 'Polygon'; coordinates: number[][][] }
            | { type: 'MultiPolygon'; coordinates: number[][][][] }
            | null;
        };
        Returns: void;
      };
      admin_delete_restaurant: {
        Args: { target_restaurant_id: string; delete_active_orders: boolean };
        Returns: void;
      };
      admin_set_user_banned: {
        Args: { target_user_id: string; banned: boolean; reason: string | null };
        Returns: void;
      };
      create_order_atomic: {
        Args: { p_order: Record<string, unknown>; p_items: unknown[] };
        Returns: { id: string; order_number: string };
      };
    };
    Enums: {
      order_status: OrderStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      restaurant_user_role: RestaurantUserRole;
      subscription_tier: SubscriptionTier;
      banner_position: BannerPosition;
      transport_type: TransportType;
      favorite_type: FavoriteType;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type WorkingHoursJson = WorkingHours;
export type PushSegmentJson = PushNotificationTargetSegment;
export type OrderItemVariantsJson = OrderItemVariantSnapshot[];
export type DeliveryAddressSnapshotJson = DeliveryAddressSnapshot;
