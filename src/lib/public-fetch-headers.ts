/** Headers que reduzem bloqueio 403 em APIs públicas acessadas a partir do servidor. */
export const FETCH_HEADERS_BROWSER_LIKE = {
  Accept: "application/json",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
} as const;

/**
 * Plano público da cnpj.ws: cerca de 3 consultas por minuto.
 * @see https://docs.cnpj.ws/referencia-de-api/api-publica/consultando-cnpj
 */
export const CNPJ_WS_PUBLIC_MIN_INTERVAL_MS = 20_500;
