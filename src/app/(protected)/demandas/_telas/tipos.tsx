import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireGestorDemandas } from "@/lib/demandas-access";
import { parseFiltros } from "@/lib/demandas";
import {
  fetchDemandasParaMetricas,
  fetchResumoDemandasUsuario,
  fetchTiposServico,
} from "@/lib/demandas-queries";
import { DemandasSubnav } from "@/components/demandas/demandas-subnav";
import {
  AlternarTipoForm,
  NovoTipoServicoForm,
  RenomearTipoForm,
} from "@/components/demandas/tipos-servico-forms";
import {
  AvisoSucesso,
  ErroCarregamento,
  EstadoVazio,
  ModuloNaoInstalado,
} from "@/components/demandas/demandas-avisos";
import { caminhosSetor, SETOR_META, type DemandaSetor } from "@/lib/demanda-setor";
import {
  alternarTipoServico,
  criarTipoServico,
  renomearTipoServico,
} from "../actions";

export async function TiposServico({
  setor,
  searchParams,
}: {
  setor: DemandaSetor;
  searchParams: Promise<{ criado?: string; renomeado?: string }>;
}) {
  const meta = SETOR_META[setor];
  const caminhos = caminhosSetor(setor);
  const profile = await requireGestorDemandas(caminhos.minhas);
  const supabase = await createSupabaseServerClient();
  const flags = await searchParams;

  const filtrosVazios = parseFiltros({});
  const [tiposServico, usoPorTipo, resumoPessoal] = await Promise.all([
    fetchTiposServico(supabase, { setor }),
    fetchDemandasParaMetricas(supabase, filtrosVazios, { setor }),
    fetchResumoDemandasUsuario(supabase, profile.id, new Date(), setor),
  ]);

  const contagem = new Map<string, number>();
  for (const item of usoPorTipo.itens) {
    if (!item.tipo_servico_id) continue;
    contagem.set(
      item.tipo_servico_id,
      (contagem.get(item.tipo_servico_id) ?? 0) + 1
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 md:text-xs md:tracking-[0.3em]">
          {meta.area} · {meta.departamento}
        </p>
        <h1 className="text-2xl font-semibold md:text-3xl">Tipos de serviço</h1>
        <p className="text-xs text-neutral-400 md:text-sm">
          Cadastre novos tipos sem alterar o código. Tipos já usados em demandas
          não são excluídos — apenas desativados.
        </p>
      </div>

      <DemandasSubnav
        atual="tipos"
        gestor
        pendentes={resumoPessoal.pendentes}
        setor={setor}
      />

      {tiposServico.moduloAusente ? <ModuloNaoInstalado /> : null}
      {!tiposServico.moduloAusente && tiposServico.erro ? (
        <ErroCarregamento mensagem={tiposServico.erro} />
      ) : null}

      {flags.criado === "1" ? (
        <AvisoSucesso mensagem="Tipo de serviço cadastrado com sucesso." />
      ) : null}
      {flags.renomeado === "1" ? (
        <AvisoSucesso mensagem="Tipo de serviço atualizado com sucesso." />
      ) : null}

      {!tiposServico.moduloAusente ? (
        <Card
          title="Cadastrar tipo de serviço"
          action={<Pill label="Gestores" tone="warning" />}
        >
          <NovoTipoServicoForm action={criarTipoServico} setor={setor} />
        </Card>
      ) : null}

      <Card title={`${tiposServico.tipos.length} tipo(s) cadastrado(s)`}>
        {tiposServico.tipos.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum tipo de serviço cadastrado"
            descricao="Cadastre o primeiro tipo para começar a criar demandas."
          />
        ) : (
          <ul className="divide-y divide-neutral-900">
            {tiposServico.tipos.map((tipo) => (
              <li
                key={tipo.id}
                className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1 lg:max-w-lg">
                  <RenomearTipoForm
                    tipoId={tipo.id}
                    nome={tipo.nome}
                    setor={setor}
                    action={renomearTipoServico}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Pill
                    label={tipo.ativo ? "Ativo" : "Inativo"}
                    tone={tipo.ativo ? "success" : "neutral"}
                  />
                  <span className="text-xs text-neutral-500">
                    {contagem.get(tipo.id) ?? 0} demanda(s)
                  </span>
                  <AlternarTipoForm
                    tipoId={tipo.id}
                    ativo={tipo.ativo}
                    action={alternarTipoServico}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
