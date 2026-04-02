import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

/** Erros típicos quando cookies são de outro projeto ou refresh expirou/revogado. */
export function isStaleRefreshAuthError(message: string | undefined): boolean {
  if (!message) return false;
  return /invalid refresh token|refresh token not found|refresh token/i.test(
    message
  );
}

export async function getSessionClearingStaleRefresh(
  supabase: SupabaseClient
): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error && isStaleRefreshAuthError(error.message)) {
    await supabase.auth.signOut().catch(() => {});
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
  } = await supabase.auth.getUser();

  if (error && isStaleRefreshAuthError(error.message)) {
    await supabase.auth.signOut().catch(() => {});
    return { user: null };
  }

  return { user };
}
