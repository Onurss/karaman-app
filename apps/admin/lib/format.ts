export const formatCurrency = (value: number | string): string => {
  const num = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const localDateKey = (iso: string): string => {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatNumber = (value: number | string): string => {
  const num = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('tr-TR').format(num);
};

export const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export const formatDateTime = (iso: string): string => {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatPhone = (input: string): string => {
  const digits = input.replace(/\D/g, '');
  let normalized = digits;
  if (normalized.startsWith('90')) normalized = normalized.substring(2);
  else if (normalized.startsWith('0')) normalized = normalized.substring(1);
  if (normalized.length !== 10) return input;
  return `+90 ${normalized.substring(0, 3)} ${normalized.substring(3, 6)} ${normalized.substring(6, 8)} ${normalized.substring(8)}`;
};
