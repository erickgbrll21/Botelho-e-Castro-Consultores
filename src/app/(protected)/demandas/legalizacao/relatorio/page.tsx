import Link from "next/link";
import { DemandasSubnav } from "@/components/demandas/demandas-subnav";
import { ImprimirRelatorioButton } from "@/components/demandas/imprimir-relatorio-button";
import { RelatorioFiltros } from "@/components/demandas/relatorio-filtros";
import { requireGestorDemandas } from "@/lib/demandas-access";
import { caminhosSetor } from "@/lib/demanda-setor";
import {
  fetchRelatorioMensalLegalizacao,
  labelStatus,
  parseMesRelatorio,
  parseSituacaoRelatorio,
  resumoStatusRelatorio,
  rotuloMes,
  rotuloSituacao,
} from "@/lib/demandas-relatorio";
import { formatDateTimePtBR } from "@/lib/format-date";
import { formatDocumentoCnpjCpf } from "@/lib/format-documento";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchResumoDemandasUsuario } from "@/lib/demandas-queries";

function empresaDoItem(empresaNome: string | null, fantasia: string | null) {
  const nome = empresaNome?.trim();
  const apelido = fantasia?.trim();
  if (nome && apelido && apelido !== nome) return `${nome} (${apelido})`;
  return nome || apelido || "—";
}

