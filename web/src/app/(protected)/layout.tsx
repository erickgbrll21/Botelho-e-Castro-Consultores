import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
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
      <div className="mx-auto flex max-w-7xl flex-col md:flex-row gap-6">
        <Sidebar role={profile.tipo_usuario} />
        <div className="flex-1 space-y-4">
          <header className="glass-panel flex items-center justify-between rounded-2xl border border-neutral-800/80 px-4 py-3 md:px-5 md:py-4">
            <div className="flex items-center gap-3 md:gap-4">
              <MobileNav role={profile.tipo_usuario} signOutAction={signOut} />
              <div className="space-y-0.5 md:space-y-1">
                <p className="text-[9px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] text-neutral-500">
                  Painel
                </p>
                <p className="text-xs md:text-lg font-semibold truncate max-w-[120px] md:max-w-none">
                  Botelho e Castro
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 text-sm text-neutral-200">
              <div className="hidden text-right lg:block">
                <p className="font-semibold">{profile.nome}</p>
                <p className="text-xs text-neutral-400">{profile.email}</p>
              </div>
              <SignOutButton signOut={signOut} />
            </div>
          </header>
          <main>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
