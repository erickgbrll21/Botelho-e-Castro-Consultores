import { redirect } from "next/navigation";
import type { UserRole } from "@/types/database";
import { getCurrentProfile, type CurrentProfile } from "@/lib/auth";
import { PAPEIS_GESTORES } from "@/lib/demandas";

/**
 * Gestor de demandas = mesmo conjunto elevado do restante do painel
 * (admin, diretor, financeiro, controladoria). Espelha public.demandas_is_gestor()
 * no banco — a permissão real é garantida por RLS, aqui é só a camada de UI/ação.
 */
export function isGestorDemandas(role: UserRole): boolean {
  return (PAPEIS_GESTORES as readonly string[]).includes(role);
}

/** Qualquer usuário autenticado do painel (todos têm "Minhas Demandas"). */
export async function requireDemandasProfile(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

/** Ações/telas administrativas do módulo. */
export async function requireGestorDemandas(
  fallback = "/demandas"
): Promise<CurrentProfile> {
  const profile = await requireDemandasProfile();
  if (!isGestorDemandas(profile.tipo_usuario)) {
    redirect(fallback);
  }
  return profile;
}

/** Mesma checagem, mas para Server Actions (erro em vez de redirect). */
export async function assertGestorDemandas(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile || !isGestorDemandas(profile.tipo_usuario)) {
    throw new Error("Ação permitida apenas para gestores de demandas.");
  }
  return profile;
}
