import {
  FunctionCallingMode,
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIError,
  GoogleGenerativeAIResponseError,
  SchemaType,
  type FunctionDeclaration,
} from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  cnpjPayloadForTool,
  lookupCnpjPublic,
} from "@/lib/cnpj-lookup-providers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Nomes de grupos muitas vezes vêm do cadastro em MAIÚSCULAS. Para a resposta ao utilizador
 * (sem alterar a prova de cadastro), expõe-se também uma forma com capitalização legível.
 */
function nomeGrupoExibicaoParaResposta(
  nome: string | null | undefined
): string | null {
  if (nome == null) return null;
  const t = nome.trim();
  if (t.length < 2) return t || null;
  if (/[a-z]/.test(t) || /\d/.test(t)) return t;
  if (t !== t.toLocaleUpperCase("pt-BR")) return t;
  if (!/[\p{Lu}]/u.test(t)) return t;
  if (t.length < 4 && !/\s/.test(t)) return t;
  return t
    .split(/(\s+)/)
    .map((p) => {
      if (!p || /^\s+$/.test(p)) return p;
      const l = p.toLocaleLowerCase("pt-BR");
      return l.charAt(0).toLocaleUpperCase("pt-BR") + l.slice(1);
    })
    .join("");
}

/**
 * Padrão: gemini-2.0-flash-lite (leve). Sobrescreve com GEMINI_MODEL se necessário.
 */
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash-lite";

const SYSTEM = `O objetivo do Assistente é responder perguntas com base EXCLUSIVAMENTE nos dados fornecidos pelo sistema (CONTEXTO da requisição).

O CONTEXTO disponível para você é SOMENTE:
- As mensagens desta conversa (usuário/assistente) enviadas pelo sistema.
- Blocos anexados pelo servidor no formato "[Pré-carga BCC ...]" (cadastro interno / grupo econômico).
- Dados de consultas internas: CNPJ (bases públicas), cadastro de clientes, grupos económicos.

TOM E LINGUAGEM (falar com o utilizador)
- Português do Brasil, tom **profissional, cordial e natural** — evite respostas frias, excessivamente burocráticas ou de manual técnico.
- Seja **objetivo** (poucas frases) quando a pergunta for simples; use um parágrafo curto, não listas longas, salvo se o pedido for uma lista.
- **Não mencione** nomes de funções, APIs, “ferramentas” internas, nomes de campos JSON, nem crases (\`) nem código na conversa. O utilizador não precisa saber *como* o sistema busca; diga, por exemplo, que pode consultar os dados públicos do CNPJ, ou o cadastro, ou o grupo — sem jargão.
- Não inicie toda resposta com “Por favor” de forma mecânica; varie a formulação.
- Pode usar **negrito** com moderação (markdown **texto**) só para destacar um pedido (ex.: número do CNPJ), não decoração em excesso.

REGRAS CRÍTICAS (obrigatório):

1) CONTEXTO ATIVO
- Sempre identifique qual é a entidade principal da conversa atual (ex.: grupo econômico, empresa, CNPJ).
- Se o usuário fizer perguntas sequenciais, mantenha o contexto da ÚLTIMA entidade válida mencionada.
- NUNCA troque de entidade por conta própria.

2) PROIBIDO INVENTAR OU TROCAR DADOS
- Não misture dados de entidades diferentes.
- Não use conhecimento geral, suposições, ou “memória” fora do CONTEXTO desta requisição.
- Se houver dúvida/ambiguidade, peça esclarecimento antes de responder.

3) MEMÓRIA DE CONVERSA (somente dentro do CONTEXTO enviado)
- Se o usuário disser "esse grupo", "ele", "essa empresa", associe ao último item válido citado na conversa/JSON do contexto.

4) VALIDAÇÃO ANTES DE RESPONDER
- Confirme mentalmente: estou falando da mesma entidade da pergunta anterior?
- Se houver qualquer inconsistência, responda exatamente: "Preciso confirmar: você está se referindo ao grupo X ou Y?" (substitua X/Y pelas opções presentes no CONTEXTO).

5) RESPOSTAS DIRETAS E OBJETIVAS
- Responda de forma clara e curta, em português do Brasil.
- Use os dados do CONTEXTO. Para **nomes de grupos económicos** no texto mostrado ao utilizador, use
  a forma legível do nome (campo de exibição no JSON) em vez de repetir tudo em MAIÚSCULAS. Não citar
  nomes técnicos de campos no chat.
- Valores numéricos, CNPJ e textos fora de nome de grupo: alinhados ao CONTEXTO.

6) SE NÃO HOUVER DADOS NO CONTEXTO
- Comunique a mesma ideia de forma educada, por exemplo: "Não encontrei essa informação para este grupo no sistema." (não precisa ser palavra por palavra, desde que fique claro).

USO DE FERRAMENTAS (uso interno — não falar disso ao utilizador)
- CNPJ público: chame a função apropriada; nunca invente dados.
- Cadastro: só busque de novo se a pré-carga ainda for insuficiente.
- Grupo econômico: para contagens, contrato ou listas, quando faltar contexto.

SEGURANÇA
- Não exponha chaves, tokens, nem detalhes técnicos do servidor.
`;

