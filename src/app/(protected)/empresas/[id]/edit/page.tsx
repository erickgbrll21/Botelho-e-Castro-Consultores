import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/lib/auth";

async function updateEmpresa(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id"));

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
  const socio_responsavel_pj = String(formData.get("socio_responsavel_pj") ?? "").trim();
  const capital_social = Number(formData.get("capital_social") ?? 0);
  const data_abertura_empresa = formData.get("data_abertura_empresa")
    ? String(formData.get("data_abertura_empresa"))
    : null;
  const data_entrada_contabilidade = formData.get("data_entrada_contabilidade")
    ? String(formData.get("data_entrada_contabilidade"))
    : null;
  const regime_tributario = String(formData.get("regime_tributario") ?? "").trim();
  const processos_ativos = Number(formData.get("processos_ativos") ?? 0);

  const responsavel_comercial = String(formData.get("responsavel_comercial") ?? "").trim();
  const responsavel_contabil = String(formData.get("responsavel_contabil") ?? "").trim();
  const responsavel_juridico = String(formData.get("responsavel_juridico") ?? "").trim();
  const responsavel_planejamento_tributario = String(formData.get("responsavel_planejamento_tributario") ?? "").trim();

  const serv_contabilidade = formData.get("serv_contabilidade") === "on";
  const serv_juridico = formData.get("serv_juridico") === "on";
  const serv_planejamento = formData.get("serv_planejamento") === "on";

  if (!razao_social || !cnpj) {
    throw new Error("Razão social e CNPJ são obrigatórios.");
  }

  const { error: updateError } = await (supabase
    .from("empresas") as any)
    .update({
      razao_social,
      cnpj,
      dominio: dominio || null,
      grupo_id: grupo_id || null,
      tipo_unidade: tipo_unidade || null,
      responsavel_fiscal: responsavel_fiscal || null,
      cidade: cidade || null,
      estado: estado || null,
      atividade: atividade || null,
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
    .eq("id", id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // Update responsaveis_internos
  await (supabase.from("responsaveis_internos") as any)
    .upsert({
      empresa_id: id,
      responsavel_comercial: responsavel_comercial || null,
      responsavel_contabil: responsavel_contabil || null,
      responsavel_juridico: responsavel_juridico || null,
      responsavel_planejamento_tributario: responsavel_planejamento_tributario || null,
    }, { onConflict: 'empresa_id' });

  // Update servicos_contratados
  await (supabase.from("servicos_contratados") as any)
    .upsert({
      empresa_id: id,
      contabilidade: serv_contabilidade,
      juridico: serv_juridico,
      planejamento_tributario: serv_planejamento,
    }, { onConflict: 'empresa_id' });

  revalidatePath(`/empresas/${id}`);
  revalidatePath("/empresas");
  revalidatePath("/dashboard");
  redirect(`/empresas/${id}`);
}

async function addSocio(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const empresa_id = String(formData.get("empresa_id"));
  const nome_socio = String(formData.get("nome_socio")).trim();
  const percentual_participacao = Number(formData.get("percentual_participacao"));

  if (!nome_socio) throw new Error("Nome do sócio é obrigatório.");

  const { error } = await (supabase.from("quadro_socios") as any).insert({
    empresa_id,
    nome_socio,
    percentual_participacao,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/empresas/${empresa_id}/edit`);
  revalidatePath(`/empresas/${empresa_id}`);
}

async function removeSocio(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("socio_id"));
  const empresa_id = String(formData.get("empresa_id"));

  const { error } = await (supabase.from("quadro_socios") as any).delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/empresas/${empresa_id}/edit`);
  revalidatePath(`/empresas/${empresa_id}`);
}

export default async function EditEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminProfile();
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: dataEmpresa, error } = await supabase
    .from("empresas")
    .select(`
      *,
      responsaveis_internos (*),
      servicos_contratados (*),
      quadro_socios (*)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!dataEmpresa || error) {
    notFound();
  }

  const empresa: any = dataEmpresa;
  const responsaveis = empresa.responsaveis_internos?.[0] || {};
  const servicos = empresa.servicos_contratados?.[0] || {};
  const socios = empresa.quadro_socios || [];

  const { data: gruposData } = await supabase
    .from("grupos_empresariais")
    .select("id, nome")
    .order("nome", { ascending: true });
  const grupos = gruposData ?? [];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Administração</p>
          <h1 className="text-3xl font-semibold">Editar Empresa</h1>
          <p className="text-neutral-400">Alterando dados de {empresa.razao_social}</p>
        </div>
        <a 
          href={`/empresas/${id}`}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
        >
          Cancelar
        </a>
      </div>

      <div className="space-y-6">
        <form action={updateEmpresa} className="space-y-6">
          <input type="hidden" name="id" value={id} />
          
          <Card title="Dados Básicos">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Razão Social *</label>
                <input
                  name="razao_social"
                  required
                  defaultValue={empresa.razao_social}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">CNPJ *</label>
                <input
                  name="cnpj"
                  required
                  defaultValue={empresa.cnpj}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Domínio</label>
                <input
                  name="dominio"
                  defaultValue={empresa.dominio}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Grupo Empresarial</label>
                <select
                  name="grupo_id"
                  defaultValue={empresa.grupo_id || ""}
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
            </div>
          </Card>

          <Card title="Localização e Operação">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Unidade</label>
                <select
                  name="tipo_unidade"
                  defaultValue={empresa.tipo_unidade || ""}
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
                defaultValue={empresa.cidade}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Estado (UF)</label>
              <input
                name="estado"
                defaultValue={empresa.estado}
                maxLength={2}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Atividade</label>
              <select
                name="atividade"
                defaultValue={empresa.atividade || ""}
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
                defaultValue={empresa.constituicao ? "Sim" : "Não"}
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
                defaultValue={empresa.inscricao_estadual}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Inscrição Municipal</label>
              <input
                name="inscricao_municipal"
                defaultValue={empresa.inscricao_municipal}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Responsável Fiscal</label>
              <input
                name="responsavel_fiscal"
                defaultValue={empresa.responsavel_fiscal}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
            </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Regime Tributário</label>
                <input
                  name="regime_tributario"
                  defaultValue={empresa.regime_tributario}
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
                  defaultValue={empresa.socio_responsavel_pj}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Capital Social</label>
                <input
                  name="capital_social"
                  type="number"
                  defaultValue={empresa.capital_social}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Processos Ativos</label>
                <input
                  name="processos_ativos"
                  type="number"
                  defaultValue={empresa.processos_ativos}
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
                  defaultValue={responsaveis.responsavel_juridico}
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
            </div>
          </Card>

          <Card title="Serviços Contratados">
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-neutral-200">
                <input 
                  type="checkbox" 
                  name="serv_contabilidade" 
                  defaultChecked={servicos.contabilidade}
                  className="accent-white h-4 w-4" 
                />
                Contabilidade
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-200">
                <input 
                  type="checkbox" 
                  name="serv_juridico" 
                  defaultChecked={servicos.juridico}
                  className="accent-white h-4 w-4" 
                />
                Jurídico
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-200">
                <input 
                  type="checkbox" 
                  name="serv_planejamento" 
                  defaultChecked={servicos.planejamento_tributario}
                  className="accent-white h-4 w-4" 
                />
                Planejamento Tributário
              </label>
            </div>
          </Card>

          <Card title="Datas">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Data de Abertura</label>
                <input
                  name="data_abertura_empresa"
                  type="date"
                  defaultValue={empresa.data_abertura_empresa}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Entrada na Contabilidade</label>
                <input
                  name="data_entrada_contabilidade"
                  type="date"
                  defaultValue={empresa.data_entrada_contabilidade}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="submit"
              className="rounded-lg bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
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
                    <input type="hidden" name="empresa_id" value={id} />
                    <button type="submit" className="text-red-500 hover:text-red-400 text-xs font-semibold">Remover</button>
                  </form>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-800 pt-4">
              <p className="text-sm font-semibold mb-3">Adicionar novo sócio</p>
              <form action={addSocio} className="grid gap-3 sm:grid-cols-3">
                <input type="hidden" name="empresa_id" value={id} />
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
