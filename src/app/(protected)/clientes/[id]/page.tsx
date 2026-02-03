import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, canSeeContractValue } from "@/lib/auth";
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

export default async function ClienteDetalhe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();
  const showContractValue = profile ? canSeeContractValue(profile.tipo_usuario) : false;

  const { data: clienteData, error: clienteError } = await supabase
    .from("clientes")
    .select(`
      *,
      grupos_economicos ( nome, valor_contrato ),
      responsaveis_internos (*),
      servicos_contratados (*),
      quadro_socios (*)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!clienteData || clienteError) {
    notFound();
  }

  const cliente = clienteData as any;
  const gruposRel = cliente.grupos_economicos;
  const grupoNome = (Array.isArray(gruposRel) ? gruposRel[0]?.nome : gruposRel?.nome) || 
                    (typeof cliente.grupo_economico === 'string' ? cliente.grupo_economico : null) || 
                    "Sem grupo vinculado";
  const grupoValorContrato = Array.isArray(gruposRel) ? gruposRel[0]?.valor_contrato : gruposRel?.valor_contrato;
  const responsaveis = (cliente.responsaveis_internos && Array.isArray(cliente.responsaveis_internos)) 
    ? cliente.responsaveis_internos[0] 
    : (cliente.responsaveis_internos || {});
  const servicos = Array.isArray(cliente.servicos_contratados)
    ? cliente.servicos_contratados[0]
    : cliente.servicos_contratados;

  const hasContabil = servicos?.contabil_fiscal || 
                      servicos?.contabil_contabilidade || 
                      servicos?.contabil_dp || 
                      servicos?.contabil_pericia || 
                      servicos?.contabil_legalizacao;

  const hasJuridico = servicos?.juridico_civel || 
                      servicos?.juridico_trabalhista || 
                      servicos?.juridico_licitacao || 
                      servicos?.juridico_penal || 
                      servicos?.juridico_empresarial;

  const hasPlanejamento = servicos?.planejamento_societario_tributario;

  const socios = cliente.quadro_socios ?? [];

  return (
    <div className="space-y-8">
      {/* Header Profile Section */}
      <div className="glass-panel flex flex-col items-start justify-between gap-6 rounded-3xl p-6 md:p-8 md:flex-row md:items-center">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6 w-full md:w-auto">
          <div className="flex h-16 w-16 md:h-20 md:w-20 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800">
            <BuildingOffice2Icon className="h-8 w-8 md:h-10 md:w-10 text-neutral-400" />
          </div>
          <div className="space-y-1 min-w-0 flex-1 w-full">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <div className={`h-3 w-3 rounded-full shrink-0 ${cliente.ativo !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <h1 className="text-xl md:text-3xl font-bold tracking-tight text-white break-words max-w-full">
                {cliente.razao_social}
              </h1>
              <div className="flex gap-2 shrink-0">
                <Pill label={cliente.tipo_unidade ?? "—"} tone="neutral" />
                <Pill 
                  label={cliente.ativo !== false ? "Ativo" : "Desativado"} 
                  tone={cliente.ativo !== false ? "success" : "critical"} 
                />
                {["admin", "diretor", "financeiro"].includes(profile?.tipo_usuario as string) && (
                  <a
                    href={`/clientes/${id}/edit`}
                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 md:px-3 md:py-1 text-[10px] md:text-xs font-medium text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                  >
                    <PencilIcon className="h-3 w-3" />
                    Editar
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm text-neutral-400">
              <span className="flex items-center gap-1.5 shrink-0">
                <IdentificationIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {cliente.cnpj}
              </span>
              {cliente.dominio && (
                <span className="flex items-center gap-1.5 shrink-0">
                  <GlobeAltIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  {cliente.dominio}
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
            label={cliente.atividade ?? "Não informada"}
            tone={cliente.atividade === "Serviço" ? "success" : "warning"}
          />
          <Pill
            label={cliente.regime_tributario ?? "Regime não inf."}
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
                    {formatCurrency(cliente.capital_social)}
                  </p>
                </div>
                {showContractValue && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      {!cliente.cobranca_por_grupo && (
                        <div>
                          <p className="text-xs text-neutral-500 uppercase tracking-wider">Valor do Contrato (Mensal)</p>
                          <p className="text-2xl font-semibold text-amber-200">
                            {formatCurrency(cliente.valor_contrato)}
                          </p>
                        </div>
                      )}
                      {cliente.cobranca_por_grupo && <div />}
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Cobrança por Grupo</p>
                        <Pill 
                          label={cliente.cobranca_por_grupo ? "Sim" : "Não"} 
                          tone={cliente.cobranca_por_grupo ? "warning" : "neutral"} 
                        />
                      </div>
                    </div>
                    {grupoValorContrato && (
                      <div className="border-t border-neutral-800/50 pt-2">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Valor do Grupo ({grupoNome})</p>
                        <p className="text-lg font-medium text-amber-100/80">
                          {formatCurrency(grupoValorContrato)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <Card title="Datas Importantes" action={<CalendarDaysIcon className="h-4 w-4 text-neutral-500" />}>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-neutral-800/50 pb-2">
                  <span className="text-sm text-neutral-400">Abertura</span>
                  <span className="text-sm font-medium text-neutral-200">{formatDate(cliente.data_abertura_cliente)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-neutral-800/50 pb-2">
                  <span className="text-sm text-neutral-400">Entrada Contab.</span>
                  <span className="text-sm font-medium text-neutral-200">{formatDate(cliente.data_entrada_contabilidade)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400">Saída</span>
                  <span className="text-sm font-medium text-red-400">{formatDate(cliente.data_saida)}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card title="Serviços Ativos" className="bg-neutral-900/20">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">1. Serviço Contábil</p>
                <div className="flex flex-wrap gap-2">
                  {servicos?.contabil_fiscal && <Pill label="Fiscal" tone="success" />}
                  {servicos?.contabil_contabilidade && <Pill label="Contabilidade" tone="success" />}
                  {servicos?.contabil_dp && <Pill label="Depto. Pessoal" tone="success" />}
                  {servicos?.contabil_pericia && <Pill label="Perícia" tone="success" />}
                  {servicos?.contabil_legalizacao && <Pill label="Legalização" tone="success" />}
                  {!hasContabil && (
                    <p className="text-xs text-neutral-600 italic">Nenhum serviço contábil ativo</p>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">2. Jurídico</p>
                <div className="flex flex-wrap gap-2">
                  {servicos?.juridico_civel && <Pill label="Cível" tone="warning" />}
                  {servicos?.juridico_trabalhista && <Pill label="Trabalhista" tone="warning" />}
                  {servicos?.juridico_licitacao && <Pill label="Licitação" tone="warning" />}
                  {servicos?.juridico_penal && <Pill label="Penal" tone="warning" />}
                  {servicos?.juridico_empresarial && <Pill label="Empresarial" tone="warning" />}
                  {!hasJuridico && (
                    <p className="text-xs text-neutral-600 italic">Nenhum serviço jurídico ativo</p>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">3. Planejamento</p>
                <div className="flex flex-wrap gap-2">
                  {servicos?.planejamento_societario_tributario && <Pill label="Societário e Tributário" tone="success" />}
                  {!hasPlanejamento && (
                    <p className="text-xs text-neutral-600 italic">Nenhum planejamento ativo</p>
                  )}
                </div>
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
              <div className="border-l-2 border-neutral-800 pl-3">
                <dt className="text-[10px] text-neutral-500 uppercase tracking-wider">Depto. Pessoal</dt>
                <dd className="text-sm font-semibold text-neutral-200">
                  {responsaveis?.responsavel_dp ?? "—"}
                </dd>
              </div>
              <div className="border-l-2 border-neutral-800 pl-3">
                <dt className="text-[10px] text-neutral-500 uppercase tracking-wider">Financeiro</dt>
                <dd className="text-sm font-semibold text-neutral-200">
                  {responsaveis?.responsavel_financeiro ?? "—"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Informações Institucionais" action={<ClipboardDocumentCheckIcon className="h-4 w-4 text-neutral-500" />}>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Grupo de Clientes</p>
                <p className={clsx("font-medium", grupoNome === "Sem grupo vinculado" ? "text-neutral-500 italic" : "text-amber-200")}>
                  {grupoNome}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Responsável Fiscal</p>
                <p className="font-medium text-neutral-200">{cliente.responsavel_fiscal ?? "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Insc. Estadual</p>
                  <p className="font-medium text-neutral-200">{cliente.inscricao_estadual ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Insc. Municipal</p>
                  <p className="font-medium text-neutral-200">{cliente.inscricao_municipal ?? "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Constituição</p>
                <p className="font-medium text-neutral-200">{cliente.constituicao === true ? "Sim" : cliente.constituicao === false ? "Não" : "—"}</p>
              </div>
            </div>
          </Card>

          <Card title="Contato do Cliente" action={<UserIcon className="h-4 w-4 text-neutral-500" />}>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Pessoa de Contato</p>
                <p className="font-medium text-neutral-200">{cliente.contato_nome ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Telefone</p>
                <p className="font-medium text-neutral-200">{cliente.contato_telefone ?? "—"}</p>
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
                  {cliente.cidade ?? "Cidade não inf."}
                </p>
                <p className="text-xs text-neutral-500">
                  {cliente.estado ? `Estado: ${cliente.estado}` : "UF não inf."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