const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "consultar_cnpj",
    description:
      "Consulta dados públicos de um CNPJ (exatamente 14 dígitos) via bases integradas (BrasilAPI, Receitaws, cnpj.ws).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        cnpj: {
          type: SchemaType.STRING,
          description: "CNPJ com 14 dígitos (pode ter máscara)",
        },
      },
      required: ["cnpj"],
    },
  },
  {
    name: "buscar_empresas_sistema",
    description:
      "Só se necessário: busca no cadastro do painel (razão social, CNPJ/trecho). A mensagem do utilizador pode já trazer [Pré-carga BCC] com o mesmo; nesse caso, não chames. Só vê o que o RLS da sessão permitir.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        termo: {
          type: SchemaType.STRING,
          description: "Texto de busca (2+ caracteres)",
        },
      },
      required: ["termo"],
    },
  },
  {
    name: "consultar_grupo_economico",
    description:
      "Consulta um grupo econômico pelo nome e retorna contagem de empresas (e, opcionalmente, uma lista resumida). Use para perguntas como: 'quantas empresas tem no grupo X?'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        nome: {
          type: SchemaType.STRING,
          description: "Nome do grupo econômico (ou trecho do nome)",
        },
        incluir_empresas: {
          type: SchemaType.BOOLEAN,
          description: "Se true, retorna até `limite` empresas (resumo).",
        },
        limite: {
          type: SchemaType.NUMBER,
          description: "Máximo de empresas a retornar (padrão 20, máx 50).",
        },
      },
      required: ["nome"],
    },
  },
];

type ClientMsg = {
  role: "user" | "assistant" | "system" | "tool" | "model";
  content: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: unknown;
};

function toToolResponsePayload(toolText: string): Record<string, unknown> {
  try {
    return JSON.parse(toolText) as Record<string, unknown>;
  } catch {
    return { payload: toolText };
  }
}

/** Mesma riqueza que a ficha de `/clientes/[id]`: ficha + grupo + responsáveis + serviços + sócios. */
const CLIENTES_SELECT_COMPLETO = `
  id,
  created_at,
  razao_social,
  cnpj,
  dominio,
  tipo_unidade,
  identificacao_filial,
  responsavel_fiscal,
  cep,
  logradouro,
  bairro,
  complemento,
  cidade,
  estado,
  atividade,
  constituicao,
  inscricao_estadual,
  inscricao_municipal,
  grupo_economico,
  socio_responsavel_pj,
  capital_social,
  data_abertura_cliente,
  data_entrada_contabilidade,
  data_saida,
  regime_tributario,
  contato_nome,
  contato_telefone,
  valor_contrato,
  cobranca_por_grupo,
  ativo,
  situacao_empresa,
  grupos_economicos ( id, nome, descricao, valor_contrato ),
  responsaveis_internos (
    responsavel_comercial,
    responsavel_contabil,
    responsavel_juridico,
    responsavel_planejamento_tributario,
    responsavel_dp,
    responsavel_financeiro
  ),
  servicos_contratados ( * ),
  quadro_socios ( id, nome_socio, percentual_participacao )
`
  .replace(/\s+/g, " ")
  .trim();

function primeiroEmbed<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

function serializarServicosBooleans(s: Record<string, unknown> | null) {
  if (!s) return { contratados: [] as string[] };
  const m: { key: string; label: string }[] = [
    { key: "contabil_fiscal", label: "Contábil-Fiscal" },
    { key: "contabil_contabilidade", label: "Contabilidade" },
    { key: "contabil_dp", label: "Contábil – DP" },
    { key: "contabil_pericia", label: "Contábil – Perícia" },
    { key: "contabil_legalizacao", label: "Contábil – Legalização" },
    { key: "juridico_civel", label: "Jurídico – Cível" },
    { key: "juridico_trabalhista", label: "Jurídico – Trabalhista" },
    { key: "juridico_licitacao", label: "Jurídico – Licitação" },
    { key: "juridico_penal", label: "Jurídico – Penal" },
    { key: "juridico_empresarial", label: "Jurídico – Empresarial" },
    {
      key: "planejamento_societario_tributario",
      label: "Planejamento societário/tributário",
    },
  ];
  const contratados = m
    .filter(({ key }) => s[key] === true)
    .map(({ label }) => label);
  return { contratados, raw: s };
}

