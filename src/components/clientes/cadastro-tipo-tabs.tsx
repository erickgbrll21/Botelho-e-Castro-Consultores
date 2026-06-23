"use client";

import Link from "next/link";
import clsx from "clsx";
import type { TipoPessoaCliente } from "@/lib/cliente-tipo-pessoa";

type CadastroTipoTabsProps = {
  tipo: TipoPessoaCliente;
};

export function CadastroTipoTabs({ tipo }: CadastroTipoTabsProps) {
  const base =
    "rounded-lg px-4 py-2 text-sm font-semibold transition border";

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/clientes?tipo=pj#cadastro-novo-cliente"
        className={clsx(
          base,
          tipo === "pj"
            ? "border-white bg-white text-black"
            : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-600 hover:text-white"
        )}
      >
        Pessoa Jurídica
      </Link>
      <Link
        href="/clientes?tipo=pf#cadastro-novo-cliente"
        className={clsx(
          base,
          tipo === "pf"
            ? "border-white bg-white text-black"
            : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-600 hover:text-white"
        )}
      >
        Pessoa Física
      </Link>
    </div>
  );
}
