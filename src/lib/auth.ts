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

  if (!profile || profile.tipo_usuario !== "admin") {
    redirect("/dashboard");
  }

  return profile;
}

export function assertAdmin(profile: { tipo_usuario: UserRole }) {
  if (profile.tipo_usuario !== "admin") {
    throw new Error("Ação permitida apenas para administradores.");
  }
}

export function getServiceRoleClient() {
  return createSupabaseServiceRoleClient();
}
