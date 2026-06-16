"use client";

import { useState } from "react";

type Props = {
  className?: string;
};

export function ExportClientesButton({ className = "" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/clientes/export", { method: "GET" });
      if (!res.ok) {
        let msg = "Não foi possível exportar a planilha.";
        try {
          const body = await res.json();
          if (body?.error) msg = String(body.error);
        } catch {
          /* resposta não JSON */
        }
        setError(msg);
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/i);
      const filename = match?.[1] ?? "clientes.xlsx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Falha de rede ao exportar. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className="w-full shrink-0 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-60 sm:w-auto"
      >
        {loading ? "Gerando planilha..." : "Exportar planilha de clientes"}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
