import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  BuildingOffice2Icon,
  GlobeAltIcon,
  UserIcon,
  CalendarDaysIcon,
  IdentificationIcon,
  MapPinIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

function formatCurrency(value: number | null | undefined) {
  if (!value && value !== 0) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

export default async function EmpresaDetalhe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();

  const { data, error } = await supabase
    .from("empresas")
    .select(
      `
        id,
        razao_social,
        cnpj,
        dominio,
        tipo_unidade,
        responsavel_fiscal,
        cidade,
        estado,
        atividade,
        constituicao,
        inscricao_estadual,
        inscricao_municipal,
        grupo_empresarial,
        grupo_id,
        grupos_empresariais ( nome ),
        socio_responsavel_pj,
        capital_social,
        data_abertura_empresa,
        data_entrada_contabilidade,
        regime_tributario,
        processos_ativos,
        responsaveis_internos (responsavel_comercial, responsavel_contabil, responsavel_juridico, responsavel_planejamento_tributario),
        servicos_contratados (contabilidade, juridico, planejamento_tributario),
        quadro_socios (nome_socio, percentual_participacao)
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (!data || error) {
    notFound();
  }

  const empresa: any = data;
  const gruposRel = empresa.grupos_empresariais;
  // Supabase can return an object or an array depending on the query result type
  const grupoNome = (Array.isArray(gruposRel) ? gruposRel[0]?.nome : gruposRel?.nome) || empresa.grupo_empresarial || "Sem grupo vinculado";
  const responsaveis = empresa.responsaveis_internos?.[0];
  const servicos = empresa.servicos_contratados?.[0];
  const socios = empresa.quadro_socios ?? [];

  return (
    <div className="space-y-8">
      {/* Header Profile Section */}
      <div className="glass-panel flex flex-col items-start justify-between gap-6 rounded-3xl p-6 md:p-8 md:flex-row md:items-center">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6 w-full md:w-auto">
          <div className="flex h-16 w-16 md:h-20 md:w-20 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800">
            <BuildingOffice2Icon className="h-8 w-8 md:h-10 md:w-10 text-neutral-400" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-3xl font-bold tracking-tight text-white truncate">
                {empresa.razao_social}
              </h1>
              <div className="flex gap-2 shrink-0">
                <Pill label={empresa.tipo_unidade ?? "—"} tone="neutral" />
                {profile?.tipo_usuario === "admin" && (
                  <a
                    href={`/empresas/${id}/edit`}
                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 md:px-3 md:py-1 text-[10px] md:text-xs font-medium text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                  >
                    <PencilIcon className="h-3 w-3" />
                    Editar
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-neutral-400">
              <span className="flex items-center gap-1.5 shrink-0">
                <IdentificationIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {empresa.cnpj}
              </span>
              {empresa.dominio && (
                <span className="flex items-center gap-1.5 shrink-0">
                  <GlobeAltIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  {empresa.dominio}
                </span>
              )}
              {grupoNome !== "Sem grupo vinculado" && (
                <span className="flex items-center gap-1.5 font-medium text-amber-200 shrink-0">
                  <ChartBarIcon className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-500" />
                  Grupo: {grupoNome}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Pill
            label={empresa.atividade ?? "Não informada"}
            tone={empresa.atividade === "Serviço" ? "success" : "warning"}
          />
          <Pill
            label={empresa.regime_tributario ?? "Regime não inf."}
            tone="neutral"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Stats Column */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Financeiro e Escala" action={<ChartBarIcon className="h-4 w-4 text-neutral-500" />}>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Capital Social</p>
                  <p className="text-2xl font-semibold text-neutral-50">
                    {formatCurrency(empresa.capital_social)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Processos Ativos</p>
                  <p className="text-2xl font-semibold text-neutral-50">
                    {empresa.processos_ativos ?? 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card title="Datas Importantes" action={<CalendarDaysIcon className="h-4 w-4 text-neutral-500" />}>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-neutral-800/50 pb-2">
                  <span className="text-sm text-neutral-400">Abertura</span>
                  <span className="text-sm font-medium text-neutral-200">{formatDate(empresa.data_abertura_empresa)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400">Entrada Contab.</span>
                  <span className="text-sm font-medium text-neutral-200">{formatDate(empresa.data_entrada_contabilidade)}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card title="Serviços Ativos" className="bg-neutral-900/20">
            <div className="flex flex-wrap gap-3">
              <div className={clsx(
                "flex-1 min-w-[140px] rounded-xl border p-4 transition-colors",
                servicos?.contabilidade ? "bg-emerald-500/5 border-emerald-500/20" : "bg-neutral-900/40 border-neutral-800"
              )}>
                <p className="text-xs text-neutral-500 mb-1">Contábil</p>
                <p className={clsx("font-semibold", servicos?.contabilidade ? "text-emerald-400" : "text-neutral-600")}>
                  {servicos?.contabilidade ? "Ativo" : "Inativo"}
                </p>
              </div>
              <div className={clsx(
                "flex-1 min-w-[140px] rounded-xl border p-4 transition-colors",
                servicos?.juridico ? "bg-amber-500/5 border-amber-500/20" : "bg-neutral-900/40 border-neutral-800"
              )}>
                <p className="text-xs text-neutral-500 mb-1">Jurídico</p>
                <p className={clsx("font-semibold", servicos?.juridico ? "text-amber-400" : "text-neutral-600")}>
                  {servicos?.juridico ? "Ativo" : "Inativo"}
                </p>
              </div>
              <div className={clsx(
                "flex-1 min-w-[140px] rounded-xl border p-4 transition-colors",
                servicos?.planejamento_tributario ? "bg-blue-500/5 border-blue-500/20" : "bg-neutral-900/40 border-neutral-800"
              )}>
                <p className="text-xs text-neutral-500 mb-1">Planejamento</p>
                <p className={clsx("font-semibold", servicos?.planejamento_tributario ? "text-blue-400" : "text-neutral-600")}>
                  {servicos?.planejamento_tributario ? "Ativo" : "Inativo"}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Quadro de Sócios" action={<UserIcon className="h-4 w-4 text-neutral-500" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              {socios.length === 0 ? (
                <p className="text-sm text-neutral-500 italic py-4">Nenhum sócio registrado.</p>
              ) : (
                socios.map((socio: any) => (
                  <div
                    key={socio.nome_socio}
                    className="flex items-center justify-between rounded-xl bg-neutral-900/60 border border-neutral-800/50 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-neutral-100">
                        {socio.nome_socio}
                      </p>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Participação</p>
                    </div>
                    <span className="text-lg font-bold text-neutral-50">
                      {socio.percentual_participacao ?? 0}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Side Info Column */}
        <div className="space-y-6">
          <Card title="Responsáveis Internos" action={<UserIcon className="h-4 w-4 text-neutral-500" />}>
            <dl className="space-y-4">
              <div className="border-l-2 border-neutral-800 pl-3">
                <dt className="text-[10px] text-neutral-500 uppercase tracking-wider">Comercial / Contrato</dt>
                <dd className="text-sm font-semibold text-neutral-200">
                  {responsaveis?.responsavel_comercial ?? "—"}
                </dd>
              </div>
              <div className="border-l-2 border-neutral-800 pl-3">
                <dt className="text-[10px] text-neutral-500 uppercase tracking-wider">Departamento Contábil</dt>
                <dd className="text-sm font-semibold text-neutral-200">
                  {responsaveis?.responsavel_contabil ?? "—"}
                </dd>
              </div>
              <div className="border-l-2 border-neutral-800 pl-3">
                <dt className="text-[10px] text-neutral-500 uppercase tracking-wider">Departamento Jurídico</dt>
                <dd className="text-sm font-semibold text-neutral-200">
                  {responsaveis?.responsavel_juridico ?? "—"}
                </dd>
              </div>
              <div className="border-l-2 border-neutral-800 pl-3">
                <dt className="text-[10px] text-neutral-500 uppercase tracking-wider">Planej. Tributário</dt>
                <dd className="text-sm font-semibold text-neutral-200">
                  {responsaveis?.responsavel_planejamento_tributario ?? "—"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Informações Institucionais" action={<ClipboardDocumentCheckIcon className="h-4 w-4 text-neutral-500" />}>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Grupo Empresarial</p>
                <p className={clsx("font-medium", grupoNome === "Sem grupo vinculado" ? "text-neutral-500 italic" : "text-amber-200")}>
                  {grupoNome}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Responsável Fiscal</p>
                <p className="font-medium text-neutral-200">{empresa.responsavel_fiscal ?? "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Insc. Estadual</p>
                  <p className="font-medium text-neutral-200">{empresa.inscricao_estadual ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Insc. Municipal</p>
                  <p className="font-medium text-neutral-200">{empresa.inscricao_municipal ?? "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Constituição</p>
                <p className="font-medium text-neutral-200">{empresa.constituicao === true ? "Sim" : empresa.constituicao === false ? "Não" : "—"}</p>
              </div>
            </div>
          </Card>

          <Card title="Localização" action={<MapPinIcon className="h-4 w-4 text-neutral-500" />}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800">
                <MapPinIcon className="h-5 w-5 text-neutral-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-200">
                  {empresa.cidade ?? "Cidade não inf."}
                </p>
                <p className="text-xs text-neutral-500">
                  {empresa.estado ? `Estado: ${empresa.estado}` : "UF não inf."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
