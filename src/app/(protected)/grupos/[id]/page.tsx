import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import clsx from "clsx";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, canSeeContractValue, requireAdminProfile } from "@/lib/auth";
import { fetchEmpresasDoGrupo } from "@/lib/grupo-clientes";
import {
  getSituacaoEmpresa,
  situacaoEmpresaLabels,
  situacaoIndicatorClass,
} from "@/lib/cliente-situacao";
import { labelTipoUnidadeExibicao } from "@/lib/unidade-label";
import { registrarLog } from "@/lib/logs";
import { onlyDigits } from "@/lib/brasilapi-cnpj";
import { formatCpfDisplay } from "@/lib/format-documento";
import {
  UserGroupIcon,
  BuildingOffice2Icon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

function formatCurrency(value: number | null | undefined) {
  if (value == null || (typeof value === "number" && Number.isNaN(value))) {
    return "—";
  }
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function parseOptionalCpf(formData: FormData, key = "cpf"): string | null {
  const digits = onlyDigits(String(formData.get(key) ?? "")).slice(0, 11);
  if (!digits) return null;
  if (digits.length !== 11) {
    throw new Error("CPF inválido: informe 11 dígitos.");
  }
  return digits;
}

async function addSocioGrupo(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();

  const grupo_id = String(formData.get("grupo_id") ?? "").trim();
  const nome_socio = String(formData.get("nome_socio") ?? "").trim();
  const cpf = parseOptionalCpf(formData);
  const email = String(formData.get("email") ?? "").trim() || null;
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const percentualRaw = String(formData.get("percentual_participacao") ?? "").trim();
  const percentual_participacao = percentualRaw
    ? Number(percentualRaw.replace(",", "."))
    : null;

  if (!grupo_id || !nome_socio) {
    throw new Error("Grupo e nome do sócio são obrigatórios.");
  }

  const { error } = await (supabase.from("quadro_socios_grupo") as any).insert({
    grupo_id,
    nome_socio,
    cpf,
    email,
    telefone,
    percentual_participacao:
      percentual_participacao != null && Number.isFinite(percentual_participacao)
        ? percentual_participacao
        : null,
  });

  if (error) {
    throw new Error(error.message || "Não foi possível adicionar o sócio.");
  }

  await registrarLog("Adição de Sócio (Grupo)", { grupo_id, nome_socio });
  revalidatePath(`/grupos/${grupo_id}`);
  redirect(`/grupos/${grupo_id}`);
}

async function updateSocioGrupo(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();

  const id = String(formData.get("socio_id") ?? "").trim();
  const grupo_id = String(formData.get("grupo_id") ?? "").trim();
  const nome_socio = String(formData.get("nome_socio") ?? "").trim();
  const cpf = parseOptionalCpf(formData);
  const email = String(formData.get("email") ?? "").trim() || null;
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const percentualRaw = String(formData.get("percentual_participacao") ?? "").trim();
  const percentual_participacao = percentualRaw
    ? Number(percentualRaw.replace(",", "."))
    : null;

  if (!id || !grupo_id || !nome_socio) {
    throw new Error("Dados do sócio incompletos.");
  }

  const { error } = await (supabase.from("quadro_socios_grupo") as any)
    .update({
      nome_socio,
      cpf,
      email,
      telefone,
      percentual_participacao:
        percentual_participacao != null && Number.isFinite(percentual_participacao)
          ? percentual_participacao
          : null,
    })
    .eq("id", id)
    .eq("grupo_id", grupo_id);

  if (error) {
    throw new Error(error.message || "Não foi possível atualizar o sócio.");
  }

  await registrarLog("Edição de Sócio (Grupo)", { grupo_id, socio_id: id, nome_socio });
  revalidatePath(`/grupos/${grupo_id}`);
  redirect(`/grupos/${grupo_id}`);
}

async function removeSocioGrupo(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();

  const id = String(formData.get("socio_id") ?? "").trim();
  const grupo_id = String(formData.get("grupo_id") ?? "").trim();

  if (!id || !grupo_id) {
    throw new Error("ID do sócio e do grupo são obrigatórios.");
  }

  const { error } = await (supabase.from("quadro_socios_grupo") as any)
    .delete()
    .eq("id", id)
    .eq("grupo_id", grupo_id);

  if (error) {
    throw new Error(error.message || "Não foi possível remover o sócio.");
  }

  await registrarLog("Remoção de Sócio (Grupo)", { grupo_id, socio_id: id });
  revalidatePath(`/grupos/${grupo_id}`);
  redirect(`/grupos/${grupo_id}`);
}

export default async function GrupoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editSocio?: string }>;
}) {
  const { id } = await params;
  const { editSocio: editSocioId } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();
  const isAdmin =
    profile != null &&
    ["admin", "diretor", "financeiro", "controladoria"].includes(
      profile.tipo_usuario
    );
  const showContractValue = profile
    ? canSeeContractValue(profile.tipo_usuario)
    : false;

  const { data: grupo, error: grupoError } = await supabase
    .from("grupos_economicos")
    .select("id, nome, descricao, valor_contrato, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!grupo || grupoError) {
    notFound();
  }

  const grupoRow = grupo as any;

  const [{ data: sociosData }, empresas] = await Promise.all([
    (supabase.from("quadro_socios_grupo") as any)
      .select("id, nome_socio, cpf, email, telefone, percentual_participacao")
      .eq("grupo_id", id)
      .order("nome_socio", { ascending: true }),
    fetchEmpresasDoGrupo(supabase, id, grupoRow.nome ?? ""),
  ]);

  const socios: any[] = sociosData ?? [];
  const editingSocio = editSocioId
    ? socios.find((s) => s.id === editSocioId)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Link
            href="/clientes"
            className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 transition hover:text-neutral-100"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
            Voltar ao Cadastro
          </Link>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
              Grupo econômico
            </p>
            <h1 className="text-2xl font-semibold sm:text-3xl">{grupoRow.nome}</h1>
            {grupoRow.descricao ? (
              <p className="max-w-2xl text-sm text-neutral-400">
                {grupoRow.descricao}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill
            label={`${empresas.length} ${empresas.length === 1 ? "empresa" : "empresas"}`}
            tone="neutral"
          />
          <Pill
            label={`${socios.length} ${socios.length === 1 ? "sócio" : "sócios"}`}
            tone="neutral"
          />
        </div>
      </div>

      <div className="card-grid">
        <Card
          title="Empresas no grupo"
          action={<BuildingOffice2Icon className="h-4 w-4 text-blue-400" />}
        >
          <p className="text-3xl font-semibold">{empresas.length}</p>
          <p className="text-xs text-neutral-400">Cadastros vinculados a este grupo</p>
        </Card>
        <Card
          title="Sócios cadastrados"
          action={<UserGroupIcon className="h-4 w-4 text-emerald-400" />}
        >
          <p className="text-3xl font-semibold">{socios.length}</p>
          <p className="text-xs text-neutral-400">Quadro societário do grupo</p>
        </Card>
        {showContractValue ? (
          <Card title="Valor do contrato (mensal)">
            <p className="text-3xl font-semibold tabular-nums text-amber-200/95">
              {formatCurrency(grupoRow.valor_contrato)}
            </p>
            <p className="text-xs text-neutral-400">Contrato consolidado do grupo</p>
          </Card>
        ) : null}
      </div>

      <Card
        title="Quadro de sócios"
        action={
          isAdmin ? (
            <Pill label="Gestão de sócios" tone="neutral" />
          ) : null
        }
        className="overflow-hidden"
      >
        {isAdmin && editingSocio ? (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-amber-100">
                Editar sócio: {editingSocio.nome_socio}
              </p>
              <Link
                href={`/grupos/${id}`}
                className="text-xs text-neutral-400 underline hover:text-white"
              >
                Cancelar
              </Link>
            </div>
            <form action={updateSocioGrupo} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <input type="hidden" name="socio_id" value={editingSocio.id} />
              <input type="hidden" name="grupo_id" value={id} />
              <input
                name="nome_socio"
                required
                defaultValue={editingSocio.nome_socio}
                placeholder="Nome completo"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none sm:col-span-2"
              />
              <input
                name="cpf"
                inputMode="numeric"
                defaultValue={
                  editingSocio.cpf ? formatCpfDisplay(editingSocio.cpf) : ""
                }
                placeholder="CPF"
                maxLength={14}
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
              <input
                name="email"
                type="email"
                defaultValue={editingSocio.email ?? ""}
                placeholder="E-mail"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
              <input
                name="telefone"
                defaultValue={editingSocio.telefone ?? ""}
                placeholder="Telefone"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
              <input
                name="percentual_participacao"
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue={editingSocio.percentual_participacao ?? ""}
                placeholder="Participação %"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200 sm:col-span-2 lg:col-span-6 lg:ml-auto lg:w-auto"
              >
                Salvar alterações
              </button>
            </form>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr className="border-b border-neutral-800/80">
                <th className="py-3 pr-4 font-medium">Nome</th>
                <th className="py-3 pr-4 font-medium hidden md:table-cell">CPF</th>
                <th className="py-3 pr-4 font-medium">E-mail</th>
                <th className="py-3 pr-4 font-medium">Telefone</th>
                <th className="py-3 pr-4 font-medium">Participação</th>
                {isAdmin ? (
                  <th className="py-3 pr-4 font-medium text-right">Ações</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {socios.map((socio) => (
                <tr key={socio.id}>
                  <td className="py-3 pr-4 font-semibold text-neutral-50">
                    {socio.nome_socio}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-neutral-300 hidden md:table-cell">
                    {socio.cpf ? formatCpfDisplay(socio.cpf) : "—"}
                  </td>
                  <td className="py-3 pr-4 text-neutral-300">
                    {socio.email ? (
                      <a
                        href={`mailto:${socio.email}`}
                        className="hover:text-white hover:underline"
                      >
                        {socio.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 pr-4 text-neutral-300">
                    {socio.telefone ? (
                      <a
                        href={`tel:${socio.telefone.replace(/\D/g, "")}`}
                        className="hover:text-white hover:underline"
                      >
                        {socio.telefone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 pr-4 text-neutral-300">
                    {formatPercent(socio.percentual_participacao)}
                  </td>
                  {isAdmin ? (
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/grupos/${id}?editSocio=${socio.id}`}
                          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                        >
                          Editar
                        </Link>
                        <form action={removeSocioGrupo} className="inline">
                          <input type="hidden" name="socio_id" value={socio.id} />
                          <input type="hidden" name="grupo_id" value={id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
                          >
                            Remover
                          </button>
                        </form>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
              {socios.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 6 : 5}
                    className="py-6 text-center text-neutral-400"
                  >
                    Nenhum sócio cadastrado para este grupo.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {isAdmin && !editingSocio ? (
          <div className="mt-6 border-t border-neutral-800 pt-6">
            <p className="mb-3 text-sm font-semibold text-neutral-200">
              Adicionar sócio
            </p>
            <form action={addSocioGrupo} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <input type="hidden" name="grupo_id" value={id} />
              <input
                name="nome_socio"
                required
                placeholder="Nome completo *"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none sm:col-span-2"
              />
              <input
                name="cpf"
                inputMode="numeric"
                placeholder="CPF"
                maxLength={14}
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
              <input
                name="email"
                type="email"
                placeholder="E-mail"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
              <input
                name="telefone"
                placeholder="Telefone"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
              <input
                name="percentual_participacao"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="Participação %"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200 sm:col-span-2 lg:col-span-6 lg:ml-auto lg:w-auto"
              >
                Adicionar sócio
              </button>
            </form>
          </div>
        ) : null}
      </Card>

      <Card title="Empresas do grupo" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr className="border-b border-neutral-800/80">
                <th className="py-3 pr-4 font-medium">Razão social</th>
                <th className="py-3 pr-4 font-medium hidden md:table-cell">CNPJ</th>
                <th className="py-3 pr-4 font-medium hidden sm:table-cell">Unidade</th>
                <th className="py-3 pr-4 font-medium hidden lg:table-cell">Local</th>
                <th className="py-3 pr-4 font-medium">Situação</th>
                <th className="py-3 pr-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {empresas.map((empresa) => {
                const situacao = getSituacaoEmpresa(empresa);
                const { descricaoCurta } = situacaoEmpresaLabels(situacao);
                return (
                  <tr key={empresa.id} className="align-top">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={clsx(
                            "h-2.5 w-2.5 shrink-0 rounded-full",
                            situacaoIndicatorClass(situacao)
                          )}
                          aria-hidden
                        />
                        <p className="font-semibold text-neutral-50">
                          {empresa.razao_social}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 pr-4 font-mono text-xs text-neutral-400 hidden md:table-cell">
                      {empresa.cnpj ?? "—"}
                    </td>
                    <td className="py-4 pr-4 hidden sm:table-cell">
                      <Pill
                        label={labelTipoUnidadeExibicao(
                          empresa.tipo_unidade,
                          empresa.identificacao_filial
                        )}
                        tone="neutral"
                      />
                    </td>
                    <td className="py-4 pr-4 text-neutral-300 hidden lg:table-cell">
                      {[empresa.cidade, empresa.estado].filter(Boolean).join(" / ") ||
                        "—"}
                    </td>
                    <td className="py-4 pr-4">
                      <Pill
                        label={descricaoCurta}
                        tone={
                          situacao === "ativa"
                            ? "success"
                            : situacao === "paralisada"
                              ? "warning"
                              : "critical"
                        }
                      />
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <Link
                        href={`/clientes/${empresa.id}`}
                        className="inline-flex items-center rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:border-neutral-700 hover:bg-neutral-800"
                      >
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {empresas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-neutral-400">
                    Nenhuma empresa vinculada a este grupo.
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
