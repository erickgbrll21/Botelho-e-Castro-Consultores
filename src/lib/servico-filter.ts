/**
 * Filtro de serviços contratados (compartilhado pelo dashboard, página de
 * clientes e pela função `listar_clientes` do assistente de IA).
 *
 * Como `servicos_contratados` é uma tabela 1-1 com `clientes`, optámos por
 * resolver o filtro em duas etapas:
 *   1) buscar os `cliente_id` em `servicos_contratados` que casam com o filtro;
 *   2) restringir a query principal de `clientes` com `.in("id", ids)`.
 *
 * Esta abordagem evita reescrever o `select(...)` para usar `!inner` e
 * funciona para filtros simples (uma coluna) ou de categoria (qualquer das
 * colunas Contábil/Jurídico).
 */

export type ServicoFiltroValor =
  | "qualquer_contabil"
  | "qualquer_juridico"
  | "contabil_fiscal"
  | "contabil_contabilidade"
  | "contabil_dp"
  | "contabil_pericia"
  | "contabil_legalizacao"
  | "juridico_civel"
  | "juridico_trabalhista"
  | "juridico_licitacao"
  | "juridico_penal"
  | "juridico_empresarial"
  | "planejamento_societario_tributario"
  | "bpo_financeiro";

export type ServicoOpcao = {
  value: ServicoFiltroValor;
  label: string;
  group: "Por categoria" | "Contábil" | "Jurídico";
};

export const SERVICO_OPCOES: ServicoOpcao[] = [
  { value: "qualquer_contabil", label: "Qualquer Contábil", group: "Por categoria" },
  { value: "qualquer_juridico", label: "Qualquer Jurídico", group: "Por categoria" },
  {
    value: "planejamento_societario_tributario",
    label: "Planejamento Societário/Tributário",
    group: "Por categoria",
  },
  { value: "bpo_financeiro", label: "BPO Financeiro", group: "Por categoria" },

  { value: "contabil_fiscal", label: "Fiscal", group: "Contábil" },
  { value: "contabil_contabilidade", label: "Contabilidade", group: "Contábil" },
  { value: "contabil_dp", label: "Departamento Pessoal", group: "Contábil" },
  { value: "contabil_pericia", label: "Perícia", group: "Contábil" },
  { value: "contabil_legalizacao", label: "Legalização", group: "Contábil" },

  { value: "juridico_civel", label: "Cível", group: "Jurídico" },
  { value: "juridico_trabalhista", label: "Trabalhista", group: "Jurídico" },
  { value: "juridico_licitacao", label: "Licitação", group: "Jurídico" },
  { value: "juridico_penal", label: "Penal", group: "Jurídico" },
  { value: "juridico_empresarial", label: "Empresarial", group: "Jurídico" },
];

const VALORES_VALIDOS = new Set<string>(SERVICO_OPCOES.map((o) => o.value));

const COLUNAS_CONTABIL = [
  "contabil_fiscal",
  "contabil_contabilidade",
  "contabil_dp",
  "contabil_pericia",
  "contabil_legalizacao",
] as const;

const COLUNAS_JURIDICO = [
  "juridico_civel",
  "juridico_trabalhista",
  "juridico_licitacao",
  "juridico_penal",
  "juridico_empresarial",
] as const;

export function parseServicoFiltro(
  raw: string | undefined | null
): ServicoFiltroValor | "" {
  const v = (raw ?? "").trim();
  if (VALORES_VALIDOS.has(v)) return v as ServicoFiltroValor;
  return "";
}

export function labelDoServicoFiltro(s: ServicoFiltroValor | ""): string {
  if (!s) return "";
  const op = SERVICO_OPCOES.find((o) => o.value === s);
  return op?.label ?? s;
}

/** UUID “impossível” usado para forçar nenhum resultado. */
const SENTINEL_VAZIO = "00000000-0000-0000-0000-000000000000";

/**
 * Devolve uma lista de IDs de clientes cujos serviços casam com o filtro.
 * Quando o filtro está vazio retorna `null` (sinaliza “não restringir”).
 * Quando casa zero registos devolve `[SENTINEL_VAZIO]` para que `.in("id", …)`
 * resulte em conjunto vazio sem precisar de tratamento especial nos chamadores.
 */
export async function clienteIdsParaServicoFiltro(
  supabase: any,
  servico: ServicoFiltroValor | "" | null | undefined
): Promise<string[] | null> {
  if (!servico) return null;
  let q = supabase.from("servicos_contratados").select("cliente_id");
  if (servico === "qualquer_contabil") {
    q = q.or(COLUNAS_CONTABIL.map((c) => `${c}.eq.true`).join(","));
  } else if (servico === "qualquer_juridico") {
    q = q.or(COLUNAS_JURIDICO.map((c) => `${c}.eq.true`).join(","));
  } else {
    q = q.eq(servico, true);
  }
  const { data, error } = await q;
  if (error || !Array.isArray(data)) {
    return [SENTINEL_VAZIO];
  }
  const ids = Array.from(
    new Set((data as Array<{ cliente_id: unknown }>).map((r) => String(r.cliente_id)))
  ).filter((s) => s.length > 0);
  return ids.length ? ids : [SENTINEL_VAZIO];
}
