import { createSupabaseServerClient } from "./supabase/server";
import { getCurrentProfile } from "./auth";

export async function registrarLog(acao: string, detalhes?: any) {
  try {
    const supabase = await createSupabaseServerClient();
    const profile = await getCurrentProfile();

    if (!profile) return;

    const { error } = await (supabase.from("logs_sistema") as any).insert({
      usuario_id: profile.id,
      usuario_nome: profile.nome,
      acao,
      detalhes: detalhes ?? null,
    });
    if (error) {
      console.error("[registrarLog]", acao, error.message);
    }
  } catch (e) {
    console.error("[registrarLog]", acao, e);
  }
}
