import { situacaoFilterOrClause } from "@/lib/cliente-situacao";
import { applyGrupoFilterOnClienteQuery } from "@/lib/grupos-filtro";

type ScopeFilter = (query: any) => any;

type GrupoByIdMap = Map<string, { nome: string; valor_contrato: number | null }>;
type GrupoByNomeMap = Map<
  string,
  { id: string; nome: string; valor_contrato: number | null }
>;

export type DashboardCardMetrics = {
  entradasMes: number;
  saidasMes: number;
  totalParalisadas: number;
  totalDesativadas: number;
  totalAtivos: number;
  totalGrupos: number;
};

type ClienteFaturamentoRow = {
  valor_contrato?: number | null;
  cobranca_por_grupo?: boolean | null;
  grupo_id?: string | null;
  grupo_economico?: string | null;
  grupos_economicos?:
    | { valor_contrato?: number | null }
    | { valor_contrato?: number | null }[]
    | null;
};

function resolveGrupoValorContrato(
  cliente: ClienteFaturamentoRow,
  gruposById: GrupoByIdMap,
  gruposByNome: GrupoByNomeMap
): number | null {
  const gruposRel = cliente.grupos_economicos;
  const grupoValorContrato = Array.isArray(gruposRel)
    ? gruposRel[0]?.valor_contrato
    : gruposRel?.valor_contrato;
  if (grupoValorContrato != null) return Number(grupoValorContrato) || null;
  if (cliente.grupo_id) {
    return gruposById.get(String(cliente.grupo_id))?.valor_contrato ?? null;
  }
  if (
    typeof cliente.grupo_economico === "string" &&
    cliente.grupo_economico.trim()
  ) {
    return (
      gruposByNome.get(cliente.grupo_economico.trim().toLowerCase())
        ?.valor_contrato ?? null
    );
  }
  return null;
}

function usaContratoGrupo(
  cliente: ClienteFaturamentoRow,
  grupoValorContrato: number | null
): boolean {
  return (
    cliente.cobranca_por_grupo === true ||
    (grupoValorContrato != null &&
      (cliente.valor_contrato == null || cliente.valor_contrato === 0) &&
      (cliente.grupo_id != null ||
        typeof cliente.grupo_economico === "string"))
  );
}

function grupoFaturamentoKey(cliente: ClienteFaturamentoRow): string | null {
  const id = cliente.grupo_id ? String(cliente.grupo_id).trim() : "";
  if (id) return `id:${id}`;
  const nome =
    typeof cliente.grupo_economico === "string"
      ? cliente.grupo_economico.trim().toLowerCase()
      : "";
  if (nome) return `nome:${nome}`;
  return null;
}

/**
 * Soma faturamento mensal sem duplicar valor de contrato do grupo econômico
 * quando várias empresas do mesmo grupo usam cobrança pelo grupo.
 */
export function calcFaturamentoMensalClientes(
  clientes: ClienteFaturamentoRow[],
  gruposById: GrupoByIdMap,
  gruposByNome: GrupoByNomeMap
): number {
  const valorPorGrupo = new Map<string, number>();
  let totalAvulsosEIndividuais = 0;

  for (const cliente of clientes) {
    const grupoValor = resolveGrupoValorContrato(
      cliente,
      gruposById,
      gruposByNome
    );
    const grupoKey = grupoFaturamentoKey(cliente);
    const cobrancaGrupo = usaContratoGrupo(cliente, grupoValor);

    if (cobrancaGrupo && grupoKey) {
      if (!valorPorGrupo.has(grupoKey)) {
        const valorGrupo = Number(grupoValor) || 0;
        if (valorGrupo > 0) {
          valorPorGrupo.set(grupoKey, valorGrupo);
        } else {
          totalAvulsosEIndividuais += Number(cliente.valor_contrato) || 0;
        }
      }
      continue;
    }

    totalAvulsosEIndividuais += Number(cliente.valor_contrato) || 0;
  }

  let totalGrupos = 0;
  for (const valor of valorPorGrupo.values()) {
    totalGrupos += valor;
  }

  return totalGrupos + totalAvulsosEIndividuais;
}

function applyGrupoOpcional(
  query: any,
  grupoId: string,
  gruposById: GrupoByIdMap
): any {
  if (grupoId.trim() === "") return query;
  return applyGrupoFilterOnClienteQuery(query, grupoId, gruposById);
}

