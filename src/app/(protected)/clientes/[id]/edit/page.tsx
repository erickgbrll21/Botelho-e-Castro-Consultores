import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui/card";
import { CnpjReceitaLookup } from "@/components/clientes/cnpj-receita-lookup";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminProfile, getCurrentProfile, canSeeContractValue } from "@/lib/auth";
import { registrarLog } from "@/lib/logs";
import { messageFromSupabaseError } from "@/lib/supabase-errors";
import { getSituacaoEmpresa, type SituacaoEmpresa } from "@/lib/cliente-situacao";
import {
  RESPONSAVEL_PADRAO_CONTABIL,
  RESPONSAVEL_PADRAO_DP,
  RESPONSAVEL_PADRAO_FINANCEIRO,
  responsavelJuridicoSalvo,
  responsavelJuridicoCampoDefault,
} from "@/lib/responsaveis-padrao";
import { parseFormCheckbox } from "@/lib/parse-form-checkbox";
import { CurrencyInput } from "@/components/ui/currency-input";

function parseOptionalMoney(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const normalized = raw
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

async function updateCliente(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id"));

  const razao_social = String(formData.get("razao_social") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "")
    .replace(/\D/g, "")
    .trim();
  const dominio = String(formData.get("dominio") ?? "").trim();
  const grupo_id = String(formData.get("grupo_id") ?? "").trim() || null;
  const tipoUnidadeRaw = String(formData.get("tipo_unidade") ?? "").trim();
  const tipo_unidade: "Matriz" | "Filial" | null =
    tipoUnidadeRaw === "" ? null : (tipoUnidadeRaw as "Matriz" | "Filial");
  const identificacaoFilialRaw = String(
    formData.get("identificacao_filial") ?? ""
  ).trim();
  const identificacao_filial =
    tipo_unidade === "Filial" ? identificacaoFilialRaw || null : null;
  const responsavel_fiscal = String(formData.get("responsavel_fiscal") ?? "").trim();
  const cepRaw = String(formData.get("cep") ?? "").replace(/\D/g, "");
  const cep = cepRaw.length === 8 ? cepRaw : null;
  const logradouro = String(formData.get("logradouro") ?? "").trim() || null;
  const bairro = String(formData.get("bairro") ?? "").trim() || null;
  const complemento = String(formData.get("complemento") ?? "").trim() || null;
  const cidade = String(formData.get("cidade") ?? "").trim();
  const estado = String(formData.get("estado") ?? "").trim();
  const atividadeRaw = String(formData.get("atividade") ?? "").trim();
  const atividade: "Serviço" | "Comércio" | "Indústria" | "Ambos" | null =
    atividadeRaw === ""
      ? null
      : (atividadeRaw as "Serviço" | "Comércio" | "Indústria" | "Ambos");
  const constituicao = formData.get("constituicao") === "Sim";
  const inscricao_estadual = String(formData.get("inscricao_estadual") ?? "").trim();
  const inscricao_municipal = String(formData.get("inscricao_municipal") ?? "").trim();
  const socio_responsavel_pj = String(formData.get("socio_responsavel_pj") ?? "").trim();
  const capital_social = Number(formData.get("capital_social") ?? 0);
  const data_abertura_cliente = formData.get("data_abertura_cliente")
    ? String(formData.get("data_abertura_cliente"))
    : null;
  const data_entrada_contabilidade = formData.get("data_entrada_contabilidade")
    ? String(formData.get("data_entrada_contabilidade"))
    : null;
  const situacaoRaw = String(formData.get("situacao_empresa") ?? "").trim().toLowerCase();
  const situacao_empresa: SituacaoEmpresa =
    situacaoRaw === "paralisada" || situacaoRaw === "desativada" || situacaoRaw === "ativa"
      ? situacaoRaw
      : "ativa";
  const ativo = situacao_empresa !== "desativada";
  const dataSaidaForm = formData.get("data_saida")
    ? String(formData.get("data_saida")).trim()
    : "";
  const data_saida =
    situacao_empresa === "desativada"
      ? dataSaidaForm || new Date().toISOString().slice(0, 10)
      : dataSaidaForm || null;
  const regime_tributario = String(formData.get("regime_tributario") ?? "").trim();
  const contato_nome = String(formData.get("contato_nome") ?? "").trim();
  const contato_telefone = String(formData.get("contato_telefone") ?? "").trim();
  const valor_contrato = parseOptionalMoney(formData, "valor_contrato");
  const cobranca_por_grupo = formData.get("cobranca_por_grupo") === "Sim";

  const responsavel_comercial = String(formData.get("responsavel_comercial") ?? "").trim();
  const responsavel_contabil = String(formData.get("responsavel_contabil") ?? "").trim();
  const responsavel_juridico = String(formData.get("responsavel_juridico") ?? "").trim();
  const responsavel_planejamento_tributario = String(formData.get("responsavel_planejamento_tributario") ?? "").trim();
  const responsavel_dp = String(formData.get("responsavel_dp") ?? "").trim();
  const responsavel_financeiro = String(formData.get("responsavel_financeiro") ?? "").trim();

  // Serviços Contábeis
  const contabil_fiscal = parseFormCheckbox(formData, "contabil_fiscal");
  const contabil_contabilidade = parseFormCheckbox(formData, "contabil_contabilidade");
  const contabil_dp = parseFormCheckbox(formData, "contabil_dp");
  const contabil_pericia = parseFormCheckbox(formData, "contabil_pericia");
  const contabil_legalizacao = parseFormCheckbox(formData, "contabil_legalizacao");

  // Serviços Jurídicos
  const juridico_civel = parseFormCheckbox(formData, "juridico_civel");
  const juridico_trabalhista = parseFormCheckbox(formData, "juridico_trabalhista");
  const juridico_licitacao = parseFormCheckbox(formData, "juridico_licitacao");
  const juridico_penal = parseFormCheckbox(formData, "juridico_penal");
  const juridico_empresarial = parseFormCheckbox(formData, "juridico_empresarial");
  const planejamento_societario_tributario = parseFormCheckbox(
    formData,
    "planejamento_societario_tributario"
  );

  if (!razao_social || !cnpj || cnpj.length !== 14) {
    throw new Error("Razão social e CNPJ válido (14 dígitos) são obrigatórios.");
  }

  const { error: updateError } = await (supabase
    .from("clientes") as any)
    .update({
      razao_social,
      cnpj,
      dominio: dominio || null,
      grupo_id: grupo_id || null,
      tipo_unidade: tipo_unidade || null,
      identificacao_filial,
      responsavel_fiscal: responsavel_fiscal || null,
      cep,
      logradouro,
      bairro,
      complemento,
      cidade: cidade || null,
      estado: estado || null,
      atividade: atividade || null,
      constituicao,
      inscricao_estadual: inscricao_estadual || null,
      inscricao_municipal: inscricao_municipal || null,
      socio_responsavel_pj: socio_responsavel_pj || null,
      capital_social: Number.isNaN(capital_social) ? null : capital_social,
      data_abertura_cliente,
      data_entrada_contabilidade,
      data_saida,
      regime_tributario: regime_tributario || null,
      contato_nome: contato_nome || null,
      contato_telefone: contato_telefone || null,
      valor_contrato,
      cobranca_por_grupo,
      ativo,
      situacao_empresa,
    })
    .eq("id", id);

  if (updateError) {
    throw new Error(
      messageFromSupabaseError(
        updateError,
        "Não foi possível atualizar o cliente."
      )
    );
  }

  const { data: servRow, error: servUpsertErr } = await (supabase
    .from("servicos_contratados") as any)
    .upsert(
      {
        cliente_id: id,
        contabil_fiscal,
        contabil_contabilidade,
        contabil_dp,
        contabil_pericia,
        contabil_legalizacao,
        juridico_civel,
        juridico_trabalhista,
        juridico_licitacao,
        juridico_penal,
        juridico_empresarial,
        planejamento_societario_tributario,
      },
      { onConflict: "cliente_id" }
    )
    .select("juridico_civel, juridico_trabalhista")
    .single();

  if (servUpsertErr) {
    throw new Error(
      servUpsertErr.message || "Não foi possível salvar os serviços contratados."
    );
  }

  const juridicoCivelDb = Boolean(servRow?.juridico_civel);
  const juridicoTrabalhistaDb = Boolean(servRow?.juridico_trabalhista);

  await (supabase.from("responsaveis_internos") as any)
    .upsert(
      {
        cliente_id: id,
        responsavel_comercial: responsavel_comercial || null,
        responsavel_contabil: responsavel_contabil || RESPONSAVEL_PADRAO_CONTABIL,
        responsavel_juridico: responsavelJuridicoSalvo(
          responsavel_juridico,
          juridicoCivelDb,
          juridicoTrabalhistaDb
        ),
        responsavel_planejamento_tributario:
          responsavel_planejamento_tributario || null,
        responsavel_dp: responsavel_dp || RESPONSAVEL_PADRAO_DP,
        responsavel_financeiro: responsavel_financeiro || RESPONSAVEL_PADRAO_FINANCEIRO,
      },
      { onConflict: "cliente_id" }
    );

  await registrarLog("Edição de Cliente", {
    id,
    razao_social,
    cnpj,
  });

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  redirect(`/clientes/${id}`);
}

async function addSocio(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const cliente_id = String(formData.get("cliente_id"));
  const nome_socio = String(formData.get("nome_socio")).trim();
  const percentual_participacao = Number(formData.get("percentual_participacao"));

  if (!nome_socio) throw new Error("Nome do sócio é obrigatório.");

  const { error } = await (supabase.from("quadro_socios") as any).insert({
    cliente_id,
    nome_socio,
    percentual_participacao,
  });

  if (error) throw new Error(error.message);

  await registrarLog("Adição de Sócio", { cliente_id, nome_socio, percentual_participacao });

  revalidatePath(`/clientes/${cliente_id}/edit`);
  revalidatePath(`/clientes/${cliente_id}`);
}

async function removeSocio(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("socio_id"));
  const cliente_id = String(formData.get("cliente_id"));

  const { error } = await (supabase.from("quadro_socios") as any).delete().eq("id", id);

  if (error) throw new Error(error.message);

  await registrarLog("Remoção de Sócio", { cliente_id, socio_id: id });

  revalidatePath(`/clientes/${cliente_id}/edit`);
  revalidatePath(`/clientes/${cliente_id}`);
}

