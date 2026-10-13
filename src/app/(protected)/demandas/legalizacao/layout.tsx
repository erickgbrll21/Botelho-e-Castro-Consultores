import { getCurrentProfile } from "@/lib/auth";
import { isGestorDemandas } from "@/lib/demandas-access";
import { expurgarDemandasLegalizacaoConfirmadas } from "@/lib/demandas-relatorio";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LegalizacaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (profile && isGestorDemandas(profile.tipo_usuario)) {
    const supabase = await createSupabaseServerClient();
    await expurgarDemandasLegalizacaoConfirmadas(supabase);
  }

  return children;
}