/** Serializa um registo de cliente com embeds (PostgREST) para o LLM. */
function serializeClienteCompleto(c: any, canSeeContrato: boolean) {
  const g = primeiroEmbed(c.grupos_economicos);
  const r = primeiroEmbed(c.responsaveis_internos) as Record<string, string | null> | null;
  const sRow = primeiroEmbed(c.servicos_contratados) as Record<string, unknown> | null;
  const servicos = serializarServicosBooleans(sRow);
  const socios = (Array.isArray(c.quadro_socios) ? c.quadro_socios : []).map(
    (q: { nome_socio: string; percentual_participacao: number }) => ({
      nome: q.nome_socio,
      participacao_percentual: q.percentual_participacao,
    })
  );

  const contratoCliente = canSeeContrato ? (c.valor_contrato ?? null) : null;
  const contratoGrupo = canSeeContrato ? (g?.valor_contrato ?? null) : null;

  return {
    id: c.id,
    detalhe_url: `/clientes/${c.id}`,
    cadastrado_em: c.created_at ?? null,
    razao_social: c.razao_social,
    cnpj: c.cnpj,
    dominio: c.dominio,
    unidade: {
      tipo: c.tipo_unidade,
      identificacao_filial: c.identificacao_filial,
    },
    responsavel_fiscal: c.responsavel_fiscal,
    endereco: {
      cep: c.cep,
      logradouro: c.logradouro,
      bairro: c.bairro,
      complemento: c.complemento,
      cidade: c.cidade,
      estado: c.estado,
    },
    atividade: c.atividade,
    constituicao: c.constituicao,
    inscricoes: {
      estadual: c.inscricao_estadual,
      municipal: c.inscricao_municipal,
    },
    societario: {
      socio_responsavel_pj: c.socio_responsavel_pj,
      capital_social: c.capital_social,
      quadro_socios: socios,
    },
    datas: {
      abertura: c.data_abertura_cliente,
      entrada_contabilidade: c.data_entrada_contabilidade,
      saida: c.data_saida,
    },
    regime_tributario: c.regime_tributario,
    contato: {
      nome: c.contato_nome,
      telefone: c.contato_telefone,
    },
    financeiro: {
      valor_contrato_cliente: contratoCliente,
      cobranca_por_grupo: c.cobranca_por_grupo,
    },
    situacao_empresa: c.situacao_empresa,
    ativo: c.ativo,
    grupo_economico_texto: c.grupo_economico,
    grupo_economico_texto_exibicao: c.grupo_economico
      ? nomeGrupoExibicaoParaResposta(String(c.grupo_economico))
      : null,
    grupo: g
      ? {
          id: g.id,
          nome: g.nome,
          nome_exibicao: nomeGrupoExibicaoParaResposta(g.nome) ?? g.nome,
          descricao: g.descricao,
          valor_contrato_grupo: contratoGrupo,
        }
      : null,
    responsaveis_internos: r
      ? {
          comercial: r.responsavel_comercial,
          contabil: r.responsavel_contabil,
          juridico: r.responsavel_juridico,
          planejamento_tributario: r.responsavel_planejamento_tributario,
          dp: r.responsavel_dp,
          financeiro: r.responsavel_financeiro,
        }
      : null,
    servicos_contratados: servicos,
    restricoes: canSeeContrato
      ? null
      : {
          contratos_ocultos: true,
          motivo:
            "Valores de contrato (cliente e grupo) são visíveis apenas para usuários Diretor e Financeiro.",
        },
  };
}

async function buscarEmpresasSistema(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  termo: string,
  canSeeContrato: boolean
): Promise<string> {
  const t = termo.trim().slice(0, 120);
  if (t.length < 2) {
    return JSON.stringify({
      resultados: [],
      aviso: "Use pelo menos 2 caracteres no termo.",
    });
  }
  const d = t.replace(/\D/g, "");
  const e = t.replace(/[%\n\r]/g, " ").replace(/ +/g, " ").trim();
  const select = CLIENTES_SELECT_COMPLETO;
  type Row = Record<string, unknown>;

  if (d.length === 14) {
    const { data, error } = await (supabase.from("clientes") as any)
      .select(select)
      .eq("cnpj", d)
      .limit(20);
    if (error) {
      return JSON.stringify({
        erro: "Não foi possível buscar no cadastro.",
        detalhe: error.message,
      });
    }
    return JSON.stringify({
      resultados: ((data as Row[] | null) ?? []).map((x) =>
        serializeClienteCompleto(x, canSeeContrato)
      ),
    });
  }

  const like = `%${e}%`;
  const { data: r1, error: e1 } = await (supabase.from("clientes") as any)
    .select(select)
    .ilike("razao_social", like)
    .limit(20);
  if (e1) {
    return JSON.stringify({
      erro: "Não foi possível buscar no cadastro.",
      detalhe: e1.message,
    });
  }
  const byName = (r1 as Row[] | null) ?? [];

  let byCnpj: Row[] = [];
  if (d.length >= 3) {
    const { data: r2, error: e2 } = await (supabase.from("clientes") as any)
      .select(select)
      .ilike("cnpj", `%${d}%`)
      .limit(20);
    if (!e2) byCnpj = (r2 as Row[] | null) ?? [];
  }

  const { data: r3, error: e3 } = await (supabase.from("clientes") as any)
    .select(select)
    .ilike("cidade", like)
    .limit(20);
  if (e3) {
    console.warn("[/api/ai/chat] busca por cidade (auxiliar):", e3.message);
  }
  const byCidade = e3 ? [] : ((r3 as Row[] | null) ?? []);

  const map = new Map<string, Row>();
  for (const x of [...byName, ...byCnpj, ...byCidade]) map.set(x.id as string, x);
  return JSON.stringify({
    resultados: [...map.values()].map((x) => serializeClienteCompleto(x, canSeeContrato)),
  });
}

type GrupoEconomicoEmpresaResumo = {
  id: string;
  razao_social: string | null;
  cnpj: string | null;
  cidade: string | null;
  estado: string | null;
  ativo: boolean | null;
  situacao_empresa: string | null;
};

