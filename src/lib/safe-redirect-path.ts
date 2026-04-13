/**
 * Evita open redirect: só paths relativos internos (uma barra inicial, sem //).
 */
export function safeInternalRedirectPath(raw: string | null): string {
  if (!raw) return "/dashboard";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/dashboard";
  if (/[\r\n\0]/.test(t)) return "/dashboard";
  return t;
}
