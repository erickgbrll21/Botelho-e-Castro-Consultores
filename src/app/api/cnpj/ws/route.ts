import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { FETCH_HEADERS_BROWSER_LIKE } from "@/lib/public-fetch-headers";

type CnpjNormalized = {
  cnpj: string;
  nome: string;
  fantasia: string;
  situacao: string;
  abertura: string;
  atividade_principal: string;
  endereco: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  // Campos auxiliares para preencher formulário (não afetam UI se ausentes).
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  _meta?: {
    api: "brasilapi" | "receitaws" | "cnpjws" | "cache";
    stale?: boolean;
    attempts: Attempt[];
  };
};

type Attempt = {
  api: "brasilapi" | "receitaws" | "cnpjws";
  ok: boolean;
  status?: number;
  error?: string;
};
type Attempts = Attempt[];

const TIMEOUT_MS = 4_800;
const MAX_RETRIES_PER_API = 2;
const CACHE_TTL_MS = 10 * 60_000;
const STALE_IF_ERROR_MS = 24 * 60 * 60_000; // 24h

const cache = new Map<
  string,
  { expiresAt: number; staleUntil: number; payload: CnpjNormalized }
>();

function emptyNormalized(cnpj: string): CnpjNormalized {
  return {
    cnpj,
    nome: "",
    fantasia: "",
    situacao: "",
    abertura: "",
    atividade_principal: "",
    endereco: {
      logradouro: "",
      numero: "",
      bairro: "",
      cidade: "",
      uf: "",
      cep: "",
    },
  };
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function digitsOnly(v: string): string {
  return v.replace(/\D/g, "");
}

function normalizeBrasilApi(cnpj: string, payload: unknown): CnpjNormalized {
  const p = payload as Record<string, unknown>;
  return {
    ...emptyNormalized(cnpj),
    cnpj: safeStr(p.cnpj) || cnpj,
    nome: safeStr(p.razao_social),
    fantasia: safeStr(p.nome_fantasia),
    situacao: safeStr(p.descricao_situacao_cadastral),
    abertura: safeStr(p.data_inicio_atividade),
    atividade_principal: safeStr(p.cnae_fiscal_descricao),
    endereco: {
      logradouro: safeStr(p.logradouro),
      numero: safeStr(p.numero),
      bairro: safeStr(p.bairro),
      cidade: safeStr(p.municipio),
      uf: safeStr(p.uf),
      cep: digitsOnly(safeStr(p.cep)),
    },
    inscricao_estadual: safeStr(p.inscricao_estadual) || undefined,
    inscricao_municipal: safeStr(p.inscricao_municipal) || undefined,
  };
}

function normalizeReceitaWs(cnpj: string, payload: unknown): CnpjNormalized {
  const p = payload as Record<string, unknown>;
  const ap = (p.atividade_principal as Array<Record<string, unknown>> | undefined)?.[0];
  return {
    ...emptyNormalized(cnpj),
    cnpj: digitsOnly(safeStr(p.cnpj)) || cnpj,
    nome: safeStr(p.nome),
    fantasia: safeStr(p.fantasia),
    situacao: safeStr(p.situacao),
    abertura: safeStr(p.abertura),
    atividade_principal: safeStr(ap?.text),
    endereco: {
      logradouro: safeStr(p.logradouro),
      numero: safeStr(p.numero),
      bairro: safeStr(p.bairro),
      cidade: safeStr(p.municipio),
      uf: safeStr(p.uf),
      cep: digitsOnly(safeStr(p.cep)),
    },
  };
}

function normalizeCnpjWs(cnpj: string, payload: unknown): CnpjNormalized {
  const root = payload as Record<string, unknown>;
  const est = root.estabelecimento as Record<string, unknown> | undefined;
  const estAny = est as any;
  const nome = safeStr(root.razao_social);
  const fantasia = safeStr(estAny?.nome_fantasia);
  const situacao = safeStr(estAny?.situacao_cadastral);
  const abertura = safeStr(estAny?.data_inicio_atividade);
  const atividade = safeStr(estAny?.atividade_principal?.descricao);
  const cep = digitsOnly(safeStr(estAny?.cep));

  // IE/IM (best effort)
  const ies = est?.inscricoes_estaduais as Array<Record<string, unknown>> | undefined;
  const ieRaw = Array.isArray(ies)
    ? safeStr(
        (ies.find((x) => x.ativo !== false)?.inscricao_estadual ?? ies[0]?.inscricao_estadual)
      )
    : "";
  const ims = est?.inscricoes_municipais as Array<Record<string, unknown>> | undefined;
  const imRaw = Array.isArray(ims)
    ? safeStr(ims[0]?.inscricao_municipal ?? ims[0]?.numero)
    : safeStr(est?.inscricao_municipal ?? est?.inscricao_municipal_numero ?? est?.numero_inscricao_municipal);

  return {
    ...emptyNormalized(cnpj),
    cnpj,
    nome,
    fantasia,
    situacao,
    abertura,
    atividade_principal: atividade,
    endereco: {
      logradouro: safeStr(estAny?.logradouro),
      numero: safeStr(estAny?.numero),
      bairro: safeStr(estAny?.bairro),
      cidade: safeStr(estAny?.cidade?.nome ?? estAny?.cidade),
      uf: safeStr(estAny?.estado?.sigla ?? estAny?.estado),
      cep,
    },
    inscricao_estadual: ieRaw || undefined,
    inscricao_municipal: imRaw || undefined,
  };
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        ...FETCH_HEADERS_BROWSER_LIKE,
      },
    });
    const status = res.status;
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { ok: res.ok, status, json, retryAfter: res.headers.get("retry-after") };
  } finally {
    clearTimeout(timeout);
  }
}

