export function isValidTcKimlik(tc: string | null | undefined): boolean {
  if (!tc) return false;
  if (!/^[1-9]\d{10}$/.test(tc)) return false;

  const digits = tc.split('').map(Number);
  const sumOdd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const sumEven = digits[1] + digits[3] + digits[5] + digits[7];

  const check10 = ((sumOdd * 7) - sumEven) % 10;
  if (((check10 % 10) + 10) % 10 !== digits[9]) return false;

  const sumAll = digits.slice(0, 10).reduce((acc, n) => acc + n, 0);
  return sumAll % 10 === digits[10];
}
