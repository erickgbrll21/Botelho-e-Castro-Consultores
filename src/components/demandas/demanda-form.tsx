"use client";

import { useEffect, useState } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { SubmitButton } from "@/components/ui/submit-button";
import { UsuarioPicker } from "@/components/demandas/usuario-picker";
import { paraDatetimeLocal } from "@/lib/demandas";
import type { TipoServicoRow, UsuarioAtribuivel } from "@/lib/demandas-queries";
import type { DemandaStatus } from "@/types/database";

const CAMPO =
  "w-full min-w-0 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-100 focus:outline-none";
const ROTULO = "text-sm text-neutral-300";

export type DemandaFormValores = {
  id?: string;
  titulo?: string | null;
  descricao?: string | null;
  tipo_servico_id?: string | null;
  responsavel_id?: string | null;
  prazo_final?: string | null;
  caminho_pasta?: string | null;
  observacoes?: string | null;
  status?: DemandaStatus;
};

type CamposProps = {
  tipos: TipoServicoRow[];
  usuarios: UsuarioAtribuivel[];
  valores?: DemandaFormValores;
  /** Somente na edição: permite o gestor corrigir o status. */
  mostrarStatus?: boolean;
};

function CamposDemanda({
  tipos,
  usuarios,
  valores,
  mostrarStatus = false,
}: CamposProps) {
  const tiposDisponiveis = tipos.filter(
    (tipo) => tipo.ativo || tipo.id === valores?.tipo_servico_id
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <label className={ROTULO} htmlFor="demanda-titulo">
          Título da demanda<span className="text-red-400"> *</span>
        </label>
        <input
          id="demanda-titulo"
          name="titulo"
          required
          maxLength={180}
          defaultValue={valores?.titulo ?? ""}
          placeholder="Ex.: Realizar Alteração Contratual"
          className={CAMPO}
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <label className={ROTULO} htmlFor="demanda-descricao">
          Descrição
        </label>
        <textarea
          id="demanda-descricao"
          name="descricao"
          rows={4}
          maxLength={4000}
          defaultValue={valores?.descricao ?? ""}
          placeholder="Explique o que deve ser realizado, documentos necessários, etc."
          className={CAMPO}
        />
      </div>

      <div className="space-y-2">
        <label className={ROTULO} htmlFor="demanda-tipo">
          Tipo de serviço<span className="text-red-400"> *</span>
        </label>
        <select
          id="demanda-tipo"
          name="tipo_servico_id"
          required
          defaultValue={valores?.tipo_servico_id ?? ""}
          className={CAMPO}
        >
          <option value="">Selecione o tipo</option>
          {tiposDisponiveis.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nome}
            </option>
          ))}
        </select>
        {tiposDisponiveis.length === 0 ? (
          <p className="text-xs text-amber-200/90">
            Nenhum tipo de serviço ativo. Cadastre em Demandas → Tipos de serviço.
          </p>
        ) : null}
      </div>

      <UsuarioPicker
        name="responsavel_id"
        usuarios={usuarios}
        defaultValue={valores?.responsavel_id ?? ""}
        required
        id="demanda-responsavel"
      />

      <div className="space-y-2">
        <label className={ROTULO} htmlFor="demanda-prazo">
          Prazo final<span className="text-red-400"> *</span>
        </label>
        <input
          id="demanda-prazo"
          name="prazo_final"
          type="datetime-local"
          required
          defaultValue={paraDatetimeLocal(valores?.prazo_final)}
          className={CAMPO}
        />
        <p className="text-xs text-neutral-500">Horário de Brasília.</p>
      </div>

      {mostrarStatus ? (
        <div className="space-y-2">
          <label className={ROTULO} htmlFor="demanda-status">
            Status
          </label>
          <select
            id="demanda-status"
            name="status"
            defaultValue={valores?.status ?? "pendente"}
            className={CAMPO}
          >
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em andamento</option>
            <option value="aguardando_confirmacao">
              Confirmada pelo usuário
            </option>
            <option value="concluida">Confirmada pelo gestor</option>
          </select>
        </div>
      ) : null}

      <div className="space-y-2 md:col-span-2">
        <label className={ROTULO} htmlFor="demanda-caminho">
          Caminho da pasta na rede
        </label>
        <input
          id="demanda-caminho"
          name="caminho_pasta"
          maxLength={600}
          defaultValue={valores?.caminho_pasta ?? ""}
          placeholder="X:\CONTABILIDADE\DEPARTAMENTO LEGALIZACAO\..."
          className={CAMPO}
        />
        <p className="text-xs text-neutral-500">
          Caminho interno — o funcionário usa “Copiar caminho”.
        </p>
      </div>

      <div className="space-y-2 md:col-span-2">
        <label className={ROTULO} htmlFor="demanda-observacoes">
          Observações
        </label>
        <textarea
          id="demanda-observacoes"
          name="observacoes"
          rows={3}
          maxLength={4000}
          defaultValue={valores?.observacoes ?? ""}
          placeholder="Instruções adicionais, pendências, informações de execução..."
          className={CAMPO}
        />
      </div>
    </div>
  );
}

/** Botão + modal "Nova Demanda" (gestor). */
export function NovaDemandaButton({
  tipos,
  usuarios,
  action,
}: CamposProps & { action: (formData: FormData) => Promise<void> }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
      >
        <PlusIcon className="h-4 w-4" aria-hidden />
        Nova demanda
      </button>

      {aberto ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-3 py-6 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-nova-demanda"
          onClick={(event) => {
            if (event.target === event.currentTarget) setAberto(false);
          }}
        >
          <div className="glass-panel animate-in w-full max-w-3xl rounded-2xl p-4 md:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                  Controle de Demandas
                </p>
                <h2
                  id="titulo-nova-demanda"
                  className="text-lg font-semibold md:text-xl"
                >
                  Nova demanda
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-400 transition hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form action={action} className="space-y-5">
              <CamposDemanda tipos={tipos} usuarios={usuarios} />
              <div className="flex flex-col-reverse gap-2 border-t border-neutral-800/70 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-neutral-800"
                >
                  Cancelar
                </button>
                <SubmitButton pendingLabel="Criando demanda...">
                  Criar demanda
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Formulário de edição completo (gestor), usado na página de detalhes. */
export function EditarDemandaForm({
  tipos,
  usuarios,
  valores,
  action,
}: CamposProps & {
  valores: DemandaFormValores & { id: string };
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="demanda_id" value={valores.id} />
      <CamposDemanda
        tipos={tipos}
        usuarios={usuarios}
        valores={valores}
        mostrarStatus
      />
      <div className="flex justify-end border-t border-neutral-800/70 pt-4">
        <SubmitButton pendingLabel="Salvando alterações...">
          Salvar alterações
        </SubmitButton>
      </div>
    </form>
  );
}
