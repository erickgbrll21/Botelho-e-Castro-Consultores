import { redirect } from "next/navigation";

/** Middleware já encaminha `/` → login ou dashboard; isto evita 2.ª ida ao Supabase no RSC. */
export default function Home() {
  redirect("/login");
}
