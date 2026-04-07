import { IdentificationIcon } from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/card";
import { ConsultaCnpjPanel } from "@/components/cnpj/consulta-cnpj-panel";
import { getCurrentProfile } from "@/lib/auth";

export default async function ConsultaCnpjPage() {
  const profile = await getCurrentProfile();
  const canCadastrarCliente =
    profile != null &&
    ["admin", "diretor", "financeiro"].includes(profile.tipo_usuario);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
          Ferramentas
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Consulta de CNPJ</h1>
        <p className="max-w-2xl text-sm text-neutral-400 sm:text-base">
          Informe os 14 dígitos para exibir razão social, situação cadastral,
          endereço, quadro societário e inscrições quando existirem nas fontes
          consultadas.
        </p>
      </div>

      <Card
        title="Busca na Receita (dados públicos)"
        action={<IdentificationIcon className="h-4 w-4 text-amber-500" />}
      >
        <ConsultaCnpjPanel canCadastrarCliente={canCadastrarCliente} />
      </Card>
    </div>
  );
}
