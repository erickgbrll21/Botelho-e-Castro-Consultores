import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireGestorDemandas } from "@/lib/demandas-access";
import {
  parseFiltros,
  queryStringFiltros,
  type DemandaFiltrosParams,
} from "@/lib/demandas";
import {
  fetchDemandas,
  fetchResumoDemandasUsuario,
  fetchTiposServico,
  fetchUsuariosAtribuiveis,
  DEMANDAS_POR_PAGINA,
} from "@/lib/demandas-queries";
import { DemandasSubnav } from "@/components/demandas/demandas-subnav";
import { DemandasFiltros } from "@/components/demandas/demandas-filtros";
import { DemandasTabela } from "@/components/demandas/demandas-tabela";
import {
  AvisoSucesso,
  ErroCarregamento,
  EstadoVazio,
  ModuloNaoInstalado,
} from "@/components/demandas/demandas-avisos";
import { NovaDemandaButton } from "@/components/demandas/demanda-form";
import { caminhosSetor, SETOR_META, type DemandaSetor } from "@/lib/demanda-setor";
import { concluirDemanda, confirmarConclusaoDemanda, criarDemanda, excluirDemanda } from "../actions";

export async function TodasAsDemandas({
  setor,
  searchParams,
}: {
  setor: DemandaSetor;
  searchParams: Promise<DemandaFiltrosParams & { excluida?: string }>;
}) {
  const meta = SETOR_META[setor];
  const caminhos = caminhosSetor(setor);
  const profile = await requireGestorDemandas(caminhos.minhas);
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const filtros = parseFiltros(params);
  const agora = new Date();

  const [lista, tiposServico, usuarios, resumoPessoal] = await Promise.all([
    fetchDemandas(supabase, filtros, { agora, setor }),
    fetchTiposServico(supabase, { setor }),
    fetchUsuariosAtribuiveis(supabase),
    fetchResumoDemandasUsuario(supabase, profile.id, agora, setor),
  ]);

  const moduloAusente = lista.moduloAusente || tiposServico.moduloAusente;
  const primeiro = (lista.pagina - 1) * DEMANDAS_POR_PAGINA + 1;
  const ultimo = Math.min(lista.pagina * DEMANDAS_POR_PAGINA, lista.total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 md:text-xs md:tracking-[0.3em]">
            {meta.area} · {meta.departamento}
          </p>
          <h1 className="text-2xl font-semibold md:text-3xl">
            Todas as demandas
          </h1>
          <p className="text-xs text-neutral-400 md:text-sm">
            {meta.descricao}
          </p>
        </div>
        {!moduloAusente ? (
          <NovaDemandaButton
            tipos={tiposServico.tipos}
            usuarios={usuarios}
            setor={setor}
            action={criarDemanda}
          />
        ) : null}
      </div>

      <DemandasSubnav
        atual="todas"
        gestor
        pendentes={resumoPessoal.pendentes}
        setor={setor}
      />

      {params.excluida === "1" ? (
        <AvisoSucesso mensagem="Demanda excluída com sucesso." />
      ) : null}

      {moduloAusente ? <ModuloNaoInstalado /> : null}
      {!moduloAusente && lista.erro ? (
        <ErroCarregamento mensagem={lista.erro} />
      ) : null}

      <DemandasFiltros
        filtros={filtros}
        tipos={tiposServico.tipos}
        usuarios={usuarios}
        basePath={caminhos.todas}
      />

      <Card
        title={`${lista.total} ${lista.total === 1 ? "demanda encontrada" : "demandas encontradas"}`}
        action={
          lista.total > 0 ? (
            <span className="text-xs text-neutral-500">
              Exibindo {primeiro}–{ultimo}
            </span>
          ) : null
        }
      >
        {lista.itens.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma demanda encontrada"
            descricao={
              moduloAusente
                ? "O módulo ainda não está habilitado no banco de dados."
                : "Revise os filtros ou crie uma nova demanda para a equipe."
            }
          />
        ) : (
          <div className="space-y-4">
            <DemandasTabela
              demandas={lista.itens}
              gestor
              concluirAction={concluirDemanda}
              confirmarAction={confirmarConclusaoDemanda}
              excluirAction={excluirDemanda}
            />

            {lista.totalPaginas > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-neutral-800/70 pt-4">
                {lista.pagina > 1 ? (
                  <Link
                    href={`${caminhos.todas}${queryStringFiltros(filtros, {
                      pagina: lista.pagina - 1,
                    })}`}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:bg-neutral-800"
                  >
                    ← Anterior
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-xs text-neutral-500">
                  Página {lista.pagina} de {lista.totalPaginas}
                </span>
                {lista.pagina < lista.totalPaginas ? (
                  <Link
                    href={`${caminhos.todas}${queryStringFiltros(filtros, {
                      pagina: lista.pagina + 1,
                    })}`}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:bg-neutral-800"
                  >
                    Próxima →
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
