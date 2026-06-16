"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sincronizarEnderecosClientesPelaReceita,
  type SincronizarEnderecosResultado,
} from "@/lib/sincronizar-enderecos-clientes";

type Props = {
  pendentes?: number;
};

export function SincronizarEnderecosButton({ pendentes = 0 }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ultimo, setUltimo] = useState<SincronizarEnderecosResultado | null>(
    null
  );
  const [erro, setErro] = useState<string | null>(null);

  function executar() {
    const avisoPendentes =
      pendentes > 0
        ? `${pendentes} empresa(s) com endereço incompleto serão consultadas. `
        : "";

    if (
      !window.confirm(
        `${avisoPendentes}Preencher endereços pela consulta de CNPJ (BrasilAPI / Receitaws / cnpj.ws)? ` +
          "Somente clientes sem endereço completo serão atualizados. " +
          "Apenas os campos de endereço (CEP, logradouro, bairro, cidade e UF) serão gravados. " +
          "O processo pode levar vários minutos por causa dos limites das APIs."
      )
    ) {
      return;
    }

    setErro(null);
    setUltimo(null);
    startTransition(async () => {
      try {
        const r = await sincronizarEnderecosClientesPelaReceita();
        setUltimo(r);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha na sincronização.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={executar}
        disabled={pending}
        className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
      >
        {pending
          ? "Consultando CNPJs e preenchendo endereços…"
          : "Preencher endereços pela Receita (CNPJ)"}
      </button>
      {pendentes > 0 && !ultimo && !pending ? (
        <p className="text-xs text-amber-200/90">
          {pendentes} cliente(s) com endereço incompleto no cadastro.
        </p>
      ) : null}
      {erro ? <p className="text-xs text-red-400">{erro}</p> : null}
      {ultimo ? (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 p-3 text-xs text-neutral-300">
          <p>
            {ultimo.pendentes} pendente(s):{" "}
            <strong className="text-emerald-400">{ultimo.ok}</strong> atualizado(s),{" "}
            <strong className="text-red-400">{ultimo.falha}</strong> falha(s).{" "}
            {ultimo.ignorados} já tinham endereço completo.
          </p>
          {ultimo.detalhes.length > 0 ? (
            <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-4 text-neutral-500">
              {ultimo.detalhes.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
