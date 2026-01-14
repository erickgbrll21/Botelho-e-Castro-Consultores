import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/lib/auth";
import { DeleteEmpresaButton } from "@/components/empresas/delete-empresa-button";

async function createEmpresa(formData: FormData) {
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
  const data_abertura_empresa = formData.get("data_abertura_empresa")
    ? String(formData.get("data_abertura_empresa"))
    : null;
  const data_entrada_contabilidade = formData.get("data_entrada_contabilidade")
    ? String(formData.get("data_entrada_contabilidade"))
    : null;
  const regime_tributario = String(
    formData.get("regime_tributario") ?? ""
  ).trim();
  const processos_ativos = Number(formData.get("processos_ativos") ?? 0);

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

  const socio_nome = String(formData.get("socio_nome") ?? "").trim();
  const socio_percentual = Number(formData.get("socio_percentual") ?? 100);

  const serv_contabilidade = formData.get("serv_contabilidade") === "on";
  const serv_juridico = formData.get("serv_juridico") === "on";
  const serv_planejamento = formData.get("serv_planejamento") === "on";

  if (!razao_social || !cnpj) {
    throw new Error("Razão social e CNPJ são obrigatórios.");
  }

  const { data: empresa, error } = await (supabase
    .from("empresas") as any)
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
      data_abertura_empresa,
      data_entrada_contabilidade,
      regime_tributario: regime_tributario || null,
      processos_ativos: Number.isNaN(processos_ativos) ? 0 : processos_ativos,
    })
    .select("id")
    .maybeSingle();

  if (error || !empresa?.id) {
    throw new Error(error?.message ?? "Não foi possível criar a empresa.");
  }

  await (supabase.from("responsaveis_internos") as any).insert({
    empresa_id: empresa.id,
    responsavel_comercial: responsavel_comercial || null,
    responsavel_contabil: responsavel_contabil || null,
    responsavel_juridico: responsavel_juridico || null,
    responsavel_planejamento_tributario:
      responsavel_planejamento_tributario || null,
  });

  await (supabase.from("servicos_contratados") as any).insert({
    empresa_id: empresa.id,
    contabilidade: serv_contabilidade,
    juridico: serv_juridico,
    planejamento_tributario: serv_planejamento,
  });

  if (socio_nome) {
    await (supabase.from("quadro_socios") as any).insert({
      empresa_id: empresa.id,
      nome_socio: socio_nome,
      percentual_participacao: socio_percentual,
    });
  }

  await revalidatePath("/empresas");
  // return { ok: true, empresa_id: empresa.id };
}

