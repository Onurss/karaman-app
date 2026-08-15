import { VAT_RATES } from '../constants';

export interface VatBreakdown {
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateVat(amount: number, rate: number = VAT_RATES.standard): VatBreakdown {
  const vatAmount = round2(amount * rate);
  return {
    subtotal: round2(amount),
    vatRate: rate,
    vatAmount,
    total: round2(amount + vatAmount),
  };
}

export function extractVat(grossAmount: number, rate: number = VAT_RATES.standard): VatBreakdown {
  const subtotal = round2(grossAmount / (1 + rate));
  const vatAmount = round2(grossAmount - subtotal);
  return {
    subtotal,
    vatRate: rate,
    vatAmount,
    total: round2(grossAmount),
  };
}

export interface CommissionBreakdown {
  orderTotal: number;
  commissionRate: number;
  commissionAmount: number;
  restaurantEarning: number;
}

export function calculateCommission(orderTotal: number, commissionRate: number): CommissionBreakdown {
  const commissionAmount = round2(orderTotal * (commissionRate / 100));
  return {
    orderTotal: round2(orderTotal),
    commissionRate,
    commissionAmount,
    restaurantEarning: round2(orderTotal - commissionAmount),
  };
}

export { VAT_RATES } from '../constants';
