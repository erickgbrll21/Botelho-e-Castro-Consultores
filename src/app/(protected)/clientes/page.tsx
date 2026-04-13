import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminProfile, getCurrentProfile, canSeeContractValue } from "@/lib/auth";
import { CnpjReceitaLookup } from "@/components/clientes/cnpj-receita-lookup";
import { DeleteClienteButton } from "@/components/clientes/delete-cliente-button";
import { ImportClientesButton } from "@/components/clientes/import-clientes-button";
import { SincronizarBrasilApiButton } from "@/components/clientes/sincronizar-brasilapi-button";
import { registrarLog } from "@/lib/logs";
import { formatDateTimePtBR } from "@/lib/format-date";
import { messageFromSupabaseError } from "@/lib/supabase-errors";
import {
  RESPONSAVEL_PADRAO_CONTABIL,
  RESPONSAVEL_PADRAO_DP,
  RESPONSAVEL_PADRAO_FINANCEIRO,
  responsavelJuridicoSalvo,
} from "@/lib/responsaveis-padrao";
import {
  getSituacaoEmpresa,
  situacaoEmpresaLabels,
  situacaoIndicatorClass,
} from "@/lib/cliente-situacao";
import { parseFormCheckbox } from "@/lib/parse-form-checkbox";

async function createCliente(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();

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
  const socio_responsavel_pj = String(
    formData.get("socio_responsavel_pj") ?? ""
  ).trim();
  const capital_social = Number(formData.get("capital_social") ?? 0);
  const data_abertura_cliente = formData.get("data_abertura_cliente")
    ? String(formData.get("data_abertura_cliente"))
    : null;
  const data_entrada_contabilidade = formData.get("data_entrada_contabilidade")
    ? String(formData.get("data_entrada_contabilidade"))
    : null;
  const data_saida = formData.get("data_saida")
    ? String(formData.get("data_saida"))
    : null;
  const regime_tributario = String(
    formData.get("regime_tributario") ?? ""
  ).trim();
  const contato_nome = String(formData.get("contato_nome") ?? "").trim();
  const contato_telefone = String(formData.get("contato_telefone") ?? "").trim();
  const valor_contrato = Number(formData.get("valor_contrato") ?? 0);
  const cobranca_por_grupo = formData.get("cobranca_por_grupo") === "Sim";

  const responsavel_comercial = String(
    formData.get("responsavel_comercial") ?? ""
  ).trim();
  const responsavel_contabil = String(
    formData.get("responsavel_contabil") ?? ""
  ).trim();
  const responsavel_juridico = String(
    formData.get("responsavel_juridico") ?? ""
  ).trim();
  const responsavel_planejamento_tributario = String(
    formData.get("responsavel_planejamento_tributario") ?? ""
  ).trim();
  const responsavel_dp = String(formData.get("responsavel_dp") ?? "").trim();
  const responsavel_financeiro = String(formData.get("responsavel_financeiro") ?? "").trim();

  const socio_nome = String(formData.get("socio_nome") ?? "").trim();
  const socioPercentNum = Number(formData.get("socio_percentual") ?? 100);
  const socio_percentual = Number.isFinite(socioPercentNum) ? socioPercentNum : 100;

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

  const { data: cliente, error } = await (supabase
    .from("clientes") as any)
    .insert({
      razao_social,
      cnpj,
      dominio: dominio || null,
      grupo_id: grupo_id || null,
      tipo_unidade,
      identificacao_filial,
      responsavel_fiscal: responsavel_fiscal || null,
      cep,
      logradouro,
      bairro,
      complemento,
      cidade: cidade || null,
      estado: estado || null,
      atividade,
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
      valor_contrato: Number.isNaN(valor_contrato) ? null : valor_contrato,
      cobranca_por_grupo,
      ativo: true,
      situacao_empresa: "ativa",
    })
    .select("id")
    .maybeSingle();

  if (error || !cliente?.id) {
    const msg = error
      ? messageFromSupabaseError(error, "Não foi possível criar a cliente.")
      : "Não foi possível criar a cliente.";
    const isUniqueViolation =
      !!error &&
      (error.code === "23505" ||
        /duplicate key|unique constraint/i.test(error.message ?? ""));
    const likelyCnpjDuplicate =
      isUniqueViolation && /cnpj/i.test(error.message ?? "");
    if (likelyCnpjDuplicate) {
      redirect(
        `/clientes?novoCnpj=${encodeURIComponent(cnpj)}#cadastro-novo-cliente`
      );
    }
    throw new Error(msg);
  }

  const { data: servRow, error: servErr } = await (supabase
    .from("servicos_contratados") as any)
    .insert({
      cliente_id: cliente.id,
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
    })
    .select("juridico_civel, juridico_trabalhista")
    .single();
  if (servErr) {
    throw new Error(
      servErr.message || "Não foi possível salvar os serviços contratados."
    );
  }

  const juridicoCivelDb = Boolean(servRow?.juridico_civel);
  const juridicoTrabalhistaDb = Boolean(servRow?.juridico_trabalhista);

  const { error: respErr } = await (supabase.from("responsaveis_internos") as any).insert({
    cliente_id: cliente.id,
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
  });
  if (respErr) {
    throw new Error(
      respErr.message || "Não foi possível salvar os responsáveis internos."
    );
  }

  if (socio_nome) {
    const { error: socioErr } = await (supabase.from("quadro_socios") as any).insert({
      cliente_id: cliente.id,
      nome_socio: socio_nome,
      percentual_participacao: socio_percentual,
    });
    if (socioErr) {
      throw new Error(socioErr.message || "Não foi possível salvar o sócio.");
    }
  }

  await registrarLog("Cadastro de Cliente", {
    razao_social,
    cnpj,
    id: cliente.id,
  });

  await revalidatePath("/clientes");
}