async function createGrupo(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();

  if (!nome) {
    throw new Error("Nome do grupo é obrigatório.");
  }

  const { error } = await (supabase.from("grupos_empresariais") as any).insert({
    nome,
    descricao: descricao || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  await revalidatePath("/empresas");
  // return { ok: true };
}

async function deleteGrupo(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const grupo_id = String(formData.get("grupo_id") ?? "").trim();

  if (!grupo_id) {
    throw new Error("ID do grupo é obrigatório.");
  }

  // Remove vínculo das empresas antes de excluir o grupo
  await (supabase
    .from("empresas") as any)
    .update({ grupo_id: null })
    .eq("grupo_id", grupo_id);

  const { error } = await (supabase
    .from("grupos_empresariais") as any)
    .delete()
    .eq("id", grupo_id);

  if (error) {
    throw new Error(error.message);
  }

  await revalidatePath("/empresas");
  // return { ok: true, deleted: grupo_id };
}

async function deleteEmpresa(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const empresa_id = String(formData.get("empresa_id") ?? "").trim();

  if (!empresa_id) {
    throw new Error("ID da empresa é obrigatório.");
  }

  const { error } = await (supabase.from("empresas") as any).delete().eq("id", empresa_id);
  if (error) {
    throw new Error(error.message);
  }

  await revalidatePath("/empresas");
  await revalidatePath("/dashboard");
  // return { ok: true, deleted: empresa_id };
}

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { q } = await searchParams;
  const term = q?.trim() ?? "";

  const { data: gruposData } = await supabase
    .from("grupos_empresariais")
    .select("id, nome, descricao")
    .order("nome", { ascending: true });
  const grupos: any[] = gruposData ?? [];

  const empresasQuery = supabase
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
        created_at
      `
    )
    .order("razao_social", { ascending: true });

  const { data: dataEmpresas } = await (term
    ? empresasQuery.ilike("razao_social", `%${term}%`)
    : empresasQuery);
  const empresas: any[] = dataEmpresas ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            Empresas
          </p>
          <h1 className="text-3xl font-semibold">Cadastro e consulta</h1>
          <p className="text-neutral-400">
            Administradores podem cadastrar; usuários veem apenas empresas permitidas.
          </p>
        </div>
        <form className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={term}
            placeholder="Buscar empresa..."
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

      <Card
        title="Cadastrar nova empresa (apenas administradores)"
        className="border-amber-500/30"
        action={<Pill label="Restrito a admins" tone="critical" />}
      >
        <form action={createEmpresa} className="grid gap-4 md:grid-cols-2">
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
            <label className="text-sm text-neutral-300">Grupo empresarial</label>
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
            <label className="text-sm text-neutral-300">Responsável Fiscal</label>
            <input
              name="responsavel_fiscal"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              placeholder="Nome do responsável"
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
          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Data de abertura</label>
            <input
              name="data_abertura_empresa"
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
            <label className="text-sm text-neutral-300">Processos ativos</label>
            <input
              name="processos_ativos"
              type="number"
              min="0"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
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
            <p className="text-sm text-neutral-300">Serviços contratados</p>
            <label className="flex items-center gap-2 text-sm text-neutral-200">
              <input type="checkbox" name="serv_contabilidade" className="accent-white" />
              Contabilidade
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-200">
              <input type="checkbox" name="serv_juridico" className="accent-white" />
              Jurídico
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-200">
              <input type="checkbox" name="serv_planejamento" className="accent-white" />
              Planejamento Tributário
            </label>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
            >
              Cadastrar empresa
            </button>
          </div>
        </form>
      </Card>

      <Card
        title="Grupos de empresas"
        action={<Pill label="Gestão de grupos" tone="neutral" />}
        className="overflow-hidden"
      >
        <form action={createGrupo} className="grid gap-3 md:grid-cols-3 mb-4">
          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Nome do grupo *</label>
            <input
              name="nome"
              required
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              placeholder="Ex.: Grupo XPTO"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-neutral-300">Descrição (opcional)</label>
            <input
              name="descricao"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              placeholder="Notas internas sobre o grupo"
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
            >
              Adicionar grupo
            </button>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr className="border-b border-neutral-800/80">
                <th className="py-3 pr-4 font-medium">Grupo</th>
                <th className="py-3 pr-4 font-medium">Descrição</th>
                <th className="py-3 pr-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {grupos.map((grupo) => (
                <tr key={grupo.id}>
                  <td className="py-3 pr-4 font-semibold text-neutral-50">
                    {grupo.nome}
                  </td>
                  <td className="py-3 pr-4 text-neutral-300">
                    {grupo.descricao ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-right">
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
                </tr>
              ))}
              {grupos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-neutral-400">
                    Nenhum grupo cadastrado ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Empresas"
        action={
          <p className="text-xs text-neutral-400">
            Só administradores podem cadastrar e editar dados.
          </p>
        }
        className="overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr className="border-b border-neutral-800/80">
                <th className="py-3 pr-4 font-medium">Razão Social</th>
                <th className="py-3 pr-4 font-medium hidden sm:table-cell">Data de Inscrição</th>
                <th className="py-3 pr-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {empresas.map((empresa) => (
                <tr key={empresa.id} className="align-top">
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-neutral-50 leading-tight">{empresa.razao_social}</p>
                    <p className="text-[10px] md:text-xs text-neutral-500 mt-1">{empresa.cnpj}</p>
                  </td>
                  <td className="py-4 pr-4 text-neutral-300 hidden sm:table-cell">
                    {empresa.created_at
                      ? new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(empresa.created_at))
                      : "—"}
                  </td>
                  <td className="py-4 pr-4 text-right flex flex-col sm:flex-row justify-end items-end gap-2 sm:gap-3">
                    <a
                      href={`/empresas/${empresa.id}`}
                      className="inline-flex items-center rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs font-semibold text-neutral-200 transition hover:border-neutral-700 hover:bg-neutral-800"
                    >
                      Ver detalhes
                    </a>
                    <DeleteEmpresaButton
                      empresaId={empresa.id}
                      action={deleteEmpresa}
                    />
                  </td>
                </tr>
              ))}

              {empresas.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="py-6 text-center text-sm text-neutral-400"
                  >
                    Nenhuma empresa encontrada para este filtro.
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
