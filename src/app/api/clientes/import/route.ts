import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { registrarLog } from "@/lib/logs";

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || !["admin", "diretor", "financeiro"].includes(profile.tipo_usuario)) {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores podem importar dados." }, { status: 403 });
    }

    const { clients } = await req.json();
    
    console.log(`[IMPORT] Recebidos ${clients?.length} registros da planilha.`);
    
    if (!Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json({ error: "Nenhum dado encontrado na planilha." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Buscar grupos para mapeamento por nome
    const { data: gruposData } = await supabase.from("grupos_economicos").select("id, nome");
    const grupos = (gruposData || []) as any[];
    const gruposMap = new Map(grupos.map((g) => [g.nome.toLowerCase().trim(), g.id]));

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const clientData of clients) {
      // Helper para buscar chaves de forma flexível (sem diferenciar maiúsculas/minúsculas ou espaços)
      const getValue = (possibleKeys: string[], defaultValue: any = "0") => {
        const keys = Object.keys(clientData);
        for (const pk of possibleKeys) {
          const foundKey = keys.find(k => k.toLowerCase().trim() === pk.toLowerCase().trim());
          if (foundKey) {
            const val = clientData[foundKey];
            if (val === undefined || val === null || String(val).trim() === "") {
              return defaultValue;
            }
            return val;
          }
        }
        return defaultValue;
      };

      // Mapeamento conforme formato EXATO fornecido pelo usuário:
      // Grupo - Domínio - Unidade - Empresas - Cidade - UF - CNPJ - Insc. Estadual - Insc. Municipal - Regime Tributação - Atividade - Entrada - Constituição 
      
      const rawRazaoSocial = getValue(["Empresas", "Empresa", "Razão Social", "razao_social"], "");
      const rawCnpj = getValue(["CNPJ", "cnpj"], "");

      if (!rawRazaoSocial) {
        console.log(`[IMPORT] Linha pulada: Coluna 'Empresas' não encontrada ou vazia.`);
        skippedCount++;
        continue;
      }

      const razao_social = String(rawRazaoSocial).trim();
      const cnpj = rawCnpj ? String(rawCnpj).replace(/\D/g, "") : "0";

      // Normalizar Unidade
      let tipo_unidade = getValue(["Unidade"], null);
      if (tipo_unidade) {
        tipo_unidade = String(tipo_unidade).trim().toLowerCase();
        tipo_unidade = tipo_unidade.includes("matriz") ? "Matriz" : 
                      tipo_unidade.includes("filial") ? "Filial" : null;
      }

      // Normalizar Atividade
      let atividade = getValue(["Atividade"], null);
      if (atividade) {
        const lowAtiv = String(atividade).trim().toLowerCase();
        if (lowAtiv.includes("serviço")) atividade = "Serviço";
        else if (lowAtiv.includes("comércio") || lowAtiv.includes("comercio")) atividade = "Comércio";
        else if (lowAtiv.includes("indústria") || lowAtiv.includes("industria")) atividade = "Indústria";
        else if (lowAtiv.includes("ambos")) atividade = "Ambos";
        else atividade = null;
      }

      // Mapear Grupo
      const grupoNome = getValue(["Grupo"], null);
      const grupo_id = (grupoNome && grupoNome !== "0") ? gruposMap.get(String(grupoNome).toLowerCase().trim()) : null;

      // Tratar Data de Entrada
      let data_entrada = getValue(["Entrada"], null);
      if (data_entrada && typeof data_entrada === "number") {
        const date = new Date((data_entrada - 25569) * 86400 * 1000);
        data_entrada = date.toISOString().split("T")[0];
      } else if (data_entrada && data_entrada !== "0") {
        try {
          const parts = String(data_entrada).split("/");
          if (parts.length === 3) {
            data_entrada = `${parts[2]}-${parts[1]}-${parts[0]}`;
          } else {
            const date = new Date(String(data_entrada));
            data_entrada = !isNaN(date.getTime()) ? date.toISOString().split("T")[0] : null;
          }
        } catch {
          data_entrada = null;
        }
      } else {
        data_entrada = null;
      }

      // Tratar Constituição
      const rawConstituicao = getValue(["Constituição"], "Não");
      const constituicao = String(rawConstituicao).toLowerCase().trim() === "sim" || 
                          String(rawConstituicao).toLowerCase().trim() === "true" ||
                          rawConstituicao === true;

      const { data: cliente, error: clientError } = await (supabase.from("clientes") as any)
        .insert({
          razao_social,
          cnpj,
          dominio: getValue(["Domínio"]),
          tipo_unidade,
          cidade: getValue(["Cidade"]),
          estado: getValue(["UF"]),
          inscricao_estadual: getValue(["Insc. Estadual"]),
          inscricao_municipal: getValue(["Insc. Municipal"]),
          regime_tributario: getValue(["Regime Tributação"]),
          atividade,
          data_entrada_contabilidade: data_entrada,
          constituicao,
          grupo_id,
          ativo: true,
        })
        .select("id")
        .single();

      if (clientError || !cliente) {
        let errMsg = `Erro ao inserir ${razao_social}: ${clientError?.message || 'Erro desconhecido'}`;
        if (clientError?.code === '23505') {
          errMsg = `Cliente "${razao_social}" já existe (CNPJ duplicado: ${cnpj}).`;
        }
        console.error(`[IMPORT] ${errMsg}`);
        errors.push(errMsg);
        continue;
      }

      // Inserir tabelas vinculadas (essenciais para o funcionamento do sistema)
      await (supabase.from("responsaveis_internos") as any).insert({ cliente_id: cliente.id });
      await (supabase.from("servicos_contratados") as any).insert({ cliente_id: cliente.id });

      importedCount++;
    }

    await registrarLog("Importação em Massa", { 
      sucesso: importedCount, 
      pulados: skippedCount, 
      erros: errors.length 
    });

    console.log(`[IMPORT] Finalizado. Sucesso: ${importedCount}, Pulados: ${skippedCount}, Erros: ${errors.length}`);

    if (importedCount === 0 && errors.length > 0) {
      return NextResponse.json({ error: `Falha na importação: ${errors[0]}` }, { status: 500 });
    }

    return NextResponse.json({ count: importedCount, skipped: skippedCount, errors: errors.length });
  } catch (error: any) {
    console.error("[IMPORT] Erro crítico na API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
