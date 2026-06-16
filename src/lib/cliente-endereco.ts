import type { CnpjNormalized } from "@/lib/cnpj-lookup-providers";
import { onlyDigits } from "@/lib/brasilapi-cnpj";

export type ClienteEnderecoRow = {
  cep?: string | null;
  logradouro?: string | null;
  bairro?: string | null;
  complemento?: string | null;
  cidade?: string | null;
  estado?: string | null;
};

export const CAMPOS_ENDERECO_CLIENTE = [
  "cep",
  "logradouro",
  "bairro",
  "complemento",
  "cidade",
  "estado",
] as const;

function tituloPalavra(w: string): string {
  if (!w) return w;
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function tituloCidade(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(tituloPalavra)
    .join(" ");
}

function buildLogradouroComNumero(logradouro: string, numero: string): string {
  const log = logradouro.trim();
  const num = numero.trim();
  if (log && num) return `${log}, ${num}`;
  return log || num;
}

/** Endereço considerado incompleto se faltar logradouro, cidade ou UF. */
export function clienteEnderecoIncompleto(c: ClienteEnderecoRow): boolean {
  const log = String(c.logradouro ?? "").trim();
  const cidade = String(c.cidade ?? "").trim();
  const uf = String(c.estado ?? "").trim().toUpperCase();
  return !log || !cidade || uf.length !== 2;
}

export function mapCnpjNormalizedToEnderecoPatch(
  data: CnpjNormalized
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const e = data.endereco;

  const cepDigits = onlyDigits(e.cep ?? "").slice(0, 8);
  if (cepDigits.length === 8) patch.cep = cepDigits;

  const log = buildLogradouroComNumero(e.logradouro, e.numero);
  if (log) patch.logradouro = log;

  if (e.bairro?.trim()) patch.bairro = e.bairro.trim();

  if (e.cidade?.trim()) patch.cidade = tituloCidade(e.cidade);

  const uf = (e.uf ?? "").slice(0, 2).toUpperCase();
  if (uf.length === 2) patch.estado = uf;

  return patch;
}

export function patchEnderecoUtilizavel(patch: Record<string, unknown>): boolean {
  const log = String(patch.logradouro ?? "").trim();
  const cidade = String(patch.cidade ?? "").trim();
  const uf = String(patch.estado ?? "").trim().toUpperCase();
  return Boolean(log && cidade && uf.length === 2);
}

export function formatCepDisplay(cep: string | null | undefined): string {
  const digits = String(cep ?? "").replace(/\D/g, "");
  if (digits.length === 8) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return String(cep ?? "").trim();
}

/** Texto único de endereço para planilhas e exibição. */
export function formatEnderecoClienteTexto(row: ClienteEnderecoRow): string {
  const parts: string[] = [];
  const linha = [row.logradouro, row.complemento, row.bairro]
    .map((v) => (v ? String(v).trim() : ""))
    .filter(Boolean)
    .join(", ");
  if (linha) parts.push(linha);

  const cidadeUf = [row.cidade, row.estado]
    .map((v) => (v ? String(v).trim() : ""))
    .filter(Boolean)
    .join(" / ");
  if (cidadeUf) parts.push(cidadeUf);

  const cep = formatCepDisplay(row.cep);
  if (cep) parts.push(`CEP ${cep}`);

  return parts.join(" — ");
}
