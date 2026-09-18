import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartPieIcon,
  CalendarDaysIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireGestorDemandas } from "@/lib/demandas-access";
import {
  parseFiltros,
  queryStringFiltros,
  type DemandaFiltros,
  type DemandaFiltrosParams,
} from "@/lib/demandas";
import {
  fetchDemandasParaMetricas,
  fetchDemandasUltimosMeses,
  fetchResumoDemandasUsuario,
  fetchTiposServico,
  fetchUsuariosAtribuiveis,
} from "@/lib/demandas-queries";
import {
  calcularEvolucaoMensal,
  calcularPorFuncionario,
  calcularPorStatus,
  calcularPorTipoServico,
  calcularResumo,
} from "@/lib/demandas-metrics";
import { DemandasSubnav } from "@/components/demandas/demandas-subnav";
import { DemandasFiltros } from "@/components/demandas/demandas-filtros";
import {
  BarrasComparativas,
  BarrasHorizontais,
  type ItemBarra,
} from "@/components/demandas/demanda-charts";
import {
  ErroCarregamento,
  EstadoVazio,
  ModuloNaoInstalado,
} from "@/components/demandas/demandas-avisos";
import { NovaDemandaButton } from "@/components/demandas/demanda-form";
import { criarDemanda } from "./actions";

