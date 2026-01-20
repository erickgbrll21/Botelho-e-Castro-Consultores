import { createSupabaseServerClient } from "./supabase/server";
import { getCurrentProfile } from "./auth";

export async function registrarLog(acao: string, detalhes?: any) {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();

  if (!profile) return;

  await (supabase.from("logs_sistema") as any).insert({
    usuario_id: profile.id,
    usuario_nome: profile.nome,
    acao,
    detalhes: detalhes || null,
  });
}
