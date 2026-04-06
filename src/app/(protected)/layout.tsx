import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { loadServerAuth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, profile } = await loadServerAuth();

  if (!session) {
    redirect("/login");
  }

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
    <div className="min-h-screen bg-neutral-950 p-3 sm:p-4 md:p-8 text-neutral-50">
      <div className="mx-auto flex min-w-0 max-w-7xl flex-col gap-4 md:flex-row md:gap-6">
        <Sidebar role={profile.tipo_usuario} />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="glass-panel flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-neutral-800/80 px-3 py-3 md:px-5 md:py-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4">
              <MobileNav role={profile.tipo_usuario} signOutAction={signOut} />
              <div className="min-w-0 flex-1 space-y-0.5 md:space-y-1">
                <p className="text-[9px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] text-neutral-500">
                  Painel
                </p>
                <p className="truncate text-xs font-semibold sm:text-base md:text-lg">
                  Botelho e Castro
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 md:gap-3 text-sm text-neutral-200">
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