async function consultarGrupoEconomico(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  nome: string,
  incluirEmpresas: boolean,
  limite: number,
  canSeeContrato: boolean
): Promise<string> {
  const q = nome.trim().replace(/[%\n\r]/g, " ").replace(/ +/g, " ").trim().slice(0, 120);
  if (q.length < 2) {
    return JSON.stringify({ erro: "Informe ao menos 2 caracteres no nome do grupo." });
  }
  const lim = Math.max(1, Math.min(50, Math.floor(limite || 20)));

  // Primeiro: encontrar os grupos que casam pelo nome (ilike).
  const { data: grupos, error: gErr } = await (supabase.from("grupos_economicos") as any)
    .select("id, nome, descricao, valor_contrato")
    .ilike("nome", `%${q}%`)
    .limit(10);
  if (gErr) {
    return JSON.stringify({ erro: "Não foi possível consultar grupos econômicos.", detalhe: gErr.message });
  }
  const gs = (Array.isArray(grupos) ? grupos : []) as Array<{
    id: string;
    nome: string;
    descricao: string | null;
    valor_contrato: unknown;
  }>;

  if (!gs.length) {
    return JSON.stringify({ grupos: [], aviso: `Nenhum grupo econômico encontrado com “${q}”.` });
  }

  // Para cada grupo encontrado, contar empresas relacionadas via FK (join) e também via texto (fallback).
  const resultados: any[] = [];
  for (const g of gs) {
    const baseSelect = "id, razao_social, cnpj, cidade, estado, ativo, situacao_empresa";

    const { count: countFk, error: cFkErr } = await (supabase.from("clientes") as any)
      .select(`id, grupos_economicos!inner(nome)`, { count: "exact", head: true })
      .eq("grupos_economicos.id", g.id);

    if (cFkErr) {
      return JSON.stringify({ erro: "Não foi possível contar empresas do grupo.", detalhe: cFkErr.message });
    }

    const { count: countTxt, error: cTxtErr } = await (supabase.from("clientes") as any)
      .select("id", { count: "exact", head: true })
      .ilike("grupo_economico", g.nome);

    if (cTxtErr) {
      return JSON.stringify({ erro: "Não foi possível contar empresas do grupo (texto).", detalhe: cTxtErr.message });
    }

    const total = Math.max(Number(countFk ?? 0), Number(countTxt ?? 0));
    const payload: Record<string, unknown> = {
      grupo: {
        id: g.id,
        nome: g.nome,
        nome_exibicao: nomeGrupoExibicaoParaResposta(g.nome) ?? g.nome,
        descricao: g.descricao,
        valor_contrato: canSeeContrato ? (g.valor_contrato ?? null) : null,
      },
      valor_contrato_disponivel: canSeeContrato ? g.valor_contrato != null : false,
      total_empresas: total,
      contagem_origem: {
        fk: Number(countFk ?? 0),
        texto_grupo_economico: Number(countTxt ?? 0),
      },
      restricoes: canSeeContrato
        ? null
        : {
            contratos_ocultos: true,
            motivo:
              "Valores de contrato (grupo) são visíveis apenas para usuários Diretor e Financeiro.",
          },
    };

    if (incluirEmpresas) {
      // Preferir FK; se não houver, cair para texto.
      let empresas: GrupoEconomicoEmpresaResumo[] = [];
      const { data: eFk, error: eFkErr } = await (supabase.from("clientes") as any)
        .select(`${baseSelect}, grupos_economicos!inner(id)`)
        .eq("grupos_economicos.id", g.id)
        .order("razao_social", { ascending: true })
        .limit(lim);

      if (!eFkErr && Array.isArray(eFk) && eFk.length) {
        empresas = (eFk as any[]).map((x) => ({
          id: String(x.id),
          razao_social: x.razao_social ?? null,
          cnpj: x.cnpj ?? null,
          cidade: x.cidade ?? null,
          estado: x.estado ?? null,
          ativo: x.ativo ?? null,
          situacao_empresa: x.situacao_empresa ?? null,
        }));
      } else {
        const { data: eTxt, error: eTxtErr } = await (supabase.from("clientes") as any)
          .select(baseSelect)
          .ilike("grupo_economico", g.nome)
          .order("razao_social", { ascending: true })
          .limit(lim);
        if (eTxtErr) {
          return JSON.stringify({ erro: "Não foi possível listar empresas do grupo.", detalhe: eTxtErr.message });
        }
        empresas = (Array.isArray(eTxt) ? eTxt : []).map((x: any) => ({
          id: String(x.id),
          razao_social: x.razao_social ?? null,
          cnpj: x.cnpj ?? null,
          cidade: x.cidade ?? null,
          estado: x.estado ?? null,
          ativo: x.ativo ?? null,
          situacao_empresa: x.situacao_empresa ?? null,
        }));
      }

      payload.empresas = empresas;
      payload.empresas_limite = lim;
      payload.empresas_observacao =
        total > empresas.length ? `Mostrando ${empresas.length} de ${total}. Peça “listar mais” se precisar.` : null;
    }

    resultados.push(payload);
  }

  return JSON.stringify({ grupos: resultados });
}

/** Palavras a ignorar ao extrair termo útil a partir de uma pergunta em linguagem natural. */
const PT_BUSCA_STOP = new Set(
  [
    "a", "ao", "aos", "as", "o", "os", "um", "uma", "uns", "de", "do", "da", "dos", "das",
    "e", "em", "no", "na", "nos", "nas", "que", "com", "por", "para", "se", "ou", "mais",
    "muito", "muita", "muitos", "muitas", "qual", "quais", "quem", "quando", "onde", "há", "ha",
    "existe", "existem", "tem", "pode", "poderia", "diz", "diga", "me", "mim", "não", "nao", "ver",
    "saber", "listar", "mostrar", "buscar", "procurar", "mostre", "liste", "sobre", "dados", "dado",
    "cadastro", "cadastrad", "cadastrada", "cadastrado", "cadastrados", "sistema", "painel", "nosso",
    "nossa", "nossos", "nossas", "bcc", "empresa", "empresas", "cliente", "clientes", "razao", "razão",
    "social", "nome", "cnpj", "grupo", "grupos", "interno", "interna", "mesmo", "próprio", "proprio",
    "encontrei", "encontrou", "informacoes", "informações", "sobre", "ainda", "fale", "digo",
  ]
);

