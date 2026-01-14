import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { getCurrentProfile, requireSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  const profile = await getCurrentProfile();

  if (!profile) {
    // middleware já direciona, mas protegemos aqui também
    return null;
  }

  async function signOut() {
    "use server";
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-4 md:p-8 text-neutral-50">
      <div className="mx-auto flex max-w-7xl gap-6">
        <Sidebar role={profile.tipo_usuario} />
        <div className="flex-1 space-y-4">
          <header className="glass-panel flex items-center justify-between rounded-2xl border border-neutral-800/80 px-5 py-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
                Painel
              </p>
              <p className="text-lg font-semibold">Botelho e Castro Consultores</p>
              <p className="text-xs text-neutral-400">
                Dados somente são exibidos após autenticação. Acesso:{" "}
                <span className="font-semibold text-neutral-100">
                  {profile.tipo_usuario === "admin" ? "Administrador" : "Usuário"}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-200">
              <div className="hidden text-right md:block">
                <p className="font-semibold">{profile.nome}</p>
                <p className="text-xs text-neutral-400">{profile.email}</p>
              </div>
              <SignOutButton signOut={signOut} />
            </div>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
