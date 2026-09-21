import type { Tables, Views } from "@/types/database";
import { getServiceRoleClient } from "@/lib/auth";
import {
  diaEmBrasilia,
  inicioDoDiaISO,
  inicioDoDiaSeguinteISO,
  intervaloPeriodo,
  primeiroDiaDoMes,
  somarDias,
  type DemandaFiltros,
} from "@/lib/demandas";

/**
 * Cliente/builder do Supabase com tipagem solta, como no restante de `src/lib`:
 * os helpers gerados do PostgREST não acompanham bem o encadeamento dinâmico de
 * filtros usado aqui. O retorno é sempre convertido para os tipos abaixo.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export type DemandaRow = Views<"demandas_view">;
export type TipoServicoRow = Tables<"tipos_servico">;
export type HistoricoRow = Tables<"historico_demandas">;

export type UsuarioAtribuivel = {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  ativo: boolean;
};

export const DEMANDAS_POR_PAGINA = 20;

/** Colunas necessárias para cards/gráficos (mais leve que `select("*")`). */
const COLUNAS_METRICAS =
  "id, status, atrasada, prazo_final, created_at, concluida_em, responsavel_id, responsavel_nome, tipo_servico_id, tipo_servico_nome";

/**
 * A migration 0024 pode não ter sido aplicada ainda no ambiente.
 * Nesse caso mostramos um aviso em vez de estourar a página.
 */
export function moduloNaoInstalado(
  error: { code?: string; message?: string } | null | undefined
): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|could not find the table|schema cache/i.test(
      error.message ?? ""
    )
  );
}

/** Evita quebrar a expressão `or=(...)` do PostgREST com vírgulas/parênteses. */
function termoSeguro(q: string): string {
  return q.replace(/[,()\\%*]/g, " ").trim();
}

function aplicarFiltros(
  query: SupabaseLike,
  filtros: DemandaFiltros,
  agora: Date
): SupabaseLike {
  const { deISO, ateISO } = intervaloPeriodo(filtros, agora);
  if (deISO) query = query.gte("created_at", deISO);
  if (ateISO) query = query.lt("created_at", ateISO);

  if (filtros.responsavel) {
    query = query.eq("responsavel_id", filtros.responsavel);
  }
  if (filtros.tipo) {
    query = query.eq("tipo_servico_id", filtros.tipo);
  }

  if (filtros.status === "atrasada") {
    query = query.eq("atrasada", true);
  } else if (filtros.status) {
    query = query.eq("status", filtros.status);
  }

  const hoje = diaEmBrasilia(agora);
  if (filtros.prazo === "atrasadas") {
    query = query.eq("atrasada", true);
  } else if (filtros.prazo === "vence_hoje") {
    query = query
      .gte("prazo_final", inicioDoDiaISO(hoje))
      .lt("prazo_final", inicioDoDiaSeguinteISO(hoje));
  } else if (filtros.prazo === "proximos_7") {
    query = query
      .neq("status", "concluida")
      .gte("prazo_final", agora.toISOString())
      .lt("prazo_final", inicioDoDiaSeguinteISO(somarDias(hoje, 7)));
  }

  const termo = filtros.q ? termoSeguro(filtros.q) : "";
  if (termo) {
    const digits = termo.replace(/\D/g, "");
    const partes = [
      `titulo.ilike.%${termo}%`,
      `protocolo.ilike.%${termo}%`,
      `descricao.ilike.%${termo}%`,
      `empresa_nome.ilike.%${termo}%`,
      `empresa_fantasia.ilike.%${termo}%`,
    ];
    if (digits.length >= 8) {
      partes.push(`cnpj.ilike.%${digits}%`);
    }
    query = query.or(partes.join(","));
  }

  return query;
}

export type ListaDemandas = {
  itens: DemandaRow[];
  total: number;
  pagina: number;
  totalPaginas: number;
  erro: string | null;
  moduloAusente: boolean;
};

/**
 * Lista paginada. `responsavelId` fixa o escopo (tela "Minhas Demandas");
 * a RLS/view já limita o que cada usuário pode ler.
 */
