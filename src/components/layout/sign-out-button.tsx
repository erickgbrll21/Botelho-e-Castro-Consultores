"use client";

import { useTransition } from "react";

export function SignOutButton({ signOut }: { signOut: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => signOut())}
      disabled={isPending}
      className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:border-neutral-700 disabled:opacity-60"
    >
      {isPending ? "Saindo..." : "Sair"}
    </button>
  );
}
