"use client";

import { useTransition } from "react";

type Props = {
  userId: string;
  action: (formData: FormData) => Promise<void>;
};

export function HardDeleteUserButton({ userId, action }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(() => action(formData));
      }}
      className="inline"
    >
      <input type="hidden" name="user_id" value={userId} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
        onClick={(e) => {
          if (
            !confirm(
              "Excluir definitivamente? Isso remove a conta e o cadastro. Os logs ficarão sem usuário vinculado."
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        {isPending ? "Excluindo..." : "Excluir"}
      </button>
    </form>
  );
}
