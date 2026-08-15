import { format, formatDistance, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';

export function toDate(input: string | Date): Date | null {
  if (input instanceof Date) return isValid(input) ? input : null;
  const parsed = parseISO(input);
  return isValid(parsed) ? parsed : null;
}

export function formatDate(input: string | Date, pattern = 'd MMMM yyyy'): string {
  const date = toDate(input);
  if (!date) return '—';
  return format(date, pattern, { locale: tr });
}

export function formatDateTime(input: string | Date): string {
  return formatDate(input, 'd MMMM yyyy, HH:mm');
}

export function formatShortDate(input: string | Date): string {
  return formatDate(input, 'dd.MM.yyyy');
}

export function formatTime(input: string | Date): string {
  return formatDate(input, 'HH:mm');
}

export function formatRelative(input: string | Date): string {
  const date = toDate(input);
  if (!date) return '—';
  return formatDistance(date, new Date(), { addSuffix: true, locale: tr });
}

export function isUpcoming(input: string | Date): boolean {
  const date = toDate(input);
  return date ? date.getTime() > Date.now() : false;
}
