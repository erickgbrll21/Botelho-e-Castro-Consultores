"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  formatCnpjDisplay,
  onlyDigits,
} from "@/lib/brasilapi-cnpj";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";

function formatCep(cep: string | undefined) {
  const d = onlyDigits(cep ?? "").slice(0, 8);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : cep ?? "—";
}

type CnpjNormalized = {
  cnpj: string;
  nome: string;
  fantasia: string;
  situacao: string;
  abertura: string;
  atividade_principal: string;
  endereco: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  error?: string;
  _meta?: { api?: string; stale?: boolean };
};

type Status = "idle" | "loading" | "ok" | "notfound" | "error";

type ConsultaCnpjPanelProps = {
  /** admin / diretor / financeiro — exibe o botão de ir ao cadastro */
  canCadastrarCliente?: boolean;
};

export function ConsultaCnpjPanel({
  canCadastrarCliente = false,
}: ConsultaCnpjPanelProps) {
  const [cnpjDisplay, setCnpjDisplay] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<CnpjNormalized | null>(null);
  const [ie, setIe] = useState<string | null>(null);
  const [im, setIm] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const runConsulta = useCallback(async (digits14: string) => {
    if (digits14.length !== 14) {
      setStatus("idle");
      setData(null);
      setIe(null);
      setIm(null);
      return;
    }

    setStatus("loading");
    setData(null);
    setIe(null);
    setIm(null);

    try {
      const res = await fetch(`/api/cnpj/ws?cnpj=${encodeURIComponent(digits14)}`);
      if (res.status === 404) {
        setStatus("notfound");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }

      const json: CnpjNormalized = await res.json();
      if (typeof json.error === "string" && json.error.trim()) {
        setStatus("error");
        return;
      }
      const nextIe =
        typeof json.inscricao_estadual === "string" && json.inscricao_estadual.trim()
          ? json.inscricao_estadual.trim()
          : null;
      const nextIm =
        typeof json.inscricao_municipal === "string" && json.inscricao_municipal.trim()
          ? json.inscricao_municipal.trim()
          : null;

      setData(json);
      setIe(nextIe);
      setIm(nextIm);
      setStatus("ok");
      setCnpjDisplay(formatCnpjDisplay(json.cnpj ?? digits14));
    } catch {
      setStatus("error");
    }
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = onlyDigits(e.target.value).slice(0, 14);
    setCnpjDisplay(formatCnpjDisplay(d));
    if (d.length === 14) {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        void runConsulta(d);
      }, 500);
    } else {
      setStatus("idle");
      setData(null);
      setIe(null);
      setIm(null);
    }
  };

  const onBlur = () => {
    const d = onlyDigits(cnpjDisplay);
    if (d.length === 14) void runConsulta(d);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = onlyDigits(cnpjDisplay);
    if (d.length === 14) void runConsulta(d);
  };

  const logradouro = data
    ? [data.endereco.logradouro, data.endereco.numero].filter(Boolean).join(", ")
    : "";

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-2">
          <label
            htmlFor="consulta-cnpj-input"
            className="text-sm text-neutral-300"
          >
            Número do CNPJ
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <input
              id="consulta-cnpj-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="00.000.000/0000-00"
              value={cnpjDisplay}
              onChange={onChange}
              onBlur={onBlur}
              className="w-full min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-100 focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "loading" || onlyDigits(cnpjDisplay).length !== 14}
              className="shrink-0 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "loading" ? "Consultando…" : "Consultar"}
            </button>
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          Dados públicos da Receita Federal via BrasilAPI, com complemento de
          inscrições quando disponível (fonte auxiliar). Não substitui
          certidões oficiais.
        </p>
        {status === "notfound" ? (
          <p className="text-sm text-amber-400/90">CNPJ não encontrado na base.</p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-red-400/90">
            Não foi possível concluir a consulta. Tente de novo em instantes.
          </p>
        ) : null}
      </form>

      {status === "ok" && data ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(data.situacao?.trim() || "").length > 0 ? (
              <Pill
                label={String(data.situacao).trim()}
                tone="neutral"
              />
            ) : null}
            {data._meta?.stale ? <Pill label="Cache" tone="warning" /> : null}
          </div>

          <Card title="Identificação">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Razão social
                </dt>
                <dd className="font-semibold text-neutral-100 break-words">
                  {data.nome?.trim() || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Nome fantasia
                </dt>
                <dd className="text-neutral-200 break-words">
                  {(data.fantasia ?? "").trim() || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                  CNPJ
                </dt>
                <dd className="font-mono text-neutral-200">
                  {formatCnpjDisplay(data.cnpj ?? onlyDigits(cnpjDisplay))}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Abertura
                </dt>
                <dd className="text-neutral-200">
                  {data.abertura?.trim() || "—"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Atividade">
            <p className="text-sm text-neutral-200 break-words">
              {data.atividade_principal?.trim() || "—"}
            </p>
          </Card>

          <Card title="Endereço e inscrições">
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-neutral-500">CEP: </span>
                <span className="text-neutral-200">{formatCep(data.endereco.cep)}</span>
              </p>
              {logradouro ? (
                <p className="text-neutral-200 break-words">{logradouro}</p>
              ) : null}
              {data.endereco.bairro?.trim() ? (
                <p className="text-neutral-300 break-words">{data.endereco.bairro}</p>
              ) : null}
              <p className="font-medium text-neutral-100">
                {[data.endereco.cidade, data.endereco.uf].filter(Boolean).join(" / ") || "—"}
              </p>
              <dl className="grid gap-3 pt-2 sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Inscrição estadual
                  </dt>
                  <dd className="font-mono text-neutral-200">{ie ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Inscrição municipal
                  </dt>
                  <dd className="font-mono text-neutral-200">{im ?? "—"}</dd>
                </div>
              </dl>
            </div>
          </Card>

          {data._meta?.api ? (
            <p className="text-xs text-neutral-500">
              Fonte: {data._meta.api}
              {data._meta.stale ? " (cache)" : ""}
            </p>
          ) : null}

          <div className="space-y-3 border-t border-neutral-800/60 pt-4">
            {canCadastrarCliente ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
                <Link
                  href={`/clientes?novoCnpj=${encodeURIComponent(
                    onlyDigits(cnpjDisplay) || onlyDigits(String(data.cnpj ?? ""))
                  )}#cadastro-novo-cliente`}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-amber-500/90 px-4 py-3 text-center text-sm font-semibold text-neutral-950 transition hover:bg-amber-400 sm:w-auto"
                >
                  Adicionar à lista de clientes
                </Link>
                <p className="text-center text-xs text-neutral-500 sm:max-w-sm sm:text-left">
                  Abre o formulário de cadastro com este CNPJ e preenche os
                  dados pela Receita; complete grupo, responsáveis e serviços
                  antes de salvar.
                </p>
              </div>
            ) : (
              <p className="text-center text-xs text-neutral-500">
                Somente perfis de{" "}
                <span className="text-neutral-400">administrador, diretor ou
                financeiro</span> podem cadastrar clientes.{" "}
                <Link
                  href="/clientes"
                  className="text-amber-200/90 underline hover:text-amber-100"
                >
                  Ver lista de clientes
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
