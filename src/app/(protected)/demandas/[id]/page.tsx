import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import {
  ArrowLeftIcon,
  ClockIcon,
  PencilSquareIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isGestorDemandas, requireDemandasProfile } from "@/lib/demandas-access";
import { formatDateTimePtBR } from "@/lib/format-date";
import { formatCnpjDisplay } from "@/lib/brasilapi-cnpj";
import {
  fetchDemandaPorId,
  fetchHistoricoDemanda,
  fetchTiposServico,
  fetchUsuariosAtribuiveis,
} from "@/lib/demandas-queries";
import { PrazoDestaque, StatusBadge } from "@/components/demandas/demanda-badges";
import { PastaAcoes } from "@/components/demandas/demandas-tabela";
import {
  AlterarResponsavelForm,
  ConfirmarConclusaoButton,
  ConcluirDemandaButton,
  ExcluirDemandaButton,
  ObservacoesForm,
  ProtocoloForm,
  ReabrirDemandaButton,
  StatusRapidoForm,
} from "@/components/demandas/demanda-acoes";
import { EditarDemandaForm } from "@/components/demandas/demanda-form";
import {
  AvisoSucesso,
  ErroCarregamento,
  ModuloNaoInstalado,
} from "@/components/demandas/demandas-avisos";
import {
  alterarResponsavel,
  atualizarDemanda,
  atualizarObservacoes,
  atualizarProtocolo,
  atualizarStatus,
  concluirDemanda,
  confirmarConclusaoDemanda,
  excluirDemanda,
  reabrirDemanda,
} from "../actions";

function Campo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">
        {rotulo}
      </p>
      <div className="mt-1 text-sm text-neutral-200">{children}</div>
    </div>
  );
}

