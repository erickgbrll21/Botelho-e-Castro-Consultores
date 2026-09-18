"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import clsx from "clsx";
import {
  CheckIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { SubmitButton } from "@/components/ui/submit-button";
import { UsuarioPicker } from "@/components/demandas/usuario-picker";
import type { UsuarioAtribuivel } from "@/lib/demandas-queries";
import type { DemandaStatus } from "@/types/database";

type Acao = (formData: FormData) => Promise<void>;

const CAMPO =
  "w-full min-w-0 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-100 focus:outline-none";

function Salvando({ label = "Salvando..." }: { label?: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <span className="text-xs text-neutral-400" role="status">
      {label}
    </span>
  );
}

/** ✓ Marcar como concluída (usuário) — aguarda confirmação do gestor. */
export function ConcluirDemandaButton({
  demandaId,
  action,
  className,
}: {
  demandaId: string;
  action: Acao;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={clsx("inline-flex", className)}
      onSubmit={(event) => {
        const ok = window.confirm(
          "Marcar esta demanda como concluída? Ela ficará aguardando a confirmação final do gestor."
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="demanda_id" value={demandaId} />
      <SubmitButton
        variante="sucesso"
        pendingLabel="Enviando..."
        className="whitespace-nowrap"
      >
        <CheckIcon className="h-4 w-4" aria-hidden />
        Marcar como concluída
      </SubmitButton>
    </form>
  );
}

/** Confirmação final exclusiva do gestor. */
export function ConfirmarConclusaoButton({
  demandaId,
  action,
  className,
}: {
  demandaId: string;
  action: Acao;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={clsx("inline-flex", className)}
      onSubmit={(event) => {
        const ok = window.confirm(
          "Confirmar a conclusão desta demanda? A data e a hora da confirmação serão registradas."
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="demanda_id" value={demandaId} />
      <SubmitButton
        variante="sucesso"
        pendingLabel="Confirmando..."
        className="whitespace-nowrap"
      >
        <CheckIcon className="h-4 w-4" aria-hidden />
        Confirmar conclusão
      </SubmitButton>
    </form>
  );
}

export function ReabrirDemandaButton({
  demandaId,
  action,
}: {
  demandaId: string;
  action: Acao;
}) {
  return (
    <form
      action={action}
      className="inline-flex"
      onSubmit={(event) => {
        const ok = window.confirm(
          "Reabrir esta demanda? Ela voltará para “Em andamento”."
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="demanda_id" value={demandaId} />
      <SubmitButton variante="secundario" pendingLabel="Reabrindo...">
        <ArrowPathIcon className="h-4 w-4" aria-hidden />
        Reabrir demanda
      </SubmitButton>
    </form>
  );
}

export function ExcluirDemandaButton({
  demandaId,
  titulo,
  action,
  compacto = false,
}: {
  demandaId: string;
  titulo: string;
  action: Acao;
  compacto?: boolean;
}) {
  return (
    <form
      action={action}
      className="inline-flex"
      onSubmit={(event) => {
        const ok = window.confirm(
          `Excluir a demanda “${titulo}”? Esta ação não pode ser desfeita e o histórico será removido.`
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="demanda_id" value={demandaId} />
      <SubmitButton
        variante="perigo"
        pendingLabel="Excluindo..."
        className={compacto ? "px-3 py-1.5 text-xs" : undefined}
        title="Excluir demanda"
      >
        <TrashIcon className="h-4 w-4" aria-hidden />
        {compacto ? "" : "Excluir"}
      </SubmitButton>
    </form>
  );
}

/** Troca rápida de status (responsável ou gestor). */
export function StatusRapidoForm({
  demandaId,
  status,
  action,
  gestor = false,
}: {
  demandaId: string;
  status: DemandaStatus;
  action: Acao;
  /** Gestor pode selecionar a confirmação final; usuário comum não. */
  gestor?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="demanda_id" value={demandaId} />
      <label className="sr-only" htmlFor={`status-${demandaId}`}>
        Status da demanda
      </label>
      <select
        id={`status-${demandaId}`}
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="min-w-[12rem] rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
      >
        <option value="pendente">Pendente</option>
        <option value="em_andamento">Em andamento</option>
        <option value="aguardando_confirmacao">Confirmada pelo usuário</option>
        {gestor ? (
          <option value="concluida">Confirmada pelo gestor</option>
        ) : null}
      </select>
      <noscript>
        <button
          type="submit"
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-200"
        >
          Atualizar
        </button>
      </noscript>
      <Salvando label="Atualizando..." />
    </form>
  );
}

/** Nº do protocolo — preenchido pelo responsável a qualquer momento. */
export function ProtocoloForm({
  demandaId,
  protocolo,
  action,
}: {
  demandaId: string;
  protocolo: string | null;
  action: Acao;
}) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="demanda_id" value={demandaId} />
      <div className="min-w-0 flex-1">
        <label
          className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-500"
          htmlFor={`protocolo-${demandaId}`}
        >
          Nº do protocolo
        </label>
        <input
          id={`protocolo-${demandaId}`}
          name="protocolo"
          maxLength={60}
          defaultValue={protocolo ?? ""}
          placeholder="Ex.: 123456"
          className={CAMPO}
        />
      </div>
      <SubmitButton variante="secundario" pendingLabel="Salvando...">
        Salvar
      </SubmitButton>
    </form>
  );
}

export function ObservacoesForm({
  demandaId,
  observacoes,
  action,
}: {
  demandaId: string;
  observacoes: string | null;
  action: Acao;
}) {
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="demanda_id" value={demandaId} />
      <textarea
        name="observacoes"
        rows={4}
        maxLength={4000}
        defaultValue={observacoes ?? ""}
        placeholder="Informações sobre a execução, pendências, retornos do órgão..."
        className={CAMPO}
      />
      <div className="flex items-center justify-end gap-3">
        <Salvando />
        <SubmitButton variante="secundario" pendingLabel="Salvando...">
          Salvar observações
        </SubmitButton>
      </div>
    </form>
  );
}

/** Alteração de responsável (somente gestor). */
export function AlterarResponsavelForm({
  demandaId,
  responsavelId,
  usuarios,
  action,
}: {
  demandaId: string;
  responsavelId: string | null;
  usuarios: UsuarioAtribuivel[];
  action: Acao;
}) {
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="demanda_id" value={demandaId} />
      <UsuarioPicker
        name="responsavel_id"
        usuarios={usuarios}
        defaultValue={responsavelId}
        required
        label="Transferir para"
        id={`responsavel-${demandaId}`}
      />
      <div className="flex items-center justify-end gap-3">
        <Salvando label="Transferindo..." />
        <SubmitButton variante="secundario" pendingLabel="Transferindo...">
          Alterar responsável
        </SubmitButton>
      </div>
    </form>
  );
}

/**
 * Caminho de rede (X:\...) não é URL navegável: a ação útil é copiar o texto
 * para o funcionário colar no Explorer.
 */
export function CopiarCaminhoButton({
  valor,
  label = "Copiar caminho",
  className,
}: {
  valor: string;
  label?: string;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className={clsx(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition",
        copiado
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
          : "border-neutral-800 bg-neutral-900 text-neutral-200 hover:bg-neutral-800",
        className
      )}
    >
      {copiado ? (
        <CheckIcon className="h-4 w-4" aria-hidden />
      ) : (
        <ClipboardDocumentIcon className="h-4 w-4" aria-hidden />
      )}
      {copiado ? "Caminho copiado" : label}
    </button>
  );
}
