import { ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/card";
import { ConsultaProcessoPanel } from "@/components/datajud/consulta-processo-panel";
import { getCurrentProfile } from "@/lib/auth";

export default async function ConsultaProcessoPage() {
  const profile = await getCurrentProfile();
  const podeConsultar =
    profile != null &&
    ["admin", "diretor", "financeiro"].includes(profile.tipo_usuario);

  if (!podeConsultar) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Consulta de processos</h1>
        <p className="text-sm text-neutral-400">
          Acesso restrito a administradores, diretoria e financeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
          Ferramentas
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Consulta de processos (DataJud)
        </h1>
        <p className="max-w-2xl text-sm text-neutral-400 sm:text-base">
          Pesquisa por numeração única (20 dígitos) na API pública do DataJud do
          CNJ. O tribunal pode ser detectado automaticamente a partir do número
          ou escolhido manualmente quando a inferência não for possível.
        </p>
      </div>

      <Card
        title="Busca no DataJud"
        action={
          <ClipboardDocumentCheckIcon className="h-4 w-4 text-amber-500" />
        }
      >
        <ConsultaProcessoPanel />
      </Card>
    </div>
  );
}
