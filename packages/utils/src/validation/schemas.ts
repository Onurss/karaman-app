import { z } from 'zod';
import { isValidTurkishPhone } from '../format/phone';
import { isValidTcKimlik } from './tc-kimlik';

export const emailSchema = z
  .string()
  .min(1, 'E-posta zorunludur.')
  .email('Geçerli bir e-posta giriniz.')
  .max(120);

export const turkishPhoneSchema = z
  .string()
  .min(1, 'Telefon numarası zorunludur.')
  .refine(isValidTurkishPhone, 'Geçerli bir Türkiye telefon numarası giriniz.');

export const optionalTurkishPhoneSchema = z
  .string()
  .optional()
  .refine(
    val => !val || isValidTurkishPhone(val),
    'Geçerli bir Türkiye telefon numarası giriniz.',
  );

export const passwordSchema = z
  .string()
  .min(6, 'Şifre en az 6 karakter olmalı.')
  .max(64, 'Şifre en fazla 64 karakter olabilir.');

export const tcKimlikSchema = z
  .string()
  .length(11, 'TC kimlik numarası 11 haneli olmalı.')
  .refine(isValidTcKimlik, 'Geçerli bir TC kimlik numarası giriniz.');

export const nameSchema = z
  .string()
  .min(2, 'Ad soyad en az 2 karakter olmalı.')
  .max(80, 'Ad soyad en fazla 80 karakter olabilir.');

export const kvkkSchema = z
  .boolean()
  .refine(v => v === true, 'KVKK metnini onaylamalısın.');

export const termsSchema = z
  .boolean()
  .refine(v => v === true, 'Kullanım koşullarını onaylamalısın.');

export const loginSchema = z.object({
  phone: turkishPhoneSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  name: nameSchema,
  phone: turkishPhoneSchema,
  password: passwordSchema,
  accept_terms: termsSchema,
  accept_kvkk: kvkkSchema,
});

export const forgotPasswordSchema = z.object({
  phone: turkishPhoneSchema,
});

export const verifyPhoneSchema = z.object({
  code: z
    .string()
    .min(4, 'Doğrulama kodunu giriniz.')
    .max(8, 'Kod en fazla 8 hane.')
    .regex(/^\d+$/, 'Kod yalnızca rakamlardan oluşur.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type VerifyPhoneFormValues = z.infer<typeof verifyPhoneSchema>;