function normalizarTermoBusca(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120);
}

/**
 * Tira o “ruído” da pergunta para a ilike (nome/CNPJ) bater depressa, em vez
 * de procurar a frase inteira.
 */
function extractBuscaRapidaTermo(msg: string): string {
  const t = msg.trim();
  if (t.length < 2) return t;
  const digits = t.replace(/\D/g, "");
  if (digits.length === 14) return t;
  const quoted =
    t.match(/["“]([^"”]{2,100})["”]/)?.[1]?.trim() ?? t.match(/'([^']{2,100})'/)?.[1]?.trim();
  if (quoted && quoted.length >= 2) return quoted.slice(0, 120);
  const words = t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const kept = words.filter((w) => w.length > 1 && !PT_BUSCA_STOP.has(w));
  if (kept.length) {
    const s = kept.join(" ").slice(0, 120);
    if (s.length >= 2) return s;
  }
  return t.slice(0, 120);
}

/** Junta o fim do chat (perguntas de seguimento trazem o nome nas mensagens anteriores). */
function blocoMensagensRecentes(msgs: ClientMsg[], maxMens = 10, maxChar = 8000): string {
  const partes = msgs
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-maxMens)
    .map((m) => (typeof m.content === "string" ? m.content : ""));
  const s = partes.join("\n").trim();
  if (s.length <= maxChar) return s;
  return s.slice(-maxChar);
}

function extractCnpj14DoTexto(s: string): string | null {
  const m = s.replace(/\D/g, "").match(/\d{14}/);
  return m ? m[0] : null;
}

/** Razão social com sufixo típico (texto + LTDA, etc.), para ilike. */
function extractRazaoComSufixoSocietario(s: string): string | null {
  const re =
    /\b((?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9&][A-Za-zÁÉÍÓÚÂÊÔÃÕça-záéíóúâêôãõç0-9&.\-']+\s+){1,12}(?:LTDA|LDA|ME|EPP|EIRELI|S\.\s*A\.?|S\/A)\b)/iu;
  const m = s.match(re);
  return m ? m[1].trim().slice(0, 120) : null;
}

function extractRazaoJsonDoContexto(bloco: string): string | null {
  const re = /"razao_social"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let last: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bloco)) !== null) {
    const raw = m[1].replace(/\\"/g, '"').replace(/\\n/g, "\n");
    if (raw.trim().length >= 2) last = raw.trim();
  }
  return last ? last.slice(0, 120) : null;
}

/** Nome de empresa em MAIÚSCULAS (ex.: ALAMEDDINE HOLDING), sem exigir LTDA. */
function extractMaiusculasNomeEmpresa(s: string): string | null {
  const re = /\b((?:[A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚ0-9&.\-]{1,32}\s+){1,5}[A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚ0-9&.\-]{1,32})\b/gu;
  let best: string | null = null;
  for (const m of s.matchAll(re)) {
    const g = m[1].trim();
    if (g.split(/\s+/).length < 2) continue;
    if (!best || g.length > best.length) best = g;
  }
  return best ? best.slice(0, 120) : null;
}

/**
 * Termo útil para pesquisa no cadastro, usando **todo** o fim do chat
 * (a última pergunta pode ser só "a que grupo pertence?").
 */