export default async function EditClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getCurrentProfile();
  const showContractValue = profile ? canSeeContractValue(profile.tipo_usuario) : false;
  
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: dataCliente, error } = await supabase
    .from("clientes")
    .select(`
      *,
      responsaveis_internos (*),
      servicos_contratados (*),
      quadro_socios (*)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!dataCliente || error) {
    notFound();
  }

  const cliente: any = dataCliente;
  const responsaveis = Array.isArray(cliente.responsaveis_internos)
    ? (cliente.responsaveis_internos[0] ?? {})
    : (cliente.responsaveis_internos ?? {});

  // Buscar serviços diretamente para garantir que os checkboxes carreguem corretamente
  const servicosEmbed = Array.isArray(cliente.servicos_contratados)
    ? cliente.servicos_contratados[0]
    : cliente.servicos_contratados;
  const { data: servicosDireto } = await supabase
    .from("servicos_contratados")
    .select("*")
    .eq("cliente_id", id)
    .maybeSingle();
  const servicos = servicosDireto ?? servicosEmbed ?? {};
  const socios = cliente.quadro_socios || [];

  const { data: gruposData } = await supabase
    .from("grupos_economicos")
    .select("id, nome")
    .order("nome", { ascending: true });
  const grupos = gruposData ?? [];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Administração</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">Editar Cliente</h1>
          <p className="break-words text-neutral-400">Alterando dados de {cliente.razao_social}</p>
        </div>
        <a 
          href={`/clientes/${id}`}
          className="shrink-0 self-start rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 sm:self-center"
        >
          Cancelar
        </a>
      </div>

      <div className="space-y-6">
        <form id="edit-cliente-form" action={updateCliente} className="space-y-6">
          <input type="hidden" name="id" value={id} />
          
          <Card title="Dados Básicos">
            <div className="grid gap-4 md:grid-cols-2">
              <CnpjReceitaLookup
                formId="edit-cliente-form"
                initialCnpj={cliente.cnpj}
              />
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-neutral-300">Razão Social *</label>
                <input
                  name="razao_social"
                  required
                  defaultValue={cliente.razao_social}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">ID do Domínio</label>
                <input
                  name="dominio"
                  defaultValue={cliente.dominio}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Grupo de Clientes</label>
                <select
                  name="grupo_id"
                  defaultValue={cliente.grupo_id || ""}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                >
                  <option value="">Nenhum grupo</option>
                  {grupos.map((grupo: any) => (
                    <option key={grupo.id} value={grupo.id}>
                      {grupo.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Situação da empresa</label>
                <select
                  name="situacao_empresa"
                  defaultValue={getSituacaoEmpresa(cliente)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                >
                  <option value="ativa">Empresa ativa</option>
                  <option value="paralisada">Empresa paralisada</option>
                  <option value="desativada">Empresa desativada</option>
                </select>
                <p className="text-xs text-neutral-500">
                  Paralisada indica operação suspensa temporariamente (destaque em amarelo no painel).
                </p>
              </div>
            </div>
          </Card>

          <Card title="Localização e Operação">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Unidade</label>
                <select
                  name="tipo_unidade"
                  defaultValue={cliente.tipo_unidade || ""}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                >
                  <option value="">Selecionar</option>
                  <option value="Matriz">Matriz</option>
                  <option value="Filial">Filial</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">
                  Identificação da filial
                </label>
                <input
                  name="identificacao_filial"
                  defaultValue={cliente.identificacao_filial ?? ""}
                  placeholder="Ex.: Filial 01, Filial 02"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-100 focus:outline-none"
                />
                <p className="text-xs text-neutral-500">
                  Preencha quando a unidade for Filial (exibido no card do
                  dashboard).
                </p>
              </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">CEP</label>
              <input
                name="cep"
                type="text"
                inputMode="numeric"
                defaultValue={
                  cliente.cep && String(cliente.cep).replace(/\D/g, "").length === 8
                    ? String(cliente.cep).replace(/\D/g, "").replace(/^(\d{5})(\d{3})$/, "$1-$2")
                    : cliente.cep ?? ""
                }
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-neutral-300">Logradouro</label>
              <input
                name="logradouro"
                type="text"
                defaultValue={cliente.logradouro ?? ""}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Complemento</label>
              <input
                name="complemento"
                type="text"
                defaultValue={cliente.complemento ?? ""}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Bairro</label>
              <input
                name="bairro"
                type="text"
                defaultValue={cliente.bairro ?? ""}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Cidade</label>
              <input
                name="cidade"
                defaultValue={cliente.cidade ?? ""}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Estado (UF)</label>
              <input
                name="estado"
                defaultValue={cliente.estado ?? ""}
                maxLength={2}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Atividade</label>
              <select
                name="atividade"
                defaultValue={cliente.atividade || ""}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              >
                <option value="">Selecionar</option>
                <option value="Serviço">Serviço</option>
                <option value="Comércio">Comércio</option>
                <option value="Indústria">Indústria</option>
                <option value="Ambos">Ambos</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Constituição</label>
              <select
                name="constituicao"
                defaultValue={cliente.constituicao ? "Sim" : "Não"}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              >
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title="Fiscal e Tributário">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Inscrição Estadual</label>
              <input
                name="inscricao_estadual"
                defaultValue={cliente.inscricao_estadual}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Inscrição Municipal</label>
              <input
                name="inscricao_municipal"
                defaultValue={cliente.inscricao_municipal}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Responsável Fiscal</label>
              <input
                name="responsavel_fiscal"
                defaultValue={cliente.responsavel_fiscal}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Regime Tributário</label>
                <input
                  name="regime_tributario"
                  defaultValue={cliente.regime_tributario}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
            </div>
          </Card>

          <Card title="Societário e Interno">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Sócio Responsável PJ</label>
                <input
                  name="socio_responsavel_pj"
                  defaultValue={cliente.socio_responsavel_pj}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Capital Social</label>
                <input
                  name="capital_social"
                  type="number"
                  defaultValue={cliente.capital_social}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              {showContractValue && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-300">Valor do Contrato (mensal)</label>
                    <CurrencyInput
                      name="valor_contrato"
                      defaultValue={cliente.valor_contrato}
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                      placeholder="0,00"
                      showSymbol
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-300">Cobrança por Grupo?</label>
                    <select
                      name="cobranca_por_grupo"
                      defaultValue={cliente.cobranca_por_grupo ? "Sim" : "Não"}
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                    >
                      <option value="Não">Não</option>
                      <option value="Sim">Sim</option>
                    </select>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Pessoa de contato</label>
                <input
                  name="contato_nome"
                  defaultValue={cliente.contato_nome}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Telefone de contato</label>
                <input
                  name="contato_telefone"
                  defaultValue={cliente.contato_telefone}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
            </div>
          </Card>

          <Card title="Responsáveis Internos">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Responsável Comercial</label>
                <input
                  name="responsavel_comercial"
                  defaultValue={responsaveis.responsavel_comercial}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Responsável Contábil</label>
                <input
                  name="responsavel_contabil"
                  defaultValue={responsaveis.responsavel_contabil}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Responsável Jurídico</label>
                <input
                  name="responsavel_juridico"
                  defaultValue={responsavelJuridicoCampoDefault(
                    responsaveis.responsavel_juridico,
                    servicos
                  )}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Planejamento Tributário</label>
                <input
                  name="responsavel_planejamento_tributario"
                  defaultValue={responsaveis.responsavel_planejamento_tributario}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Responsável Depto. Pessoal</label>
                <input
                  name="responsavel_dp"
                  defaultValue={responsaveis.responsavel_dp}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Responsável Financeiro</label>
                <input
                  name="responsavel_financeiro"
                  defaultValue={responsaveis.responsavel_financeiro}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
            </div>
          </Card>

          <Card title="Serviços Contratados">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="space-y-4">
                <p className="text-sm font-bold text-amber-500 uppercase tracking-widest border-b border-amber-500/20 pb-2">1. Serviço Contábil</p>
                <div className="grid grid-cols-1 gap-3">
                  <label className="flex items-center gap-3 text-sm text-neutral-200 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      name="contabil_fiscal" 
                      defaultChecked={Boolean(servicos?.contabil_fiscal)}
                      className="accent-amber-500 h-5 w-5 rounded border-neutral-700 bg-neutral-800" 
                    />
                    <span className="group-hover:text-amber-400 transition-colors">Fiscal</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm text-neutral-200 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      name="contabil_contabilidade" 
                      defaultChecked={Boolean(servicos?.contabil_contabilidade)}
                      className="accent-amber-500 h-5 w-5 rounded border-neutral-700 bg-neutral-800" 
                    />
                    <span className="group-hover:text-amber-400 transition-colors">Contabilidade</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm text-neutral-200 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      name="contabil_dp" 
                      defaultChecked={Boolean(servicos?.contabil_dp)}
                      className="accent-amber-500 h-5 w-5 rounded border-neutral-700 bg-neutral-800" 
                    />
                    <span className="group-hover:text-amber-400 transition-colors">Depto. Pessoal</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm text-neutral-200 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      name="contabil_pericia" 
                      defaultChecked={Boolean(servicos?.contabil_pericia)}
                      className="accent-amber-500 h-5 w-5 rounded border-neutral-700 bg-neutral-800" 
                    />
                    <span className="group-hover:text-amber-400 transition-colors">Perícia</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm text-neutral-200 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      name="contabil_legalizacao" 
                      defaultChecked={Boolean(servicos?.contabil_legalizacao)}
                      className="accent-amber-500 h-5 w-5 rounded border-neutral-700 bg-neutral-800" 
                    />
                    <span className="group-hover:text-amber-400 transition-colors">Legalização</span>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-blue-500 uppercase tracking-widest border-b border-blue-500/20 pb-2">2. Jurídico</p>
                <div className="grid grid-cols-1 gap-3">
                  <label className="flex items-center gap-3 text-sm text-neutral-200 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      name="juridico_civel" 
                      defaultChecked={Boolean(servicos?.juridico_civel)}
                      className="accent-blue-500 h-5 w-5 rounded border-neutral-700 bg-neutral-800" 
                    />
                    <span className="group-hover:text-blue-400 transition-colors">Cível</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm text-neutral-200 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      name="juridico_trabalhista" 
                      defaultChecked={Boolean(servicos?.juridico_trabalhista)}
                      className="accent-blue-500 h-5 w-5 rounded border-neutral-700 bg-neutral-800" 
                    />
                    <span className="group-hover:text-blue-400 transition-colors">Trabalhista</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm text-neutral-200 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      name="juridico_licitacao" 
                      defaultChecked={Boolean(servicos?.juridico_licitacao)}
                      className="accent-blue-500 h-5 w-5 rounded border-neutral-700 bg-neutral-800" 
                    />
                    <span className="group-hover:text-blue-400 transition-colors">Licitação</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm text-neutral-200 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      name="juridico_penal" 
                      defaultChecked={Boolean(servicos?.juridico_penal)}
                      className="accent-blue-500 h-5 w-5 rounded border-neutral-700 bg-neutral-800" 
                    />
                    <span className="group-hover:text-blue-400 transition-colors">Penal</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm text-neutral-200 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      name="juridico_empresarial" 
                      defaultChecked={Boolean(servicos?.juridico_empresarial)}
                      className="accent-blue-500 h-5 w-5 rounded border-neutral-700 bg-neutral-800" 
                    />
                    <span className="group-hover:text-blue-400 transition-colors">Empresarial</span>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-2">3. Planejamento</p>
                <div className="grid grid-cols-1 gap-3">
                  <label className="flex items-center gap-3 text-sm text-neutral-200 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      name="planejamento_societario_tributario" 
                      defaultChecked={Boolean(servicos?.planejamento_societario_tributario)}
                      className="accent-emerald-500 h-5 w-5 rounded border-neutral-700 bg-neutral-800" 
                    />
                    <span className="group-hover:text-emerald-400 transition-colors">Societário e Tributário</span>
                  </label>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Datas">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Data de Abertura</label>
                <input
                  name="data_abertura_cliente"
                  type="date"
                  defaultValue={cliente.data_abertura_cliente}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Entrada na Contabilidade</label>
                <input
                  name="data_entrada_contabilidade"
                  type="date"
                  defaultValue={cliente.data_entrada_contabilidade}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Data de Saída</label>
                <input
                  name="data_saida"
                  type="date"
                  defaultValue={cliente.data_saida}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="submit"
              className="w-full rounded-lg bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 sm:w-auto"
            >
              Salvar Alterações
            </button>
          </div>
        </form>

        <Card title="Quadro de Sócios (Gerenciar)">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {socios.map((socio: any) => (
                <div key={socio.id} className="flex items-center justify-between rounded-xl bg-neutral-900 border border-neutral-800 p-4">
                  <div>
                    <p className="font-semibold text-neutral-100">{socio.nome_socio}</p>
                    <p className="text-xs text-neutral-500">{socio.percentual_participacao}% de participação</p>
                  </div>
                  <form action={removeSocio}>
                    <input type="hidden" name="socio_id" value={socio.id} />
                    <input type="hidden" name="cliente_id" value={id} />
                    <button type="submit" className="text-red-500 hover:text-red-400 text-xs font-semibold">Remover</button>
                  </form>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-800 pt-4">
              <p className="text-sm font-semibold mb-3">Adicionar novo sócio</p>
              <form action={addSocio} className="grid gap-3 sm:grid-cols-3">
                <input type="hidden" name="cliente_id" value={id} />
                <input 
                  name="nome_socio" 
                  placeholder="Nome completo" 
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
                <input 
                  name="percentual_participacao" 
                  type="number" 
                  placeholder="Participação %" 
                  defaultValue="0"
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
                <button type="submit" className="rounded-lg bg-neutral-100 text-black px-4 py-2 text-xs font-bold hover:bg-white transition">
                  Adicionar Sócio
                </button>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
