"use client";

import { useTransition } from "react";

type Props = {
  empresaId: string;
  action: (formData: FormData) => Promise<void>;
};

export function DeleteEmpresaButton({ empresaId, action }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(() => action(formData));
      }}
      className="inline"
    >
      <input type="hidden" name="empresa_id" value={empresaId} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
      >
        {isPending ? "Removendo..." : "Remover"}
      </button>
    </form>
  );
}
