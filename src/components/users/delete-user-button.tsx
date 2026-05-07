"use client";

import { useTransition } from "react";

type Props = {
  userId: string;
  action: (formData: FormData) => Promise<void>;
};

export function DeleteUserButton({ userId, action }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(() => action(formData));
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <button
        type="submit"
        className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
        disabled={isPending}
        onClick={(e) => {
          if (!confirm("Desativar usuário? Ele não poderá mais acessar o sistema.")) {
            e.preventDefault();
          }
        }}
      >
        {isPending ? "Desativando..." : "Desativar"}
      </button>
    </form>
  );
}