export default async function DemandaDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    criada?: string;
    salvo?: string;
    responsavel?: string;
  }>;
}) {
  const profile = await requireDemandasProfile();
  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  const flags = await searchParams;

  const { demanda, erro, moduloAusente } = await fetchDemandaPorId(supabase, id);

  if (moduloAusente) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Controle de Demandas</h1>
        <ModuloNaoInstalado />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Controle de Demandas</h1>
        <ErroCarregamento mensagem={erro} />
      </div>
    );
  }

  if (!demanda) {
    notFound();
  }

  const gestor = isGestorDemandas(profile.tipo_usuario);
  const souResponsavel = demanda.responsavel_id === profile.id;
  const podeExecutar = gestor || souResponsavel;

  const [historico, tiposServico, usuarios] = await Promise.all([
    fetchHistoricoDemanda(supabase, demanda.id),
    gestor
      ? fetchTiposServico(supabase)
      : Promise.resolve({ tipos: [], erro: null, moduloAusente: false }),
    gestor ? fetchUsuariosAtribuiveis(supabase) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <Link
            href={gestor ? "/demandas/todas" : "/demandas/minhas"}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 transition hover:text-neutral-100"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
            Voltar para {gestor ? "todas as demandas" : "minhas demandas"}
          </Link>
          <h1 className="text-2xl font-semibold md:text-3xl">
            {demanda.titulo}
          </h1>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <StatusBadge status={demanda.status} atrasada={demanda.atrasada} />
            <Pill
              label={demanda.tipo_servico_nome ?? "Sem tipo de serviço"}
              tone="neutral"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {souResponsavel &&
          demanda.status !== "concluida" &&
          demanda.status !== "aguardando_confirmacao" ? (
            <ConcluirDemandaButton
              demandaId={demanda.id}
              action={concluirDemanda}
            />
          ) : null}
          {gestor && demanda.status === "aguardando_confirmacao" ? (
            <ConfirmarConclusaoButton
              demandaId={demanda.id}
              action={confirmarConclusaoDemanda}
            />
          ) : null}
          {gestor &&
          (demanda.status === "concluida" ||
            demanda.status === "aguardando_confirmacao") ? (
            <ReabrirDemandaButton
              demandaId={demanda.id}
              action={reabrirDemanda}
            />
          ) : null}
          {gestor ? (
            <ExcluirDemandaButton
              demandaId={demanda.id}
              titulo={demanda.titulo}
              action={excluirDemanda}
            />
          ) : null}
        </div>
      </div>

      {flags.criada === "1" ? (
        <AvisoSucesso mensagem="Demanda criada e atribuída com sucesso." />
      ) : null}
      {flags.salvo === "1" ? (
        <AvisoSucesso mensagem="Alterações salvas com sucesso." />
      ) : null}
      {flags.responsavel === "1" ? (
        <AvisoSucesso mensagem="Responsável alterado com sucesso." />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Dados da demanda">
            <div className="grid gap-4 sm:grid-cols-2">
              {demanda.cnpj ? (
                <>
                  <Campo rotulo="CNPJ">
                    <span className="font-mono tabular-nums">
                      {formatCnpjDisplay(demanda.cnpj)}
                    </span>
                  </Campo>
                  <Campo rotulo="Empresa">
                    <div>
                      <p>{demanda.empresa_nome?.trim() || "—"}</p>
                      {demanda.empresa_fantasia?.trim() ? (
                        <p className="mt-0.5 text-xs text-neutral-500">
                          Fantasia: {demanda.empresa_fantasia}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-neutral-500">
                        {[
                          demanda.empresa_situacao,
                          [demanda.empresa_cidade, demanda.empresa_uf]
                            .filter(Boolean)
                            .join(" / "),
                        ]
                          .filter(Boolean)
                          .join(" · ") || null}
                      </p>
                    </div>
                  </Campo>
                </>
              ) : null}
              <Campo rotulo="Tipo de serviço">
                {demanda.tipo_servico_nome ?? "—"}
              </Campo>
              <Campo rotulo="Responsável">
                <span className="flex items-center gap-1.5">
                  <UserCircleIcon
                    className="h-4 w-4 text-neutral-500"
                    aria-hidden
                  />
                  {demanda.responsavel_nome ?? "Sem responsável"}
                </span>
              </Campo>
              <Campo rotulo="Criada por">
                {demanda.criado_por_nome ?? "—"}
              </Campo>
              <Campo rotulo="Criada em">
                {formatDateTimePtBR(demanda.created_at, {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </Campo>
              <Campo rotulo="Prazo final">
                <PrazoDestaque
                  prazoFinal={demanda.prazo_final}
                  status={demanda.status}
                  compacto
                />
              </Campo>
              {demanda.status === "concluida" ? (
                <>
                  <Campo rotulo="Confirmada em">
                    {formatDateTimePtBR(demanda.concluida_em, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </Campo>
                  <Campo rotulo="Confirmada por">
                    {demanda.concluida_por_nome ?? "—"}
                  </Campo>
                </>
              ) : null}
            </div>

            <div className="mt-5 space-y-4 border-t border-neutral-800/70 pt-4">
              <Campo rotulo="Descrição">
                <p className="whitespace-pre-wrap text-sm text-neutral-200">
                  {demanda.descricao?.trim() || "Sem descrição."}
                </p>
              </Campo>

              <Campo rotulo="Pasta na rede">
                <PastaAcoes url={null} caminho={demanda.caminho_pasta} />
                {demanda.caminho_pasta?.trim() ? (
                  <p className="mt-2 break-all font-mono text-xs text-neutral-500">
                    {demanda.caminho_pasta}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-neutral-500">—</p>
                )}
              </Campo>
            </div>
          </Card>

          {podeExecutar ? (
            <Card title="Andamento">
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-neutral-500">
                    Status
                  </p>
                  <StatusRapidoForm
                    demandaId={demanda.id}
                    status={demanda.status}
                    action={atualizarStatus}
                    gestor={gestor}
                  />
                  {demanda.status === "aguardando_confirmacao" && !gestor ? (
                    <p className="mt-2 text-xs text-sky-200/90">
                      Você confirmou a conclusão. Aguardando a confirmação final
                      do gestor.
                    </p>
                  ) : null}
                </div>

                {souResponsavel ? (
                  <div className="border-t border-neutral-800/70 pt-4">
                    <ProtocoloForm
                      demandaId={demanda.id}
                      protocolo={demanda.protocolo}
                      action={atualizarProtocolo}
                    />
                  </div>
                ) : null}

                <div className="border-t border-neutral-800/70 pt-4">
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-neutral-500">
                    Observações
                  </p>
                  <ObservacoesForm
                    demandaId={demanda.id}
                    observacoes={demanda.observacoes}
                    action={atualizarObservacoes}
                  />
                </div>
              </div>
            </Card>
          ) : (
            <Card title="Observações">
              <p className="whitespace-pre-wrap text-sm text-neutral-200">
                {demanda.observacoes?.trim() || "Sem observações."}
              </p>
            </Card>
          )}

          {gestor ? (
            <Card title="Edição da demanda">
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300 transition hover:text-white">
                  <PencilSquareIcon className="h-4 w-4" aria-hidden />
                  Editar todos os campos
                </summary>
                <div className="mt-4">
                  <EditarDemandaForm
                    tipos={tiposServico.tipos}
                    usuarios={usuarios}
                    valores={{
                      id: demanda.id,
                      titulo: demanda.titulo,
                      descricao: demanda.descricao,
                      tipo_servico_id: demanda.tipo_servico_id,
                      responsavel_id: demanda.responsavel_id,
                      prazo_final: demanda.prazo_final,
                      caminho_pasta: demanda.caminho_pasta,
                      observacoes: demanda.observacoes,
                      cnpj: demanda.cnpj,
                      empresa_nome: demanda.empresa_nome,
                      empresa_fantasia: demanda.empresa_fantasia,
                      empresa_situacao: demanda.empresa_situacao,
                      empresa_cidade: demanda.empresa_cidade,
                      empresa_uf: demanda.empresa_uf,
                      status: demanda.status,
                    }}
                    action={atualizarDemanda}
                  />
                </div>
              </details>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          {gestor ? (
            <Card title="Responsável">
              <AlterarResponsavelForm
                demandaId={demanda.id}
                responsavelId={demanda.responsavel_id}
                usuarios={usuarios}
                action={alterarResponsavel}
              />
            </Card>
          ) : null}

          <Card
            title="Histórico"
            action={<ClockIcon className="h-4 w-4 text-neutral-500" />}
          >
            {historico.length === 0 ? (
              <p className="py-4 text-sm text-neutral-500">
                Nenhuma alteração registrada ainda.
              </p>
            ) : (
              <ol className="space-y-4">
                {historico.map((item) => (
                  <li
                    key={item.id}
                    className="border-l border-neutral-800 pl-3 text-sm"
                  >
                    <p className="text-[11px] text-neutral-500">
                      {formatDateTimePtBR(item.created_at, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                    <p className="mt-0.5 text-neutral-200">
                      <span className="font-semibold">
                        {item.usuario_nome ?? "Usuário removido"}
                      </span>{" "}
                      — {item.acao}
                      {item.campo_alterado ? ` (${item.campo_alterado})` : ""}
                    </p>
                    {item.valor_anterior || item.valor_novo ? (
                      <p className="mt-1 break-words text-xs text-neutral-500">
                        {item.valor_anterior ? (
                          <>
                            de{" "}
                            <span className="text-neutral-400">
                              “{item.valor_anterior}”
                            </span>{" "}
                          </>
                        ) : null}
                        {item.valor_novo ? (
                          <>
                            para{" "}
                            <span className="text-neutral-300">
                              “{item.valor_novo}”
                            </span>
                          </>
                        ) : null}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