async function createGrupo(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const nome = String(formData.get("nome") ?? "").trim();
  const valor_contrato = Number(formData.get("valor_contrato") ?? 0);

  if (!nome) {
    throw new Error("Nome do grupo é obrigatório.");
  }

  const { error } = await (supabase.from("grupos_economicos") as any).insert({
    nome,
    valor_contrato: Number.isNaN(valor_contrato) ? null : valor_contrato,
  });

  if (error) {
    throw new Error(error.message);
  }

  await registrarLog("Criação de Grupo", { nome, valor_contrato });

  await revalidatePath("/clientes");
}

async function updateGrupo(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("grupo_id"));
  const nome = String(formData.get("nome") ?? "").trim();
  const valor_contrato = Number(formData.get("valor_contrato") ?? 0);

  if (!id || !nome) {
    throw new Error("ID e nome do grupo são obrigatórios.");
  }

  const { error } = await (supabase.from("grupos_economicos") as any)
    .update({
      nome,
      valor_contrato: Number.isNaN(valor_contrato) ? null : valor_contrato,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await registrarLog("Edição de Grupo", { id, nome, valor_contrato });

  await revalidatePath("/clientes");
}

async function deleteGrupo(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const grupo_id = String(formData.get("grupo_id") ?? "").trim();

  if (!grupo_id) {
    throw new Error("ID do grupo é obrigatório.");
  }

  // Remove vínculo das clientes antes de excluir o grupo
  await (supabase
    .from("clientes") as any)
    .update({ grupo_id: null })
    .eq("grupo_id", grupo_id);

  const { error } = await (supabase
    .from("grupos_economicos") as any)
    .delete()
    .eq("id", grupo_id);

  if (error) {
    throw new Error(error.message);
  }

  await registrarLog("Exclusão de Grupo", { grupo_id });

  await revalidatePath("/clientes");
}

async function deleteCliente(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const cliente_id = String(formData.get("cliente_id") ?? "").trim();

  if (!cliente_id) {
    throw new Error("ID da cliente é obrigatório.");
  }

  const { error } = await (supabase.from("clientes") as any).delete().eq("id", cliente_id);
  if (error) {
    throw new Error(error.message);
  }

  await registrarLog("Exclusão de Cliente", { cliente_id });

  await revalidatePath("/clientes");
  await revalidatePath("/dashboard");
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    grupo?: string;
    editGrupo?: string;
    novoCnpj?: string;
  }>;
}) {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();
  const isAdmin = profile && ["admin", "diretor", "financeiro"].includes(profile.tipo_usuario);
  const showContractValue = profile ? canSeeContractValue(profile.tipo_usuario) : false;
  
  const { q, grupo: grupoFiltro, editGrupo: editGrupoId, novoCnpj: novoCnpjRaw } =
    await searchParams;
  const term = q?.trim() ?? "";
  const grupoId = grupoFiltro?.trim() ?? "";
  const novoCnpjDigits = String(novoCnpjRaw ?? "")
    .replace(/\D/g, "")
    .slice(0, 14);
  const cnpjParaCadastro =
    novoCnpjDigits.length === 14 ? novoCnpjDigits : null;

  const { data: clienteJaCadastrado } = cnpjParaCadastro
    ? await (supabase.from("clientes") as any)
        .select("id, razao_social, cnpj")
        .eq("cnpj", cnpjParaCadastro)
        .maybeSingle()
    : { data: null as { id: string; razao_social: string; cnpj: string } | null };

  const gruposQuery = supabase
    .from("grupos_economicos")
    .select("id, nome, descricao, valor_contrato")
    .order("nome", { ascending: true });

  let clientesQuery = supabase
    .from("clientes")
    .select(
      `
        id,
        razao_social,
        cnpj,
        dominio,
        tipo_unidade,
        identificacao_filial,
        responsavel_fiscal,
        cep,
        logradouro,
        bairro,
        complemento,
        cidade,
        estado,
        atividade,
        constituicao,
        inscricao_estadual,
        inscricao_municipal,
        grupo_economico,
        grupo_id,
        grupos_economicos ( nome ),
        socio_responsavel_pj,
        capital_social,
        data_abertura_cliente,
        data_entrada_contabilidade,
        data_saida,
        regime_tributario,
        contato_nome,
        contato_telefone,
        valor_contrato,
        cobranca_por_grupo,
        ativo,
        situacao_empresa,
        responsaveis_internos (responsavel_comercial, responsavel_contabil, responsavel_juridico, responsavel_planejamento_tributario, responsavel_dp, responsavel_financeiro),
        servicos_contratados (*),
        created_at
      `
    )
    .order("razao_social", { ascending: true });

  if (term) {
    clientesQuery = clientesQuery.ilike("razao_social", `%${term}%`);
  }

  if (grupoId) {
    clientesQuery = clientesQuery.eq("grupo_id", grupoId);
  }

  const [{ data: gruposData }, { data: dataClientes }] = await Promise.all([
    gruposQuery,
    clientesQuery,
  ]);
  const grupos: any[] = gruposData ?? [];
  const editingGrupo = editGrupoId ? grupos.find(g => g.id === editGrupoId) : null;
  const clientes: any[] = dataClientes ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            Clientes
          </p>
          <h1 className="text-2xl font-semibold sm:text-3xl">Cadastro e consulta</h1>
          <p className="text-neutral-400">
            Administradores podem cadastrar; todos os usuários podem visualizar a lista completa.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          {isAdmin && (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
              <ImportClientesButton grupos={grupos} />
              <SincronizarBrasilApiButton />
            </div>
          )}
          <form className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
            <select
              name="grupo"
              defaultValue={grupoId}
              className="w-full min-w-0 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none sm:w-auto sm:min-w-[11rem]"
            >
              <option value="">Todos os grupos</option>
              {grupos.map((grupo) => (
                <option key={grupo.id} value={grupo.id}>
                  {grupo.nome}
                </option>
              ))}
            </select>
            <input
              name="q"
              defaultValue={term}
              placeholder="Buscar cliente..."
              className="w-full min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-100 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200 sm:w-auto"
            >
              Buscar
            </button>
          </form>
        </div>
      </div>

      {isAdmin && (
        <Card
          id="cadastro-novo-cliente"
          title="Cadastrar novo cliente (apenas administradores)"
          className="scroll-mt-24 border-amber-500/30"
          action={<Pill label="Restrito a admins" tone="critical" />}
        >
          {clienteJaCadastrado ? (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <p className="font-semibold">
                CNPJ ou Empresa já foi cadastrado.
              </p>
              <p className="mt-1 text-amber-200/90">
                Já existe um cliente com este CNPJ:{" "}
                <span className="font-mono">{clienteJaCadastrado.cnpj}</span>{" "}
                —{" "}
                <a
                  href={`/clientes/${clienteJaCadastrado.id}`}
                  className="underline underline-offset-2 hover:text-amber-100"
                >
                  {clienteJaCadastrado.razao_social}
                </a>
                .
              </p>
            </div>
          ) : null}
          <form
            id="cadastro-cliente-form"
            action={createCliente}
            className="grid gap-4 md:grid-cols-2"
          >
            <CnpjReceitaLookup
              key={cnpjParaCadastro ?? "default"}
              formId="cadastro-cliente-form"
              initialCnpj={cnpjParaCadastro}
              autoLookupOnMount={Boolean(cnpjParaCadastro)}
            />
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-neutral-300">Razão social *</label>
              <input
                name="razao_social"
                required
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Domínio</label>
              <input
                name="dominio"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="Ex.: bcconsultores.adv.br"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Grupo Econômico</label>
              <select
                name="grupo_id"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                defaultValue=""
              >
                <option value="">Selecionar grupo cadastrado</option>
                {grupos.map((grupo) => (
                  <option key={grupo.id} value={grupo.id}>
                    {grupo.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Unidade (Matriz/Filial)</label>
              <select
                name="tipo_unidade"
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
                placeholder="Ex.: Filial 01, Filial 02"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-100 focus:outline-none"
              />
              <p className="text-xs text-neutral-500">
                Quando for Filial, informe o rótulo (ex.: Filial 01); aparece no
                card do dashboard.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">CEP</label>
              <input
                name="cep"
                type="text"
                inputMode="numeric"
                placeholder="00000-000"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-neutral-300">Logradouro</label>
              <input
                name="logradouro"
                type="text"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="Rua, avenida, número…"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Complemento</label>
              <input
                name="complemento"
                type="text"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Bairro</label>
              <input
                name="bairro"
                type="text"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Cidade</label>
              <input
                name="cidade"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Estado (UF)</label>
              <input
                name="estado"
                maxLength={2}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="Ex.: SP"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Atividade</label>
              <select
                name="atividade"
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
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              >
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Inscrição Estadual</label>
              <input
                name="inscricao_estadual"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Inscrição Municipal</label>
              <input
                name="inscricao_municipal"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">
                Sócio responsável PJ
              </label>
              <input
                name="socio_responsavel_pj"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">
                Nome do Sócio (Quadro de Sócios)
              </label>
              <input
                name="socio_nome"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="Ex.: João Silva"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">
                Participação do Sócio (%)
              </label>
              <input
                name="socio_percentual"
                type="number"
                min="0"
                max="100"
                defaultValue="100"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Capital social</label>
              <input
                name="capital_social"
                type="number"
                min="0"
                step="1000"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            {showContractValue && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">Valor do contrato (mensal)</label>
                  <input
                    name="valor_contrato"
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">Cobrança por Grupo?</label>
                  <select
                    name="cobranca_por_grupo"
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Data de abertura</label>
              <input
                name="data_abertura_cliente"
                type="date"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Entrada na contabilidade</label>
              <input
                name="data_entrada_contabilidade"
                type="date"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Regime tributário</label>
              <input
                name="regime_tributario"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="Simples, Lucro Presumido, Lucro Real..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Pessoa de contato</label>
              <input
                name="contato_nome"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="Nome do contato"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Telefone de contato</label>
              <input
                name="contato_telefone"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Responsável comercial (quem fechou)</label>
              <input
                name="responsavel_comercial"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="Ex.: Dr. Otávio"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Responsável Fiscal</label>
              <input
                name="responsavel_fiscal"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="Nome do responsável"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Responsável contábil</label>
              <input
                name="responsavel_contabil"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Responsável jurídico</label>
              <input
                name="responsavel_juridico"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">
                Planejamento tributário
              </label>
              <input
                name="responsavel_planejamento_tributario"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Responsável Depto. Pessoal</label>
              <input
                name="responsavel_dp"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="Nome do responsável"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Responsável Financeiro</label>
              <input
                name="responsavel_financeiro"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="Nome do responsável"
              />
            </div>

            <div className="md:col-span-2 space-y-4 border-t border-neutral-800 pt-4">
              <p className="font-semibold text-neutral-200">Serviços Contratados</p>
              
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-amber-500 uppercase tracking-wider">1. Serviço Contábil</p>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer">
                      <input type="checkbox" name="contabil_fiscal" className="accent-amber-500 h-4 w-4" />
                      Fiscal
                    </label>
                    <label className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer">
                      <input type="checkbox" name="contabil_contabilidade" className="accent-amber-500 h-4 w-4" />
                      Contabilidade
                    </label>
                    <label className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer">
                      <input type="checkbox" name="contabil_dp" className="accent-amber-500 h-4 w-4" />
                      Departamento Pessoal
                    </label>
                    <label className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer">
                      <input type="checkbox" name="contabil_pericia" className="accent-amber-500 h-4 w-4" />
                      Perícia
                    </label>
                    <label className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer">
                      <input type="checkbox" name="contabil_legalizacao" className="accent-amber-500 h-4 w-4" />
                      Legalização
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-blue-500 uppercase tracking-wider">2. Jurídico</p>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer">
                      <input type="checkbox" name="juridico_civel" className="accent-blue-500 h-4 w-4" />
                      Cível
                    </label>
                    <label className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer">
                      <input type="checkbox" name="juridico_trabalhista" className="accent-blue-500 h-4 w-4" />
                      Trabalhista
                    </label>
                    <label className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer">
                      <input type="checkbox" name="juridico_licitacao" className="accent-blue-500 h-4 w-4" />
                      Licitação
                    </label>
                    <label className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer">
                      <input type="checkbox" name="juridico_penal" className="accent-blue-500 h-4 w-4" />
                      Penal
                    </label>
                    <label className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer">
                      <input type="checkbox" name="juridico_empresarial" className="accent-blue-500 h-4 w-4" />
                      Empresarial
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-emerald-500 uppercase tracking-wider">3. Planejamento</p>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer">
                      <input type="checkbox" name="planejamento_societario_tributario" className="accent-emerald-500 h-4 w-4" />
                      Societário e Tributário
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex items-end pt-4">
              <button
                type="submit"
                className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
              >
                Cadastrar cliente
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card
        title={editingGrupo ? `Editar Grupo: ${editingGrupo.nome}` : "Grupos de clientes"}
        action={
          editingGrupo ? (
            <a href="/clientes" className="text-xs text-neutral-400 hover:text-white transition-colors underline">
              Cancelar edição e criar novo
            </a>
          ) : isAdmin ? (
            <Pill label="Gestão de grupos" tone="neutral" />
          ) : null
        }
        className="overflow-hidden"
      >
        {isAdmin && (
          <form action={editingGrupo ? updateGrupo : createGrupo} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {editingGrupo && <input type="hidden" name="grupo_id" value={editingGrupo.id} />}
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Nome do grupo *</label>
              <input
                name="nome"
                required
                defaultValue={editingGrupo?.nome ?? ""}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="Ex.: Grupo XPTO"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Valor do Contrato (Mensal)</label>
              <input
                name="valor_contrato"
                type="number"
                step="0.01"
                defaultValue={editingGrupo?.valor_contrato ?? ""}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="R$ 0,00"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-white px-6 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
              >
                {editingGrupo ? "Salvar Alterações" : "Adicionar grupo"}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr className="border-b border-neutral-800/80">
                <th className="py-3 pr-4 font-medium">Nome do Grupo</th>
                {showContractValue && <th className="py-3 pr-4 font-medium">Valor do Contrato</th>}
                {isAdmin && <th className="py-3 pr-4 font-medium text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {grupos.map((grupo) => (
                <tr key={grupo.id}>
                  <td className="py-3 pr-4 font-semibold text-neutral-50">
                    {grupo.nome}
                  </td>
                  {showContractValue && (
                    <td className="py-3 pr-4 text-neutral-300">
                      {grupo.valor_contrato ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grupo.valor_contrato) : "—"}
                    </td>
                  )}
                  {isAdmin && (
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap justify-end gap-2">
                      <a
                        href={`?editGrupo=${grupo.id}`}
                        className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                      >
                        Editar
                      </a>
                      <form action={deleteGrupo} className="inline">
                        <input type="hidden" name="grupo_id" value={grupo.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
                        >
                          Remover
                        </button>
                      </form>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {grupos.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? (showContractValue ? 3 : 2) : (showContractValue ? 2 : 1)} className="py-4 text-center text-neutral-400">
                    Nenhum grupo cadastrado ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Clientes"
        action={
          <p className="max-w-full text-xs text-neutral-400 break-words sm:max-w-md sm:text-right">
            {isAdmin ? "Você tem permissão para cadastrar e editar dados." : "Visualização permitida para todos os usuários."}
          </p>
        }
        className="overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr className="border-b border-neutral-800/80">
                <th className="py-3 pr-4 font-medium">Razão Social</th>
                <th className="py-3 pr-4 font-medium hidden md:table-cell">Grupo</th>
                <th className="py-3 pr-4 font-medium hidden sm:table-cell">Data de Inscrição</th>
                <th className="py-3 pr-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {clientes.map((cliente) => {
                const situacao = getSituacaoEmpresa(cliente);
                const { titulo: situacaoTitulo } = situacaoEmpresaLabels(situacao);
                return (
                <tr key={cliente.id} className="align-top">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${situacaoIndicatorClass(situacao)}`}
                        title={situacaoTitulo}
                      />
                      <p className="font-semibold text-neutral-50 leading-tight">{cliente.razao_social}</p>
                    </div>
                    <p className="text-[10px] md:text-xs text-neutral-500 mt-1">{cliente.cnpj}</p>
                  </td>
                  <td className="py-4 pr-4 text-neutral-300 hidden md:table-cell">
                    {cliente.grupos_economicos?.nome ?? "—"}
                  </td>
                  <td className="py-4 pr-4 text-neutral-300 hidden sm:table-cell">
                    {formatDateTimePtBR(cliente.created_at, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="py-4 pr-4 text-right flex flex-col sm:flex-row justify-end items-end gap-2 sm:gap-3">
                    <a
                      href={`/clientes/${cliente.id}`}
                      className="inline-flex items-center rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs font-semibold text-neutral-200 transition hover:border-neutral-700 hover:bg-neutral-800"
                    >
                      Ver detalhes
                    </a>
                    {isAdmin && (
                      <DeleteClienteButton
                        clienteId={cliente.id}
                        action={deleteCliente}
                      />
                    )}
                  </td>
                </tr>
              );
              })}

              {clientes.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-6 text-center text-sm text-neutral-400"
                  >
                    Nenhum cliente encontrado para este filtro.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
