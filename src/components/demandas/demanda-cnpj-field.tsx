"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatCnpjDisplay, onlyDigits } from "@/lib/brasilapi-cnpj";

const CAMPO =
  "w-full min-w-0 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-100 focus:outline-none";
const ROTULO = "text-sm text-neutral-300";

type CnpjNormalized = {
  cnpj: string;
  nome: string;
  fantasia: string;
  situacao: string;
  endereco?: {
    cidade?: string;
    uf?: string;
  };
  error?: string;
};

type Status = "idle" | "loading" | "ok" | "notfound" | "error";

type Props = {
  defaultCnpj?: string | null;
  defaultEmpresaNome?: string | null;
  defaultEmpresaFantasia?: string | null;
  defaultEmpresaSituacao?: string | null;
  defaultEmpresaCidade?: string | null;
  defaultEmpresaUf?: string | null;
  /** Quando o título ainda está vazio, sugere a razão social. */
  onEmpresaCarregada?: (nome: string) => void;
};

/**
 * Campo de CNPJ com consulta automática em /api/cnpj/ws.
 * Não vincula a demanda a clientes — só grava o snapshot na própria demanda.
 */
export function DemandaCnpjField({
  defaultCnpj,
  defaultEmpresaNome,
  defaultEmpresaFantasia,
  defaultEmpresaSituacao,
  defaultEmpresaCidade,
  defaultEmpresaUf,
  onEmpresaCarregada,
}: Props) {
  const digitsIniciais = onlyDigits(defaultCnpj ?? "").slice(0, 14);
  const [cnpjDisplay, setCnpjDisplay] = useState(
    digitsIniciais ? formatCnpjDisplay(digitsIniciais) : ""
  );
  const [cnpjDigits, setCnpjDigits] = useState(digitsIniciais);
  const [empresaNome, setEmpresaNome] = useState(defaultEmpresaNome ?? "");
  const [empresaFantasia, setEmpresaFantasia] = useState(
    defaultEmpresaFantasia ?? ""
  );
  const [empresaSituacao, setEmpresaSituacao] = useState(
    defaultEmpresaSituacao ?? ""
  );
  const [empresaCidade, setEmpresaCidade] = useState(
    defaultEmpresaCidade ?? ""
  );
  const [empresaUf, setEmpresaUf] = useState(defaultEmpresaUf ?? "");
  const [status, setStatus] = useState<Status>(
    digitsIniciais.length === 14 && defaultEmpresaNome ? "ok" : "idle"
  );
  const debounceRef = useRef<number | null>(null);
  const onEmpresaRef = useRef(onEmpresaCarregada);
  useEffect(() => {
    onEmpresaRef.current = onEmpresaCarregada;
  }, [onEmpresaCarregada]);

  const limparEmpresa = useCallback(() => {
    setEmpresaNome("");
    setEmpresaFantasia("");
    setEmpresaSituacao("");
    setEmpresaCidade("");
    setEmpresaUf("");
  }, []);

  const aplicarDados = useCallback((json: CnpjNormalized, digits: string) => {
    const nome = (json.nome ?? "").trim();
    const fantasia = (json.fantasia ?? "").trim();
    const situacao = (json.situacao ?? "").trim();
    const cidade = (json.endereco?.cidade ?? "").trim();
    const uf = (json.endereco?.uf ?? "").trim();

    setCnpjDigits(onlyDigits(json.cnpj || digits).slice(0, 14));
    setCnpjDisplay(formatCnpjDisplay(json.cnpj || digits));
    setEmpresaNome(nome);
    setEmpresaFantasia(fantasia);
    setEmpresaSituacao(situacao);
    setEmpresaCidade(cidade);
    setEmpresaUf(uf);
    setStatus("ok");

    if (nome) {
      onEmpresaRef.current?.(nome);
    }
  }, []);

  const runConsulta = useCallback(
    async (digits14: string) => {
      if (digits14.length !== 14) {
        setStatus("idle");
        limparEmpresa();
        return;
      }

      setStatus("loading");

      try {
        const res = await fetch(
          `/api/cnpj/ws?cnpj=${encodeURIComponent(digits14)}`
        );
        if (res.status === 404) {
          setStatus("notfound");
          limparEmpresa();
          return;
        }
        if (!res.ok) {
          setStatus("error");
          limparEmpresa();
          return;
        }

        const json: CnpjNormalized = await res.json();
        if (typeof json.error === "string" && json.error.trim()) {
          setStatus("error");
          limparEmpresa();
          return;
        }

        aplicarDados(json, digits14);
      } catch {
        setStatus("error");
        limparEmpresa();
      }
    },
    [aplicarDados, limparEmpresa]
  );

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = onlyDigits(e.target.value).slice(0, 14);
    setCnpjDigits(d);
    setCnpjDisplay(formatCnpjDisplay(d));

    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if (d.length === 14) {
      debounceRef.current = window.setTimeout(() => {
        void runConsulta(d);
      }, 450);
    } else {
      setStatus("idle");
      limparEmpresa();
    }
  };

  const onBlur = () => {
    const d = onlyDigits(cnpjDisplay).slice(0, 14);
    if (d.length === 14 && status !== "ok" && status !== "loading") {
      void runConsulta(d);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-3 md:col-span-2">
      <div className="space-y-2">
        <label className={ROTULO} htmlFor="demanda-cnpj">
          CNPJ da empresa
        </label>
        <input
          id="demanda-cnpj"
          inputMode="numeric"
          autoComplete="off"
          value={cnpjDisplay}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="00.000.000/0000-00"
          className={CAMPO}
          aria-describedby="demanda-cnpj-status"
        />
        <input type="hidden" name="cnpj" value={cnpjDigits} />
        <input type="hidden" name="empresa_nome" value={empresaNome} />
        <input type="hidden" name="empresa_fantasia" value={empresaFantasia} />
        <input type="hidden" name="empresa_situacao" value={empresaSituacao} />
        <input type="hidden" name="empresa_cidade" value={empresaCidade} />
        <input type="hidden" name="empresa_uf" value={empresaUf} />

        <p id="demanda-cnpj-status" className="text-xs text-neutral-500">
          {status === "loading"
            ? "Consultando CNPJ..."
            : status === "ok"
              ? "Dados carregados automaticamente."
              : status === "notfound"
                ? "CNPJ não encontrado na base pública."
                : status === "error"
                  ? "Não foi possível consultar o CNPJ. Tente novamente."
                  : "Digite os 14 dígitos para buscar razão social e situação."}
        </p>
      </div>

      {status === "ok" && empresaNome ? (
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-3 text-sm">
          <p className="font-semibold text-neutral-100">{empresaNome}</p>
          {empresaFantasia ? (
            <p className="mt-0.5 text-xs text-neutral-400">
              Fantasia: {empresaFantasia}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
            {empresaSituacao ? <span>Situação: {empresaSituacao}</span> : null}
            {empresaCidade || empresaUf ? (
              <span>
                {[empresaCidade, empresaUf].filter(Boolean).join(" / ")}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