export async function fetchDemandas(
  supabase: SupabaseLike,
  filtros: DemandaFiltros,
  opts: { responsavelId?: string; agora?: Date; porPagina?: number } = {}
): Promise<ListaDemandas> {
  const agora = opts.agora ?? new Date();
  const porPagina = opts.porPagina ?? DEMANDAS_POR_PAGINA;
  const pagina = Math.max(1, filtros.pagina);
  const inicio = (pagina - 1) * porPagina;

  let query = supabase
    .from("demandas_view")
    .select("*", { count: "exact" })
    .order("status", { ascending: true })
    .order("prazo_final", { ascending: true });

  if (opts.responsavelId) {
    query = query.eq("responsavel_id", opts.responsavelId);
  }

  query = aplicarFiltros(query, filtros, agora).range(
    inicio,
    inicio + porPagina - 1
  );

  const { data, error, count } = await query;

  if (error) {
    return {
      itens: [],
      total: 0,
      pagina,
      totalPaginas: 1,
      erro: error.message ?? "Não foi possível carregar as demandas.",
      moduloAusente: moduloNaoInstalado(error),
    };
  }

  const total = count ?? 0;
  return {
    itens: (data ?? []) as DemandaRow[],
    total,
    pagina,
    totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
    erro: null,
    moduloAusente: false,
  };
}

export type DemandasParaMetricas = {
  itens: Pick<
    DemandaRow,
    | "id"
    | "status"
    | "atrasada"
    | "prazo_final"
    | "created_at"
    | "concluida_em"
    | "responsavel_id"
    | "responsavel_nome"
    | "tipo_servico_id"
    | "tipo_servico_nome"
  >[];
  erro: string | null;
  moduloAusente: boolean;
};

/** Conjunto filtrado usado pelos cards e gráficos da dashboard. */
export async function fetchDemandasParaMetricas(
  supabase: SupabaseLike,
  filtros: DemandaFiltros,
  opts: { responsavelId?: string; agora?: Date; limite?: number } = {}
): Promise<DemandasParaMetricas> {
  const agora = opts.agora ?? new Date();

  let query = supabase.from("demandas_view").select(COLUNAS_METRICAS);

  if (opts.responsavelId) {
    query = query.eq("responsavel_id", opts.responsavelId);
  }

  query = aplicarFiltros(query, filtros, agora).limit(opts.limite ?? 5000);

  const { data, error } = await query;

  if (error) {
    return {
      itens: [],
      erro: error.message ?? "Não foi possível calcular os indicadores.",
      moduloAusente: moduloNaoInstalado(error),
    };
  }

  return {
    itens: (data ?? []) as DemandasParaMetricas["itens"],
    erro: null,
    moduloAusente: false,
  };
}

/**
 * Base da "evolução mensal": ignora o período selecionado (para sempre mostrar
 * os últimos meses), mas respeita responsável e tipo de serviço.
 */
export async function fetchDemandasUltimosMeses(
  supabase: SupabaseLike,
  filtros: DemandaFiltros,
  opts: { meses?: number; responsavelId?: string; agora?: Date } = {}
): Promise<DemandasParaMetricas> {
  const agora = opts.agora ?? new Date();
  const meses = opts.meses ?? 6;
  const primeiroMes = primeiroDiaDoMes(diaEmBrasilia(agora));
  const inicio = new Date(`${primeiroMes}T03:00:00.000Z`);
  inicio.setUTCMonth(inicio.getUTCMonth() - (meses - 1));

  let query = supabase
    .from("demandas_view")
    .select(COLUNAS_METRICAS)
    .or(
      `created_at.gte.${inicio.toISOString()},concluida_em.gte.${inicio.toISOString()}`
    );

  if (opts.responsavelId) {
    query = query.eq("responsavel_id", opts.responsavelId);
  }
  if (filtros.responsavel) {
    query = query.eq("responsavel_id", filtros.responsavel);
  }
  if (filtros.tipo) {
    query = query.eq("tipo_servico_id", filtros.tipo);
  }

  const { data, error } = await query.limit(5000);

  if (error) {
    return {
      itens: [],
      erro: error.message ?? "Não foi possível montar a evolução mensal.",
      moduloAusente: moduloNaoInstalado(error),
    };
  }

  return {
    itens: (data ?? []) as DemandasParaMetricas["itens"],
    erro: null,
    moduloAusente: false,
  };
}

export async function fetchDemandaPorId(
  supabase: SupabaseLike,
  id: string
): Promise<{ demanda: DemandaRow | null; erro: string | null; moduloAusente: boolean }> {
  const { data, error } = await supabase
    .from("demandas_view")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      demanda: null,
      erro: error.message ?? "Não foi possível carregar a demanda.",
      moduloAusente: moduloNaoInstalado(error),
    };
  }

  return { demanda: (data as DemandaRow) ?? null, erro: null, moduloAusente: false };
}

