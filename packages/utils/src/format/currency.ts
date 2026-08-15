export interface FormatCurrencyOptions {
  withSymbol?: boolean;
  compact?: boolean;
  maximumFractionDigits?: number;
}

export function formatCurrency(
  amount: number | null | undefined,
  options: FormatCurrencyOptions = {},
): string {
  if (amount == null || Number.isNaN(amount)) return '—';

  const { withSymbol = true, compact = false, maximumFractionDigits } = options;

  if (compact && Math.abs(amount) >= 1000) {
    const compactValue = (amount / 1000).toFixed(1).replace('.', ',');
    return `${compactValue} bin${withSymbol ? ' ₺' : ''}`;
  }

  const fractionDigits = maximumFractionDigits ?? (Number.isInteger(amount) ? 0 : 2);

  return new Intl.NumberFormat('tr-TR', {
    style: withSymbol ? 'currency' : 'decimal',
    currency: 'TRY',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

export function parseCurrency(input: string): number | null {
  if (!input) return null;
  const cleaned = input
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
