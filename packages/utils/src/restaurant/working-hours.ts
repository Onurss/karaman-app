export type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type DayHours = { open: string; close: string } | null;

export type WorkingHours = Partial<Record<DayKey, DayHours>>;

export type OpenOverride = 'auto' | 'open' | 'closed';

export const WEEKDAYS: { key: DayKey; label: string }[] = [
  { key: 'monday', label: 'Pazartesi' },
  { key: 'tuesday', label: 'Salı' },
  { key: 'wednesday', label: 'Çarşamba' },
  { key: 'thursday', label: 'Perşembe' },
  { key: 'friday', label: 'Cuma' },
  { key: 'saturday', label: 'Cumartesi' },
  { key: 'sunday', label: 'Pazar' },
];

export function defaultWorkingHours(open = '09:00', close = '22:00'): WorkingHours {
  return Object.fromEntries(WEEKDAYS.map((d) => [d.key, { open, close }])) as WorkingHours;
}

function hhmmToMinutes(value: string | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function istanbulNowParts(at: Date): { dayKey: DayKey; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const dayKey = get('weekday').toLowerCase() as DayKey;
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  return { dayKey, minutes: hour * 60 + minute };
}

/**
 * Restoran şu an açık mı? `override` 'open'/'closed' ise manuel zorlanır;
 * 'auto' ise çalışma saatlerine göre (Türkiye saati) hesaplanır.
 * Gece yarısını aşan saatleri (örn. 18:00–02:00) destekler.
 */
export function isRestaurantOpenNow(
  workingHours: WorkingHours | null | undefined,
  override: OpenOverride = 'auto',
  at: Date = new Date(),
): boolean {
  if (override === 'open') return true;
  if (override === 'closed') return false;

  const { dayKey, minutes } = istanbulNowParts(at);
  const today = workingHours?.[dayKey];
  if (!today) return false;

  const open = hhmmToMinutes(today.open);
  const close = hhmmToMinutes(today.close);
  if (open === null || close === null) return false;

  return close > open ? minutes >= open && minutes < close : minutes >= open || minutes < close;
}
