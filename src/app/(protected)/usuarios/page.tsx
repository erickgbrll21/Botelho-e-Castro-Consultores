import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { DeleteUserButton } from "@/components/users/delete-user-button";
import {
  getServiceRoleClient,
  requireAdminProfile,
} from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function createUser(formData: FormData) {
  "use server";

  await requireAdminProfile();
  const supabaseAdmin = getServiceRoleClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nome = String(formData.get("nome") ?? "");
  const cargo = formData.get("cargo") ? String(formData.get("cargo")) : null;
  const tipo_usuario =
    formData.get("tipo_usuario") === "admin" ? "admin" : "user";

  if (!email || !password || !nome) {
    throw new Error("Preencha todos os campos obrigatórios.");
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

  await revalidatePath("/usuarios");
  // return { ok: true, created_by: adminProfile.id };
}

async function deleteUser(formData: FormData) {
  "use server";
  await requireAdminProfile();
  const supabaseAdmin = getServiceRoleClient();
  const userId = String(formData.get("user_id") ?? "");

  if (!userId) {
    throw new Error("ID do usuário é obrigatório.");
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(error.message);
  }

  await revalidatePath("/usuarios");
  // return { ok: true, deleted: userId };
}

export default async function UsuariosPage() {
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();

  const { data: usuariosData } = await (supabase
    .from("usuarios") as any)
    .select("id, nome, email, cargo, tipo_usuario, ativo, created_at")
    .order("created_at", { ascending: false });
  const usuarios: any[] = usuariosData ?? [];

  const serviceKeyPresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
          Segurança
        </p>
        <h1 className="text-3xl font-semibold">Gestão de usuários</h1>
        <p className="text-neutral-400">
          Apenas administradores podem criar contas. Não existe auto cadastro.
        </p>
      </div>

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
                placeholder="email@empresa.com"
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
                <option value="user">Usuário (visualização)</option>
                <option value="admin">Administrador</option>
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr className="border-b border-neutral-800/80">
                <th className="py-3 pr-4 font-medium">Usuário</th>
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
                    <div className="flex sm:hidden gap-2 mt-2">
                      <Pill
                        label={usuario.tipo_usuario === "admin" ? "Admin" : "User"}
                        tone={usuario.tipo_usuario === "admin" ? "warning" : "neutral"}
                      />
                      <Pill
                        label={usuario.ativo ? "Ativo" : "Inativo"}
                        tone={usuario.ativo ? "success" : "critical"}
                      />
                    </div>
                  </td>
                  <td className="py-4 pr-4 hidden sm:table-cell">
                    <div className="flex flex-col gap-2 items-start">
                      <Pill
                        label={usuario.tipo_usuario === "admin" ? "Administrador" : "Usuário"}
                        tone={usuario.tipo_usuario === "admin" ? "warning" : "neutral"}
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
