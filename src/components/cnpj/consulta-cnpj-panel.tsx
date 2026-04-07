"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  brasilApiLogradouroLinha,
  brasilApiRegimeAtualTexto,
  brasilApiTelefonePreferido,
  brasilApiTipoUnidadeTexto,
  formatCnpjDisplay,
  onlyDigits,
  type BrasilApiCnpjJson,
} from "@/lib/brasilapi-cnpj";
import { extractInscricoesFromCnpjWsPayload } from "@/lib/cnpj-ws-inscricoes";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";

function formatCep(cep: string | undefined) {
  const d = onlyDigits(cep ?? "").slice(0, 8);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : cep ?? "—";
}

function formatCapital(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function ieImFromBrasilApi(data: BrasilApiCnpjJson): {
  ie: string | null;
  im: string | null;
} {
  const ext = data as Record<string, unknown>;
  const str = (k: string) => {
    const v = ext[k];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const ie =
    data.inscricao_estadual?.trim() ||
    str("inscricao_estadual") ||
    str("inscrição_estadual") ||
    str("numero_inscricao_estadual") ||
    str("ie");
  const im =
    data.inscricao_municipal?.trim() ||
    str("inscricao_municipal") ||
    str("inscrição_municipal") ||
    str("numero_inscricao_municipal") ||
    str("im");
  return { ie: ie || null, im: im || null };
}

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
  const [data, setData] = useState<BrasilApiCnpjJson | null>(null);
  const [ie, setIe] = useState<string | null>(null);
  const [im, setIm] = useState<string | null>(null);

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
      const res = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${digits14}`
      );
      if (res.status === 404) {
        setStatus("notfound");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }

      const json: BrasilApiCnpjJson = await res.json();
      const { ie: ieB, im: imB } = ieImFromBrasilApi(json);
      let nextIe = ieB;
      let nextIm = imB;

      try {
        const wr = await fetch(
          `/api/cnpj/ws?cnpj=${encodeURIComponent(digits14)}`
        );
        if (wr.ok) {
          const payload: unknown = await wr.json();
          const { inscricao_estadual, inscricao_municipal } =
            extractInscricoesFromCnpjWsPayload(
              payload,
              (json.uf ?? "").slice(0, 2)
            );
          if (!nextIe && inscricao_estadual) nextIe = inscricao_estadual;
          if (!nextIm && inscricao_municipal) nextIm = inscricao_municipal;
        }
      } catch {
        /* complemento opcional */
      }

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
      void runConsulta(d);
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

  const tipoUnidade = data ? brasilApiTipoUnidadeTexto(data) : "";
  const logradouro = data ? brasilApiLogradouroLinha(data) : "";
  const telefone = data ? brasilApiTelefonePreferido(data) : "";
  const regime = data ? brasilApiRegimeAtualTexto(data) : "";

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
            {(data.descricao_situacao_cadastral?.trim() || "").length > 0 ? (
              <Pill
                label={String(data.descricao_situacao_cadastral).trim()}
                tone="neutral"
              />
            ) : null}
            {tipoUnidade === "Matriz" || tipoUnidade === "Filial" ? (
              <Pill label={tipoUnidade} tone="success" />
            ) : null}
          </div>

          <Card title="Identificação">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Razão social
                </dt>
                <dd className="font-semibold text-neutral-100 break-words">
                  {data.razao_social ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Nome fantasia
                </dt>
                <dd className="text-neutral-200 break-words">
                  {(data.nome_fantasia ?? "").trim() || "—"}
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
                  Início de atividades
                </dt>
                <dd className="text-neutral-200">
                  {data.data_inicio_atividade ?? "—"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Atividade e porte">
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                  CNAE fiscal
                </p>
                <p className="text-neutral-200 break-words">
                  {data.cnae_fiscal_descricao ?? "—"}
                </p>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Capital social
                  </p>
                  <p className="font-medium text-neutral-100">
                    {formatCapital(data.capital_social)}
                  </p>
                </div>
                {regime ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Regime tributário (último informado)
                    </p>
                    <p className="text-neutral-200">{regime}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

          <Card title="Endereço e contato">
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-neutral-500">CEP: </span>
                <span className="text-neutral-200">{formatCep(data.cep)}</span>
              </p>
              {logradouro ? (
                <p className="text-neutral-200 break-words">{logradouro}</p>
              ) : null}
              {(data.bairro || data.complemento) ? (
                <p className="text-neutral-300 break-words">
                  {[data.bairro, data.complemento].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              <p className="font-medium text-neutral-100">
                {[data.municipio, data.uf].filter(Boolean).join(" / ") || "—"}
              </p>
              {telefone ? (
                <p>
                  <span className="text-neutral-500">Telefone: </span>
                  <span className="text-neutral-200">{telefone}</span>
                </p>
              ) : null}
            </div>
          </Card>

          <Card title="Inscrições (quando disponíveis)">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
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
          </Card>

          {data.qsa && data.qsa.length > 0 ? (
            <Card title={`Quadro societário (${data.qsa.length})`}>
              <ul className="divide-y divide-neutral-800">
                {data.qsa.map((s, i) => (
                  <li key={i} className="py-3 text-sm first:pt-0">
                    <p className="font-medium text-neutral-100">
                      {s.nome_socio ?? "—"}
                    </p>
                    {(s.qualificacao_socio || s.cnpj_cpf_do_socio) ? (
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {[s.qualificacao_socio, s.cnpj_cpf_do_socio]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
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
