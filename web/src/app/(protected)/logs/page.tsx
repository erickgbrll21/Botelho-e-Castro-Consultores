import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/lib/auth";

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
        <h1 className="text-3xl font-semibold">Logs do Sistema</h1>
        <p className="text-neutral-400">
          Histórico das últimas 100 ações realizadas por administradores.
        </p>
      </div>

      <Card title="Atividades Recentes">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr className="border-b border-neutral-800/80">
                <th className="py-3 pr-4 font-medium">Data/Hora</th>
                <th className="py-3 pr-4 font-medium">Usuário</th>
                <th className="py-3 pr-4 font-medium">Ação</th>
                <th className="py-3 pr-4 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {logs.map((log) => (
                <tr key={log.id} className="align-top hover:bg-neutral-900/30 transition-colors">
                  <td className="py-4 pr-4 whitespace-nowrap text-neutral-400">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    }).format(new Date(log.created_at))}
                  </td>
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-neutral-200">{log.usuario_nome}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <Pill 
                      label={log.acao} 
                      tone={
                        log.acao.includes("Exclusão") ? "critical" : 
                        log.acao.includes("Edição") ? "warning" : 
                        log.acao.includes("Cadastro") || log.acao.includes("Criação") ? "success" : "neutral"
                      } 
                    />
                  </td>
                  <td className="py-4 pr-4">
                    <pre className="text-[10px] text-neutral-500 font-mono bg-black/20 p-2 rounded-lg max-w-xs overflow-auto">
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