async function attemptApi<T>(
  api: "brasilapi" | "receitaws" | "cnpjws",
  url: string,
  cnpj: string,
  normalizer: (cnpj: string, payload: unknown) => T,
  attempts: Attempts
): Promise<T | null> {
  for (let i = 0; i < MAX_RETRIES_PER_API; i++) {
    try {
      const r = await fetchJsonWithTimeout(url, TIMEOUT_MS);
      if (r.status === 404) {
        attempts.push({ api, ok: false, status: 404 });
        return null;
      }
      if (r.status === 429) {
        attempts.push({ api, ok: false, status: 429 });
        return null;
      }
      if (!r.ok) {
        attempts.push({ api, ok: false, status: r.status });
        return null;
      }
      attempts.push({ api, ok: true, status: r.status });
      return normalizer(cnpj, r.json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      attempts.push({ api, ok: false, error: msg });
      // retry only on network/timeout
      if (i < MAX_RETRIES_PER_API - 1) {
        await new Promise((r) => setTimeout(r, 150));
        continue;
      }
      return null;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("cnpj") ?? "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 14) {
    return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
  }

  try {
    const now = Date.now();
    const cached = cache.get(digits);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json({
        ...cached.payload,
        _meta: {
          api: "cache",
          stale: false,
          attempts: [],
        },
      } satisfies CnpjNormalized);
    }

    const attempts: Attempts = [];

    const brasil = await attemptApi(
      "brasilapi",
      `https://brasilapi.com.br/api/cnpj/v1/${digits}`,
      digits,
      normalizeBrasilApi,
      attempts
    );
    if (brasil) {
      const payload: CnpjNormalized = {
        ...brasil,
        _meta: { api: "brasilapi", attempts },
      };
      cache.set(digits, {
        expiresAt: now + CACHE_TTL_MS,
        staleUntil: now + STALE_IF_ERROR_MS,
        payload,
      });
      return NextResponse.json(payload);
    }

    const receita = await attemptApi(
      "receitaws",
      `https://receitaws.com.br/v1/cnpj/${digits}`,
      digits,
      normalizeReceitaWs,
      attempts
    );
    if (receita) {
      const payload: CnpjNormalized = {
        ...receita,
        _meta: { api: "receitaws", attempts },
      };
      cache.set(digits, {
        expiresAt: now + CACHE_TTL_MS,
        staleUntil: now + STALE_IF_ERROR_MS,
        payload,
      });
      return NextResponse.json(payload);
    }

    const ws = await attemptApi(
      "cnpjws",
      `https://publica.cnpj.ws/cnpj/${digits}`,
      digits,
      normalizeCnpjWs,
      attempts
    );
    if (ws) {
      const payload: CnpjNormalized = {
        ...ws,
        _meta: { api: "cnpjws", attempts },
      };
      cache.set(digits, {
        expiresAt: now + CACHE_TTL_MS,
        staleUntil: now + STALE_IF_ERROR_MS,
        payload,
      });
      return NextResponse.json(payload);
    }

    // tudo falhou: devolve stale se existir
    if (cached && cached.staleUntil > now) {
      return NextResponse.json(
        {
          ...cached.payload,
          _meta: {
            api: "cache",
            stale: true,
            attempts,
          },
        } satisfies CnpjNormalized,
        { headers: { "X-Cache": "stale" } }
      );
    }

    console.error("[/api/cnpj/ws] todas as APIs falharam", {
      cnpj: digits,
      attempts,
    });
    return NextResponse.json(
      {
        ...emptyNormalized(digits),
        _meta: {
          api: "cache",
          stale: false,
          attempts,
        },
        error: "Serviço indisponível no momento",
      } as unknown,
      { status: 503 }
    );
  } catch (err) {
    console.error("[/api/cnpj/ws] erro inesperado", {
      cnpj: digits,
      err: err instanceof Error ? err.message : String(err),
    });
    const now = Date.now();
    const cached = cache.get(digits);
    if (cached && cached.staleUntil > now) {
      return NextResponse.json(cached.payload, {
        headers: { "X-Cache": "stale" },
      });
    }
    return NextResponse.json(
      { error: "Serviço indisponível no momento" },
      { status: 503 }
    );
  }
}
