import { onlyDigits } from "@/lib/brasilapi-cnpj";
import { formatCpfDisplay } from "@/lib/format-documento";
import { labelTipoUnidadeExibicao } from "@/lib/unidade-label";

export type TipoPessoaCliente = "pj" | "pf";

export function parseTipoCadastro(raw: string | undefined): TipoPessoaCliente {
  return raw === "pf" ? "pf" : "pj";
}

export function parseCpfDigits(raw: string): string {
  return onlyDigits(raw).slice(0, 11);
}

export function isPessoaFisica(cliente: {
  tipo_pessoa?: string | null;
  cnpj?: string | null;
}): boolean {
  if (cliente.tipo_pessoa === "pf") return true;
  if (cliente.tipo_pessoa === "pj") return false;
  const digits = onlyDigits(String(cliente.cnpj ?? ""));
  return digits.length === 11;
}

export function formatDocumentoCliente(cnpj: string | null | undefined): string {
  const digits = onlyDigits(String(cnpj ?? ""));
  if (digits.length === 11) return formatCpfDisplay(digits);
  if (digits.length === 14) {
    return digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );
  }
  return cnpj ?? "—";
}

export function labelTipoClienteExibicao(cliente: {
  tipo_pessoa?: string | null;
  tipo_unidade?: "Matriz" | "Filial" | null;
  identificacao_filial?: string | null;
}): string {
  if (isPessoaFisica(cliente)) return "Pessoa Física";
  return labelTipoUnidadeExibicao(
    cliente.tipo_unidade,
    cliente.identificacao_filial
  );
}

export function tituloNomeCliente(cliente: {
  tipo_pessoa?: string | null;
  razao_social?: string | null;
}): string {
  return String(cliente.razao_social ?? "").trim() || "—";
}
