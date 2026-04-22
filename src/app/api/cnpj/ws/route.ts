import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { cnpjWsPublicaToBrasilApiJson } from "@/lib/cnpj-ws-publica-adapter";
import { extractInscricoesFromCnpjWsPayload } from "@/lib/cnpj-ws-inscricoes";
import { FETCH_HEADERS_BROWSER_LIKE } from "@/lib/public-fetch-headers";

type ApiName = "brasilapi" | "receitaws" | "cnpjws" | "cache";

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
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  _meta?: {
    api: ApiName;
    stale?: boolean;
    attempts: AttemptLog[];
  };
  error?: string;
};

type AttemptLog = {
  api: "brasilapi" | "receitaws" | "cnpjws";
  ok: boolean;
  status?: number;
  error?: string;
  /** "timeout" | "rate_limit" | "http" | "parse" | "data" */
  reason?: string;
};

const TIMEOUT_MS = 5_000;
const MAX_TRIES_PER_API = 2;
const CACHE_TTL_MS = 10 * 60_000;
const STALE_IF_ERROR_MS = 24 * 60 * 60_000;

/** Memória. Para Redis: substitua leitura/escrita deste Map por get/set com TTL. */
const cache = new Map<
  string,
  { expiresAt: number; staleUntil: number; payload: CnpjNormalized }
>();

const UPSTREAM_HEADERS: HeadersInit = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0",
  "Accept-Language": FETCH_HEADERS_BROWSER_LIKE["Accept-Language"],
};

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

function atividadeText(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object" && "text" in (v as object)) {
    return String((v as { text?: string }).text ?? "").trim();
  }
  if (v && typeof v === "object" && "name" in (v as object)) {
    return String((v as { name?: string }).name ?? "").trim();
  }
  return "";
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

function normalizeReceitaws(cnpj: string, payload: unknown): CnpjNormalized {
  const p = payload as Record<string, unknown>;
  const st = p.status;
  const situ =
    safeStr(p.situacao) ||
    (typeof st === "string" ? st : "") ||
    safeStr(p.situacao_cadastral);
  return {
    ...emptyNormalized(cnpj),
    cnpj: digitsOnly(safeStr(p.cnpj)) || cnpj,
    nome: safeStr(p.nome) || safeStr(p.nome_fantasia),
    fantasia: safeStr(p.fantasia) || safeStr(p.nome_fantasia),
    situacao: situ,
    abertura: safeStr(p.abertura) || safeStr(p.data_abertura),
    atividade_principal: atividadeText(p.atividade_principal),
    endereco: {
      logradouro: safeStr(p.logradouro),
      numero: safeStr(p.numero),
      bairro: safeStr(p.bairro),
      cidade: safeStr(p.municipio) || safeStr(p.cidade),
      uf: safeStr(p.uf),
      cep: digitsOnly(safeStr(p.cep)),
    },
  };
}

function situacaoFromCnpjWsRaw(
  n: CnpjNormalized,
  raw: unknown
): CnpjNormalized {
  const r = raw as Record<string, unknown> | null;
  const est = (r?.estabelecimento as Record<string, unknown>) ?? undefined;
  if (!est || n.situacao) return n;
  const s = est.situacao_cadastral;
  if (s && typeof s === "object" && s !== null && "nome" in s) {
    return {
      ...n,
      situacao: String((s as { nome?: string }).nome ?? "").trim() || n.situacao,
    };
  }
  if (typeof s === "string" && s.trim()) return { ...n, situacao: s.trim() };
  return n;
}

