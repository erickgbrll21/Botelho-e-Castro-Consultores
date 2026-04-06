import clsx from "clsx";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, canSeeContractValue } from "@/lib/auth";
import {
  getSituacaoEmpresa,
  situacaoEmpresaLabels,
  type SituacaoEmpresa,
} from "@/lib/cliente-situacao";
import { labelTipoUnidadeExibicao } from "@/lib/unidade-label";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  ChartPieIcon,
} from "@heroicons/react/24/outline";

const situacaoCardUi: Record<
  SituacaoEmpresa,
  {
    border: string;
    card: string;
    banner: string;
    dot: string;
  }
> = {
  ativa: {
    border: "border-l-emerald-500",
    card: "",
    banner:
      "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/35",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)]",
  },
  paralisada: {
    border: "border-l-amber-400",
    card: "bg-amber-950/10 ring-1 ring-amber-500/30",
    banner:
      "bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/45",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
  },
  desativada: {
    border: "border-l-red-500",
    card: "bg-red-950/15 ring-1 ring-red-500/25",
    banner: "bg-red-500/20 text-red-100 ring-1 ring-red-500/40",
    dot: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.7)]",
  },
};

function formatCurrencyContrato(value: number | null | undefined) {
  if (value == null || (typeof value === "number" && Number.isNaN(value))) {
    return "—";
  }
  if (!value && value !== 0) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; grupo?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { q, grupo: grupoFiltro } = await searchParams;
  const term = q?.trim() ?? "";
  const grupoId = grupoFiltro?.trim() ?? "";

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfNextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );
  const inicioMes = startOfMonth.toISOString().slice(0, 10);
  const inicioProximoMes = startOfNextMonth.toISOString().slice(0, 10);

  const gruposQuery = supabase
    .from("grupos_economicos")
    .select("id, nome")
    .order("nome", { ascending: true });

  const entradasQuery = supabase
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfMonth.toISOString())
    .lt("created_at", startOfNextMonth.toISOString());

  const saidasQuery = supabase
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .eq("ativo", false)
    .not("data_saida", "is", null)
    .gte("data_saida", inicioMes)
    .lt("data_saida", inicioProximoMes);

  const clientesQuery = supabase
    .from("clientes")
    .select(
      `
        id,
        razao_social,
        cnpj,
        dominio,
        tipo_unidade,
        identificacao_filial,
        responsavel_fiscal,
        cep,
        logradouro,
        bairro,
        complemento,
        cidade,
        estado,
        atividade,
        constituicao,
        inscricao_estadual,
        inscricao_municipal,
        grupo_economico,
        grupo_id,
        valor_contrato,
        cobranca_por_grupo,
        grupos_economicos ( nome, valor_contrato ),
        socio_responsavel_pj,
        capital_social,
        data_abertura_cliente,
        data_entrada_contabilidade,
        data_saida,
        regime_tributario,
        ativo,
        situacao_empresa,
        responsaveis_internos (responsavel_comercial, responsavel_contabil, responsavel_juridico, responsavel_planejamento_tributario, responsavel_dp, responsavel_financeiro),
        servicos_contratados (*),
        quadro_socios (nome_socio, percentual_participacao)
      `
    )
    .order("razao_social", { ascending: true });

  let finalQuery = clientesQuery;
  if (term) {
    finalQuery = finalQuery.ilike("razao_social", `%${term}%`);
  }
  if (grupoId) {
    finalQuery = finalQuery.eq("grupo_id", grupoId);
  }

  const [
    { data: gruposLista },
    { count: entradasMes },
    { count: saidasMesCount },
    { data: dataClientes },
    profile,
  ] = await Promise.all([
    gruposQuery,
    entradasQuery,
    saidasQuery,
    finalQuery,
    getCurrentProfile(),
  ]);

  const showContractValue =
    profile != null && canSeeContractValue(profile.tipo_usuario);

  const gruposFiltro: any[] = gruposLista ?? [];
  const totalGrupos = gruposLista?.length ?? 0;
  const saidasMes = saidasMesCount ?? 0;
  const clientes: any[] = dataClientes ?? [];

  return (
    <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] text-neutral-500">
                Visão Geral
              </p>
              <h1 className="text-2xl md:text-3xl font-semibold">Dashboard</h1>
              <p className="text-xs md:text-sm text-neutral-400">
                Dados de clientes, responsáveis internos e serviços contratados.
              </p>
            </div>
            <form className="flex items-center gap-2">
              <select
                name="grupo"
                defaultValue={grupoId}
                className="hidden sm:block rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              >
                <option value="">Todos os grupos</option>
                {gruposFiltro.map((grupo) => (
                  <option key={grupo.id} value={grupo.id}>
                    {grupo.nome}
                  </option>
                ))}
              </select>
              <input
                name="q"
                defaultValue={term}
                placeholder="Buscar cliente..."
                className="w-full sm:w-auto rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-100 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
              >
                Buscar
              </button>
            </form>
          </div>

      <div className="card-grid">
        <Card title="Clientes ativos" action={<UserGroupIcon className="h-4 w-4 text-emerald-500" />}>
          <p className="text-3xl font-semibold">
            {clientes.filter((c) => c.ativo !== false).length}
          </p>
          <p className="text-xs text-neutral-400">Total de clientes ativos no sistema</p>
        </Card>
        <Card title="Grupos ativos" action={<ChartPieIcon className="h-4 w-4 text-blue-500" />}>
          <p className="text-3xl font-semibold">{totalGrupos}</p>
          <p className="text-xs text-neutral-400">Total de grupos cadastrados</p>
        </Card>
        <Card title="Entradas de clientes (mês)" action={<ArrowTrendingUpIcon className="h-4 w-4 text-emerald-500" />}>
          <p className="text-3xl font-semibold">{entradasMes ?? 0}</p>
          <p className="text-xs text-neutral-400">
            Novos cadastros no mês atual
          </p>
        </Card>
        <Card title="Saída de clientes (mês)" action={<ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />}>
          <p className="text-3xl font-semibold text-red-500">{saidasMes ?? 0}</p>
          <p className="text-xs text-neutral-400">
            Empresas desativadas no mês atual
          </p>
        </Card>
        <Card title="Serviços mais contratados">
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill label="Contabilidade" tone="success" />
            <Pill label="Jurídico" tone="warning" />
            <Pill label="Planejamento Tributário" tone="neutral" />
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            Ajuste conforme dados reais.
          </p>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Clientes</h2>
        <p className="text-sm text-neutral-400">
          {clientes.length} {clientes.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}
        </p>
      </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {clientes.map((cliente) => {
              const gruposRel = cliente.grupos_economicos;
              const grupoNome = (Array.isArray(gruposRel) ? gruposRel[0]?.nome : gruposRel?.nome) || cliente.grupo_economico || "—";
              const grupoValorContrato = Array.isArray(gruposRel)
                ? gruposRel[0]?.valor_contrato
                : gruposRel?.valor_contrato;
              const responsaveis = cliente.responsaveis_internos?.[0];
              const servicosEmbed = cliente.servicos_contratados;
              const servicos = Array.isArray(servicosEmbed)
                ? servicosEmbed[0]
                : servicosEmbed;
              const hasContabil =
                !!servicos?.contabil_fiscal ||
                !!servicos?.contabil_contabilidade ||
                !!servicos?.contabil_dp ||
                !!servicos?.contabil_pericia ||
                !!servicos?.contabil_legalizacao;
              const hasJuridico =
                !!servicos?.juridico_civel ||
                !!servicos?.juridico_trabalhista ||
                !!servicos?.juridico_licitacao ||
                !!servicos?.juridico_penal ||
                !!servicos?.juridico_empresarial;
              const hasPlanejamento = !!servicos?.planejamento_societario_tributario;
              const hasAnyServicoAtivo =
                hasContabil || hasJuridico || hasPlanejamento;
              const situacao = getSituacaoEmpresa(cliente);
              const { titulo: situacaoTitulo } = situacaoEmpresaLabels(situacao);
              const ui = situacaoCardUi[situacao];

              return (
                <a
                  key={cliente.id}
                  href={`/clientes/${cliente.id}`}
                  aria-label={`${cliente.razao_social} — ${situacaoTitulo.toLowerCase()}`}
                  className={clsx(
                    "glass-panel group flex flex-col justify-between rounded-2xl border-l-[5px] p-4 md:p-5 transition-all hover:border-neutral-100 hover:bg-neutral-900/50",
                    ui.border,
                    ui.card
                  )}
                >
                  <div className="space-y-4">
                    <div
                      className={clsx(
                        "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider sm:text-xs",
                        ui.banner
                      )}
                    >
                      <span
                        className={clsx(
                          "h-2 w-2 shrink-0 rounded-full",
                          ui.dot
                        )}
                        aria-hidden
                      />
                      {situacaoTitulo}
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-neutral-50 group-hover:text-white text-sm md:text-base">
                          {cliente.razao_social}
                        </h3>
                        <p className="text-[10px] md:text-xs text-neutral-500 truncate">{cliente.cnpj}</p>
                      </div>
                      <div className="shrink-0 max-w-[min(140px,42%)]">
                        <Pill
                          label={labelTipoUnidadeExibicao(
                            cliente.tipo_unidade,
                            cliente.identificacao_filial
                          )}
                          tone="neutral"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[10px] md:text-xs">
                      <div className="min-w-0">
                        <p className="text-neutral-500 uppercase tracking-tighter">Grupo</p>
                        <p className="truncate font-medium text-neutral-300">
                          {grupoNome}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-neutral-500 uppercase tracking-tighter">Responsável</p>
                        <p className="truncate font-medium text-neutral-300">
                          {responsaveis?.responsavel_comercial ?? "—"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-neutral-500 uppercase tracking-tighter">Atividade</p>
                        <p className="truncate font-medium text-neutral-300">
                          {cliente.atividade ?? "—"}
                        </p>
                      </div>
                      {showContractValue ? (
                        <div className="min-w-0">
                          <p className="text-neutral-500 uppercase tracking-tighter">
                            Contrato (mensal)
                          </p>
                          <p className="truncate font-semibold text-amber-200/95 tabular-nums">
                            {cliente.cobranca_por_grupo
                              ? grupoValorContrato != null
                                ? formatCurrencyContrato(grupoValorContrato)
                                : "—"
                              : formatCurrencyContrato(cliente.valor_contrato)}
                          </p>
                          {cliente.cobranca_por_grupo ? (
                            <p className="mt-0.5 truncate text-[9px] font-normal text-neutral-500">
                              Cobrança pelo grupo
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-1 border-t border-neutral-800/50 pt-3">
                      {hasContabil ? (
                        <Pill label="Contábil" tone="success" />
                      ) : null}
                      {hasJuridico ? (
                        <Pill label="Jurídico" tone="warning" />
                      ) : null}
                      {hasPlanejamento ? (
                        <Pill label="Planejamento" tone="neutral" />
                      ) : null}
                      {!hasAnyServicoAtivo ? (
                        <p className="text-[10px] text-neutral-600 italic">
                          Sem serviços ativos
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[9px] md:text-[10px] text-neutral-500 uppercase tracking-wider">
                    <span className="min-w-0 max-w-[65%] truncate">
                      {cliente.cidade ?? "Local não inf."}
                    </span>
                    <span className="shrink-0 whitespace-nowrap opacity-100 sm:opacity-0 transition-opacity group-hover:opacity-100">
                      Ver detalhes →
                    </span>
                  </div>
                </a>
              );
            })}

        {clientes.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="text-neutral-500">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
