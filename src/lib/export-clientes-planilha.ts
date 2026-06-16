import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDocumentoCnpjCpf } from "@/lib/format-documento";
import { formatEnderecoClienteTexto } from "@/lib/cliente-endereco";

export type ClienteExportRow = {
  razao_social: string;
  cnpj: string;
  cep: string | null;
  logradouro: string | null;
  bairro: string | null;
  complemento: string | null;
  cidade: string | null;
  estado: string | null;
  data_abertura_cliente: string | null;
};

const PAGE_SIZE = 1000;

const EXPORT_HEADERS = [
  "Empresa",
  "CNPJ/CPF",
  "Endereço",
  "Data de abertura",
] as const;

function formatDataAberturaExport(value: string | null | undefined): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
  }).format(d);
}

export async function fetchAllClientesParaExport(
  supabase: SupabaseClient
): Promise<ClienteExportRow[]> {
  const all: ClienteExportRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("clientes")
      .select(
        "razao_social, cnpj, cep, logradouro, bairro, complemento, cidade, estado, data_abertura_cliente"
      )
      .order("razao_social", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message || "Não foi possível listar os clientes.");
    }

    const page = (data ?? []) as ClienteExportRow[];
    all.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

export function buildClientesExportXlsxBuffer(rows: ClienteExportRow[]): Buffer {
  const sheetRows = rows.map((r) => ({
    Empresa: r.razao_social ?? "",
    "CNPJ/CPF": formatDocumentoCnpjCpf(r.cnpj),
    Endereço: formatEnderecoClienteTexto(r),
    "Data de abertura": formatDataAberturaExport(r.data_abertura_cliente),
  }));

  const worksheet = XLSX.utils.json_to_sheet(sheetRows, {
    header: [...EXPORT_HEADERS],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function clientesExportFilename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `clientes-${y}-${m}-${day}.xlsx`;
}
