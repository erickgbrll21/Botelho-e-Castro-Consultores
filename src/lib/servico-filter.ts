/**
 * Filtro de serviços contratados (dashboard, página de clientes e IA).
 *
 * Filtros ativos: embed `servicos_contratados!inner (...)` na query de
 * `clientes` + `applyServicoContratadoFiltersOnClienteQuery` ( filtros `.or`/`.eq`
 * em `servicos_contratados`). Evita buscar todas as FKs para `.in("id", …)`.
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

/** Nome do relacionamento FK em PostgREST (match com FK no schema). */
export const SERVICOS_CONTRATADOS_FK = "servicos_contratados";

/** Embed na `select(...)`: usar `inner` quando for aplicar filtros em servicos via PostgREST. */
export function servicosContratadosEmbedAlias(
  inner: boolean,
  columns: string = "*"
): string {
  const sel = columns.trim() === "*" ? " * " : ` ${columns.trim()} `;
  return inner
    ? `${SERVICOS_CONTRATADOS_FK}!inner (${sel})`
    : `${SERVICOS_CONTRATADOS_FK} (${sel})`;
}

/**
 * Filtros em `servicos_contratados`; combinar com `servicosContratadosEmbedAlias(true)`
 * na `select(...)` para inner join.
 */
export function applyServicoContratadoFiltersOnClienteQuery(
  query: any,
  servico: ServicoFiltroValor | "" | null | undefined
): any {
  if (!servico) return query;
  if (servico === "qualquer_contabil") {
    return query.or(
      COLUNAS_CONTABIL.map((c) => `${c}.eq.true`).join(","),
      { foreignTable: SERVICOS_CONTRATADOS_FK }
    );
  }
  if (servico === "qualquer_juridico") {
    return query.or(
      COLUNAS_JURIDICO.map((c) => `${c}.eq.true`).join(","),
      { foreignTable: SERVICOS_CONTRATADOS_FK }
    );
  }
  return query.eq(`${SERVICOS_CONTRATADOS_FK}.${servico}`, true);
}

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
