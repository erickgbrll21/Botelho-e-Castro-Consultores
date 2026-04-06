"use client";

import { useTransition } from "react";

export function SignOutButton({ signOut }: { signOut: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => signOut())}
      disabled={isPending}
      className="shrink-0 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-200 transition hover:border-neutral-700 disabled:opacity-60 sm:px-3 sm:py-2 sm:text-sm"
    >
      {isPending ? "Saindo..." : "Sair"}
    </button>
  );
}
