export function formatPhone(input: string | null | undefined): string {
  if (!input) return '';
  const digits = input.replace(/\D/g, '');

  let normalized = digits;
  if (normalized.startsWith('90')) normalized = normalized.slice(2);
  else if (normalized.startsWith('0')) normalized = normalized.slice(1);

  if (normalized.length !== 10) return input;

  return `+90 ${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6, 8)} ${normalized.slice(8, 10)}`;
}

export function normalizePhoneForApi(input: string | null | undefined): string {
  if (!input) return '';
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('90')) return `+${digits}`;
  if (digits.startsWith('0')) return `+90${digits.slice(1)}`;
  if (digits.length === 10) return `+90${digits}`;
  return digits;
}

export function isValidTurkishPhone(input: string | null | undefined): boolean {
  if (!input) return false;
  const normalized = normalizePhoneForApi(input);
  return /^\+90(5\d{9})$/.test(normalized);
}

export function phoneInputMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 8));
  if (digits.length > 8) parts.push(digits.slice(8, 10));
  return parts.join(' ');
}
