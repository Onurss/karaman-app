export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ApiSuccess<T> {
  status: 'success';
  data: T;
}

export interface ApiPaginated<T> {
  status: 'success';
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiFailure {
  status: 'error';
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
export type ApiPaginatedResponse<T> = ApiPaginated<T> | ApiFailure;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface NewsCategory {
  id: number;
  slug: string;
  name: string;
  count?: number;
}

export interface News {
  id: number;
  slug: string;
  title: string;
  summary: string;
  image: string;
  thumbnail: string;
  published_at: string;
  category: NewsCategory;
  author: string;
  view_count: number;
  url: string;
}

export interface NewsDetail extends News {
  content: string;
  gallery: string[];
  updated_at: string;
  tags: string[];
  related_news: Array<Pick<News, 'id' | 'title' | 'image' | 'slug'>>;
}

export interface NewsListParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}

export interface CompanyCategory {
  id: number;
  slug: string;
  name: string;
  icon?: string;
  count?: number;
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  logo: string;
  cover_image: string;
  summary: string;
  category: CompanyCategory;
  subcategories: string[];
  phone: string;
  whatsapp?: string;
  address: string;
  district: string;
  location: GeoPoint;
  rating: number;
  review_count: number;
  is_open: boolean;
  working_hours: string;
  url: string;
}

export interface CompanyDetail extends Company {
  description: string;
  gallery: string[];
  phone_alt?: string;
  email?: string;
  website?: string;
  social: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
  };
  working_hours_full: Record<DayOfWeek, string>;
  features: string[];
}

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type CompanySortKey = 'distance' | 'rating' | 'name';

export interface CompanyListParams {
  page?: number;
  limit?: number;
  category?: string;
  district?: string;
  search?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  sort?: CompanySortKey;
}

export interface ListingCategory {
  id: number;
  slug: string;
  name: string;
  icon?: string;
  count?: number;
}

export interface Listing {
  id: number;
  title: string;
  slug: string;
  price: number;
  currency: 'TRY';
  category: ListingCategory;
  subcategory: string;
  images: string[];
  main_image: string;
  district: string;
  location: GeoPoint | null;
  created_at: string;
  is_featured: boolean;
  is_premium: boolean;
  contact_phone: string;
  url: string;
}

export interface ListingDetail extends Listing {
  description: string;
  contact_name?: string;
  contact_whatsapp?: string;
}

export type ListingSortKey = 'newest' | 'price_asc' | 'price_desc' | 'distance';

export interface ListingListParams {
  page?: number;
  limit?: number;
  category?: string;
  min_price?: number;
  max_price?: number;
  district?: string;
  search?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  sort?: ListingSortKey;
}

export interface Event {
  id: number;
  title: string;
  slug: string;
  summary: string;
  image: string;
  start_date: string;
  end_date: string;
  venue: string;
  address: string;
  location: GeoPoint;
  category: string;
  is_free: boolean;
  ticket_url: string | null;
  organizer: string;
  url: string;
}

export interface EventDetail extends Event {
  description: string;
  gallery: string[];
}

export interface EventListParams {
  page?: number;
  limit?: number;
  from_date?: string;
  to_date?: string;
  category?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  upcoming_only?: boolean;
  search?: string;
}

export interface Pharmacy {
  id: number;
  name: string;
  phone: string;
  address: string;
  district: string;
  location: GeoPoint;
  duty_start: string;
  duty_end: string;
}

export interface PharmacyDutyResponse {
  date: string;
  pharmacies: Pharmacy[];
  total: number;
}

export interface PharmacyListParams {
  district?: string;
}

export interface CampaignCompanyRef {
  id: number;
  name: string;
  logo: string;
}

export interface Campaign {
  id: number;
  title: string;
  summary: string;
  image: string;
  company: CampaignCompanyRef;
  discount_percentage?: number;
  valid_from: string;
  valid_until: string;
  category: string;
  url: string;
}

export interface CampaignDetail extends Campaign {
  description: string;
}

export interface CampaignListParams {
  page?: number;
  limit?: number;
  active_only?: boolean;
  category?: string;
  company_id?: number;
}

export type TourismPlaceType = 'historical' | 'nature' | 'accommodation' | 'restaurant';

export interface TourismPlace {
  id: number;
  type: TourismPlaceType;
  name: string;
  slug: string;
  summary: string;
  main_image: string;
  category: string;
  district: string;
  address: string;
  location: GeoPoint;
  url: string;
}

export interface TourismPlaceDetail extends TourismPlace {
  description: string;
  images: string[];
  visit_info: {
    opening_hours?: string;
    ticket_price?: number;
    estimated_duration?: string;
  };
}

export interface TourismPlaceListParams {
  type?: TourismPlaceType;
  district?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  limit?: number;
}

export interface Recipe {
  id: number;
  name: string;
  slug: string;
  summary: string;
  image: string;
  preparation_time: number;
  cooking_time: number;
  servings: number;
  difficulty: 'Kolay' | 'Orta' | 'Zor';
  url: string;
}

export interface RecipeDetail extends Recipe {
  description: string;
  ingredients: string[];
  steps: string[];
}

export interface KaramanUser {
  id: number;
  name: string;
  email: string | null;
  phone?: string;
  avatar?: string;
  has_custom_avatar?: boolean;
  created_at: string;
  is_verified: boolean;
  settings?: {
    newsletter?: boolean;
    push_notifications?: boolean;
  };
}

export interface AuthResponse {
  user: KaramanUser;
  token: string;
  expires_at: string;
}

export interface LoginPayload {
  phone: string;
  password: string;
  device_token?: string;
}

export interface RegisterPayload {
  name: string;
  phone: string;
  password: string;
  accept_terms: boolean;
  device_token?: string;
}

export interface ForgotPasswordPayload {
  phone: string;
}

export interface VerifyPhonePayload {
  phone: string;
  code: string;
}

export interface ResendCodePayload {
  phone: string;
}

export interface SimpleMessageResponse {
  message: string;
}
