"use client";

import { useCallback, useRef, useState } from "react";
import { onlyDigits } from "@/lib/brasilapi-cnpj";
import { formatCepDisplay } from "@/lib/cliente-endereco";
import { applyViaCepToForm } from "@/lib/viacep-form";
import type { ViaCepNormalized } from "@/lib/viacep";

type Props = {
  formId: string;
  initialCep?: string | null;
};

const inputClassName =
  "w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none";

export function CepEnderecoLookup({ formId, initialCep }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ok" | "notfound" | "error"
  >("idle");

  const debounceRef = useRef<number | null>(null);

  const runLookup = useCallback(
    async (digits8: string) => {
      const form = document.getElementById(formId) as HTMLFormElement | null;
      if (!form || digits8.length !== 8) return;

      setStatus("loading");
      try {
        const res = await fetch(
          `/api/cep/viacep?cep=${encodeURIComponent(digits8)}`
        );
        if (res.status === 404) {
          setStatus("notfound");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          return;
        }

        const data = (await res.json()) as ViaCepNormalized;
        applyViaCepToForm(form, data);
        if (inputRef.current) {
          inputRef.current.value = formatCepDisplay(data.cep);
        }
        setStatus("ok");
      } catch {
        setStatus("error");
      }
    },
    [formId]
  );

  const onCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = onlyDigits(e.target.value).slice(0, 8);
    e.target.value = formatCepDisplay(d);
    if (d.length === 8) {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        void runLookup(d);
      }, 400);
    } else {
      setStatus("idle");
    }
  };

  const onCepBlur = () => {
    const d = onlyDigits(inputRef.current?.value ?? "");
    if (d.length === 8) void runLookup(d);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm text-neutral-300" htmlFor={`cep-${formId}`}>
        CEP
      </label>
      <input
        ref={inputRef}
        id={`cep-${formId}`}
        name="cep"
        type="text"
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder="00000-000"
        maxLength={9}
        defaultValue={initialCep ? formatCepDisplay(initialCep) : ""}
        onChange={onCepChange}
        onBlur={onCepBlur}
        className={inputClassName}
      />
      {status === "loading" ? (
        <p className="text-xs text-neutral-400">Consultando CEP…</p>
      ) : null}
      {status === "ok" ? (
        <p className="text-xs text-emerald-400/90">
          Endereço preenchido. Revise logradouro, número e demais campos.
        </p>
      ) : null}
      {status === "notfound" ? (
        <p className="text-xs text-amber-400/90">CEP não encontrado.</p>
      ) : null}
      {status === "error" ? (
        <p className="text-xs text-red-400/90">
          Falha na consulta. Tente novamente ou preencha manualmente.
        </p>
      ) : null}
    </div>
  );
}
