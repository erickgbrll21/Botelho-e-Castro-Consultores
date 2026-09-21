import Link from "next/link";
import {
  ArrowTopRightOnSquareIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import {
  ConfirmarConclusaoButton,
  ConcluirDemandaButton,
  CopiarCaminhoButton,
  ExcluirDemandaButton,
} from "@/components/demandas/demanda-acoes";
import { PrazoDestaque, StatusBadge } from "@/components/demandas/demanda-badges";
import { formatDateTimePtBR } from "@/lib/format-date";
import { formatCnpjDisplay } from "@/lib/brasilapi-cnpj";
import { urlPastaNavegavel } from "@/lib/demandas";
import type { DemandaRow } from "@/lib/demandas-queries";

type Acao = (formData: FormData) => Promise<void>;

type Props = {
  demandas: DemandaRow[];
  /** Gestor vê responsável e data de criação; funcionário vê protocolo e pasta. */
  gestor: boolean;
  concluirAction: Acao;
  confirmarAction?: Acao;
  excluirAction?: Acao;
};

function AcoesLinha({
  demanda,
  gestor,
  concluirAction,
  confirmarAction,
  excluirAction,
}: {
  demanda: DemandaRow;
  gestor: boolean;
  concluirAction: Acao;
  confirmarAction?: Acao;
  excluirAction?: Acao;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link
        href={`/demandas/${demanda.id}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition hover:bg-neutral-800"
      >
        <EyeIcon className="h-4 w-4" aria-hidden />
        {gestor ? "Visualizar" : "Detalhes"}
      </Link>

      {gestor &&
      confirmarAction &&
      demanda.status === "aguardando_confirmacao" ? (
        <ConfirmarConclusaoButton
          demandaId={demanda.id}
          action={confirmarAction}
        />
      ) : null}

      {!gestor &&
      demanda.status !== "concluida" &&
      demanda.status !== "aguardando_confirmacao" ? (
        <ConcluirDemandaButton
          demandaId={demanda.id}
          action={concluirAction}
        />
      ) : null}

      {gestor && excluirAction ? (
        <ExcluirDemandaButton
          demandaId={demanda.id}
          titulo={demanda.titulo}
          action={excluirAction}
          compacto
        />
      ) : null}
    </div>
  );
}

export function DemandasTabela({
  demandas,
  gestor,
  concluirAction,
  confirmarAction,
  excluirAction,
}: Props) {
  return (
    <>
      {/* Desktop / notebook */}
      <div className="-mx-1 hidden overflow-x-auto px-1 lg:block">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="text-left text-neutral-400">
            <tr className="border-b border-neutral-800/80">
              <th className="py-3 pr-4 font-medium">Demanda</th>
              {gestor ? (
                <th className="py-3 pr-4 font-medium">Responsável</th>
              ) : null}
              <th className="py-3 pr-4 font-medium">Serviço</th>
              <th className="py-3 pr-4 font-medium">Prazo</th>
              {!gestor ? (
                <th className="py-3 pr-4 font-medium">Protocolo</th>
              ) : null}
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 pr-4 font-medium">
                {gestor ? "Criada em" : "Pasta"}
              </th>
              <th className="py-3 pr-0 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {demandas.map((demanda) => {
              const url = urlPastaNavegavel(demanda.url_pasta);
              return (
                <tr
                  key={demanda.id}
                  className="align-top transition-colors hover:bg-neutral-900/30"
                >
                  <td className="max-w-[20rem] py-4 pr-4">
                    <Link
                      href={`/demandas/${demanda.id}`}
                      className="font-semibold text-neutral-50 hover:underline"
                    >
                      {demanda.titulo}
                    </Link>
                    {demanda.empresa_nome || demanda.cnpj ? (
                      <p className="mt-1 text-xs text-neutral-400">
                        {demanda.empresa_nome?.trim() || "Empresa"}
                        {demanda.cnpj ? (
                          <span className="ml-1.5 font-mono tabular-nums text-neutral-500">
                            {formatCnpjDisplay(demanda.cnpj)}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    {demanda.descricao ? (
                      <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                        {demanda.descricao}
                      </p>
                    ) : null}
                  </td>
                  {gestor ? (
                    <td className="py-4 pr-4 text-neutral-300">
                      {demanda.responsavel_nome ?? "Sem responsável"}
                    </td>
                  ) : null}
                  <td className="py-4 pr-4 text-neutral-300">
                    {demanda.tipo_servico_nome ?? "—"}
                  </td>
                  <td className="py-4 pr-4">
                    <PrazoDestaque
                      prazoFinal={demanda.prazo_final}
                      status={demanda.status}
                      compacto
                    />
                  </td>
                  {!gestor ? (
                    <td className="py-4 pr-4 tabular-nums text-neutral-300">
                      {demanda.protocolo?.trim() || "—"}
                    </td>
                  ) : null}
                  <td className="py-4 pr-4">
                    <StatusBadge
                      status={demanda.status}
                      atrasada={demanda.atrasada}
                    />
                  </td>
                  <td className="py-4 pr-4 text-xs text-neutral-400">
                    {gestor ? (
                      formatDateTimePtBR(demanda.created_at, {
                        dateStyle: "short",
                      })
                    ) : (
                      <PastaAcoes
                        url={url}
                        caminho={demanda.caminho_pasta}
                        compacto
                      />
                    )}
                  </td>
                  <td className="py-4 pr-0">
                    <AcoesLinha
                      demanda={demanda}
                      gestor={gestor}
                      concluirAction={concluirAction}
                      confirmarAction={confirmarAction}
                      excluirAction={excluirAction}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tablet / mobile */}
      <ul className="space-y-3 lg:hidden">
        {demandas.map((demanda) => {
          const url = urlPastaNavegavel(demanda.url_pasta);
          return (
            <li
              key={demanda.id}
              className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/demandas/${demanda.id}`}
                    className="block text-sm font-semibold text-neutral-50 hover:underline"
                  >
                    {demanda.titulo}
                  </Link>
                  {demanda.empresa_nome || demanda.cnpj ? (
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {demanda.empresa_nome?.trim() || "Empresa"}
                      {demanda.cnpj ? (
                        <span className="ml-1 font-mono tabular-nums text-neutral-500">
                          {formatCnpjDisplay(demanda.cnpj)}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {demanda.tipo_servico_nome ?? "Sem tipo"}
                    {gestor
                      ? ` · ${demanda.responsavel_nome ?? "Sem responsável"}`
                      : ""}
                  </p>
                </div>
                <StatusBadge
                  status={demanda.status}
                  atrasada={demanda.atrasada}
                />
              </div>

              <div
                className={`mt-3 grid gap-3 border-t border-neutral-800/60 pt-3 ${
                  gestor ? "grid-cols-1" : "grid-cols-2"
                }`}
              >
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Prazo
                  </p>
                  <PrazoDestaque
                    prazoFinal={demanda.prazo_final}
                    status={demanda.status}
                    compacto
                  />
                </div>
                {!gestor ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Protocolo
                    </p>
                    <p className="text-sm tabular-nums text-neutral-200">
                      {demanda.protocolo?.trim() || "—"}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-800/60 pt-3">
                {!gestor ? (
                  <PastaAcoes
                    url={url}
                    caminho={demanda.caminho_pasta}
                    compacto
                  />
                ) : null}
                <AcoesLinha
                  demanda={demanda}
                  gestor={gestor}
                  concluirAction={concluirAction}
                  confirmarAction={confirmarAction}
                  excluirAction={excluirAction}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function PastaAcoes({
  url,
  caminho,
  compacto = false,
}: {
  url: string | null;
  caminho: string | null;
  compacto?: boolean;
}) {
  if (!url && !caminho?.trim()) {
    return <span className="text-xs text-neutral-500">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:bg-neutral-800"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
          Abrir pasta
        </a>
      ) : null}
      {caminho?.trim() ? (
        <CopiarCaminhoButton
          valor={caminho.trim()}
          label={compacto ? "Copiar caminho" : "Copiar caminho da rede"}
        />
      ) : null}
    </div>
  );
}
