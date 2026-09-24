"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useState } from "react";
import {
  HomeIcon,
  BuildingOffice2Icon,
  UsersIcon,
  UserIcon,
  DocumentTextIcon,
  IdentificationIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  ScaleIcon,
  ChartBarIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import ChevronDoubleLeftIcon from "@heroicons/react/24/outline/ChevronDoubleLeftIcon";
import type { UserRole } from "@/types/database";

type SidebarProps = {
  role: UserRole;
  /** Pendências do usuário, separadas por setor. */
  demandasPendentes?: { civel: number; legalizacao: number };
};

type SubLink = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

type NavLink = {
  href: string;
  label: string;
  icon: typeof HomeIcon;
  adminOnly?: boolean;
  /** Rota base do módulo (para submenu e estado ativo). */
  secao?: string;
  badge?: "civel" | "legalizacao";
  filhos?: SubLink[];
};

const links: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  {
    href: "/demandas/civel",
    label: "Demandas Cível",
    icon: ScaleIcon,
    secao: "/demandas/civel",
    badge: "civel",
    filhos: [
      { href: "/demandas/civel", label: "Dashboard", adminOnly: true },
      { href: "/demandas/civel/todas", label: "Todas as Demandas", adminOnly: true },
      { href: "/demandas/civel/minhas", label: "Minhas Demandas" },
      {
        href: "/demandas/civel/tipos-servico",
        label: "Tipos de Serviço",
        adminOnly: true,
      },
    ],
  },
  {
    href: "/demandas/legalizacao",
    label: "Demandas Legalização",
    icon: ClipboardDocumentListIcon,
    secao: "/demandas/legalizacao",
    badge: "legalizacao",
    filhos: [
      { href: "/demandas/legalizacao", label: "Dashboard", adminOnly: true },
      {
        href: "/demandas/legalizacao/todas",
        label: "Todas as Demandas",
        adminOnly: true,
      },
      { href: "/demandas/legalizacao/minhas", label: "Minhas Demandas" },
      {
        href: "/demandas/legalizacao/tipos-servico",
        label: "Tipos de Serviço",
        adminOnly: true,
      },
    ],
  },
  {
    href: "/departamento-juridico",
    label: "Departamento Jurídico",
    icon: ScaleIcon,
  },
  {
    href: "/departamento-contabil",
    label: "Departamento Contábil",
    icon: ChartBarIcon,
  },
  { href: "/clientes", label: "Cadastro", icon: BuildingOffice2Icon },
  { href: "/consulta-cnpj", label: "Consulta CNPJ", icon: IdentificationIcon },
  {
    href: "/consulta-processo",
    label: "Consulta processo",
    icon: ClipboardDocumentCheckIcon,
    adminOnly: true,
  },
  { href: "/usuarios", label: "Usuários", icon: UsersIcon, adminOnly: true },
  { href: "/logs", label: "Logs do Sistema", icon: DocumentTextIcon, adminOnly: true },
  { href: "/perfil", label: "Meu Perfil", icon: UserIcon },
];

const PAPEIS_ELEVADOS = ["admin", "diretor", "financeiro", "controladoria"];

const STORAGE_KEY = "bcc:sidebar-expanded";

export function Sidebar({
  role,
  demandasPendentes = { civel: 0, legalizacao: 0 },
}: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const elevado = PAPEIS_ELEVADOS.includes(role);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v === "1") setExpanded(true);
    } catch {
      // ambiente sem storage — mantém colapsado
    }
  }, []);

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // sem storage — só estado em memória
      }
      return next;
    });
  }

  return (
    <aside
      data-expanded={expanded}
      className={clsx(
        "hidden md:flex flex-col gap-4 rounded-2xl border border-neutral-800/80 bg-neutral-950/60 transition-[width] duration-200 ease-out",
        expanded ? "w-60 p-4 gap-6" : "w-[68px] p-3 items-center"
      )}
    >
      <div
        className={clsx(
          "flex w-full items-center",
          expanded ? "justify-between" : "justify-center"
        )}
      >
        {expanded ? (
          <div className="flex flex-1 flex-col items-start gap-2 min-w-0">
            <img
              src="/logo-bcc.svg"
              alt="Botelho e Castro Consultores"
              width={220}
              height={70}
              className="h-auto w-full max-w-[180px] max-h-16 object-contain"
            />
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
              Painel Interno
            </p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={toggle}
          aria-label={expanded ? "Recolher menu" : "Expandir menu"}
          aria-expanded={expanded}
          title={expanded ? "Recolher menu" : "Expandir menu"}
          className={clsx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-800/80 bg-neutral-900/60 text-neutral-300 transition hover:bg-neutral-800 hover:text-white",
            expanded ? "ml-2" : ""
          )}
        >
          {expanded ? (
            <ChevronDoubleLeftIcon className="h-4 w-4" />
          ) : (
            <Bars3Icon className="h-5 w-5" />
          )}
        </button>
      </div>

      <nav
        className={clsx(
          "flex flex-col gap-1",
          expanded ? "w-full" : "w-full items-center"
        )}
      >
        {links
          .filter((link) => !link.adminOnly || elevado)
          .map((link) => {
            const Icon = link.icon;
            const naSecao = link.secao
              ? pathname === link.secao || pathname.startsWith(`${link.secao}/`)
              : false;
            const isActive = link.secao ? naSecao : pathname === link.href;
            const filhos = (link.filhos ?? []).filter(
              (filho) => !filho.adminOnly || elevado
            );
            // Usuário comum entra direto em "Minhas Demandas".
            const destino =
              link.secao && filhos.length > 0 ? filhos[0].href : link.href;
            const badge = link.badge ? demandasPendentes[link.badge] : 0;

            return (
              <div key={link.href} className={expanded ? "w-full" : undefined}>
                <Link
                  href={destino}
                  title={!expanded ? link.label : undefined}
                  aria-label={link.label}
                  className={clsx(
                    "group relative flex items-center rounded-xl text-sm transition",
                    isActive
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-300 hover:bg-neutral-900 hover:text-white",
                    expanded
                      ? "gap-3 px-3 py-2 w-full"
                      : "h-10 w-10 justify-center"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {expanded ? (
                    <>
                      <span className="truncate">{link.label}</span>
                      {badge > 0 ? (
                        <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-amber-100">
                          {badge}
                        </span>
                      ) : null}
                    </>
                  ) : badge > 0 ? (
                    <span
                      className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold tabular-nums text-black"
                      aria-label={`${badge} demandas pendentes`}
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </Link>

                {expanded && filhos.length > 1 && naSecao ? (
                  <div className="mt-1 ml-4 flex flex-col gap-0.5 border-l border-neutral-800 pl-3">
                    {filhos.map((filho) => (
                      <Link
                        key={filho.href}
                        href={filho.href}
                        className={clsx(
                          "truncate rounded-lg px-2 py-1.5 text-xs transition",
                          pathname === filho.href
                            ? "bg-neutral-900 text-white"
                            : "text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-100"
                        )}
                      >
                        {filho.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
      </nav>

      {expanded ? (
        <div className="mt-auto rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-3 text-xs text-neutral-400">
          Todos os dados são protegidos por RLS no Supabase.
        </div>
      ) : null}
    </aside>
  );
}
