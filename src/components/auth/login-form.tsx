"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectedFrom") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createSupabaseBrowserClient();
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    startTransition(() => {
      router.replace(redirectTo);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel max-w-md w-full rounded-2xl p-8 space-y-6"
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Acessar painel</h1>
        <p className="text-sm text-neutral-400">
          Use seu e-mail corporativo.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-neutral-300" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:border-neutral-100 focus:outline-none"
          placeholder="nome@bcconsultores.adv.br"
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-neutral-300" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:border-neutral-100 focus:outline-none"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