function extractTermoRicoParaCadastro(bloco: string): string {
  const t = bloco.trim();
  if (t.length < 2) return t;
  const cnpj = extractCnpj14DoTexto(t);
  if (cnpj) return cnpj;
  const aspas =
    t.match(/["“]([^"”]{2,100})["”]/)?.[1]?.trim() ?? t.match(/'([^']{2,100})'/)?.[1]?.trim();
  if (aspas && aspas.length >= 2) return aspas.slice(0, 120);
  const comSufixo = extractRazaoComSufixoSocietario(t);
  if (comSufixo) return comSufixo;
  const deJson = extractRazaoJsonDoContexto(t);
  if (deJson) return deJson;
  const caps = extractMaiusculasNomeEmpresa(t);
  if (caps) return caps;
  return extractBuscaRapidaTermo(t);
}

function termoParaPreloadCadastro(msgs: ClientMsg[]): string {
  return extractTermoRicoParaCadastro(blocoMensagensRecentes(msgs));
}

function shouldPrefetchCadastro(msg: string): boolean {
  const t = msg.trim();
  if (t.length < 2) return false;
  const muitoCurto = new Set([
    "ok", "obrigado", "obrigada", "sim", "não", "nao", "olá", "ola", "oi", "tchau", "obg",
  ]);
  if (muitoCurto.has(t.toLowerCase())) return false;
  return true;
}

function shouldPrefetchGrupoEconomico(msg: string): boolean {
  const t = msg.trim().toLowerCase();
  if (t.length < 2) return false;
  // Evita o caso clássico: usuário pergunta "quantas empresas tem no grupo X"
  // e o modelo usa só a pré-carga do cadastro (por nome) e responde errado.
  return (
    /\bgrupo\b/.test(t) &&
    /(quant|qtd|quanto|quantas|quantos|valor|contrato|empresas|clientes|listar|liste|mostre)/.test(
      t
    )
  );
}

function extractGrupoNomeDoTexto(msg: string): string | null {
  const t = msg.trim();
  if (t.length < 2) return null;

  const quoted =
    t.match(/["“]([^"”]{2,120})["”]/)?.[1]?.trim() ??
    t.match(/'([^']{2,120})'/)?.[1]?.trim();
  if (quoted && quoted.length >= 2) return quoted.slice(0, 120);

  const m = t.match(
    /\bgrupo(?:\s+econ(?:ô|o)mico)?\s*[:\-]?\s*([^\n\r?.!]{2,120})/i
  );
  if (!m) return null;
  const raw = (m[1] ?? "").trim();
  if (raw.length < 2) return null;
  const cleaned =
    raw.replace(/\s+(tem|possui|com|no|na|das|dos|de|do|da)\b.*$/i, "").trim() || raw;
  return cleaned.slice(0, 120);
}

const COTA_GEMINI_MSG =
  "A cota da API Google AI foi excedida (cota diária/plano gratuito) ou a faturação precisa ser verificada. Em Google AI Studio confira o uso e, se for o caso, faturamento em https://aistudio.google.com/ — o resto do painel continua a funcionar sem o assistente.";

/**
 * O painel "tokens" no AI Studio muitas vezes mostra 0 se o pedido falhou antes
 * de concluir a geração, ou contabiliza outra coisa. Os limites de **requisições**
 * (RPM por minuto, RPD por dia no free tier) são separados: cada chamada à API
 * com ferramentas = várias requisições, mesmo com 0 em tokens.
 */
const LIMITO_PEDIDOS_NAO_E_TOKENS =
  "O limite aplica-se a requisições (RPM) e, no plano gratuito, a pedidos/dia, não ao gráfico de tokens — pedidos rejeitados à partida podem mostrar 0 tokens. Uma resposta com ferramentas (CNPJ, busca) usa várias requisições. Aguarde 1 minuto, reduza a conversa, ou ajuste cota no AI Studio. ";

function geminiErrorLooksLikeDailyOrPlanLimit(err: GoogleGenerativeAIFetchError): boolean {
  const msg = (err.message ?? "").toLowerCase();
  const details = JSON.stringify(err.errorDetails ?? []).toLowerCase();
  const s = msg + details;
  return /per[\s_]*day|per[\s_]*día|request[s]?[\/\s]day|generaterequestsperday|exceeded your current quota|check your (plan|billing)|consumer_quota|retrydelay|generate_content_free_tier|free[\s-]*tier.*(limit|exceeded|requests)/i.test(
    s
  );
}

/** Registo de diagnóstico (não contém a chave). */
function logGeminiApiError(
  where: string,
  err: GoogleGenerativeAIFetchError
): void {
  console.warn(
    `[/api/ai/chat] ${where} — HTTP ${err.status ?? "?"} ${(err as { statusText?: string }).statusText ?? ""}`.trim(),
    err.message,
    err.errorDetails ? JSON.stringify(err.errorDetails) : ""
  );
}

/**
 * 429 = muitas vezes throttling (RPM) ou, no free tier, RPD. Retentar ajuda o primeiro; o segundo
 * precisa de esperar ou de plano pago. Uma resposta com ferramentas = várias chamadas seguidas.
 */
async function withGemini429Retry<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const maxAttempts = 4;
  const msAfterFailure = [900, 1800, 3500] as const;
  let last: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!(e instanceof GoogleGenerativeAIFetchError) || e.status !== 429) {
        throw e;
      }
      if (geminiErrorLooksLikeDailyOrPlanLimit(e)) {
        throw e;
      }
      if (attempt >= maxAttempts - 1) {
        break;
      }
      const wait = msAfterFailure[attempt] ?? 3500;
      console.warn(
        `[/api/ai/chat] ${label} HTTP 429 (throttle), a aguardar ${wait}ms — nova tentativa ${attempt + 2}/${maxAttempts}`
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last;
}

/**
 * Mapeia erros comuns da API Google AI (chave, cota, 429) para resposta amigável.
 * @see https://ai.google.dev/gemini-api/docs/troubleshooting
 */
