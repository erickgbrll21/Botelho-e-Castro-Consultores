import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { lookupCnpjPublic } from "@/lib/cnpj-lookup-providers";

export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("cnpj") ?? "";
  const digits = raw.replace(/\D/g, "");

  const { status, body, headers } = await lookupCnpjPublic(digits);
  return NextResponse.json(body, { status, headers: headers as HeadersInit | undefined });
}
