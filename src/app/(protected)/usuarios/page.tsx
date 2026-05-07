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
      "Configuração ausente: defina SUPABASE_SERVICE_ROLE_KEY para desativar usuários."
    );
  }

  // Não apagamos da tabela `usuarios` porque existem FKs (ex.: logs_sistema.usuario_id).
  // Em vez disso, fazemos **desativação** preservando histórico/auditoria.
  const { error: delCadastroErr } = await (supabaseAdmin.from("usuarios") as any)
    .update({ ativo: false })
    .eq("id", userId);
  if (delCadastroErr) {
    throw new Error(delCadastroErr.message || "Não foi possível desativar o usuário.");
  }

  // Bloqueia login no Auth (ban). Isso é suficiente para impedir acesso.
  // (Se você quiser exclusão total do Auth, dá para tentar deleteUser depois; mas ban é estável.)
  const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h", // ~100 anos
  });

  if (banErr) {
    await registrarLog("Desativação de Usuário (parcial)", {
      user_id: userId,
      auth_error: banErr.message,
      cadastro_desativado: true,
      ban_aplicado: false,
    });
    await revalidatePath("/usuarios");
    redirect("/usuarios?remocao=parcial");
  }

  await registrarLog("Desativação de Usuário", { user_id: userId });

  await revalidatePath("/usuarios");
  redirect("/usuarios?remocao=ok");
}

async function deleteUserAndAccount(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabaseAdmin = getServiceRoleClient();

  const serviceKeyPresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!serviceKeyPresent) {
    throw new Error(
      "Configuração ausente: defina SUPABASE_SERVICE_ROLE_KEY para excluir usuários."
    );
  }

  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) throw new Error("ID do usuário é obrigatório.");

  // 1) Exclui no Auth
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authErr) {
    throw new Error(authErr.message || "Não foi possível excluir a conta (Auth).");
  }

  // 2) Exclui no cadastro do painel
  // (FK dos logs agora é ON DELETE SET NULL)
  const { error: cadastroErr } = await (supabaseAdmin.from("usuarios") as any)
    .delete()
    .eq("id", userId);
  if (cadastroErr) {
    throw new Error(cadastroErr.message || "Não foi possível excluir o usuário.");
  }

  await registrarLog("Exclusão Definitiva de Usuário", { user_id: userId });
  await revalidatePath("/usuarios");
  redirect("/usuarios?remocao=excluido");
}

function parseUserRole(raw: unknown): UserRole {
  const v = String(raw ?? "").trim();
  const allowed: UserRole[] = [
    "user",
    "admin",
    "diretor",
    "financeiro",
    "controladoria",
  ];
  return (allowed as string[]).includes(v) ? (v as UserRole) : "user";
}

function labelTipoUsuario(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Administrador";
    case "diretor":
      return "Diretor";
    case "financeiro":
      return "Financeiro";
    case "controladoria":
      return "Controladoria";
    default:
      return "Usuário";
  }
}

