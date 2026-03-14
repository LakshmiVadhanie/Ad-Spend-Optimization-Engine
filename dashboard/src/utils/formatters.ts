export const fmt = {
  currency: (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v),
  currencyFull: (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v),
  percent: (v: number, decimals = 1) => `${(v * 100).toFixed(decimals)}%`,
  number: (v: number) => new Intl.NumberFormat('en-US').format(Math.round(v)),
  decimal: (v: number, dp = 2) => v.toFixed(dp),
  roas: (v: number) => `${v.toFixed(2)}x`,
  change: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
};

export const PLATFORM_COLORS: Record<string, string> = {
  meta:      '#1877F2',
  google:    '#EA4335',
  tiktok:    '#69C9D0',
  snapchat:  '#FFFC00',
  pinterest: '#E60023',
  all:       '#8B5CF6',
};

export const PLATFORM_LABELS: Record<string, string> = {
  meta:      'Meta',
  google:    'Google',
  tiktok:    'TikTok',
  snapchat:  'Snapchat',
  pinterest: 'Pinterest',
};

export function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    (acc[k] ??= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export function sumBy<T>(arr: T[], key: keyof T): number {
  return arr.reduce((s, item) => s + (Number(item[key]) || 0), 0);
}