function responseForGeminiFailure(err: unknown): { status: number; message: string } {
  if (err instanceof GoogleGenerativeAIFetchError) {
    logGeminiApiError("Gemini", err);
    const status = err.status ?? 0;
    const msg = (err.message ?? "").trim();
    const lower = msg.toLowerCase();

    if (
      status === 404 ||
      /not found|is not (found|available) for|no such (model|version)|model.*not (found|valid)|invalid model|unknown name|models\//i.test(
        lower
      )
    ) {
      return {
        status: 503,
        message:
          `O modelo "${MODEL}" não está disponível para esta chave (404). ` +
          "No AI Studio vê o nome exato do modelo no seletor; ex.: gemini-2.0-flash-lite, gemini-2.0-flash, gemini-1.5-flash-latest. " +
          "Defina GEMINI_MODEL no servidor e reinicie. Isto gera 0 em tokens na API porque a chamada não conclui.",
      };
    }

    if (status === 400 && /api key|api_key|key.*invalid|invalid.*key|malformed|not valid|permission denied|has not been used in project/i.test(msg)) {
      if (/model|not supported|is not (found|valid)|generatecontent/i.test(lower)) {
        return {
          status: 503,
          message:
            `Pedido rejeitado (400) para o modelo «${MODEL}» ou a chave. ` +
            "Confirma GEMINI_MODEL e a Generative Language API ativa; detalhe no registo do servidor.",
        };
      }
      return {
        status: 503,
        message:
          "Chave da API (Google AI) inválida, incompleta ou o projeto da chave sem a Generative Language API. Corrija GEMINI_API_KEY (obter em https://aistudio.google.com/apikey) e verifica no Google Cloud se a API está ativa; reinicia a aplicação.",
      };
    }

    if (status === 429) {
      if (geminiErrorLooksLikeDailyOrPlanLimit(err)) {
        return { status: 503, message: COTA_GEMINI_MSG };
      }
      return {
        status: 429,
        message:
          LIMITO_PEDIDOS_NAO_E_TOKENS +
          "Se continuar, reduz pedidos (uma pergunta de cada vez) ou desativa ferramentas testando com uma pergunta simples.",
      };
    }

    if (status && /resource exhausted|rate limit|too many requests/i.test(lower)) {
      if (geminiErrorLooksLikeDailyOrPlanLimit(err)) {
        return { status: 503, message: COTA_GEMINI_MSG };
      }
      return {
        status: 429,
        message: LIMITO_PEDIDOS_NAO_E_TOKENS,
      };
    }

    if (status === 401 || status === 403) {
      return {
        status: 503,
        message:
          "Acesso negado à API Google AI (restritos de chave, projeto ou faturamento). Vê a chave e restrições em https://aistudio.google.com/apikey — 0 tokens se o acesso nunca for concedido à API de geração.",
      };
    }

    if (
      /\b(billing|payment|consumer_suspended|insufficient)\b|exceeded|over (your )?quota|per[\s_]*day|faturação/i.test(
        lower
      )
    ) {
      return { status: 503, message: COTA_GEMINI_MSG };
    }

    if (status >= 500 || /internal|unavailable|overloaded|502|503|504/i.test(lower)) {
      return {
        status: 502,
        message:
          "O serviço de IA (Google) está indisponível. Tente novamente em instantes.",
      };
    }

    if (msg) {
      return {
        status: 502,
        message:
          "Não foi possível usar o assistente de IA neste momento. " +
          (msg.length > 200 ? msg.slice(0, 200) + "…" : msg),
      };
    }
  }

  if (err instanceof GoogleGenerativeAIResponseError) {
    const m = (err.message ?? "").trim();
    return {
      status: 502,
      message:
        m && m.length < 500
          ? m
          : "A resposta do modelo foi bloqueada ou estava inválida. Tente reformular a pergunta.",
    };
  }

  if (err instanceof GoogleGenerativeAIError) {
    const m = (err.message ?? "").trim();
    return {
      status: 502,
      message: m || "Falha ao falar com o serviço de IA. Tente de novo em instantes.",
    };
  }

  return {
    status: 502,
    message: "Falha ao falar com o serviço de IA. Tente de novo em instantes.",
  };
}

