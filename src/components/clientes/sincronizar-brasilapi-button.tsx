"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sincronizarTodosClientesBrasilApi,
  type SincronizarBrasilApiResultado,
} from "@/lib/sync-clientes-brasilapi";

export function SincronizarBrasilApiButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ultimo, setUltimo] = useState<SincronizarBrasilApiResultado | null>(
    null
  );
  const [erro, setErro] = useState<string | null>(null);

  function executar() {
    if (
      !window.confirm(
        "Atualizar todos os clientes com dados da Receita Federal? Usamos a BrasilAPI quando ela responde; " +
          "se houver bloqueio (ex.: 403), cada empresa é buscada na API pública cnpj.ws (limite ~3 consultas/minuto — o processo pode levar muito tempo). " +
          "Sobrescreve endereço, razão social, capital social, regime tributário e campos correlatos. Responsáveis internos e serviços contratados não são alterados."
      )
    ) {
      return;
    }
    setErro(null);
    setUltimo(null);
    startTransition(async () => {
      try {
        const r = await sincronizarTodosClientesBrasilApi();
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
        className="rounded-lg border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-400 hover:bg-sky-500/20 disabled:opacity-50"
      >
        {pending
          ? "Sincronizando com BrasilAPI…"
          : "Atualizar todos pela BrasilAPI"}
      </button>
      {erro ? (
        <p className="text-xs text-red-400">{erro}</p>
      ) : null}
      {ultimo ? (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 p-3 text-xs text-neutral-300">
          <p>
            Concluído: <strong className="text-emerald-400">{ultimo.ok}</strong>{" "}
            ok,{" "}
            <strong className="text-red-400">{ultimo.falha}</strong> falhas,{" "}
            {ultimo.total} no total.
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
