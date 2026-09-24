import Link from "next/link";
import { requireDemandasProfile, isGestorDemandas } from "@/lib/demandas-access";
import {
  DEMANDA_SETORES,
  SETOR_META,
  caminhosSetor,
} from "@/lib/demanda-setor";

export default async function DemandasHubPage() {
  const profile = await requireDemandasProfile();
  const gestor = isGestorDemandas(profile.tipo_usuario);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 md:text-xs md:tracking-[0.3em]">
          Controle de Demandas
        </p>
        <h1 className="text-2xl font-semibold md:text-3xl">Escolha o setor</h1>
        <p className="text-xs text-neutral-400 md:text-sm">
          Jurídico atende só o departamento Cível. Contábil atende só Legalização.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {DEMANDA_SETORES.map((setor) => {
          const meta = SETOR_META[setor];
          const caminhos = caminhosSetor(setor);
          return (
            <Link
              key={setor}
              href={gestor ? caminhos.base : caminhos.minhas}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 transition hover:border-neutral-600 hover:bg-neutral-900"
            >
              <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">
                {meta.area}
              </p>
              <h2 className="mt-2 text-xl font-semibold">{meta.departamento}</h2>
              <p className="mt-2 text-sm text-neutral-400">{meta.descricao}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