export async function fetchHistoricoDemanda(
  supabase: SupabaseLike,
  demandaId: string
): Promise<HistoricoRow[]> {
  const { data } = await supabase
    .from("historico_demandas")
    .select("*")
    .eq("demanda_id", demandaId)
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []) as HistoricoRow[];
}

export async function fetchTiposServico(
  supabase: SupabaseLike,
  opts: { apenasAtivos?: boolean } = {}
): Promise<{ tipos: TipoServicoRow[]; erro: string | null; moduloAusente: boolean }> {
  let query = supabase
    .from("tipos_servico")
    .select("*")
    .order("nome", { ascending: true });

  if (opts.apenasAtivos) {
    query = query.eq("ativo", true);
  }

  const { data, error } = await query;

  if (error) {
    return {
      tipos: [],
      erro: error.message ?? "Não foi possível carregar os tipos de serviço.",
      moduloAusente: moduloNaoInstalado(error),
    };
  }

  return { tipos: (data ?? []) as TipoServicoRow[], erro: null, moduloAusente: false };
}

/**
 * Usuários que podem receber demandas.
 *
 * A leitura de `public.usuarios` depende das policies já existentes no projeto
 * (perfis elevados leem a lista completa). Se a RLS devolver vazio e a service
 * role estiver configurada, repetimos a consulta no servidor para não deixar o
 * select de responsável sem opções.
 */
export async function fetchUsuariosAtribuiveis(
  supabase: SupabaseLike
): Promise<UsuarioAtribuivel[]> {
  const colunas = "id, nome, email, cargo, ativo";

  const { data } = await supabase
    .from("usuarios")
    .select(colunas)
    .order("nome", { ascending: true });

  let usuarios = (data ?? []) as UsuarioAtribuivel[];

  if (usuarios.length <= 1 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = getServiceRoleClient();
      const { data: todos } = await (admin.from("usuarios") as SupabaseLike)
        .select(colunas)
        .order("nome", { ascending: true });
      if ((todos ?? []).length > usuarios.length) {
        usuarios = (todos ?? []) as UsuarioAtribuivel[];
      }
    } catch {
      // Sem service role utilizável — mantém o resultado da RLS.
    }
  }

  return usuarios;
}

/**
 * Só a contagem de pendências do usuário (badge do menu). Mantida em uma única
 * consulta porque roda no layout, em toda navegação do painel.
 */
export async function fetchDemandasPendentesCount(
  supabase: SupabaseLike,
  usuarioId: string
): Promise<number> {
  try {
    const { count } = await supabase
      .from("demandas_view")
      .select("id", { count: "exact", head: true })
      .eq("responsavel_id", usuarioId)
      .neq("status", "concluida")
      .neq("status", "aguardando_confirmacao");
    return count ?? 0;
  } catch {
    return 0;
  }
}

export type ResumoUsuario = {
  pendentes: number;
  venceHoje: number;
  atrasadas: number;
};

/** Indicadores do próprio usuário (badge da sidebar e destaques da tela). */
export async function fetchResumoDemandasUsuario(
  supabase: SupabaseLike,
  usuarioId: string,
  agora: Date = new Date()
): Promise<ResumoUsuario> {
  const hoje = diaEmBrasilia(agora);

  try {
    const [pendentes, venceHoje, atrasadas] = await Promise.all([
      supabase
        .from("demandas_view")
        .select("id", { count: "exact", head: true })
        .eq("responsavel_id", usuarioId)
        .neq("status", "concluida")
        .neq("status", "aguardando_confirmacao"),
      supabase
        .from("demandas_view")
        .select("id", { count: "exact", head: true })
        .eq("responsavel_id", usuarioId)
        .neq("status", "concluida")
        .neq("status", "aguardando_confirmacao")
        .gte("prazo_final", inicioDoDiaISO(hoje))
        .lt("prazo_final", inicioDoDiaSeguinteISO(hoje)),
      supabase
        .from("demandas_view")
        .select("id", { count: "exact", head: true })
        .eq("responsavel_id", usuarioId)
        .eq("atrasada", true),
    ]);

    return {
      pendentes: pendentes.count ?? 0,
      venceHoje: venceHoje.count ?? 0,
      atrasadas: atrasadas.count ?? 0,
    };
  } catch {
    return { pendentes: 0, venceHoje: 0, atrasadas: 0 };
  }
}
