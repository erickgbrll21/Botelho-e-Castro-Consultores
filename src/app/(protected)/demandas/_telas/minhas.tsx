import Link from "next/link";
import clsx from "clsx";
import { Card } from "@/components/ui/card";
import {
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isGestorDemandas, requireDemandasProfile } from "@/lib/demandas-access";
import {
  parseFiltros,
  queryStringFiltros,
  type DemandaFiltrosParams,
} from "@/lib/demandas";
import {
  fetchDemandas,
  fetchResumoDemandasUsuario,
  fetchTiposServico,
  DEMANDAS_POR_PAGINA,
} from "@/lib/demandas-queries";
import { DemandasSubnav } from "@/components/demandas/demandas-subnav";
import { DemandasFiltros } from "@/components/demandas/demandas-filtros";
import { DemandasTabela } from "@/components/demandas/demandas-tabela";
import {
  ErroCarregamento,
  EstadoVazio,
  ModuloNaoInstalado,
} from "@/components/demandas/demandas-avisos";
import { caminhosSetor, SETOR_META, type DemandaSetor } from "@/lib/demanda-setor";
import { concluirDemanda } from "../actions";

export async function MinhasDemandas({
  setor,
  searchParams,
}: {
  setor: DemandaSetor;
  searchParams: Promise<DemandaFiltrosParams>;
}) {
  const meta = SETOR_META[setor];
  const caminhos = caminhosSetor(setor);
  const profile = await requireDemandasProfile();
  const supabase = await createSupabaseServerClient();
  const filtros = parseFiltros(await searchParams);
  const agora = new Date();
  const gestor = isGestorDemandas(profile.tipo_usuario);

  const [lista, tiposServico, resumo] = await Promise.all([
    fetchDemandas(supabase, filtros, { responsavelId: profile.id, agora, setor }),
    fetchTiposServico(supabase, { setor }),
    fetchResumoDemandasUsuario(supabase, profile.id, agora, setor),
  ]);

  const moduloAusente = lista.moduloAusente || tiposServico.moduloAusente;
  const primeiro = (lista.pagina - 1) * DEMANDAS_POR_PAGINA + 1;
  const ultimo = Math.min(lista.pagina * DEMANDAS_POR_PAGINA, lista.total);
  const temDestaque = resumo.venceHoje > 0 || resumo.atrasadas > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 md:text-xs md:tracking-[0.3em]">
          {meta.area} · {meta.departamento}
        </p>
        <h1 className="text-2xl font-semibold md:text-3xl">Minhas demandas</h1>
        <p className="text-xs text-neutral-400 md:text-sm">
          {profile.nome} · {meta.descricao}
        </p>
      </div>

      <DemandasSubnav
        atual="minhas"
        gestor={gestor}
        pendentes={resumo.pendentes}
        setor={setor}
      />

      {moduloAusente ? <ModuloNaoInstalado /> : null}
      {!moduloAusente && lista.erro ? (
        <ErroCarregamento mensagem={lista.erro} />
      ) : null}

      {temDestaque ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          {resumo.venceHoje > 0 ? (
            <Link
              href={`${caminhos.minhas}${queryStringFiltros(filtros, {
                prazo: "vence_hoje",
                pagina: 1,
              })}`}
              className={clsx(
                "flex flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-sm transition",
                "border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
              )}
            >
              <CalendarDaysIcon className="h-5 w-5 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold">
                  {resumo.venceHoje}{" "}
                  {resumo.venceHoje === 1 ? "demanda vence" : "demandas vencem"}{" "}
                  hoje
                </span>
                <span className="ml-1 text-amber-100/80">— ver agora</span>
              </span>
            </Link>
          ) : null}
          {resumo.atrasadas > 0 ? (
            <Link
              href={`${caminhos.minhas}${queryStringFiltros(filtros, {
                status: "atrasada",
                pagina: 1,
              })}`}
              className="flex flex-1 items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100 transition hover:bg-red-500/20"
            >
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold">
                  {resumo.atrasadas}{" "}
                  {resumo.atrasadas === 1
                    ? "demanda atrasada"
                    : "demandas atrasadas"}
                </span>
                <span className="ml-1 text-red-100/80">— ver agora</span>
              </span>
            </Link>
          ) : null}
        </div>
      ) : null}

      <DemandasFiltros
        filtros={filtros}
        tipos={tiposServico.tipos}
        basePath={caminhos.minhas}
      />

      <Card
        title={`${lista.total} ${lista.total === 1 ? "demanda" : "demandas"}`}
        action={
          lista.total > 0 ? (
            <span className="text-xs text-neutral-500">
              Exibindo {primeiro}–{ultimo}
            </span>
          ) : (
            <ClipboardDocumentListIcon className="h-4 w-4 text-neutral-500" />
          )
        }
      >
        {lista.itens.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma demanda atribuída a você"
            descricao={
              moduloAusente
                ? "O módulo ainda não está habilitado no banco de dados."
                : "Quando o gestor distribuir uma demanda, ela aparece aqui com prazo e instruções."
            }
          />
        ) : (
          <div className="space-y-4">
            <DemandasTabela
              demandas={lista.itens}
              gestor={false}
              concluirAction={concluirDemanda}
            />

            {lista.totalPaginas > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-neutral-800/70 pt-4">
                {lista.pagina > 1 ? (
                  <Link
                    href={`${caminhos.minhas}${queryStringFiltros(filtros, {
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
                    href={`${caminhos.minhas}${queryStringFiltros(filtros, {
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