export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const canSeeContrato = profile.tipo_usuario === "diretor" || profile.tipo_usuario === "financeiro";
  const key = process.env.GEMINI_API_KEY;
  if (!key?.trim()) {
    return NextResponse.json(
      { error: "Assistente não configurado. Defina GEMINI_API_KEY no servidor." },
      { status: 503 }
    );
  }

  let body: { messages?: ClientMsg[] };
  try {
    body = (await req.json()) as { messages?: ClientMsg[] };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const incoming = body.messages;
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return NextResponse.json(
      { error: "Envie `messages` com pelo uma mensagem." },
      { status: 400 }
    );
  }
  if (incoming.length > 30) {
    return NextResponse.json({ error: "Muitas mensagens." }, { status: 400 });
  }

  const last = incoming[incoming.length - 1];
  if (last?.role !== "user") {
    return NextResponse.json(
      { error: "A última mensagem deve ser do usuário." },
      { status: 400 }
    );
  }

  const prior = incoming.slice(0, -1).map((m) => {
    if (m.role === "user" && typeof m.content === "string" && m.content.length > 12_000) {
      return { ...m, content: m.content.slice(0, 12_000) + "…" };
    }
    return m;
  });

  let lastUserText =
    typeof last.content === "string" ? last.content : "";
  if (lastUserText.length > 12_000) {
    lastUserText = lastUserText.slice(0, 12_000) + "…";
  }

  const history = prior
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const text = typeof m.content === "string" ? m.content : "";
      if (m.role === "user") {
        return { role: "user" as const, parts: [{ text }] };
      }
      return { role: "model" as const, parts: [{ text }] };
    });

  const supabase = await createSupabaseServerClient();
  const maxModelCalls = 5;

  const termoBuscaRapida = termoParaPreloadCadastro(incoming);
  const termoPreloadNormalizado = normalizarTermoBusca(termoBuscaRapida);
  let cadastroPreloadJson: string | null = null;
  let grupoPreloadJson: string | null = null;
  let grupoPreloadNome: string | null = null;
  if (shouldPrefetchCadastro(lastUserText) && termoBuscaRapida.trim().length >= 2) {
    try {
      cadastroPreloadJson = await buscarEmpresasSistema(
        supabase,
        termoBuscaRapida,
        canSeeContrato
      );
    } catch (e) {
      console.warn("[/api/ai/chat] pré-carga cadastro", e);
    }
  }

  if (shouldPrefetchGrupoEconomico(lastUserText)) {
    const nomeGrupo = extractGrupoNomeDoTexto(lastUserText);
    if (nomeGrupo && nomeGrupo.trim().length >= 2) {
      try {
        grupoPreloadNome = nomeGrupo.slice(0, 120);
        // Por padrão: só contagem/metadados. Listagem fica sob demanda.
        grupoPreloadJson = await consultarGrupoEconomico(
          supabase,
          grupoPreloadNome,
          false,
          0,
          canSeeContrato
        );
      } catch (e) {
        console.warn("[/api/ai/chat] pré-carga grupo econômico", e);
      }
    }
  }
  const lastUserComPreload =
    cadastroPreloadJson != null
      ? `${lastUserText}

[Pré-carga BCC do teu cadastro (RLS), termo «${termoBuscaRapida.slice(0, 120)}» — usa estes resultados; só chama buscar_empresas_sistema com outro termo se precisares de outro filtro.]
${cadastroPreloadJson}`
      : lastUserText;

  const lastUserComPreload2 =
    grupoPreloadJson != null && grupoPreloadNome != null
      ? `${lastUserComPreload}

[Pré-carga BCC — Grupo econômico, termo «${grupoPreloadNome}». Use isto para responder contagens/contrato do grupo. Para listar empresas, chame consultar_grupo_economico com incluir_empresas=true.]
${grupoPreloadJson}`
      : lastUserComPreload;

  const genAI = new GoogleGenerativeAI(key.trim());
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM,
    tools: [
      {
        functionDeclarations: FUNCTION_DECLARATIONS,
      },
    ],
    toolConfig: {
      functionCallingConfig: { mode: FunctionCallingMode.AUTO },
    },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  });

  let chat: ReturnType<typeof model.startChat>;
  try {
    chat = model.startChat({ history });
  } catch (err) {
    const { status, message } = responseForGeminiFailure(err);
    console.warn("[/api/ai/chat] Gemini startChat", err);
    return NextResponse.json({ error: message }, { status });
  }

  let result: Awaited<ReturnType<typeof chat.sendMessage>>;
  try {
    result = await withGemini429Retry("sendMessage", () =>
      chat.sendMessage(lastUserComPreload2)
    );
  } catch (err) {
    const { status, message } = responseForGeminiFailure(err);
    console.warn("[/api/ai/chat] Gemini sendMessage", err);
    return NextResponse.json({ error: message }, { status });
  }

  let modelCalls = 1;

  for (;;) {
    const response = result.response;
    if (response.promptFeedback?.blockReason) {
      return NextResponse.json(
        {
          error:
            "O conteúdo foi bloqueado pelas regras de segurança do modelo. Reformule a pergunta.",
        },
        { status: 400 }
      );
    }

    const fcs = response.functionCalls();
    if (!fcs?.length) {
      let text = "";
      try {
        text = response.text();
      } catch {
        text = "";
      }
      return NextResponse.json({ message: { role: "assistant", content: text } });
    }

    if (modelCalls >= maxModelCalls) {
      return NextResponse.json(
        {
          error:
            "Limite de passos de ferramentas. Reformule a pergunta de forma mais simples.",
        },
        { status: 500 }
      );
    }

    const toolParts: {
      functionResponse: { name: string; response: Record<string, unknown> };
    }[] = [];

    for (const fc of fcs) {
      const name = fc.name;
      const args = (fc.args ?? {}) as {
        cnpj?: string;
        termo?: string;
        nome?: string;
        incluir_empresas?: boolean;
        limite?: number;
      };
      let toolText = "";

      if (name === "consultar_cnpj") {
        const cnpj = String(args.cnpj ?? "")
          .replace(/\D/g, "")
          .slice(0, 14);
        if (cnpj.length !== 14) {
          toolText = JSON.stringify({ erro: "CNPJ inválido: use 14 dígitos." });
        } else {
          const { body: cnpjBody } = await lookupCnpjPublic(cnpj);
          toolText = cnpjPayloadForTool(cnpjBody);
        }
      } else if (name === "buscar_empresas_sistema") {
        const termo = String(args.termo ?? "");
        if (
          cadastroPreloadJson !== null &&
          normalizarTermoBusca(termo) === termoPreloadNormalizado
        ) {
          toolText = cadastroPreloadJson;
        } else {
          toolText = await buscarEmpresasSistema(supabase, termo, canSeeContrato);
        }
      } else if (name === "consultar_grupo_economico") {
        const nome = String(args.nome ?? "");
        const incluir = Boolean(args.incluir_empresas ?? false);
        const limite = Number(args.limite ?? 20);
        toolText = await consultarGrupoEconomico(
          supabase,
          nome,
          incluir,
          limite,
          canSeeContrato
        );
      } else {
        toolText = JSON.stringify({ erro: "função desconhecida" });
      }

      toolParts.push({
        functionResponse: {
          name,
          response: toToolResponsePayload(toolText),
        },
      });
    }

    try {
      result = await withGemini429Retry("toolFollowUp", () =>
        chat.sendMessage(toolParts)
      );
    } catch (err) {
      const { status, message } = responseForGeminiFailure(err);
      console.warn("[/api/ai/chat] Gemini tool follow-up", err);
      return NextResponse.json({ error: message }, { status });
    }
    modelCalls++;
  }
}
