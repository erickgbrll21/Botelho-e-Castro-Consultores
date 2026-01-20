"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
} from "@heroicons/react/24/outline";
import type { UserRole } from "@/types/database";

import { useTransition } from "react";

type MobileNavProps = {
  role: UserRole;
  signOutAction: () => Promise<void>;
};

const links = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/clientes", label: "Clientes", icon: BuildingOffice2Icon },
  { href: "/usuarios", label: "Usuários", icon: UsersIcon, adminOnly: true },
  { href: "/logs", label: "Logs do Sistema", icon: DocumentTextIcon, adminOnly: true },
  { href: "/perfil", label: "Meu Perfil", icon: UserIcon },
];

export function MobileNav({ role, signOutAction }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

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
        className="rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-400 transition hover:text-white"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 p-6 animate-in duration-200">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col items-start gap-1">
              <img
                src="/design-logo.svg"
                alt="Design Complementar"
                width={150}
                height={50}
                className="h-auto w-auto object-contain opacity-80"
              />
              <Image
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
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex flex-col gap-2">
            {links
              .filter((link) => !link.adminOnly || ["admin", "diretor", "financeiro"].includes(role))
              .map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
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
                  </Link>
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
