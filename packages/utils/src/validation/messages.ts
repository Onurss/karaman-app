import { z } from 'zod';

let installed = false;

export function installZodTurkishLocale(): void {
  if (installed) return;
  installed = true;

  z.setErrorMap((issue, ctx) => {
    switch (issue.code) {
      case z.ZodIssueCode.invalid_type:
        if (issue.received === 'undefined' || issue.received === 'null') {
          return { message: 'Bu alan zorunludur.' };
        }
        return { message: `Geçersiz tip (beklenen: ${issue.expected}).` };

      case z.ZodIssueCode.too_small:
        if (issue.type === 'string') {
          if (issue.minimum === 1) return { message: 'Bu alan zorunludur.' };
          return { message: `En az ${issue.minimum} karakter olmalı.` };
        }
        if (issue.type === 'number') {
          return { message: `En az ${issue.minimum} olmalı.` };
        }
        if (issue.type === 'array') {
          return { message: `En az ${issue.minimum} öğe seçmelisin.` };
        }
        break;

      case z.ZodIssueCode.too_big:
        if (issue.type === 'string') {
          return { message: `En fazla ${issue.maximum} karakter olabilir.` };
        }
        if (issue.type === 'number') {
          return { message: `En fazla ${issue.maximum} olabilir.` };
        }
        break;

      case z.ZodIssueCode.invalid_string:
        if (issue.validation === 'email') return { message: 'Geçerli bir e-posta giriniz.' };
        if (issue.validation === 'url') return { message: 'Geçerli bir URL giriniz.' };
        if (issue.validation === 'uuid') return { message: 'Geçersiz kimlik.' };
        break;

      case z.ZodIssueCode.invalid_enum_value:
        return { message: 'Geçersiz seçim.' };

      case z.ZodIssueCode.custom:
        return { message: issue.message ?? 'Doğrulama başarısız.' };
    }
    return { message: ctx.defaultError };
  });
}
