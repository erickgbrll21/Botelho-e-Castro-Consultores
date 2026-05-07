import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { DeleteUserButton } from "@/components/users/delete-user-button";
import type { UserRole } from "@/types/database";
import {
  getServiceRoleClient,
  requireAdminProfile,
  requireAdminOrDiretorProfile,
} from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registrarLog } from "@/lib/logs";

async function createUser(formData: FormData) {
  "use server";

  await requireAdminProfile();
  const supabaseAdmin = getServiceRoleClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nome = String(formData.get("nome") ?? "");
  const cargo = formData.get("cargo") ? String(formData.get("cargo")) : null;
  const tipo_usuario = String(formData.get("tipo_usuario") ?? "user") as UserRole;

  if (!email || !password || !nome) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  if (password.length < 8) {
    throw new Error("A senha inicial deve ter pelo menos 8 caracteres.");
  }

  if (password.length > 128) {
    throw new Error("A senha inicial é longa demais (máximo 128 caracteres).");
  }

  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, cargo, tipo_usuario },
      app_metadata: { tipo_usuario },
    });

  if (createError || !created.user?.id) {
    throw new Error(
      createError?.message ?? "Não foi possível criar o usuário."
    );
  }

  await (supabaseAdmin.from("usuarios") as any).insert({
    id: created.user.id,
    nome,
    email,
    cargo,
    tipo_usuario,
    ativo: true,
  });

  await registrarLog("Criação de Usuário", { email, nome, tipo_usuario });

  await revalidatePath("/usuarios");
}

async function deleteUser(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabaseAdmin = getServiceRoleClient();
  const userId = String(formData.get("user_id") ?? "");

  if (!userId) {
    throw new Error("ID do usuário é obrigatório.");
  }

  const serviceKeyPresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!serviceKeyPresent) {
    throw new Error(
      "Configuração ausente: defina SUPABASE_SERVICE_ROLE_KEY para remover usuários."
    );
  }

  // 1) Sempre remove o perfil no cadastro do painel (impede acesso ao sistema mesmo se
  // a remoção do Auth falhar por motivo interno do Supabase).
  const { error: delCadastroErr } = await (supabaseAdmin.from("usuarios") as any)
    .delete()
    .eq("id", userId);
  if (delCadastroErr) {
    throw new Error(delCadastroErr.message || "Não foi possível remover o usuário.");
  }

  // 2) Tenta remover a conta no Auth (pode falhar com "Database error deleting user").
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    // Fallback: banir usuário no Auth para garantir que não consegue logar.
    const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h", // ~100 anos
    });
    if (banErr) {
      console.warn("[usuarios] deleteUser: ban fallback falhou", banErr.message);
    }

    await registrarLog("Exclusão de Usuário (parcial)", {
      user_id: userId,
      auth_error: error.message,
      cadastro_removido: true,
      ban_aplicado: !banErr,
    });

    await revalidatePath("/usuarios");
    redirect("/usuarios?remocao=parcial");
  }

  await registrarLog("Exclusão de Usuário", { user_id: userId });

  await revalidatePath("/usuarios");
  redirect("/usuarios?remocao=ok");
}

