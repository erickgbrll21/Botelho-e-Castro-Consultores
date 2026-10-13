"use client";

import type { SituacaoRelatorio } from "@/lib/demandas-relatorio";

export function RelatorioFiltros({
  action,
  mes,
  situacao,
}: {
  action: string;
  mes: string;
  situacao: SituacaoRelatorio;
}) {
  return (
    <form
      className="no-print flex flex-wrap items-end gap-3"
      action={action}
      onChange={(event) => event.currentTarget.requestSubmit()}
    >
      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        Mês
        <input
          type="month"
          name="mes"
          defaultValue={mes}
          className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        Situação
        <select
          name="situacao"
          defaultValue={situacao}
          className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white"
        >
          <option value="todas">Todas</option>
          <option value="finalizadas">Finalizadas</option>
          <option value="em_andamento">Em andamento</option>
          <option value="pendentes">Pendentes</option>
        </select>
      </label>
    </form>
  );
}
