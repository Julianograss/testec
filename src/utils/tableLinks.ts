/**
 * Entrada na mesa por código.
 *
 * O QR Code da mesa aponta para  {site}/mesa/{CÓDIGO}  e o mesmo CÓDIGO
 * (6 letras/números, ex.: K7Q-4MX) fica impresso embaixo do QR para quem
 * não consegue usar a câmera. O número da mesa NÃO é mais usado para entrar.
 */
export const TABLE_CODE_LENGTH = 6;
const DEFAULT_BASE_URL = 'https://seu-projeto.vercel.app';

/** Endereço do site: no navegador usa o domínio atual; no app, EXPO_PUBLIC_APP_URL. */
export function getAppBaseUrl(): string {
  const origin = (globalThis as any)?.location?.origin;
  const env = process.env.EXPO_PUBLIC_APP_URL;
  return String(origin && origin !== 'null' ? origin : env || DEFAULT_BASE_URL).replace(/\/$/, '');
}

/** Tira espaços, hífens e deixa em maiúsculas: "k7q-4mx" -> "K7Q4MX". */
export const normalizeTableCode = (value: string): string =>
  String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** "K7Q4MX" -> "K7Q-4MX" (como aparece impresso). */
export const formatTableCode = (code: string): string => {
  const clean = normalizeTableCode(code);
  return clean.length === TABLE_CODE_LENGTH ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
};

export function getTableQrUrl(code: string, baseUrl = getAppBaseUrl()): string {
  return `${baseUrl.replace(/\/$/, '')}/mesa/${encodeURIComponent(normalizeTableCode(code))}`;
}

/**
 * Aceita o link lido do QR (…/mesa/K7Q4MX, ?mesa=K7Q4MX) ou o código digitado
 * (K7Q4MX, k7q-4mx). Devolve o código normalizado ou null se não for válido.
 */
export function getTableCodeFromInput(value: string): string | null {
  const raw = String(value || '').trim();
  const match = raw.match(/(?:[?&](?:mesa|table|codigo|code)=|\/mesa\/|\/table\/)([A-Za-z0-9-]+)/i);
  const code = normalizeTableCode(match?.[1] ?? raw);
  return code.length === TABLE_CODE_LENGTH ? code : null;
}
