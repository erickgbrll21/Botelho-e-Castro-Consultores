"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyCnpjJsonToForm,
  formatCnpjDisplay,
  onlyDigits,
  type BrasilApiCnpjJson,
} from "@/lib/brasilapi-cnpj";
import { fetchAndApplyInscricoesCnpjWs } from "@/lib/cnpj-ws-inscricoes";

type Props = {
  /** id do <form> pai */
  formId: string;
  /** Preenchimento inicial (ex.: edição de cliente) */
  initialCnpj?: string | null;
};

export function CnpjReceitaLookup({ formId, initialCnpj }: Props) {
  const [cnpjDisplay, setCnpjDisplay] = useState(() =>
    initialCnpj ? formatCnpjDisplay(initialCnpj) : ""
  );

  useEffect(() => {
    if (initialCnpj) {
      setCnpjDisplay(formatCnpjDisplay(initialCnpj));
    }
  }, [initialCnpj]);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ok" | "notfound" | "error"
  >("idle");

  const runLookup = useCallback(
    async (digits14: string) => {
      const form = document.getElementById(formId) as HTMLFormElement | null;
      if (!form || digits14.length !== 14) return;

      setStatus("loading");
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
        const data: BrasilApiCnpjJson = await res.json();
        applyCnpjJsonToForm(form, data);
        await fetchAndApplyInscricoesCnpjWs(form, digits14);
        setCnpjDisplay(formatCnpjDisplay(data.cnpj ?? digits14));
        setStatus("ok");
      } catch {
        setStatus("error");
      }
    },
    [formId]
  );

  const onCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = onlyDigits(e.target.value).slice(0, 14);
    setCnpjDisplay(formatCnpjDisplay(d));
    if (d.length === 14) {
      void runLookup(d);
    } else {
      setStatus("idle");
    }
  };

  const onCnpjBlur = () => {
    const d = onlyDigits(cnpjDisplay);
    if (d.length === 14) void runLookup(d);
  };

  return (
    <div className="space-y-2 md:col-span-2">
      <label className="text-sm text-neutral-300" htmlFor={`cnpj-${formId}`}>
        CNPJ *
      </label>
      <input
        id={`cnpj-${formId}`}
        name="cnpj"
        type="text"
        required
        inputMode="numeric"
        autoComplete="off"
        placeholder="00.000.000/0000-00"
        value={cnpjDisplay}
        onChange={onCnpjChange}
        onBlur={onCnpjBlur}
        className="w-full max-w-xs rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-100 focus:outline-none"
      />
      <p className="text-xs text-neutral-500">
        Ao completar o CNPJ, os dados públicos são buscados (BrasilAPI + base
        complementar) e os campos compatíveis são preenchidos, incluindo
        inscrições estadual e municipal quando constarem na consulta.
      </p>
      {status === "loading" ? (
        <p className="text-xs text-neutral-400">Consultando CNPJ…</p>
      ) : null}
      {status === "ok" ? (
        <p className="text-xs text-emerald-500/90">
          Dados carregados. Revise e complete o que faltar (grupo, serviços,
          etc.).
        </p>
      ) : null}
      {status === "notfound" ? (
        <p className="text-xs text-amber-400/90">CNPJ não encontrado na base.</p>
      ) : null}
      {status === "error" ? (
        <p className="text-xs text-red-400/90">
          Falha na consulta. Tente novamente ou preencha manualmente.
        </p>
      ) : null}
    </div>
  );
}
