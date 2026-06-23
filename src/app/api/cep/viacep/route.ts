import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { lookupViaCep } from "@/lib/viacep";

export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("cep") ?? "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8) {
    return NextResponse.json({ error: "CEP inválido." }, { status: 400 });
  }

  const data = await lookupViaCep(digits);
  if (!data) {
    return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 });
  }

  return NextResponse.json(data);
}
