const SENSITIVE_KEY =
  /^(cnpj|cpf|rg|senha|password|token|secret|inscricao_estadual|inscricao_municipal|ie|im)$/i;

/** Mascara CPF/CNPJ numéricos para logs (LGPD). */
export function maskDigitsDocument(value: string): string {
  const d = value.replace(/\D/g, "");
  if (d.length === 11 || d.length === 14) {
    return d.length === 11
      ? `***.***.***-${d.slice(-2)}`
      : `**.***.***/****-${d.slice(-2)}`;
  }
  if (d.length >= 6) return `***${d.slice(-4)}`;
  return "***";
}

function redactString(s: string): string {
  return s.replace(/\b\d{11}\b/g, () => "***CPF***").replace(/\b\d{14}\b/g, () => "***CNPJ***");
}

/**
 * Sanitiza objeto/array para persistência em log ou resposta — remove campos sensíveis por nome
 * e mascara sequências numéricas longas em strings.
 */
export function redactDetalhes(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[profundidade máxima]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map((x) => redactDetalhes(x, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(k)) {
        if (typeof v === "string" && /\d/.test(v)) {
          out[k] = maskDigitsDocument(v);
        } else if (typeof v === "number") {
          out[k] = "***";
        } else {
          out[k] = "[redacted]";
        }
      } else {
        out[k] = redactDetalhes(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

/** Mensagem de erro livre (ex.: import) sem expor documento completo. */
export function redactUserFacingMessage(msg: string): string {
  return msg
    .replace(/\b\d{11}\b/g, "***CPF***")
    .replace(/\b\d{14}\b/g, "***CNPJ***");
}
