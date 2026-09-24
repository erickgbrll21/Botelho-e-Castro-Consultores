"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  HomeIcon,
  BuildingOffice2Icon,
  UsersIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  DocumentTextIcon,
  IdentificationIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  ScaleIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import type { UserRole } from "@/types/database";

import { useTransition } from "react";

type MobileNavProps = {
  role: UserRole;
  signOutAction: () => Promise<void>;
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

export function MobileNav({
  role,
  signOutAction,
  demandasPendentes = { civel: 0, legalizacao: 0 },
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const elevado = PAPEIS_ELEVADOS.includes(role);

  const handleSignOut = () => {
    if (confirm("Deseja realmente sair?")) {
      startTransition(async () => {
        await signOutAction();
      });
    }
  };

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="relative rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-400 transition hover:text-white"
        aria-label="Abrir menu"
      >
        <Bars3Icon className="h-6 w-6" />
        {demandasPendentes.civel + demandasPendentes.legalizacao > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold tabular-nums text-black">
            {demandasPendentes.civel + demandasPendentes.legalizacao > 9
              ? "9+"
              : demandasPendentes.civel + demandasPendentes.legalizacao}
          </span>
        ) : null}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-neutral-950 p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-in duration-200">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col items-start gap-1">
              <img
                src="/logo-bcc.svg"
                alt="Botelho e Castro Consultores"
                width={150}
                height={50}
                className="h-auto w-auto max-h-10 object-contain"
              />
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">Painel Interno</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-400"
              aria-label="Fechar menu"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex flex-col gap-2">
            {links
              .filter((link) => !link.adminOnly || elevado)
              .map((link) => {
                const Icon = link.icon;
                const filhos = (link.filhos ?? []).filter(
                  (filho) => !filho.adminOnly || elevado
                );
                const naSecao = link.secao
                  ? pathname === link.secao ||
                    pathname.startsWith(`${link.secao}/`)
                  : false;
                const isActive = link.secao ? naSecao : pathname === link.href;
                const destino =
                  link.secao && filhos.length > 0 ? filhos[0].href : link.href;
                const badge = link.badge ? demandasPendentes[link.badge] : 0;

                return (
                  <div key={link.href}>
                    <Link
                      href={destino}
                      onClick={() => setIsOpen(false)}
                      className={clsx(
                        "flex items-center gap-4 rounded-xl px-4 py-4 text-lg font-medium transition",
                        isActive
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-300 hover:bg-neutral-900"
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      {link.label}
                      {badge > 0 ? (
                        <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-100">
                          {badge}
                        </span>
                      ) : null}
                    </Link>

                    {filhos.length > 1 ? (
                      <div className="mb-1 ml-8 flex flex-col gap-1 border-l border-neutral-800 pl-4">
                        {filhos.map((filho) => (
                          <Link
                            key={filho.href}
                            href={filho.href}
                            onClick={() => setIsOpen(false)}
                            className={clsx(
                              "rounded-lg px-3 py-2.5 text-sm transition",
                              pathname === filho.href
                                ? "bg-neutral-900 text-white"
                                : "text-neutral-400 hover:bg-neutral-900/60"
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

            <button
              onClick={handleSignOut}
              disabled={isPending}
              className="mt-4 flex items-center gap-4 rounded-xl px-4 py-4 text-lg font-medium text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
            >
              <ArrowRightOnRectangleIcon className="h-6 w-6" />
              {isPending ? "Saindo..." : "Sair do sistema"}
            </button>
          </nav>

          <div className="mt-auto pt-6 text-center text-[10px] text-neutral-600 uppercase tracking-widest">
            Botelho e Castro Consultores
          </div>
        </div>
      )}
    </div>
  );
}