async function updateUserCargo(formData: FormData) {
  "use server";
  const profile = await requireAdminOrDiretorProfile();
  const supabaseAdmin = getServiceRoleClient();

  const serviceKeyPresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!serviceKeyPresent) {
    throw new Error(
      "Configuração ausente: defina SUPABASE_SERVICE_ROLE_KEY para editar usuários."
    );
  }

  const userId = String(formData.get("user_id") ?? "").trim();
  const cargoRaw = String(formData.get("cargo") ?? "").trim();
  const cargo = cargoRaw ? cargoRaw.slice(0, 120) : null;

  if (!userId) {
    throw new Error("ID do usuário é obrigatório.");
  }

  const { error: updErr } = await (supabaseAdmin.from("usuarios") as any)
    .update({ cargo })
    .eq("id", userId);
  if (updErr) {
    throw new Error(updErr.message || "Não foi possível atualizar o cargo.");
  }

  const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { user_metadata: { cargo } }
  );
  if (authErr) {
    // Não bloqueia (o dado principal está no cadastro), mas registra para diagnóstico.
    console.warn("[usuarios] updateUserCargo: auth metadata", authErr.message);
  }

  await registrarLog("Edição de Cargo (Usuário)", {
    actor: profile.email,
    user_id: userId,
    cargo,
  });

  await revalidatePath("/usuarios");
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ remocao?: string }>;
}) {
  const profile = await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const { remocao } = await searchParams;

  const { data: usuariosData } = await (supabase
    .from("usuarios") as any)
    .select("id, nome, email, cargo, tipo_usuario, ativo, created_at")
    .order("created_at", { ascending: false });
  const usuarios: any[] = usuariosData ?? [];

  const serviceKeyPresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const canEditCargo =
    profile != null && ["admin", "diretor"].includes(profile.tipo_usuario);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
          Segurança
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Gestão de usuários</h1>
        <p className="text-neutral-400">
          Apenas administradores podem criar contas. Não existe auto cadastro.
        </p>
      </div>

      {remocao === "ok" ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <p className="font-semibold">Usuário removido com sucesso.</p>
          <p className="mt-1 text-emerald-100/90">
            A conta foi excluída e não terá mais acesso ao sistema.
          </p>
        </div>
      ) : remocao === "parcial" ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-semibold">Remoção concluída parcialmente.</p>
          <p className="mt-1 text-amber-200/90">
            O usuário foi removido do cadastro do painel (sem acesso). A exclusão no Auth falhou por um erro interno do Supabase; aplicamos bloqueio no login como fallback.
          </p>
        </div>
      ) : null}

      <Card
        title="Criar novo usuário"
        action={
          <Pill
            label="Apenas administradores"
            tone="critical"
          />
        }
      >
        {!serviceKeyPresent ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            Configure a variável SUPABASE_SERVICE_ROLE_KEY para habilitar a
            criação de usuários diretamente pelo painel.
          </div>
        ) : (
          <form action={createUser} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Nome completo</label>
              <input
                name="nome"
                required
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">E-mail</label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="email@cliente.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Cargo</label>
              <input
                name="cargo"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="Cargo interno"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Tipo de usuário</label>
              <select
                name="tipo_usuario"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                defaultValue="user"
              >
                <option value="user">Usuário (Comum)</option>
                <option value="admin">Administrador (TI)</option>
                <option value="diretor">Diretor</option>
                <option value="financeiro">Financeiro</option>
                <option value="controladoria">Controladoria</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Senha inicial</label>
              <input
                name="password"
                type="password"
                required
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
                placeholder="Senha temporária"
              />
              <p className="text-xs text-neutral-500">
                Solicite que o usuário altere após o primeiro acesso.
              </p>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
              >
                Criar usuário
              </button>
            </div>
          </form>
        )}
      </Card>

      <Card title="Usuários cadastrados">
        {!canEditCargo ? (
          <div className="mb-4 rounded-lg border border-neutral-800/80 bg-neutral-900/30 p-3 text-sm text-neutral-300">
            Apenas <span className="font-semibold">Administradores</span> e{" "}
            <span className="font-semibold">Diretores</span> podem editar o cargo dos usuários.
          </div>
        ) : !serviceKeyPresent ? (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            Configure a variável SUPABASE_SERVICE_ROLE_KEY para habilitar a edição de cargos.
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr className="border-b border-neutral-800/80">
                <th className="py-3 pr-4 font-medium">Usuário</th>
                <th className="py-3 pr-4 font-medium hidden lg:table-cell">Cargo</th>
                <th className="py-3 pr-4 font-medium hidden sm:table-cell">Tipo / Status</th>
                <th className="py-3 pr-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="align-top">
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-neutral-50 leading-tight">{usuario.nome}</p>
                    <p className="text-[10px] md:text-xs text-neutral-500 mt-1">{usuario.email}</p>
                    <p className="mt-1 text-[10px] text-neutral-500 lg:hidden">
                      Cargo: <span className="text-neutral-300">{usuario.cargo ?? "—"}</span>
                    </p>
                    <div className="flex sm:hidden gap-2 mt-2">
                      <Pill
                        label={
                          usuario.tipo_usuario === "admin"
                            ? "Admin"
                            : usuario.tipo_usuario === "diretor"
                            ? "Diretor"
                            : usuario.tipo_usuario === "financeiro"
                            ? "Financ."
                            : usuario.tipo_usuario === "controladoria"
                            ? "Control."
                            : "User"
                        }
                        tone={
                          ["admin", "diretor", "financeiro", "controladoria"].includes(
                            usuario.tipo_usuario
                          )
                            ? "warning"
                            : "neutral"
                        }
                      />
                      <Pill
                        label={usuario.ativo ? "Ativo" : "Inativo"}
                        tone={usuario.ativo ? "success" : "critical"}
                      />
                    </div>
                  </td>
                  <td className="py-4 pr-4 hidden lg:table-cell">
                    {canEditCargo && serviceKeyPresent ? (
                      <form
                        action={updateUserCargo}
                        className="flex min-w-[16rem] max-w-[22rem] items-center gap-2"
                      >
                        <input type="hidden" name="user_id" value={usuario.id} />
                        <input
                          name="cargo"
                          defaultValue={usuario.cargo ?? ""}
                          placeholder="Cargo (ex.: Controladoria)"
                          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:border-neutral-100 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="shrink-0 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:bg-neutral-800"
                        >
                          Salvar
                        </button>
                      </form>
                    ) : (
                      <span className="text-neutral-300">{usuario.cargo ?? "—"}</span>
                    )}
                  </td>
                  <td className="py-4 pr-4 hidden sm:table-cell">
                    <div className="flex flex-col gap-2 items-start">
                      <Pill
                        label={
                          usuario.tipo_usuario === "admin"
                            ? "Administrador"
                            : usuario.tipo_usuario === "diretor"
                            ? "Diretor"
                            : usuario.tipo_usuario === "financeiro"
                            ? "Financeiro"
                            : usuario.tipo_usuario === "controladoria"
                            ? "Controladoria"
                            : "Usuário"
                        }
                        tone={
                          ["admin", "diretor", "financeiro", "controladoria"].includes(
                            usuario.tipo_usuario
                          )
                            ? "warning"
                            : "neutral"
                        }
                      />
                      <Pill
                        label={usuario.ativo ? "Ativo" : "Inativo"}
                        tone={usuario.ativo ? "success" : "critical"}
                      />
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-right">
                    <DeleteUserButton userId={usuario.id} action={deleteUser} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