async function updateUserTipoUsuario(formData: FormData) {
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
  const tipo_usuario = parseUserRole(formData.get("tipo_usuario"));

  if (!userId) {
    throw new Error("ID do usuário é obrigatório.");
  }

  const { error: updErr } = await (supabaseAdmin.from("usuarios") as any)
    .update({ tipo_usuario })
    .eq("id", userId);
  if (updErr) {
    throw new Error(updErr.message || "Não foi possível atualizar o tipo de usuário.");
  }

  const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { tipo_usuario },
    app_metadata: { tipo_usuario },
  });
  if (authErr) {
    // Não bloqueia (o dado principal está no cadastro), mas registra para diagnóstico.
    console.warn("[usuarios] updateUserTipoUsuario: auth metadata", authErr.message);
  }

  await registrarLog("Edição de Tipo de Usuário", {
    actor: profile.email,
    user_id: userId,
    tipo_usuario,
  });

  await revalidatePath("/usuarios");
  redirect("/usuarios?atualizacao=tipo_ok");
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ remocao?: string; atualizacao?: string }>;
}) {
  const profile = await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const { remocao, atualizacao } = await searchParams;

  const { data: usuariosData } = await (supabase
    .from("usuarios") as any)
    .select("id, nome, email, cargo, tipo_usuario, ativo, created_at")
    .order("created_at", { ascending: false });
  const usuarios: any[] = usuariosData ?? [];

  const serviceKeyPresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const canEditTipoUsuario =
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

      {atualizacao === "tipo_ok" ? (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-100">
          <p className="font-semibold">Tipo de usuário atualizado com sucesso.</p>
          <p className="mt-1 text-sky-100/90">
            A permissão do usuário foi atualizada no sistema.
          </p>
        </div>
      ) : null}

      {remocao === "ok" ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <p className="font-semibold">Usuário desativado com sucesso.</p>
          <p className="mt-1 text-emerald-100/90">
            O usuário foi desativado e não terá mais acesso ao sistema.
          </p>
        </div>
      ) : remocao === "excluido" ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <p className="font-semibold">Usuário excluído com sucesso.</p>
          <p className="mt-1 text-emerald-100/90">
            A conta foi removida do Auth e do cadastro do painel.
          </p>
        </div>
      ) : remocao === "parcial" ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-semibold">Desativação concluída parcialmente.</p>
          <p className="mt-1 text-amber-200/90">
            O usuário foi desativado no cadastro do painel. O bloqueio de login no Auth falhou; tente novamente.
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
        {!canEditTipoUsuario ? (
          <div className="mb-4 rounded-lg border border-neutral-800/80 bg-neutral-900/30 p-3 text-sm text-neutral-300">
            Apenas <span className="font-semibold">Administradores</span> e{" "}
            <span className="font-semibold">Diretores</span> podem editar o tipo de usuário.
          </div>
        ) : !serviceKeyPresent ? (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            Configure a variável SUPABASE_SERVICE_ROLE_KEY para habilitar a edição do tipo de usuário.
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr className="border-b border-neutral-800/80">
                <th className="py-3 pr-4 font-medium">Usuário</th>
                <th className="py-3 pr-4 font-medium hidden lg:table-cell">Tipo de usuário</th>
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
                      Tipo:{" "}
                      <span className="text-neutral-300">
                        {labelTipoUsuario(usuario.tipo_usuario as UserRole)}
                      </span>
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
                    {canEditTipoUsuario && serviceKeyPresent ? (
                      <form
                        action={updateUserTipoUsuario}
                        className="flex min-w-[16rem] max-w-[22rem] items-center gap-2"
                      >
                        <input type="hidden" name="user_id" value={usuario.id} />
                        <select
                          name="tipo_usuario"
                          defaultValue={String(usuario.tipo_usuario ?? "user")}
                          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:border-neutral-100 focus:outline-none"
                        >
                          <option value="user">Usuário</option>
                          <option value="admin">Administrador (TI)</option>
                          <option value="diretor">Diretor</option>
                          <option value="financeiro">Financeiro</option>
                          <option value="controladoria">Controladoria</option>
                        </select>
                        <button
                          type="submit"
                          className="shrink-0 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:bg-neutral-800"
                        >
                          Salvar
                        </button>
                      </form>
                    ) : (
                      <span className="text-neutral-300">
                        {labelTipoUsuario(usuario.tipo_usuario as UserRole)}
                      </span>
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
                    <div className="flex flex-wrap justify-end gap-2">
                      <DeleteUserButton userId={usuario.id} action={deleteUser} />
                      <form action={deleteUserAndAccount} className="inline">
                        <input type="hidden" name="user_id" value={usuario.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
                          onClick={(e) => {
                            if (
                              !confirm(
                                "Excluir definitivamente? Isso remove a conta e o cadastro. Os logs ficarão sem usuário vinculado."
                              )
                            ) {
                              e.preventDefault();
                            }
                          }}
                        >
                          Excluir
                        </button>
                      </form>
                    </div>
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
