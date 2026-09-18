import Link from "next/link";
import clsx from "clsx";

/**
 * Gráficos em CSS puro (sem dependência nova), no mesmo tom do painel.
 */

type Tom = "neutral" | "emerald" | "amber" | "red" | "blue";

const BARRA: Record<Tom, string> = {
  neutral: "bg-neutral-500/70",
  emerald: "bg-emerald-500/70",
  amber: "bg-amber-400/70",
  red: "bg-red-500/60",
  blue: "bg-blue-500/60",
};

export type ItemBarra = {
  chave: string;
  label: string;
  valor: number;
  detalhe?: string;
  href?: string;
  tom?: Tom;
};

export function BarrasHorizontais({
  itens,
  tom = "blue",
  vazio = "Sem dados para os filtros selecionados.",
}: {
  itens: ItemBarra[];
  tom?: Tom;
  vazio?: string;
}) {
  const maximo = Math.max(1, ...itens.map((i) => i.valor));

  if (itens.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-500">{vazio}</p>;
  }

  return (
    <ul className="space-y-3">
      {itens.map((item) => {
        const largura = Math.max(2, Math.round((item.valor / maximo) * 100));
        const conteudo = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm text-neutral-200">
                {item.label}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-100">
                {item.valor}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-800/80">
              <div
                className={clsx("h-full rounded-full", BARRA[item.tom ?? tom])}
                style={{ width: `${largura}%` }}
              />
            </div>
            {item.detalhe ? (
              <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">
                {item.detalhe}
              </p>
            ) : null}
          </>
        );

        return (
          <li key={item.chave}>
            {item.href ? (
              <Link
                href={item.href}
                className="block rounded-lg p-1 transition hover:bg-neutral-900/60"
                title={`Ver demandas de ${item.label}`}
              >
                {conteudo}
              </Link>
            ) : (
              <div className="p-1">{conteudo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export type ItemComparativo = {
  chave: string;
  label: string;
  primeiro: number;
  segundo: number;
};

/** Colunas lado a lado — usado em "recebidas x concluídas" por mês. */
export function BarrasComparativas({
  itens,
  legendaPrimeiro,
  legendaSegundo,
}: {
  itens: ItemComparativo[];
  legendaPrimeiro: string;
  legendaSegundo: string;
}) {
  const maximo = Math.max(
    1,
    ...itens.map((i) => Math.max(i.primeiro, i.segundo))
  );

  if (itens.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-500">
        Sem dados para o período.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-wider text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-blue-500/70" aria-hidden />
          {legendaPrimeiro}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-emerald-500/70" aria-hidden />
          {legendaSegundo}
        </span>
      </div>

      <div className="flex h-40 items-end gap-2 sm:gap-4">
        {itens.map((item) => (
          <div
            key={item.chave}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <div className="flex h-32 w-full items-end justify-center gap-1">
              <div
                className="w-1/2 max-w-[22px] rounded-t bg-blue-500/70"
                style={{
                  height: `${Math.max(2, (item.primeiro / maximo) * 100)}%`,
                }}
                title={`${legendaPrimeiro}: ${item.primeiro}`}
              />
              <div
                className="w-1/2 max-w-[22px] rounded-t bg-emerald-500/70"
                style={{
                  height: `${Math.max(2, (item.segundo / maximo) * 100)}%`,
                }}
                title={`${legendaSegundo}: ${item.segundo}`}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] uppercase tracking-wider text-neutral-500">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