function selectComEscopo(
  servicosEmbed: string | null | undefined,
  columns: string
): string {
  if (servicosEmbed) {
    return `${columns}, ${servicosEmbed}`;
  }
  return columns;
}

/** Métricas dos cards de dashboard (visão geral ou departamento). */
export async function fetchDashboardCardMetrics(
  supabase: any,
  opts: {
    applyScopeFilter?: ScopeFilter;
    servicosEmbed?: string | null;
    grupoId?: string;
    gruposById: GrupoByIdMap;
    startOfMonth: Date;
    startOfNextMonth: Date;
    inicioMes: string;
    inicioProximoMes: string;
  }
): Promise<DashboardCardMetrics> {
  const {
    applyScopeFilter = (q: any) => q,
    servicosEmbed = null,
    grupoId = "",
    gruposById,
    startOfMonth,
    startOfNextMonth,
    inicioMes,
    inicioProximoMes,
  } = opts;

  const withScope = (query: any) => applyScopeFilter(query);
  const withScopeGrupo = (query: any) =>
    applyGrupoOpcional(withScope(query), grupoId, gruposById);

  const countSelect = selectComEscopo(servicosEmbed, "id");
  const gruposSelect = selectComEscopo(servicosEmbed, "grupo_id");

  const [
    { count: entradasMes },
    { count: saidasMes },
    { count: paralisadasCount },
    { count: desativadasCount },
    { count: ativosCount },
    { data: ativosComGrupo },
  ] = await Promise.all([
    withScopeGrupo(
      supabase
        .from("clientes")
        .select(countSelect, { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString())
        .lt("created_at", startOfNextMonth.toISOString())
    ),
    withScopeGrupo(
      supabase
        .from("clientes")
        .select(countSelect, { count: "exact", head: true })
        .eq("ativo", false)
        .not("data_saida", "is", null)
        .gte("data_saida", inicioMes)
        .lt("data_saida", inicioProximoMes)
    ),
    withScopeGrupo(
      supabase
        .from("clientes")
        .select(countSelect, { count: "exact", head: true })
        .or(situacaoFilterOrClause("paralisada"))
    ),
    withScopeGrupo(
      supabase
        .from("clientes")
        .select(countSelect, { count: "exact", head: true })
        .or(situacaoFilterOrClause("desativada"))
    ),
    withScopeGrupo(
      supabase
        .from("clientes")
        .select(countSelect, { count: "exact", head: true })
        .or(situacaoFilterOrClause("ativa"))
    ),
    withScopeGrupo(
      supabase
        .from("clientes")
        .select(gruposSelect)
        .or(situacaoFilterOrClause("ativa"))
        .not("grupo_id", "is", null)
    ),
  ]);

  const totalGrupos = new Set(
    (ativosComGrupo ?? [])
      .map((c: { grupo_id?: string | null }) => c.grupo_id)
      .filter(
        (id: string | null | undefined): id is string =>
          id != null && String(id).trim() !== ""
      )
  ).size;

  return {
    entradasMes: entradasMes ?? 0,
    saidasMes: saidasMes ?? 0,
    totalParalisadas: paralisadasCount ?? 0,
    totalDesativadas: desativadasCount ?? 0,
    totalAtivos: ativosCount ?? 0,
    totalGrupos,
  };
}

export async function fetchClientesAtivosFaturamento(
  supabase: any,
  opts: {
    applyScopeFilter?: ScopeFilter;
    servicosEmbed?: string | null;
    grupoId?: string;
    gruposById: GrupoByIdMap;
  }
): Promise<ClienteFaturamentoRow[]> {
  const {
    applyScopeFilter = (q: any) => q,
    servicosEmbed = null,
    grupoId = "",
    gruposById,
  } = opts;

  const embedPart = servicosEmbed ? `,\n        ${servicosEmbed}` : "";

  let query = applyScopeFilter(
    supabase
      .from("clientes")
      .select(
        `
        valor_contrato,
        cobranca_por_grupo,
        grupo_id,
        grupo_economico,
        grupos_economicos ( valor_contrato )${embedPart}
      `
      )
      .or(situacaoFilterOrClause("ativa"))
  );

  query = applyGrupoOpcional(query, grupoId, gruposById);

  const { data } = await query;
  return (data ?? []) as ClienteFaturamentoRow[];
}
