/**
 * Defesa contra CSRF em rotas de API que alteram estado: exige que o header
 * `Origin` (ou, como fallback, `Referer`) corresponda ao host da requisição.
 * Server Actions já têm proteção nativa do Next.js; isto cobre as rotas REST.
 * Aceita `Request` ou `NextRequest` (este estende `Request`).
 */
export function isSameOrigin(req: { headers: Headers }): boolean {
  const host = req.headers.get("host");
  if (!host) return false;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  // Fallback: alguns clientes não enviam Origin; valida pelo Referer.
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  // Sem Origin nem Referer numa requisição que muda estado: rejeita.
  return false;
}
