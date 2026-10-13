const FALLBACK = "/dashboard";
const BASE = "http://internal.invalid";

/**
 * Evita open redirect: só paths relativos internos.
 * Navegadores tratam "\" como "/" e removem TAB/LF, então "/\host" ou "/\t/host"
 * viram URLs de outro domínio; por isso a validação é feita pelo parser de URL.
 */
export function safeInternalRedirectPath(raw: string | null): string {
  if (!raw) return FALLBACK;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return FALLBACK;
  if (/[\\\u0000-\u001f\u007f]/.test(t)) return FALLBACK;
  try {
    const url = new URL(t, BASE);
    if (url.origin !== BASE) return FALLBACK;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return FALLBACK;
  }
}
