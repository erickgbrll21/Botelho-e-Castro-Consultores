"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const SUPABASE_NETWORK_HINT =
  "Não foi possível conectar ao Supabase. No .env.local use a URL https://…supabase.co e a chave publishable (sb_publishable_…) ou anon (eyJ…), nunca sb_secret_. Confira em Dashboard → Settings → API, reinicie npm run dev após mudar o .env e verifique se a rede não bloqueia *.supabase.co.";

function isLikelyNetworkFailure(message: string | undefined) {
  if (!message) return false;
  return (
    message === "Failed to fetch" ||
    /network|fetch|load failed|networkerror/i.test(message)
  );
}

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
    setError(null);

    let supabase;
    try {
      supabase = createSupabaseBrowserClient();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Configuração do Supabase inválida."
      );
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(
          isLikelyNetworkFailure(signInError.message)
            ? SUPABASE_NETWORK_HINT
            : signInError.message
        );
        return;
      }
    } catch (err) {
      const isNetwork =
        err instanceof TypeError ||
        (err instanceof Error && isLikelyNetworkFailure(err.message));
      setError(
        isNetwork
          ? SUPABASE_NETWORK_HINT
          : err instanceof Error
            ? err.message
            : "Erro ao entrar. Tente de novo."
      );
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
      className="glass-panel w-full max-w-md min-w-0 space-y-6 rounded-2xl p-5 sm:p-8"
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
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
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
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100 break-words sm:text-sm">
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
