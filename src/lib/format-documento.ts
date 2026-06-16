import { formatCnpjDisplay, onlyDigits } from "@/lib/brasilapi-cnpj";

export function formatCpfDisplay(digits: string): string {
  const d = onlyDigits(digits).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Formata CNPJ (14 dígitos) ou CPF (11 dígitos) para exibição em planilhas. */
export function formatDocumentoCnpjCpf(raw: string | null | undefined): string {
  const d = onlyDigits(String(raw ?? ""));
  if (!d) return "";
  if (d.length === 11) return formatCpfDisplay(d);
  if (d.length === 14) return formatCnpjDisplay(d);
  return d;
}
