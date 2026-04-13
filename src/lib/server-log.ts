import { redactDetalhes } from "./redact-for-log";

type Level = "info" | "warn" | "error";

/**
 * Log estruturado no servidor (stdout). Detalhes são redigidos antes de serializar.
 * Integração futura: enviar `meta` a APM (Sentry, Datadog) sem alterar chamadas.
 */
export function serverLog(
  scope: string,
  level: Level,
  message: string,
  meta?: unknown
): void {
  let suffix = "";
  if (meta !== undefined) {
    try {
      const safe = redactDetalhes(meta);
      suffix = ` ${JSON.stringify(safe)}`;
    } catch {
      suffix = " [meta não serializável]";
    }
  }
  const line = `[${scope}] ${message}${suffix}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