type FetchResult = {
  ok: boolean;
  status: number;
  json: unknown;
  err?: string;
  aborted?: boolean;
};

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs: number
): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { ...UPSTREAM_HEADERS },
    });
    let json: unknown = null;
    try {
      const ct = res.headers.get("content-type");
      if (ct?.includes("application/json")) {
        json = await res.json();
      } else {
        const t = await res.text();
        try {
          json = JSON.parse(t) as unknown;
        } catch {
          json = null;
        }
      }
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      status: 0,
      json: null,
      err: msg,
      aborted: /aborted|AbortError/i.test(msg),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isReceitawsErrorBody(json: unknown): boolean {
  if (!json || typeof json !== "object") return true;
  const o = json as Record<string, unknown>;
  if (o.status === "OK" || o.status === "ok") return false;
  if (o.status === "ERROR" || o.status === "error") return true;
  if (o.message && typeof o.message === "string" && o.message.length > 0) {
    return /inválid|nao encontrad|não encontrad|erro|invalid|not found/i.test(
      o.message
    );
  }
  return false;
}

function logAttempt(attempts: AttemptLog[], a: AttemptLog) {
  attempts.push(a);
  if (!a.ok) {
    console.warn("[/api/cnpj/ws]", a.api, a.status, a.error ?? a.reason);
  }
}

async function tryBrasilapi(
  cnpj: string,
  attempts: AttemptLog[]
): Promise<CnpjNormalized | null> {
  const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`;
  for (let t = 0; t < MAX_TRIES_PER_API; t++) {
    const r = await fetchJsonWithTimeout(url, TIMEOUT_MS);
    if (r.aborted || (r.status === 0 && r.err)) {
      logAttempt(attempts, {
        api: "brasilapi",
        ok: false,
        status: r.status,
        error: r.err ?? "timeout",
        reason: r.aborted ? "timeout" : "network",
      });
    } else if (r.status === 429) {
      logAttempt(attempts, {
        api: "brasilapi",
        ok: false,
        status: 429,
        reason: "rate_limit",
      });
      if (t < MAX_TRIES_PER_API - 1) await new Promise((x) => setTimeout(x, 300));
      continue;
    } else if (r.status === 404) {
      logAttempt(attempts, { api: "brasilapi", ok: false, status: 404, reason: "data" });
      return null;
    } else if (!r.ok) {
      logAttempt(attempts, { api: "brasilapi", ok: false, status: r.status, reason: "http" });
    } else {
      const n = normalizeBrasilApi(cnpj, r.json);
      logAttempt(attempts, { api: "brasilapi", ok: true, status: r.status });
      return n;
    }
    if (t < MAX_TRIES_PER_API - 1) await new Promise((x) => setTimeout(x, 200));
  }
  return null;
}

async function tryReceitaws(
  cnpj: string,
  attempts: AttemptLog[]
): Promise<CnpjNormalized | null> {
  const url = `https://receitaws.com.br/v1/cnpj/${cnpj}`;
  for (let t = 0; t < MAX_TRIES_PER_API; t++) {
    const r = await fetchJsonWithTimeout(url, TIMEOUT_MS);
    if (r.aborted || (r.status === 0 && r.err)) {
      logAttempt(attempts, {
        api: "receitaws",
        ok: false,
        status: r.status,
        error: r.err,
        reason: r.aborted ? "timeout" : "network",
      });
    } else if (r.status === 429) {
      logAttempt(attempts, { api: "receitaws", ok: false, status: 429, reason: "rate_limit" });
      if (t < MAX_TRIES_PER_API - 1) await new Promise((x) => setTimeout(x, 400));
      continue;
    } else if (r.status === 404) {
      logAttempt(attempts, { api: "receitaws", ok: false, status: 404, reason: "data" });
    } else if (!r.ok) {
      logAttempt(attempts, { api: "receitaws", ok: false, status: r.status, reason: "http" });
    } else if (isReceitawsErrorBody(r.json)) {
      logAttempt(attempts, { api: "receitaws", ok: false, status: r.status, reason: "data" });
    } else {
      const n = normalizeReceitaws(cnpj, r.json);
      if (n.nome || n.fantasia) {
        logAttempt(attempts, { api: "receitaws", ok: true, status: r.status });
        return n;
      }
      logAttempt(attempts, { api: "receitaws", ok: false, status: r.status, reason: "data" });
    }
    if (t < MAX_TRIES_PER_API - 1) await new Promise((x) => setTimeout(x, 250));
  }
  return null;
}

async function tryCnpjws(
  cnpj: string,
  attempts: AttemptLog[]
): Promise<CnpjNormalized | null> {
  const url = `https://publica.cnpj.ws/cnpj/${cnpj}`;
  for (let t = 0; t < MAX_TRIES_PER_API; t++) {
    const r = await fetchJsonWithTimeout(url, TIMEOUT_MS);
    if (r.aborted || (r.status === 0 && r.err)) {
      logAttempt(attempts, {
        api: "cnpjws",
        ok: false,
        status: r.status,
        error: r.err,
        reason: r.aborted ? "timeout" : "network",
      });
    } else if (r.status === 429 || r.status === 403) {
      logAttempt(attempts, { api: "cnpjws", ok: false, status: r.status, reason: "rate_limit" });
      if (t < MAX_TRIES_PER_API - 1) await new Promise((x) => setTimeout(x, 600));
      continue;
    } else if (r.status === 404) {
      logAttempt(attempts, { api: "cnpjws", ok: false, status: 404, reason: "data" });
    } else if (!r.ok) {
      logAttempt(attempts, { api: "cnpjws", ok: false, status: r.status, reason: "http" });
    } else {
      const shaped = cnpjWsPublicaToBrasilApiJson(r.json);
      if (shaped) {
        let n = normalizeBrasilApi(cnpj, shaped);
        n = situacaoFromCnpjWsRaw(n, r.json);
        const uf = n.endereco.uf;
        const { inscricao_estadual, inscricao_municipal } =
          extractInscricoesFromCnpjWsPayload(r.json, uf);
        n = {
          ...n,
          inscricao_estadual: inscricao_estadual ?? n.inscricao_estadual,
          inscricao_municipal: inscricao_municipal ?? n.inscricao_municipal,
        };
        if (n.nome || n.fantasia) {
          logAttempt(attempts, { api: "cnpjws", ok: true, status: r.status });
          return n;
        }
      }
      logAttempt(attempts, { api: "cnpjws", ok: false, status: r.status, reason: "parse" });
    }
    if (t < MAX_TRIES_PER_API - 1) await new Promise((x) => setTimeout(x, 300));
  }
  return null;
}

function jsonErrorResponse(
  cnpj: string,
  message: string,
  attempts: AttemptLog[],
  status: number
) {
  const body: CnpjNormalized = {
    ...emptyNormalized(cnpj),
    error: message,
    _meta: { api: "cache", stale: false, attempts },
  };
  return NextResponse.json(body, { status });
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

  const attempts: AttemptLog[] = [];

  try {
    const now = Date.now();
    const cached = cache.get(digits);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json({
        ...cached.payload,
        _meta: { api: "cache", stale: false, attempts: [] },
      } satisfies CnpjNormalized);
    }

    const from =
      (await tryBrasilapi(digits, attempts)) ??
      (await tryReceitaws(digits, attempts)) ??
      (await tryCnpjws(digits, attempts));

    if (from) {
      const sourceApi = [...attempts].reverse().find((a) => a.ok)?.api;
      const metaApi: ApiName =
        sourceApi === "receitaws" || sourceApi === "cnpjws" || sourceApi === "brasilapi"
          ? sourceApi
          : "brasilapi";
      const out: CnpjNormalized = {
        ...from,
        _meta: { api: metaApi, stale: false, attempts: [...attempts] },
      };
      cache.set(digits, {
        expiresAt: now + CACHE_TTL_MS,
        staleUntil: now + STALE_IF_ERROR_MS,
        payload: { ...out },
      });
      return NextResponse.json(out);
    }

    if (cached && cached.staleUntil > now) {
      return NextResponse.json(
        {
          ...cached.payload,
          _meta: { api: "cache", stale: true, attempts },
        } satisfies CnpjNormalized,
        { headers: { "X-Cache": "stale" } }
      );
    }

    console.error("[/api/cnpj/ws] todas as fontes falharam", { cnpj: digits, attempts });
    return jsonErrorResponse(
      digits,
      "Não foi possível consultar o CNPJ no momento. Tente novamente em instantes.",
      attempts,
      503
    );
  } catch (err) {
    console.error("[/api/cnpj/ws] exceção", {
      cnpj: digits,
      err: err instanceof Error ? err.message : String(err),
    });
    const now = Date.now();
    const c = cache.get(digits);
    if (c && c.staleUntil > now) {
      return NextResponse.json(
        { ...c.payload, _meta: { api: "cache", stale: true, attempts } },
        { headers: { "X-Cache": "stale" } }
      );
    }
    return jsonErrorResponse(
      digits,
      "Não foi possível consultar o CNPJ no momento. Tente novamente em instantes.",
      attempts,
      503
    );
  }
}