function diaPtBR(dia: string): string {
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

function descricaoPeriodo(filtros: DemandaFiltros): string {
  if (filtros.de || filtros.ate) {
    if (filtros.de && filtros.ate) {
      return `Criadas entre ${diaPtBR(filtros.de)} e ${diaPtBR(filtros.ate)}`;
    }
    if (filtros.de) return `Criadas a partir de ${diaPtBR(filtros.de)}`;
    return `Criadas até ${diaPtBR(filtros.ate)}`;
  }
  switch (filtros.periodo) {
    case "hoje":
      return "Criadas hoje";
    case "semana":
      return "Criadas nesta semana";
    case "mes":
      return "Criadas neste mês";
    default:
      return "Todo o histórico";
  }
}

export default async function DemandasDashboardPage({
  searchParams,
}: {
  searchParams: Promise<DemandaFiltrosParams>;
}) {
  const profile = await requireGestorDemandas();
  const supabase = await createSupabaseServerClient();
  const filtros = parseFiltros(await searchParams);
  const agora = new Date();

  const [metricas, ultimosMeses, tiposServico, usuarios, resumoPessoal] =
    await Promise.all([
      fetchDemandasParaMetricas(supabase, filtros, { agora }),
      fetchDemandasUltimosMeses(supabase, filtros, { agora }),
      fetchTiposServico(supabase),
      fetchUsuariosAtribuiveis(supabase),
      fetchResumoDemandasUsuario(supabase, profile.id, agora),
    ]);

  const moduloAusente = metricas.moduloAusente || tiposServico.moduloAusente;
  const resumo = calcularResumo(metricas.itens, agora);
  const porFuncionario = calcularPorFuncionario(metricas.itens);
  const porStatus = calcularPorStatus(metricas.itens);
  const porTipo = calcularPorTipoServico(metricas.itens);
  const evolucao = calcularEvolucaoMensal(ultimosMeses.itens, { agora });
  const periodoTexto = descricaoPeriodo(filtros);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 md:text-xs md:tracking-[0.3em]">
            Controle de Demandas
          </p>
          <h1 className="text-2xl font-semibold md:text-3xl">Dashboard</h1>
          <p className="text-xs text-neutral-400 md:text-sm">
            Distribuição e acompanhamento das tarefas da equipe.
          </p>
        </div>
        {!moduloAusente ? (
          <NovaDemandaButton
            tipos={tiposServico.tipos}
            usuarios={usuarios}
            action={criarDemanda}
          />
        ) : null}
      </div>

      <DemandasSubnav
        atual="dashboard"
        gestor
        pendentes={resumoPessoal.pendentes}
      />

      {moduloAusente ? <ModuloNaoInstalado /> : null}
      {!moduloAusente && metricas.erro ? (
        <ErroCarregamento mensagem={metricas.erro} />
      ) : null}

      <DemandasFiltros
        filtros={filtros}
        tipos={tiposServico.tipos}
        usuarios={usuarios}
        basePath="/demandas"
      />

      <div className="card-grid">
        <Card
          title="Demandas no período"
          action={
            <ClipboardDocumentListIcon className="h-4 w-4 text-blue-400" />
          }
        >
          <p className="text-3xl font-semibold">{resumo.total}</p>
          <p className="text-xs text-neutral-400">{periodoTexto}</p>
        </Card>

        <Card
          title="Confirmadas pelo gestor"
          action={<CheckCircleIcon className="h-4 w-4 text-emerald-500" />}
        >
          <p className="text-3xl font-semibold text-emerald-300">
            {resumo.concluidas}
          </p>
          <p className="text-xs text-neutral-400">
            Confirmação final registrada
          </p>
        </Card>

        <Card
          title="Pendentes"
          action={<ClockIcon className="h-4 w-4 text-amber-400" />}
        >
          <p className="text-3xl font-semibold text-amber-200">
            {resumo.naoConcluidas}
          </p>
          <p className="text-xs text-neutral-400">
            {resumo.pendentes} pendente(s) · {resumo.emAndamento} em andamento
            {resumo.aguardandoConfirmacao > 0
              ? ` · ${resumo.aguardandoConfirmacao} aguardando confirmação`
              : ""}
          </p>
        </Card>

        <Card
          title="Atrasadas"
          action={
            <ExclamationTriangleIcon className="h-4 w-4 text-red-400" />
          }
        >
          <p className="text-3xl font-semibold text-red-300">
            {resumo.atrasadas}
          </p>
          <p className="text-xs text-neutral-400">
            Prazo vencido e ainda não confirmadas pelo gestor
          </p>
        </Card>

        <Card
          title="Taxa de conclusão"
          action={<ChartPieIcon className="h-4 w-4 text-blue-400" />}
        >
          <p className="text-3xl font-semibold tabular-nums">
            {resumo.taxaConclusao}%
          </p>
          <p className="text-xs text-neutral-400">
            {resumo.concluidas} de {resumo.total} demandas do período
          </p>
        </Card>

        <Card
          title="Vencem hoje"
          action={<CalendarDaysIcon className="h-4 w-4 text-amber-400" />}
        >
          <p className="text-3xl font-semibold">{resumo.venceHoje}</p>
          <p className="text-xs text-neutral-400">
            Prazo para hoje, ainda em aberto
          </p>
        </Card>
      </div>

      <Card
        title="Demandas por funcionário"
        action={<UserGroupIcon className="h-4 w-4 text-blue-400" />}
      >
        {porFuncionario.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma demanda no período"
            descricao="Ajuste os filtros ou crie a primeira demanda para a equipe."
          />
        ) : (
          <div className="space-y-5">
            <BarrasHorizontais
              itens={porFuncionario.map((item) => ({
                chave: item.responsavelId ?? "sem-responsavel",
                label: item.nome,
                valor: item.total,
                detalhe: `${item.concluidas} confirmada(s) · ${item.aguardandoConfirmacao} aguardando · ${item.atrasadas} atrasada(s)`,
                href: item.responsavelId
                  ? `/demandas/todas${queryStringFiltros(filtros, {
                      responsavel: item.responsavelId,
                      pagina: 1,
                    })}`
                  : undefined,
              }))}
            />

            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[42rem] text-sm">
                <thead className="text-left text-neutral-400">
                  <tr className="border-b border-neutral-800/80">
                    <th className="py-2 pr-4 font-medium">Funcionário</th>
                    <th className="py-2 pr-4 font-medium text-right">Total</th>
                    <th className="py-2 pr-4 font-medium text-right">
                      Pendentes
                    </th>
                    <th className="py-2 pr-4 font-medium text-right">
                      Em andamento
                    </th>
                    <th className="py-2 pr-4 font-medium text-right">
                      Aguardando
                    </th>
                    <th className="py-2 pr-4 font-medium text-right">
                      Confirmadas
                    </th>
                    <th className="py-2 pr-0 font-medium text-right">
                      Atrasadas
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {porFuncionario.map((item) => (
                    <tr
                      key={item.responsavelId ?? "sem-responsavel"}
                      className="transition-colors hover:bg-neutral-900/30"
                    >
                      <td className="py-2.5 pr-4">
                        {item.responsavelId ? (
                          <Link
                            href={`/demandas/todas${queryStringFiltros(filtros, {
                              responsavel: item.responsavelId,
                              pagina: 1,
                            })}`}
                            className="text-neutral-100 hover:underline"
                          >
                            {item.nome}
                          </Link>
                        ) : (
                          <span className="text-neutral-400">{item.nome}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">
                        {item.total}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-neutral-300">
                        {item.pendentes}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-neutral-300">
                        {item.emAndamento}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-sky-300">
                        {item.aguardandoConfirmacao}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-emerald-300">
                        {item.concluidas}
                      </td>
                      <td className="py-2.5 pr-0 text-right tabular-nums text-red-300">
                        {item.atrasadas}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Demandas por status">
          <BarrasHorizontais
            itens={porStatus.map(
              (item): ItemBarra => ({
                chave: item.chave,
                label: item.label,
                valor: item.valor,
                tom:
                  item.chave === "concluida"
                    ? "emerald"
                    : item.chave === "atrasada"
                      ? "red"
                      : item.chave === "aguardando_confirmacao"
                        ? "blue"
                        : item.chave === "em_andamento"
                          ? "amber"
                          : "neutral",
              })
            )}
          />
        </Card>

        <Card title="Demandas por tipo de serviço">
          <BarrasHorizontais
            itens={porTipo.map((item) => ({
              chave: item.chave,
              label: item.label,
              valor: item.valor,
              href:
                item.chave === "sem-tipo"
                  ? undefined
                  : `/demandas/todas${queryStringFiltros(filtros, {
                      tipo: item.chave,
                      pagina: 1,
                    })}`,
            }))}
          />
        </Card>
      </div>

      <Card
        title="Evolução mensal"
        action={
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">
            Últimos 6 meses
          </span>
        }
      >
        <BarrasComparativas
          itens={evolucao.map((mes) => ({
            chave: mes.mes,
            label: mes.label,
            primeiro: mes.recebidas,
            segundo: mes.concluidas,
          }))}
          legendaPrimeiro="Recebidas"
          legendaSegundo="Confirmadas pelo gestor"
        />
        <p className="mt-3 text-xs text-neutral-500">
          Respeita os filtros de funcionário e tipo de serviço; o período é
          sempre os últimos 6 meses. Conta apenas confirmações finais do gestor.
        </p>
      </Card>
    </div>
  );
}
