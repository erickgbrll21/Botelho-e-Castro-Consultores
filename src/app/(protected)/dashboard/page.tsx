import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { q } = await searchParams;
  const term = q?.trim() ?? "";

  const { data: gruposData } = await supabase
    .from("grupos_empresariais")
    .select("id");
  const totalGrupos = gruposData?.length ?? 0;

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfNextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );

  const { count: entradasMes } = await supabase
    .from("empresas")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfMonth.toISOString())
    .lt("created_at", startOfNextMonth.toISOString());

  const empresasQuery = supabase
    .from("empresas")
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
        grupo_empresarial,
        grupo_id,
        grupos_empresariais ( nome ),
        socio_responsavel_pj,
        capital_social,
        data_abertura_empresa,
        data_entrada_contabilidade,
        regime_tributario,
        processos_ativos,
        responsaveis_internos (responsavel_comercial, responsavel_contabil, responsavel_juridico, responsavel_planejamento_tributario),
        servicos_contratados (contabilidade, juridico, planejamento_tributario),
        quadro_socios (nome_socio, percentual_participacao)
      `
    )
    .order("razao_social", { ascending: true });

  const { data: dataEmpresas } = await (term
    ? empresasQuery.ilike("razao_social", `%${term}%`)
    : empresasQuery);
  const empresas: any[] = dataEmpresas ?? [];

  const totalProcessos =
    empresas.reduce((acc, empresa) => acc + (empresa.processos_ativos ?? 0), 0) ||
    0;

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
              <input
                name="q"
                defaultValue={term}
                placeholder="Buscar empresa..."
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
        <Card title="Empresas ativas">
          <p className="text-3xl font-semibold">{empresas.length}</p>
          <p className="text-xs text-neutral-400">Com acesso concedido</p>
        </Card>
        <Card title="Grupos ativos">
          <p className="text-3xl font-semibold">{totalGrupos}</p>
          <p className="text-xs text-neutral-400">Total de grupos cadastrados</p>
        </Card>
        <Card title="Entradas de empresas (mês)">
          <p className="text-3xl font-semibold">{entradasMes ?? 0}</p>
          <p className="text-xs text-neutral-400">
            Criadas desde o primeiro dia do mês atual
          </p>
        </Card>
        <Card title="Processos em andamento">
          <p className="text-3xl font-semibold">{totalProcessos}</p>
          <p className="text-xs text-neutral-400">
            Quantidade total de processos ativos
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
        <h2 className="text-xl font-semibold">Empresas</h2>
        <p className="text-sm text-neutral-400">
          {empresas.length} {empresas.length === 1 ? "empresa cadastrada" : "empresas cadastradas"}
        </p>
      </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {empresas.map((empresa) => {
              const grupoNome =
                (
                  empresa as {
                    grupos_empresariais?: { nome?: string }[] | null;
                    grupo_empresarial?: string | null;
                  }
                ).grupos_empresariais?.[0]?.nome ??
                empresa.grupo_empresarial ??
                "—";
              const responsaveis = empresa.responsaveis_internos?.[0];
              const servicos = empresa.servicos_contratados?.[0];

              return (
                <a
                  key={empresa.id}
                  href={`/empresas/${empresa.id}`}
                  className="glass-panel group flex flex-col justify-between rounded-2xl p-4 md:p-5 transition-all hover:border-neutral-100 hover:bg-neutral-900/50"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-neutral-50 group-hover:text-white text-sm md:text-base">
                          {empresa.razao_social}
                        </h3>
                        <p className="text-[10px] md:text-xs text-neutral-500 truncate">{empresa.cnpj}</p>
                      </div>
                      <div className="shrink-0">
                        <Pill
                          label={empresa.tipo_unidade ?? "—"}
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
                          {empresa.atividade ?? "—"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-neutral-500 uppercase tracking-tighter">Processos</p>
                        <p className="font-medium text-neutral-300 truncate">
                          {empresa.processos_ativos ?? 0} ativos
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 border-t border-neutral-800/50 pt-3">
                      {servicos?.contabilidade && (
                        <Pill label="Contábil" tone="success" />
                      )}
                      {servicos?.juridico && (
                        <Pill label="Jurídico" tone="warning" />
                      )}
                      {servicos?.planejamento_tributario && (
                        <Pill label="Planej." tone="neutral" />
                      )}
                      {!servicos?.contabilidade && !servicos?.juridico && !servicos?.planejamento_tributario && (
                        <p className="text-[10px] text-neutral-600 italic">Sem serviços ativos</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[9px] md:text-[10px] text-neutral-500 uppercase tracking-wider">
                    <span className="truncate max-w-[100px]">{empresa.cidade ?? "Local não inf."}</span>
                    <span className="opacity-100 sm:opacity-0 transition-opacity group-hover:opacity-100 shrink-0">
                      Ver detalhes →
                    </span>
                  </div>
                </a>
              );
            })}

        {empresas.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="text-neutral-500">Nenhuma empresa encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
