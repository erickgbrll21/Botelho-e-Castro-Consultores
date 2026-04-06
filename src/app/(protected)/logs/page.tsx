import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/lib/auth";
import { formatDateTimePtBR } from "@/lib/format-date";

export default async function LogsPage() {
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();

  const { data: logsData } = await (supabase
    .from("logs_sistema") as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const logs: any[] = logsData ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
          Auditoria
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Logs do Sistema</h1>
        <p className="text-neutral-400">
          Histórico das últimas 100 ações realizadas por administradores.
        </p>
      </div>

      <Card title="Atividades Recentes">
        <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[36rem] text-xs sm:min-w-full sm:text-sm">
            <thead className="text-left text-neutral-400">
              <tr className="border-b border-neutral-800/80">
                <th className="whitespace-nowrap py-3 pr-3 font-medium sm:pr-4">Data/Hora</th>
                <th className="hidden py-3 pr-3 font-medium sm:table-cell sm:pr-4">Usuário</th>
                <th className="py-3 pr-3 font-medium sm:pr-4">Ação</th>
                <th className="min-w-[10rem] py-3 pr-0 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {logs.map((log) => (
                <tr key={log.id} className="align-top hover:bg-neutral-900/30 transition-colors">
                  <td className="py-4 pr-3 text-neutral-400 sm:pr-4">
                    <p className="whitespace-nowrap text-[10px] sm:text-sm">
                    {formatDateTimePtBR(log.created_at, {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                    </p>
                    <p className="mt-1 font-semibold text-neutral-200 sm:hidden">
                      {log.usuario_nome}
                    </p>
                  </td>
                  <td className="hidden py-4 pr-4 sm:table-cell">
                    <p className="font-semibold text-neutral-200">{log.usuario_nome}</p>
                  </td>
                  <td className="py-4 pr-3 sm:pr-4">
                    <Pill 
                      label={log.acao} 
                      tone={
                        log.acao.includes("Exclusão") ? "critical" : 
                        log.acao.includes("Edição") ? "warning" : 
                        log.acao.includes("Cadastro") || log.acao.includes("Criação") ? "success" : "neutral"
                      } 
                    />
                  </td>
                  <td className="max-w-[min(85vw,22rem)] py-4 pr-0 sm:max-w-xs">
                    <pre className="max-h-40 overflow-auto rounded-lg bg-black/20 p-2 font-mono text-[9px] text-neutral-500 sm:text-[10px]">
                      {JSON.stringify(log.detalhes, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-neutral-500 italic">
                    Nenhuma atividade registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
