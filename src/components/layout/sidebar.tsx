"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  HomeIcon,
  BuildingOffice2Icon,
  UsersIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import type { UserRole } from "@/types/database";

type SidebarProps = {
  role: UserRole;
};

const links = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/clientes", label: "Clientes", icon: BuildingOffice2Icon },
  { href: "/usuarios", label: "Usuários", icon: UsersIcon, adminOnly: true },
  { href: "/perfil", label: "Meu Perfil", icon: UserIcon },
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 flex-col gap-6 rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-4">
      <div className="flex flex-col items-start gap-2">
        <Image
          src="/logo-bcc.svg"
          alt="Botelho e Castro Consultores"
          width={220}
          height={70}
          className="h-auto w-full max-w-[220px] max-h-20 object-contain"
          priority
        />
        <Image
          src="/design-logo.svg"
          alt="Design Complementar"
          width={220}
          height={70}
          className="h-auto w-full max-w-[220px] object-contain opacity-80"
          priority
        />
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
          Painel Interno
        </p>
      </div>
      <nav className="space-y-1">
        {links
          .filter((link) => !link.adminOnly || ["admin", "diretor", "financeiro"].includes(role))
          .map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-300 hover:bg-neutral-900"
                )}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
      </nav>
      <div className="mt-auto rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-3 text-xs text-neutral-400">
        Somente administradores podem criar usuários e clientes. Todos os dados
        são protegidos por RLS no Supabase.
      </div>
    </aside>
  );
}
