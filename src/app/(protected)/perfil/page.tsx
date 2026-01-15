import { Card } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PasswordForm } from "@/components/perfil/password-form";
import { revalidatePath } from "next/cache";

async function updatePassword(formData: FormData) {
  "use server";
  const supabase = await createSupabaseServerClient();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || password.length < 6) {
    throw new Error("A senha deve ter pelo menos 6 caracteres.");
  }

  if (password !== confirmPassword) {
    throw new Error("As senhas não coincidem.");
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/perfil");
}

export default async function PerfilPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
          Minha Conta
        </p>
        <h1 className="text-3xl font-semibold">Meu Perfil</h1>
        <p className="text-neutral-400">
          Gerencie suas informações e segurança da conta.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Informações Pessoais">
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-neutral-500"> Nome </label>
              <p className="text-neutral-200 font-medium">{profile.nome}</p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-neutral-500"> E-mail </label>
              <p className="text-neutral-200 font-medium">{profile.email}</p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-neutral-500"> Cargo </label>
              <p className="text-neutral-200 font-medium">{profile.cargo || "Não informado"}</p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-neutral-500"> Tipo de Usuário </label>
              <p className="text-neutral-200 font-medium capitalize">
                {profile.tipo_usuario === "admin" ? "Administrador" : 
                 profile.tipo_usuario === "diretor" ? "Diretor" :
                 profile.tipo_usuario === "financeiro" ? "Financeiro" : "Usuário"}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Segurança">
          <div className="space-y-4">
            <p className="text-sm text-neutral-400">
              Deseja alterar sua senha? Preencha os campos abaixo.
            </p>
            <PasswordForm updateAction={updatePassword} />
          </div>
        </Card>
      </div>
    </div>
  );
}
