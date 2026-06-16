import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canExportClientesPlanilha, getCurrentProfile } from "@/lib/auth";
import { registrarLog } from "@/lib/logs";
import {
  buildClientesExportXlsxBuffer,
  clientesExportFilename,
  fetchAllClientesParaExport,
} from "@/lib/export-clientes-planilha";
import { serverLog } from "@/lib/server-log";

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile || !canExportClientesPlanilha(profile.tipo_usuario)) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Apenas administradores e diretores podem exportar a planilha de clientes.",
        },
        { status: 403 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const rows = await fetchAllClientesParaExport(supabase);
    const buffer = buildClientesExportXlsxBuffer(rows);

    await registrarLog("Exportação de planilha de clientes", {
      total: rows.length,
      actor: profile.email,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${clientesExportFilename()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    serverLog("clientes/export", "error", "falha na exportação", {
      err: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Não foi possível gerar a planilha. Tente novamente." },
      { status: 500 }
    );
  }
}
