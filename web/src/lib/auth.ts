import { redirect } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables, UserRole } from "@/types/database";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "./supabase/server";

export async function requireSession(): Promise<Session> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function getCurrentProfile(): Promise<
  | (Tables<"usuarios"> & {
      user: User;
    })
  | null
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  return { ...(profile as any), user };
}

export async function requireAdminProfile() {
  const profile = await getCurrentProfile();

  if (!profile || !["admin", "diretor", "financeiro"].includes(profile.tipo_usuario)) {
    redirect("/dashboard");
  }

  return profile;
}

export function assertAdmin(profile: { tipo_usuario: UserRole }) {
  if (!["admin", "diretor", "financeiro"].includes(profile.tipo_usuario)) {
    throw new Error("Ação permitida apenas para administradores.");
  }
}

export function canSeeContractValue(role: UserRole) {
  return ["diretor", "financeiro"].includes(role);
}

export function getServiceRoleClient() {
  return createSupabaseServiceRoleClient();
}
