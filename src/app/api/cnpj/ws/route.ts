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
    api: "brasilapi" | "cache";
    stale?: boolean;
    attempts: Attempt[];
  };
};

type Attempt = {
  api: "brasilapi";
  ok: boolean;
  status?: number;
  error?: string;
};
type Attempts = Attempt[];

const TIMEOUT_MS = 4_800;
const MAX_RETRIES = 2;
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

async function fetchBrasilApi(
  cnpj: string,
  attempts: Attempts
): Promise<CnpjNormalized | null> {
  const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const r = await fetchJsonWithTimeout(url, TIMEOUT_MS);
      if (r.status === 404) {
        attempts.push({ api: "brasilapi", ok: false, status: 404 });
        return null;
      }
      if (r.status === 429) {
        attempts.push({ api: "brasilapi", ok: false, status: 429 });
        return null;
      }
      if (!r.ok) {
        attempts.push({ api: "brasilapi", ok: false, status: r.status });
        return null;
      }
      attempts.push({ api: "brasilapi", ok: true, status: r.status });
      return normalizeBrasilApi(cnpj, r.json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      attempts.push({ api: "brasilapi", ok: false, error: msg });
      if (i < MAX_RETRIES - 1) {
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

    const brasil = await fetchBrasilApi(digits, attempts);
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
    // Importante: responder 200 evita "Failed to load resource" no console do browser.
    // A UI decide como exibir (mostra mensagem amigável).
    return NextResponse.json({
      ...emptyNormalized(digits),
      _meta: {
        api: "cache",
        stale: false,
        attempts,
      },
      error: "Serviço indisponível no momento",
    } as unknown);
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
    return NextResponse.json({
      ...emptyNormalized(digits),
      _meta: { api: "cache", stale: false, attempts: [] },
      error: "Serviço indisponível no momento",
    } as unknown);
  }
}
