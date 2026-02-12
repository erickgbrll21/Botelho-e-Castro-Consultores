import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ArrowTrendingDownIcon, ArrowTrendingUpIcon, UserGroupIcon, ChartPieIcon } from "@heroicons/react/24/outline";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; grupo?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { q, grupo: grupoFiltro } = await searchParams;
  const term = q?.trim() ?? "";
  const grupoId = grupoFiltro?.trim() ?? "";

  const { data: gruposLista } = await supabase
    .from("grupos_economicos")
    .select("id, nome")
    .order("nome", { ascending: true });
  const gruposFiltro: any[] = gruposLista ?? [];
  const totalGrupos = gruposLista?.length ?? 0;

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfNextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );

  const { count: entradasMes } = await supabase
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfMonth.toISOString())
    .lt("created_at", startOfNextMonth.toISOString());

  const inicioMes = startOfMonth.toISOString().slice(0, 10);
  const inicioProximoMes = startOfNextMonth.toISOString().slice(0, 10);
  const { count: saidasMes } = await supabase
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .eq("ativo", false)
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
        responsavel_fiscal,
        cidade,
        estado,
        atividade,
        constituicao,
        inscricao_estadual,
        inscricao_municipal,
        grupo_economico,
        grupo_id,
        grupos_economicos ( nome ),
        socio_responsavel_pj,
        capital_social,
        data_abertura_cliente,
        data_entrada_contabilidade,
        data_saida,
        regime_tributario,
        ativo,
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

  const { data: dataClientes } = await finalQuery;
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
              const responsaveis = cliente.responsaveis_internos?.[0];
              const servicos = cliente.servicos_contratados?.[0];

              return (
                <a
                  key={cliente.id}
                  href={`/clientes/${cliente.id}`}
                  className="glass-panel group flex flex-col justify-between rounded-2xl p-4 md:p-5 transition-all hover:border-neutral-100 hover:bg-neutral-900/50"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${cliente.ativo !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <h3 className="truncate font-semibold text-neutral-50 group-hover:text-white text-sm md:text-base">
                            {cliente.razao_social}
                          </h3>
                        </div>
                        <p className="text-[10px] md:text-xs text-neutral-500 truncate ml-3">{cliente.cnpj}</p>
                      </div>
                      <div className="shrink-0 flex gap-1">
                        <Pill
                          label={cliente.ativo !== false ? "A" : "I"}
                          tone={cliente.ativo !== false ? "success" : "critical"}
                        />
                        <Pill
                          label={cliente.tipo_unidade ?? "—"}
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
                    </div>

                    <div className="flex flex-wrap gap-1 border-t border-neutral-800/50 pt-3">
                      {(cliente.servicos_contratados?.[0]?.contabil_fiscal || 
                        cliente.servicos_contratados?.[0]?.contabil_contabilidade || 
                        cliente.servicos_contratados?.[0]?.contabil_dp || 
                        cliente.servicos_contratados?.[0]?.contabil_pericia || 
                        cliente.servicos_contratados?.[0]?.contabil_legalizacao) && (
                        <Pill label="Contábil" tone="success" />
                      )}
                      {(cliente.servicos_contratados?.[0]?.juridico_civel || 
                        cliente.servicos_contratados?.[0]?.juridico_trabalhista || 
                        cliente.servicos_contratados?.[0]?.juridico_licitacao || 
                        cliente.servicos_contratados?.[0]?.juridico_penal || 
                        cliente.servicos_contratados?.[0]?.juridico_empresarial) && (
                        <Pill label="Jurídico" tone="warning" />
                      )}
                      {cliente.servicos_contratados?.[0]?.planejamento_societario_tributario && (
                        <Pill label="Planejamento" tone="neutral" />
                      )}
                      {!cliente.servicos_contratados?.[0] && (
                        <p className="text-[10px] text-neutral-600 italic">Sem serviços ativos</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[9px] md:text-[10px] text-neutral-500 uppercase tracking-wider">
                    <span className="truncate max-w-[100px]">{cliente.cidade ?? "Local não inf."}</span>
                    <span className="opacity-100 sm:opacity-0 transition-opacity group-hover:opacity-100 shrink-0">
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
