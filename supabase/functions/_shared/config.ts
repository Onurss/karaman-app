
function num(envKey: string, fallback: number): number {
  const raw = Deno.env.get(envKey);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const VAT_RATES = {
  standard: 0.2,
  food: num('VAT_RATE_FOOD', 0.1),
  reduced: 0.01,
} as const;

export const PAYMENT_TIMEOUT_MS = num('PAYMENT_TIMEOUT_MS', 30_000);

export const SYSTEM_DEFAULTS = {
  pendingKaramanUserId: -1,
  iyzicoFallbackIdentity: '11111111111',
} as const;
