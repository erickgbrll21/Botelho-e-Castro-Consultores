"use client";

import clsx from "clsx";
import { useFormStatus } from "react-dom";

type Variante = "primario" | "secundario" | "sucesso" | "perigo";

const VARIANTES: Record<Variante, string> = {
  primario:
    "bg-white text-black hover:bg-neutral-200",
  secundario:
    "border border-neutral-800 bg-neutral-900 text-neutral-200 hover:bg-neutral-800",
  sucesso:
    "border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20",
  perigo:
    "border border-red-500/40 bg-red-500/10 text-red-100 hover:bg-red-500/20",
};

/**
 * Botão de submit com estado de carregamento automático (useFormStatus).
 * Precisa estar dentro do <form> que executa a Server Action.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variante = "primario",
  className,
  disabled,
  title,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variante?: Variante;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      title={title}
      disabled={pending || disabled}
      aria-busy={pending}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTES[variante],
        className
      )}
    >
      {pending ? (pendingLabel ?? "Salvando...") : children}
    </button>
  );
}
