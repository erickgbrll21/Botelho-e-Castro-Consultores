import { cache } from "react";
import { redirect } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables, UserRole } from "@/types/database";
import {
  getSessionClearingStaleRefresh,
  getUserClearingStaleRefresh,
} from "./supabase/clear-stale-auth";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "./supabase/server";

export type CurrentProfile = Tables<"usuarios"> & { user: User };

/**
 * Uma única leitura de sessão + perfil por requisição RSC (layout + páginas),
 * evitando várias idas ao Supabase ao trocar de aba.
 */
export const loadServerAuth = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const session = await getSessionClearingStaleRefresh(supabase);

  if (!session) {
    return { session: null as Session | null, profile: null as CurrentProfile | null };
  }

  const { user } = await getUserClearingStaleRefresh(supabase);
  if (!user) {
    return { session, profile: null as CurrentProfile | null };
  }

  const { data: profile } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return { session, profile: null as CurrentProfile | null };
  }

  return { session, profile: { ...(profile as any), user } };
});

export async function requireSession(): Promise<Session> {
  const { session } = await loadServerAuth();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const { profile } = await loadServerAuth();
  return profile;
}

export async function requireAdminProfile() {
  const profile = await getCurrentProfile();

  if (
    !profile ||
    !["admin", "diretor", "financeiro", "controladoria"].includes(profile.tipo_usuario)
  ) {
    redirect("/dashboard");
  }

  return profile;
}

/** Admin e Diretor (ex.: permissões de gestão de usuários). */
export async function requireAdminOrDiretorProfile() {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "diretor"].includes(profile.tipo_usuario)) {
    redirect("/dashboard");
  }
  return profile;
}

export function assertAdmin(profile: { tipo_usuario: UserRole }) {
  if (!["admin", "diretor", "financeiro", "controladoria"].includes(profile.tipo_usuario)) {
    throw new Error("Ação permitida apenas para administradores.");
  }
}

export function canSeeContractValue(role: UserRole) {
  return ["diretor", "financeiro", "controladoria"].includes(role);
}

/** Exportação da lista completa (Empresa + CNPJ/CPF) — Administrador (TI) e Diretor. */
export function canExportClientesPlanilha(role: UserRole) {
  return role === "admin" || role === "diretor";
}

export function getServiceRoleClient() {
  return createSupabaseServiceRoleClient();
}
