import { redirect } from "next/navigation";
import { getSessionClearingStaleRefresh } from "@/lib/supabase/clear-stale-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const session = await getSessionClearingStaleRefresh(supabase);

  redirect(session ? "/dashboard" : "/login");
}
