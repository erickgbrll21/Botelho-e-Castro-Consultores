import { createSupabaseServerClient } from "./supabase/server";
import { getCurrentProfile } from "./auth";
import { redactDetalhes } from "./redact-for-log";
import { serverLog } from "./server-log";

export async function registrarLog(acao: string, detalhes?: any) {
  try {
    const supabase = await createSupabaseServerClient();
    const profile = await getCurrentProfile();

    if (!profile) return;

    const detalhesSafe =
      detalhes === undefined || detalhes === null
        ? null
        : redactDetalhes(detalhes);

    const { error } = await (supabase.from("logs_sistema") as any).insert({
      usuario_id: profile.id,
      usuario_nome: profile.nome,
      acao,
      detalhes: detalhesSafe,
    });
    if (error) {
      serverLog("registrarLog", "error", error.message, { acao });
    }
  } catch (e) {
    serverLog("registrarLog", "error", "falha ao registrar", {
      acao,
      err: e instanceof Error ? e.message : String(e),
    });
  }
}
