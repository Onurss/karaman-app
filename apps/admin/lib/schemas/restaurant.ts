import { z } from 'zod';
import { KARAMAN_BOUNDS, KARAMAN_DISTRICTS } from '@karaman/utils';

const phoneSchema = z
  .string()
  .min(1, 'Telefon zorunlu')
  .regex(/^\+?\d[\d\s-]{8,}$/, 'Geçerli bir telefon girin (+90... formatı)');

const slugSchema = z
  .string()
  .min(2, 'Slug en az 2 karakter')
  .regex(/^[a-z0-9-]+$/, 'Slug sadece küçük harf, rakam ve tire içerebilir');

export const step1Schema = z.object({
  name: z.string().min(2, 'Restoran adı zorunlu'),
  slug: slugSchema,
  description: z.string().max(500, 'En fazla 500 karakter').optional().or(z.literal('')),
  phone: phoneSchema,
  email: z.string().email('Geçerli bir e-posta girin').optional().or(z.literal('')),
  tax_office: z.string().max(100).optional().or(z.literal('')),
  tax_number: z
    .string()
    .max(20, 'Vergi numarası 20 karakteri geçemez')
    .optional()
    .or(z.literal('')),
  cuisine_types: z.string().min(1, 'En az bir mutfak türü girin'),
  logo_url: z.string().url('Geçerli bir URL girin').optional().or(z.literal('')),
  cover_image_url: z.string().url('Geçerli bir URL girin').optional().or(z.literal('')),
});

export const step2Schema = z.object({
  address: z.string().min(5, 'Adres en az 5 karakter'),
  district: z.enum(KARAMAN_DISTRICTS, {
    errorMap: () => ({ message: 'Geçerli bir ilçe seçin' }),
  }),
  lat: z
    .coerce.number()
    .gte(KARAMAN_BOUNDS.south, `Enlem ${KARAMAN_BOUNDS.south}'in altında olamaz`)
    .lte(KARAMAN_BOUNDS.north, `Enlem ${KARAMAN_BOUNDS.north}'i geçemez`),
  lng: z
    .coerce.number()
    .gte(KARAMAN_BOUNDS.west, `Boylam ${KARAMAN_BOUNDS.west}'in altında olamaz`)
    .lte(KARAMAN_BOUNDS.east, `Boylam ${KARAMAN_BOUNDS.east}'i geçemez`),
  min_order_amount: z.coerce.number().min(0, 'Negatif olamaz'),
  delivery_fee: z.coerce.number().min(0, 'Negatif olamaz'),
  estimated_delivery_minutes: z.coerce.number().int().min(5).max(180),
});

const dayHourSchema = z
  .object({
    open: z.string().regex(/^\d{2}:\d{2}$/, 'SS:DD'),
    close: z.string().regex(/^\d{2}:\d{2}$/, 'SS:DD'),
  })
  .nullable();

export const step3Schema = z.object({
  working_hours: z.object({
    monday: dayHourSchema,
    tuesday: dayHourSchema,
    wednesday: dayHourSchema,
    thursday: dayHourSchema,
    friday: dayHourSchema,
    saturday: dayHourSchema,
    sunday: dayHourSchema,
  }),
});

export const step4Schema = z.object({
  commission_rate: z.coerce.number().min(0).max(50, 'Komisyon yüzde 50nin üstüne çıkamaz'),
  subscription_tier: z.enum(['', 'bronze', 'silver', 'gold']),
  accepts_cash: z.boolean(),
  accepts_card_on_delivery: z.boolean(),
  accepts_online_payment: z.boolean(),
});

export function validatePaymentMethods(v: z.infer<typeof step4Schema>): string | null {
  if (!v.accepts_cash && !v.accepts_card_on_delivery && !v.accepts_online_payment) {
    return 'En az bir ödeme yöntemi seçilmelidir.';
  }
  return null;
}

export const step5Schema = z.object({
  owner_name: z.string().min(2, 'Ad soyad zorunlu'),
  owner_email: z.string().email('Geçerli bir e-posta girin'),
  owner_password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalı')
    .regex(/[A-Z]/, 'En az bir büyük harf içermeli')
    .regex(/\d/, 'En az bir rakam içermeli'),
});

export const fullRestaurantSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)
  .merge(step5Schema);

export type RestaurantFormValues = z.infer<typeof fullRestaurantSchema>;
export type Step1Values = z.infer<typeof step1Schema>;
export type Step2Values = z.infer<typeof step2Schema>;
export type Step3Values = z.infer<typeof step3Schema>;
export type Step4Values = z.infer<typeof step4Schema>;
export type Step5Values = z.infer<typeof step5Schema>;

export const STEP_SCHEMAS = [
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
] as const;

export const STEP_FIELDS: Array<Array<keyof RestaurantFormValues>> = [
  ['name', 'slug', 'description', 'phone', 'email', 'tax_office', 'tax_number', 'cuisine_types', 'logo_url', 'cover_image_url'],
  ['address', 'district', 'lat', 'lng', 'min_order_amount', 'delivery_fee', 'estimated_delivery_minutes'],
  ['working_hours'],
  ['commission_rate', 'subscription_tier', 'accepts_cash', 'accepts_card_on_delivery', 'accepts_online_payment'],
  ['owner_name', 'owner_email', 'owner_password'],
];
