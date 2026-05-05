export type SituacaoEmpresa = "ativa" | "paralisada" | "desativada";

export function getSituacaoEmpresa(cliente: {
  situacao_empresa?: string | null;
  ativo?: boolean | null;
}): SituacaoEmpresa {
  const raw = cliente.situacao_empresa?.trim().toLowerCase();
  if (raw === "paralisada" || raw === "desativada" || raw === "ativa") {
    return raw;
  }
  return cliente.ativo === false ? "desativada" : "ativa";
}

export function situacaoEmpresaLabels(s: SituacaoEmpresa): {
  titulo: string;
  descricaoCurta: string;
} {
  switch (s) {
    case "paralisada":
      return { titulo: "Empresa paralisada", descricaoCurta: "Paralisada" };
    case "desativada":
      return { titulo: "Empresa desativada", descricaoCurta: "Desativada" };
    default:
      return { titulo: "Empresa ativa", descricaoCurta: "Ativa" };
  }
}

/** Cor do indicador (lista, cabeçalho) */
export function situacaoIndicatorClass(s: SituacaoEmpresa): string {
  switch (s) {
    case "paralisada":
      return "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.65)]";
    case "desativada":
      return "bg-red-500";
    default:
      return "bg-emerald-500";
  }
}

export function situacaoPillProps(s: SituacaoEmpresa): {
  label: string;
  tone: "success" | "warning" | "critical";
} {
  switch (s) {
    case "paralisada":
      return { label: "Paralisada", tone: "warning" };
    case "desativada":
      return { label: "Desativada", tone: "critical" };
    default:
      return { label: "Ativa", tone: "success" };
  }
}

/** Valores aceites no filtro/URL/IA. */
export type SituacaoFiltroValor = "ativa" | "paralisada" | "desativada";

/**
 * Reflete a regra de `getSituacaoEmpresa` em SQL/PostgREST:
 *   ativa     = situacao_empresa = 'ativa' OR (situacao_empresa IS NULL AND ativo != false)
 *   paralisada = situacao_empresa = 'paralisada'
 *   desativada = situacao_empresa = 'desativada' OR (situacao_empresa IS NULL AND ativo = false)
 *
 * Devolve a string para passar a `.or(...)` do supabase-js.
 */
export function situacaoFilterOrClause(s: SituacaoFiltroValor): string {
  switch (s) {
    case "ativa":
      return "situacao_empresa.eq.ativa,and(situacao_empresa.is.null,ativo.neq.false)";
    case "paralisada":
      return "situacao_empresa.eq.paralisada";
    case "desativada":
      return "situacao_empresa.eq.desativada,and(situacao_empresa.is.null,ativo.eq.false)";
  }
}

/** Aplica o filtro de situação a uma query supabase (mantém o tipo). */
export function applySituacaoFilter<Q extends { or: (s: string) => Q }>(
  query: Q,
  situacao: SituacaoFiltroValor | "" | null | undefined
): Q {
  if (situacao === "ativa" || situacao === "paralisada" || situacao === "desativada") {
    return query.or(situacaoFilterOrClause(situacao));
  }
  return query;
}

export function parseSituacaoFiltro(
  raw: string | undefined | null
): SituacaoFiltroValor | "" {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "ativa" || v === "paralisada" || v === "desativada") return v;
  return "";
}