export default async function RelatorioLegalizacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; situacao?: string }>;
}) {
  const caminhos = caminhosSetor("legalizacao");
  const profile = await requireGestorDemandas(caminhos.minhas);
  const params = await searchParams;
  const mes = parseMesRelatorio(params.mes);
  const situacao = parseSituacaoRelatorio(params.situacao);
  const supabase = await createSupabaseServerClient();
  const [relatorio, resumoPessoal] = await Promise.all([
    fetchRelatorioMensalLegalizacao(supabase, mes, situacao),
    fetchResumoDemandasUsuario(supabase, profile.id, new Date(), "legalizacao"),
  ]);
  const status = resumoStatusRelatorio(relatorio.grupos);
  const geradoEm = formatDateTimePtBR(new Date().toISOString(), {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 md:text-xs md:tracking-[0.3em]">
            Contábil · Legalização
          </p>
          <h1 className="text-2xl font-semibold md:text-3xl">Relatório mensal</h1>
          <p className="max-w-2xl text-xs text-neutral-400 md:text-sm">
            Demandas criadas no mês, por funcionário. As confirmadas pelo
            gestor saem da lista depois de 60 dias e continuam neste relatório.
          </p>
        </div>
        <ImprimirRelatorioButton />
      </div>

      <div className="no-print">
        <DemandasSubnav
          atual="relatorio"
          gestor
          pendentes={resumoPessoal.pendentes}
          setor="legalizacao"
        />
      </div>

      <RelatorioFiltros
        action={caminhos.relatorio}
        mes={mes}
        situacao={situacao}
      />

      {relatorio.erro ? (
        <p className="no-print rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          {relatorio.erro}
        </p>
      ) : null}

      <article className="relatorio-papel max-w-full space-y-6 overflow-x-hidden rounded-2xl border border-neutral-800 bg-white p-5 text-neutral-950 md:p-8">
        <header className="flex flex-col gap-4 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
            <img
              src="/logo-bcc.svg"
              alt="Botelho e Castro Consultores"
              width={220}
              height={48}
              className="relatorio-logo block h-12 w-[220px] max-w-full object-contain object-left"
            />
            <div className="min-w-0 sm:border-l sm:border-neutral-200 sm:pl-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">
                Legalização
              </p>
              <h2 className="text-xl font-semibold sm:text-2xl">
                Relatório de demandas · {rotuloMes(mes)}
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                {rotuloSituacao(situacao)} · criadas no mês, agrupadas pelo
                funcionário responsável.
              </p>
            </div>
          </div>
          <p className="shrink-0 text-xs text-neutral-500">Gerado em {geradoEm}</p>
        </header>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
              Total
            </dt>
            <dd className="text-xl font-semibold tabular-nums">{relatorio.total}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
              Confirmadas
            </dt>
            <dd className="text-xl font-semibold tabular-nums">{status.concluida}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
              Aguardando gestor
            </dt>
            <dd className="text-xl font-semibold tabular-nums">
              {status.aguardando_confirmacao}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
              Em andamento
            </dt>
            <dd className="text-xl font-semibold tabular-nums">
              {status.em_andamento}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
              Pendentes
            </dt>
            <dd className="text-xl font-semibold tabular-nums">{status.pendente}</dd>
          </div>
        </dl>

        {relatorio.grupos.length === 0 ? (
          <p className="text-sm text-neutral-600">
            {situacao === "todas"
              ? `Nenhuma demanda de Legalização foi criada em ${rotuloMes(mes)}.`
              : `Nenhuma demanda ${rotuloSituacao(situacao).toLowerCase()} de Legalização em ${rotuloMes(mes)}.`}
          </p>
        ) : (
          relatorio.grupos.map((grupo) => (
            <section key={grupo.responsavelNome}>
              <h3 className="mb-2 flex items-baseline justify-between gap-3 border-b border-neutral-200 pb-1 text-base font-semibold">
                <span>{grupo.responsavelNome}</span>
                <span className="text-xs font-medium text-neutral-500">
                  {grupo.itens.length}{" "}
                  {grupo.itens.length === 1 ? "demanda" : "demandas"}
                </span>
              </h3>
              <table className="w-full table-fixed border-collapse text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-neutral-500">
                    <th className="w-[34%] py-2 pr-3 font-medium">Demanda</th>
                    <th className="w-[24%] py-2 pr-3 font-medium">Empresa</th>
                    <th className="w-[16%] py-2 pr-3 font-medium">Status</th>
                    <th className="w-[13%] py-2 pr-3 font-medium">Criada</th>
                    <th className="w-[13%] py-2 font-medium">Confirmada</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.itens.map((item) => (
                    <tr key={item.id} className="border-t border-neutral-200 align-top">
                      <td className="break-words py-2 pr-3">
                        <p className="font-medium text-neutral-950">{item.titulo}</p>
                        <p className="text-neutral-600">
                          {item.tipoServico || "Sem tipo"}
                          {item.protocolo ? ` · Protocolo ${item.protocolo}` : ""}
                        </p>
                        {item.descricao ? (
                          <p className="mt-1 whitespace-pre-wrap text-neutral-700">
                            {item.descricao}
                          </p>
                        ) : null}
                        {item.observacoes ? (
                          <p className="mt-1 whitespace-pre-wrap text-neutral-700">
                            Obs.: {item.observacoes}
                          </p>
                        ) : null}
                      </td>
                      <td className="break-words py-2 pr-3">
                        <p>{empresaDoItem(item.empresaNome, item.empresaFantasia)}</p>
                        <p className="text-neutral-600">
                          {formatDocumentoCnpjCpf(item.cnpj) || "—"}
                        </p>
                      </td>
                      <td className="break-words py-2 pr-3">{labelStatus(item.status)}</td>
                      <td className="py-2 pr-3">
                        {formatDateTimePtBR(item.createdAt, { dateStyle: "short" })}
                        <span className="block text-neutral-500">
                          Prazo{" "}
                          {formatDateTimePtBR(item.prazoFinal, {
                            dateStyle: "short",
                          })}
                        </span>
                      </td>
                      <td className="py-2">
                        {formatDateTimePtBR(item.concluidaEm, { dateStyle: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))
        )}

        <p className="no-print text-xs text-neutral-500">
          No diálogo de impressão, escolha a impressora ou “Salvar como PDF”.{" "}
          <Link href={caminhos.todas} className="underline">
            Voltar para todas as demandas
          </Link>
        </p>
      </article>
    </div>
  );
}
