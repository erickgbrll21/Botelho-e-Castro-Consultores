import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

/** Erros típicos quando cookies são de outro projeto ou refresh expirou/revogado. */
export function isStaleRefreshAuthError(message: string | undefined): boolean {
  if (!message) return false;
  return /invalid refresh token|refresh token not found|refresh token/i.test(
    message
  );
}

/**
 * O cliente do Supabase faz `console.error(AuthApiError)` antes de devolver
 * o erro. O overlay do Next trata isso como falha mesmo quando a sessão
 * inválida já foi tratada. Silencia só essa mensagem.
 */
async function semLogDeRefreshInvalido<T>(executar: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = (...args: unknown[]) => {
    const texto = args
      .map((item) => {
        if (item instanceof Error) return `${item.name} ${item.message}`;
        return typeof item === "string" ? item : "";
      })
      .join(" ");
    if (isStaleRefreshAuthError(texto)) return;
    original.apply(console, args);
  };
  try {
    return await executar();
  } finally {
    console.error = original;
  }
}

async function limparSessaoLocal(supabase: SupabaseClient) {
  // `scope: 'local'` só apaga cookies/storage, sem nova chamada ao Supabase.
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
}

export async function getSessionClearingStaleRefresh(
  supabase: SupabaseClient
): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await semLogDeRefreshInvalido(() => supabase.auth.getSession());

  if (error && isStaleRefreshAuthError(error.message)) {
    await limparSessaoLocal(supabase);
    return null;
  }

  return session;
}

export async function getUserClearingStaleRefresh(
  supabase: SupabaseClient
): Promise<{ user: User | null }> {
  const {
    data: { user },
    error,
  } = await semLogDeRefreshInvalido(() => supabase.auth.getUser());

  if (error && isStaleRefreshAuthError(error.message)) {
    await limparSessaoLocal(supabase);
    return { user: null };
  }

  return { user };
}
