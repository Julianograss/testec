const DEFAULT_BASE_URL = 'https://seu-projeto.vercel.app';

export function getTableQrUrl(tableNumber: string | number, baseUrl = DEFAULT_BASE_URL): string {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  return `${normalizedBase}/mesa/${encodeURIComponent(String(tableNumber).trim())}`;
}

export function getTableNumberFromLink(value: string): string | null {
  const raw = String(value || '').trim();
  const match = raw.match(/(?:[?&](?:mesa|table)=|\/mesa\/|\/table\/)([A-Za-z0-9_-]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]);
  if (/^\d{1,4}$/.test(raw)) return raw;
  return null;
}
