import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminProfile, getCurrentProfile, canSeeContractValue } from "@/lib/auth";
import { DeleteClienteButton } from "@/components/clientes/delete-cliente-button";

async function createCliente(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();

  const razao_social = String(formData.get("razao_social") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").trim();
  const dominio = String(formData.get("dominio") ?? "").trim();
  const grupo_id = String(formData.get("grupo_id") ?? "").trim() || null;
  const tipo_unidade = formData.get("tipo_unidade") as "Matriz" | "Filial" | null;
  const responsavel_fiscal = String(formData.get("responsavel_fiscal") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const estado = String(formData.get("estado") ?? "").trim();
  const atividade = formData.get("atividade") as "Serviço" | "Comércio" | "Ambos" | null;
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
  const socio_percentual = Number(formData.get("socio_percentual") ?? 100);

  // Serviços Contábeis
  const contabil_fiscal = formData.get("contabil_fiscal") === "on";
  const contabil_contabilidade = formData.get("contabil_contabilidade") === "on";
  const contabil_dp = formData.get("contabil_dp") === "on";
  const contabil_pericia = formData.get("contabil_pericia") === "on";
  const contabil_legalizacao = formData.get("contabil_legalizacao") === "on";

  // Serviços Jurídicos
  const juridico_civel = formData.get("juridico_civel") === "on";
  const juridico_trabalhista = formData.get("juridico_trabalhista") === "on";
  const juridico_licitacao = formData.get("juridico_licitacao") === "on";
  const juridico_penal = formData.get("juridico_penal") === "on";
  const juridico_empresarial = formData.get("juridico_empresarial") === "on";
  const planejamento_societario_tributario = formData.get("planejamento_societario_tributario") === "on";

  if (!razao_social || !cnpj) {
    throw new Error("Razão social e CNPJ são obrigatórios.");
  }

  const { data: cliente, error } = await (supabase
    .from("clientes") as any)
    .insert({
      razao_social,
      cnpj,
      dominio: dominio || null,
      grupo_id: grupo_id || null,
      tipo_unidade,
      responsavel_fiscal: responsavel_fiscal || null,
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
    })
    .select("id")
    .maybeSingle();

  if (error || !cliente?.id) {
    throw new Error(error?.message ?? "Não foi possível criar a cliente.");
  }

  await (supabase.from("responsaveis_internos") as any).insert({
    cliente_id: cliente.id,
    responsavel_comercial: responsavel_comercial || null,
    responsavel_contabil: responsavel_contabil || null,
    responsavel_juridico: responsavel_juridico || null,
    responsavel_planejamento_tributario:
      responsavel_planejamento_tributario || null,
    responsavel_dp: responsavel_dp || null,
    responsavel_financeiro: responsavel_financeiro || null,
  });

  await (supabase.from("servicos_contratados") as any).insert({
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
  });

  if (socio_nome) {
    await (supabase.from("quadro_socios") as any).insert({
      cliente_id: cliente.id,
      nome_socio: socio_nome,
      percentual_participacao: socio_percentual,
    });
  }

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

  await revalidatePath("/clientes");
  await revalidatePath("/dashboard");
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; grupo?: string; editGrupo?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();
  const isAdmin = profile && ["admin", "diretor", "financeiro"].includes(profile.tipo_usuario);
  const showContractValue = profile ? canSeeContractValue(profile.tipo_usuario) : false;
  
  const { q, grupo: grupoFiltro, editGrupo: editGrupoId } = await searchParams;
  const term = q?.trim() ?? "";
  const grupoId = grupoFiltro?.trim() ?? "";

  const { data: gruposData } = await supabase
    .from("grupos_economicos")
    .select("id, nome, descricao, valor_contrato")
    .order("nome", { ascending: true });
  const grupos: any[] = gruposData ?? [];

  const editingGrupo = editGrupoId ? grupos.find(g => g.id === editGrupoId) : null;

  let clientesQuery = supabase
    .from("clientes")
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

  const { data: dataClientes } = await clientesQuery;
  const clientes: any[] = dataClientes ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            Clientes
          </p>
          <h1 className="text-3xl font-semibold">Cadastro e consulta</h1>
          <p className="text-neutral-400">
            Administradores podem cadastrar; todos os usuários podem visualizar a lista completa.
          </p>
        </div>
        <form className="flex items-center gap-2">
          <select
            name="grupo"
            defaultValue={grupoId}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
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
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-100 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
          >
            Buscar
          </button>
        </form>
      </div>

      {isAdmin && (
        <Card
          title="Cadastrar novo cliente (apenas administradores)"
          className="border-amber-500/30"
          action={<Pill label="Restrito a admins" tone="critical" />}
        >
          <form action={createCliente} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Razão social *</label>
              <input
                name="razao_social"
                required
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">CNPJ *</label>
              <input
                name="cnpj"
                required
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="00.000.000/0000-00"
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
          ) : (
            <Pill label="Gestão de grupos" tone="neutral" />
          )
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
                    <td className="py-3 pr-4 text-right flex justify-end gap-2">
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
          <p className="text-xs text-neutral-400">
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
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="align-top">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${cliente.ativo !== false ? 'bg-emerald-500' : 'bg-red-500'}`} title={cliente.ativo !== false ? 'Ativo' : 'Desativado'} />
                      <p className="font-semibold text-neutral-50 leading-tight">{cliente.razao_social}</p>
                    </div>
                    <p className="text-[10px] md:text-xs text-neutral-500 mt-1">{cliente.cnpj}</p>
                  </td>
                  <td className="py-4 pr-4 text-neutral-300 hidden md:table-cell">
                    {cliente.grupos_economicos?.nome ?? "—"}
                  </td>
                  <td className="py-4 pr-4 text-neutral-300 hidden sm:table-cell">
                    {cliente.created_at
                      ? new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(cliente.created_at))
                      : "—"}
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
              ))}

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
