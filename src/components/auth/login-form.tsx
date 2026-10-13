"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeInternalRedirectPath } from "@/lib/safe-redirect-path";
import { signInAction } from "@/app/(auth)/login/actions";
import { Turnstile, type TurnstileHandle } from "@/components/auth/turnstile";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeInternalRedirectPath(
    searchParams.get("redirectedFrom")
  );
  const perfilIncompleto = searchParams.get("erro") === "perfil";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [enviando, setEnviando] = useState(false);
  const [bloqueadoAte, setBloqueadoAte] = useState<number | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle>(null);
  const aguardandoCaptcha = Boolean(TURNSTILE_SITE_KEY) && !captchaToken;

  useEffect(() => {
    if (!bloqueadoAte) return;
    const t = setInterval(() => {
      const n = Date.now();
      setAgora(n);
      if (n >= bloqueadoAte) {
        setBloqueadoAte(null);
        setError(null);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [bloqueadoAte]);

  const segundosBloqueio = bloqueadoAte
    ? Math.max(0, Math.ceil((bloqueadoAte - agora) / 1000))
    : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enviando || segundosBloqueio > 0) return;
    if (aguardandoCaptcha) {
      setError("Conclua a verificação de segurança abaixo.");
      return;
    }
    setError(null);
    setEnviando(true);

    try {
      const result = await signInAction(email, password, captchaToken);
      // O token do Turnstile é de uso único.
      captchaRef.current?.reset();
      if (!result.ok) {
        setError(result.error);
        if (result.bloqueadoPorSeg) {
          setAgora(Date.now());
          setBloqueadoAte(Date.now() + result.bloqueadoPorSeg * 1000);
        }
        setPassword("");
        return;
      }
    } catch {
      setError("Não foi possível conectar ao servidor. Tente de novo.");
      return;
    } finally {
      setEnviando(false);
    }

    startTransition(() => {
      router.replace(redirectTo);
      router.refresh();
    });
  }

  const ocupado = isPending || enviando;

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

      {perfilIncompleto ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 sm:text-sm">
          Sessão encerrada: não há cadastro de usuário vinculado a esta conta. Peça
          a um administrador para criar seu perfil no painel ou confira a tabela
          <code className="mx-0.5 text-amber-200">usuarios</code> no Supabase.
        </div>
      ) : null}

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

      {TURNSTILE_SITE_KEY ? (
        <Turnstile
          ref={captchaRef}
          siteKey={TURNSTILE_SITE_KEY}
          onToken={setCaptchaToken}
          onError={() =>
            setError("Não foi possível carregar a verificação de segurança. Recarregue a página.")
          }
        />
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100 break-words sm:text-sm">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={ocupado || segundosBloqueio > 0 || aguardandoCaptcha}
        className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
      >
        {segundosBloqueio > 0
          ? `Aguarde ${Math.floor(segundosBloqueio / 60)}:${String(segundosBloqueio % 60).padStart(2, "0")}`
          : ocupado
            ? "Entrando..."
            : "Entrar"}
      </button>
    </form>
  );
}
