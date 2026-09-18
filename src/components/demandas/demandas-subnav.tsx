import Link from "next/link";
import clsx from "clsx";

export type AbaDemandas = "dashboard" | "todas" | "minhas" | "tipos";

type Item = {
  aba: AbaDemandas;
  href: string;
  label: string;
  somenteGestor?: boolean;
  badge?: number;
};

export function DemandasSubnav({
  atual,
  gestor,
  pendentes = 0,
}: {
  atual: AbaDemandas;
  gestor: boolean;
  pendentes?: number;
}) {
  const itens: Item[] = [
    { aba: "dashboard", href: "/demandas", label: "Dashboard", somenteGestor: true },
    {
      aba: "todas",
      href: "/demandas/todas",
      label: "Todas as demandas",
      somenteGestor: true,
    },
    {
      aba: "minhas",
      href: "/demandas/minhas",
      label: "Minhas demandas",
      badge: pendentes,
    },
    {
      aba: "tipos",
      href: "/demandas/tipos-servico",
      label: "Tipos de serviço",
      somenteGestor: true,
    },
  ];

  const visiveis = itens.filter((item) => gestor || !item.somenteGestor);

  if (visiveis.length <= 1) return null;

  return (
    <nav
      aria-label="Seções do Controle de Demandas"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
    >
      {visiveis.map((item) => {
        const ativo = item.aba === atual;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={clsx(
              "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition sm:text-sm",
              ativo
                ? "border-neutral-700 bg-neutral-800 text-white"
                : "border-neutral-800/80 bg-neutral-900/40 text-neutral-300 hover:bg-neutral-900 hover:text-white"
            )}
          >
            {item.label}
            {item.badge ? (
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-100">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
