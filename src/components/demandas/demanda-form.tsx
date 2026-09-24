"use client";

import { useEffect, useState } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { SubmitButton } from "@/components/ui/submit-button";
import { UsuarioPicker } from "@/components/demandas/usuario-picker";
import { DemandaCnpjField } from "@/components/demandas/demanda-cnpj-field";
import { paraDatetimeLocal } from "@/lib/demandas";
import type { TipoServicoRow, UsuarioAtribuivel } from "@/lib/demandas-queries";
import type { DemandaStatus } from "@/types/database";
import type { DemandaSetor } from "@/lib/demanda-setor";

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
  cnpj?: string | null;
  parte_contraria?: string | null;
  numero_processo?: string | null;
  tratado?: boolean | null;
  email_respondido?: boolean | null;
  empresa_nome?: string | null;
  empresa_fantasia?: string | null;
  empresa_situacao?: string | null;
  empresa_cidade?: string | null;
  empresa_uf?: string | null;
  status?: DemandaStatus;
};

type CamposProps = {
  tipos: TipoServicoRow[];
  usuarios: UsuarioAtribuivel[];
  valores?: DemandaFormValores;
  setor: DemandaSetor;
  /** Somente na edição: permite o gestor corrigir o status. */
  mostrarStatus?: boolean;
};

function CamposDemanda({
  tipos,
  usuarios,
  valores,
  setor,
  mostrarStatus = false,
}: CamposProps) {
  const tiposDisponiveis = tipos.filter(
    (tipo) => tipo.ativo || tipo.id === valores?.tipo_servico_id
  );
  const [titulo, setTitulo] = useState(valores?.titulo ?? "");
  const [tituloManual, setTituloManual] = useState(Boolean(valores?.titulo));
  const civel = setor === "civel";

  if (civel) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="setor" value={setor} />
        <DemandaCnpjField
          defaultCnpj={valores?.cnpj}
          defaultEmpresaNome={valores?.empresa_nome}
          defaultEmpresaFantasia={valores?.empresa_fantasia}
          defaultEmpresaSituacao={valores?.empresa_situacao}
          defaultEmpresaCidade={valores?.empresa_cidade}
          defaultEmpresaUf={valores?.empresa_uf}
        />

        <div className="space-y-2 md:col-span-2">
          <label className={ROTULO} htmlFor="demanda-parte">
            Parte contrária
          </label>
          <input
            id="demanda-parte"
            name="parte_contraria"
            maxLength={220}
            defaultValue={valores?.parte_contraria ?? ""}
            className={CAMPO}
          />
        </div>

        <div className="space-y-2">
          <label className={ROTULO} htmlFor="demanda-processo">
            Nº do processo
          </label>
          <input
            id="demanda-processo"
            name="numero_processo"
            maxLength={60}
            defaultValue={valores?.numero_processo ?? ""}
            className={CAMPO}
          />
        </div>

        <div className="space-y-2">
          <label className={ROTULO} htmlFor="demanda-tarefa">
            Tarefa<span className="text-red-400"> *</span>
          </label>
          <input
            id="demanda-tarefa"
            name="titulo"
            required
            maxLength={180}
            defaultValue={valores?.titulo ?? ""}
            className={CAMPO}
          />
        </div>

        <CaixasSimNao
          name="tratado"
          rotulo="Tratado"
          valorInicial={
            valores?.tratado === undefined || valores?.tratado === null
              ? null
              : Boolean(valores.tratado)
          }
        />

        <CaixasSimNao
          name="email_respondido"
          rotulo="E-mail respondido"
          valorInicial={
            valores?.email_respondido === undefined ||
            valores?.email_respondido === null
              ? null
              : Boolean(valores.email_respondido)
          }
        />

        <div className="space-y-2 md:col-span-2">
          <label className={ROTULO} htmlFor="demanda-observacoes-civel">
            Observação
          </label>
          <textarea
            id="demanda-observacoes-civel"
            name="observacoes"
            rows={3}
            maxLength={4000}
            defaultValue={valores?.observacoes ?? ""}
            className={CAMPO}
          />
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
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="setor" value={setor} />
      <DemandaCnpjField
        defaultCnpj={valores?.cnpj}
        defaultEmpresaNome={valores?.empresa_nome}
        defaultEmpresaFantasia={valores?.empresa_fantasia}
        defaultEmpresaSituacao={valores?.empresa_situacao}
        defaultEmpresaCidade={valores?.empresa_cidade}
        defaultEmpresaUf={valores?.empresa_uf}
        onEmpresaCarregada={(nome) => {
          if (!tituloManual && !titulo.trim()) {
            setTitulo(nome.slice(0, 180));
          }
        }}
      />

      <div className="space-y-2 md:col-span-2">
        <label className={ROTULO} htmlFor="demanda-titulo">
          Título da demanda<span className="text-red-400"> *</span>
        </label>
        <input
          id="demanda-titulo"
          name="titulo"
          required
          maxLength={180}
          value={titulo}
          onChange={(event) => {
            setTituloManual(true);
            setTitulo(event.target.value);
          }}
          placeholder="Ex.: Realizar Alteração Contratual"
          className={CAMPO}
        />
        <p className="text-xs text-neutral-500">
          Se estiver vazio, a razão social do CNPJ pode preencher o título.
        </p>
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

function CaixasSimNao({
  name,
  rotulo,
  valorInicial,
}: {
  name: string;
  rotulo: string;
  valorInicial: boolean | null;
}) {
  const [valor, setValor] = useState<boolean | null>(valorInicial);

  return (
    <fieldset className="space-y-2">
      <legend className={ROTULO}>{rotulo}</legend>
      <input
        type="hidden"
        name={name}
        value={valor === null ? "" : valor ? "1" : "0"}
      />
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-neutral-200">
          <input
            type="checkbox"
            checked={valor === true}
            onChange={() => setValor(valor === true ? null : true)}
            className="h-4 w-4 rounded border-neutral-700 bg-neutral-900"
          />
          Sim
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-200">
          <input
            type="checkbox"
            checked={valor === false}
            onChange={() => setValor(valor === false ? null : false)}
            className="h-4 w-4 rounded border-neutral-700 bg-neutral-900"
          />
          Não
        </label>
      </div>
    </fieldset>
  );
}

/** Botão + modal "Nova Demanda" (gestor). */
export function NovaDemandaButton({
  tipos,
  usuarios,
  setor,
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
                  {setor === "civel" ? "Demanda Cível" : "Nova demanda"}
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
              <CamposDemanda tipos={tipos} usuarios={usuarios} setor={setor} />
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
  setor,
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
        setor={setor}
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
