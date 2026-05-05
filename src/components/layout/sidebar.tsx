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
  Bars3Icon,
} from "@heroicons/react/24/outline";
import ChevronDoubleLeftIcon from "@heroicons/react/24/outline/ChevronDoubleLeftIcon";
import type { UserRole } from "@/types/database";

type SidebarProps = {
  role: UserRole;
};

const links = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/clientes", label: "Clientes", icon: BuildingOffice2Icon },
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

const STORAGE_KEY = "bcc:sidebar-expanded";

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

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
          .filter(
            (link) =>
              !link.adminOnly ||
              ["admin", "diretor", "financeiro"].includes(role)
          )
          .map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                title={!expanded ? link.label : undefined}
                aria-label={link.label}
                className={clsx(
                  "group flex items-center rounded-xl text-sm transition",
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
                  <span className="truncate">{link.label}</span>
                ) : null}
              </Link>
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
