/**
 * Evita RangeError do Intl quando a data é inválida (valor vazio, string malformada, etc.).
 */
export function formatDateTimePtBR(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
  if (value == null) return "—";
  const s = String(value).trim();
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  // Força horário de Brasília por padrão (evita exibir UTC em servidor/cliente).
  const merged: Intl.DateTimeFormatOptions = {
    timeZone: "America/Sao_Paulo",
    ...options,
  };
  return new Intl.DateTimeFormat("pt-BR", merged).format(d);
}
