"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { SubmitButton } from "@/components/ui/submit-button";
import type { DemandaSetor } from "@/lib/demanda-setor";

type Acao = (formData: FormData) => Promise<void>;

const CAMPO =
  "w-full min-w-0 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-100 focus:outline-none";

export function NovoTipoServicoForm({
  action,
  setor,
}: {
  action: Acao;
  setor: DemandaSetor;
}) {
  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="setor" value={setor} />
      <div className="min-w-0 flex-1 space-y-2">
        <label className="text-sm text-neutral-300" htmlFor="novo-tipo-nome">
          Nome do tipo de serviço
        </label>
        <input
          id="novo-tipo-nome"
          name="nome"
          required
          maxLength={120}
          placeholder="Ex.: Baixa de Empresa"
          className={CAMPO}
        />
      </div>
      <SubmitButton pendingLabel="Cadastrando..." className="shrink-0">
        <PlusIcon className="h-4 w-4" aria-hidden />
        Novo tipo de serviço
      </SubmitButton>
    </form>
  );
}

export function RenomearTipoForm({
  tipoId,
  nome,
  setor,
  action,
}: {
  tipoId: string;
  nome: string;
  setor: DemandaSetor;
  action: Acao;
}) {
  return (
    <form action={action} className="flex min-w-0 items-center gap-2">
      <input type="hidden" name="tipo_id" value={tipoId} />
      <input type="hidden" name="setor" value={setor} />
      <label className="sr-only" htmlFor={`tipo-nome-${tipoId}`}>
        Nome do tipo de serviço
      </label>
      <input
        id={`tipo-nome-${tipoId}`}
        name="nome"
        defaultValue={nome}
        required
        maxLength={120}
        className={CAMPO}
      />
      <SubmitButton
        variante="secundario"
        pendingLabel="Salvando..."
        className="shrink-0 px-3 py-2 text-xs"
      >
        Salvar
      </SubmitButton>
    </form>
  );
}

export function AlternarTipoForm({
  tipoId,
  ativo,
  action,
}: {
  tipoId: string;
  ativo: boolean;
  action: Acao;
}) {
  return (
    <form
      action={action}
      className="inline-flex"
      onSubmit={(event) => {
        if (!ativo) return;
        const ok = window.confirm(
          "Desativar este tipo de serviço? Ele deixa de aparecer em novas demandas, mas continua nas demandas já registradas."
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="tipo_id" value={tipoId} />
      <input type="hidden" name="ativar" value={ativo ? "0" : "1"} />
      <SubmitButton
        variante={ativo ? "perigo" : "sucesso"}
        pendingLabel="Atualizando..."
        className="px-3 py-2 text-xs"
      >
        {ativo ? "Desativar" : "Ativar"}
      </SubmitButton>
    </form>
  );
}
