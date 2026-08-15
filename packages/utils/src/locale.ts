const TR_LATIN_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'C',
  ğ: 'g',
  Ğ: 'G',
  ı: 'i',
  İ: 'I',
  ö: 'o',
  Ö: 'O',
  ş: 's',
  Ş: 'S',
  ü: 'u',
  Ü: 'U',
};

export function turkishCompare(a: string, b: string): number {
  return a.localeCompare(b, 'tr', { sensitivity: 'base' });
}

export function turkishSearchMatch(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  return haystack.toLocaleLowerCase('tr').includes(needle.toLocaleLowerCase('tr'));
}

export function turkishToLatin(text: string): string {
  return text.replace(/[çÇğĞıİöÖşŞüÜ]/g, char => TR_LATIN_MAP[char] ?? char);
}

export function slugify(text: string): string {
  return turkishToLatin(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural ?? singular}`;
}
