export function exportToCSV<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: { key: keyof T; header: string }[],
) {
  const csv = [
    columns.map((c) => `"${c.header}"`).join(','),
    ...rows.map((row) =>
      columns
        .map((c) => {
          const value = row[c.key];
          if (value == null) return '';
          const str = typeof value === 'string' ? value : String(value);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(','),
    ),
  ].join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
