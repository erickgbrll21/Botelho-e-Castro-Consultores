"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { XMarkIcon } from "@heroicons/react/24/outline";

/** Ícone cérebro (baseado no path do Lucide "Brain", ISC). */
function BrainIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  );
}

type ChatMsg = { role: "user" | "assistant"; content: string };

type Session = {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMsg[];
};

const STORAGE_KEY = "bcc_assistant_widget_sessions_v1";

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function mkId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function titleFromMessages(messages: ChatMsg[]): string {
  const firstUser = messages.find((m) => m.role === "user")?.content?.trim() ?? "";
  if (!firstUser) return "Nova conversa";
  return firstUser.length > 38 ? firstUser.slice(0, 38).trim() + "…" : firstUser;
}

const QUICK_ACTIONS: { title: string; prompt: string }[] = [
  {
    title: "Consultar CNPJ (situação, CNAE, endereço)",
    prompt: "Consulte o CNPJ 00.000.000/0001-00 e me traga um resumo objetivo.",
  },
  {
    title: "Buscar empresa no cadastro interno",
    prompt: "Procure no cadastro interno por “NOME DA EMPRESA” e me mostre os resultados.",
  },
  {
    title: "Consultar grupo econômico (contagem e contrato)",
    prompt: "No grupo econômico “NOME DO GRUPO”, quantas empresas existem e qual o valor do contrato do grupo?",
  },
];

const CATEGORIES: { label: string; prompt: string }[] = [
  { label: "Clientes", prompt: "Quero ajuda com clientes e cadastro interno." },
  { label: "CNPJ", prompt: "Quero consultar e entender dados de CNPJ." },
  { label: "Fiscal", prompt: "Quero tirar dúvidas fiscais gerais (sem substituir um profissional)." },
  { label: "Jurídico", prompt: "Quero tirar dúvidas jurídicas gerais (sem aconselhamento)." },
  { label: "Painel", prompt: "Quero aprender a usar melhor o painel BCC." },
];

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"chat" | "history">("chat");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const stored = safeJsonParse<Session[]>(localStorage.getItem(STORAGE_KEY));
    if (stored?.length) {
      setSessions(stored);
      setActiveId(stored[0]!.id);
      return;
    }
    const first: Session = {
      id: mkId(),
      title: "Nova conversa",
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setSessions([first]);
    setActiveId(first.id);
  }, []);

  useEffect(() => {
    if (!sessions.length) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId]
  );

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, active?.messages?.length, loading]);

  const setActiveMessages = useCallback(
    (updater: (prev: ChatMsg[]) => ChatMsg[]) => {
      if (!active) return;
      setSessions((prev) =>
        prev.map((s) => (s.id === active.id ? { ...s, messages: updater(s.messages) } : s))
      );
    },
    [active]
  );

  const startNew = useCallback(() => {
    const s: Session = {
      id: mkId(),
      title: "Nova conversa",
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setTab("chat");
    setInput("");
    setError(null);
  }, []);

  const clearAll = useCallback(() => {
    const s: Session = {
      id: mkId(),
      title: "Nova conversa",
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setSessions([s]);
    setActiveId(s.id);
    setTab("chat");
    setInput("");
    setError(null);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !active) return;
    setInput("");
    setError(null);
    const next: ChatMsg[] = [...active.messages, { role: "user", content: text }];
    setActiveMessages(() => next);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err =
          typeof (data as { error?: string }).error === "string"
            ? (data as { error: string }).error
            : "Não foi possível obter resposta do assistente.";
        setError(err);
        return;
      }
      const m = (data as { message?: { content?: string } }).message;
      const reply = typeof m?.content === "string" ? m.content : "";
      setActiveMessages((prev) => [...prev, { role: "assistant", content: reply || "—" }]);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === active.id ? { ...s, title: titleFromMessages(next) } : s
        )
      );
    } catch {
      setError("Falha de rede. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }, [active, input, loading, setActiveMessages]);

  const runPrompt = useCallback((prompt: string) => {
    setTab("chat");
    setInput(prompt);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6 print:hidden">
      {open && (
        <div className="pointer-events-auto mb-2 flex w-[min(100vw-1.5rem,24rem)] sm:w-[26rem] flex-col overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950/95 shadow-2xl shadow-black/60 backdrop-blur-md sm:max-h-[36rem] max-h-[min(75vh,32rem)]">
          <div className="flex items-center justify-between border-b border-neutral-800/80 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/20 to-neutral-900/50">
                <BrainIcon className="h-5 w-5 text-amber-100" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-100">Assistente BCC</p>
                <p className="truncate text-[10px] text-neutral-500">Chat interno • IA</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
              aria-label="Fechar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="border-b border-neutral-800/60 px-3 py-2">
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-neutral-800/80 bg-neutral-950/40 p-1.5">
              <button
                type="button"
                onClick={() => setTab("chat")}
                className={clsx(
                  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition",
                  tab === "chat"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-300 hover:bg-neutral-900"
                )}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setTab("history")}
                className={clsx(
                  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition",
                  tab === "history"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-300 hover:bg-neutral-900"
                )}
              >
                Histórico
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[10px] leading-relaxed text-neutral-500">
                Consulta de CNPJ, busca no cadastro e grupo econômico. Responde apenas com base no contexto do sistema.
              </p>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={startNew}
                  className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-neutral-800/80 bg-neutral-900/60 px-2.5 py-1.5 text-[10px] font-extrabold text-neutral-200 hover:bg-neutral-900"
                  title="Nova conversa"
                >
                  Nova
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-neutral-800/80 bg-neutral-900/60 px-2.5 py-1.5 text-[10px] font-extrabold text-neutral-200 hover:bg-neutral-900"
                  title="Limpar histórico local"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
            {tab === "history" ? (
              <div className="space-y-2">
                {sessions.length ? (
                  sessions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActiveId(s.id);
                        setTab("chat");
                      }}
                      className={clsx(
                        "w-full rounded-2xl border px-3 py-2 text-left transition",
                        s.id === activeId
                          ? "border-amber-500/35 bg-amber-500/10 text-neutral-100"
                          : "border-neutral-800/80 bg-neutral-950/40 text-neutral-200 hover:bg-neutral-900/50"
                      )}
                    >
                      <p className="truncate text-xs font-semibold">{s.title}</p>
                      <p className="mt-0.5 text-[10px] text-neutral-500">
                        {new Date(s.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500">Sem histórico.</p>
                )}
              </div>
            ) : (
              <>
                {!active?.messages?.length && !loading ? (
                  <>
                    <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/40 p-3">
                      <p className="text-xs font-semibold text-neutral-100">
                        Como posso ajudar hoje?
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                        Use uma ação rápida ou escreva sua pergunta.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {QUICK_ACTIONS.map((a) => (
                        <button
                          key={a.title}
                          type="button"
                          onClick={() => runPrompt(a.prompt)}
                          className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-neutral-800/80 bg-neutral-950/40 px-3 py-2.5 text-left text-xs text-neutral-200 transition hover:bg-neutral-900/50"
                        >
                          <span className="min-w-0 truncate">{a.title}</span>
                          <span className="shrink-0 text-neutral-500 transition group-hover:text-neutral-200">
                            →
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/40 p-2.5">
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((c) => (
                          <button
                            key={c.label}
                            type="button"
                            onClick={() => runPrompt(c.prompt)}
                            className="rounded-full border border-neutral-800 bg-neutral-950/40 px-3 py-1.5 text-[10px] font-extrabold text-neutral-200 hover:bg-neutral-900"
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}

                {active?.messages?.map((m, i) => (
                  <div
                    key={i}
                    className={clsx(
                      "max-w-[18rem] rounded-2xl px-3 py-2.5 text-xs leading-relaxed",
                      m.role === "user"
                        ? "ml-auto border border-amber-500/30 bg-amber-500/10 text-neutral-100"
                        : "mr-auto border border-neutral-800/80 bg-neutral-950/40 text-neutral-200"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                ))}
                {loading ? <p className="text-xs text-amber-200/80">Pensando…</p> : null}
                {error ? <p className="text-xs text-red-400/90">{error}</p> : null}
                <div ref={bottomRef} />
              </>
            )}
          </div>
          <form
            className="border-t border-neutral-800/80 p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <div className="flex gap-1.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escreva sua pergunta…"
                className="min-w-0 flex-1 rounded-2xl border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-amber-500/50 focus:outline-none"
                disabled={loading || !active}
                maxLength={8000}
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || !active}
                className="shrink-0 rounded-2xl bg-amber-500/90 px-3 py-2 text-xs font-extrabold text-neutral-950 transition hover:bg-amber-400 disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
            <p className="mt-2 px-1 text-[10px] text-neutral-600">
              Histórico salvo somente neste navegador.
            </p>
          </form>
        </div>
      )}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={clsx(
            "pointer-events-auto flex h-14 w-14 items-center justify-center",
            "rounded-2xl border border-amber-400/25",
            "bg-gradient-to-b from-amber-500/30 via-amber-500/10 to-neutral-950/90",
            "text-amber-50 shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_0_1px_rgba(251,191,36,0.1)]",
            "backdrop-blur-sm transition [transition:transform_200ms_ease,box-shadow_200ms_ease,background_200ms_ease,border-color_200ms_ease]",
            "hover:scale-105 hover:border-amber-300/40 hover:shadow-[0_12px_40px_rgba(251,191,36,0.18),0_0_0_1px_rgba(253,230,138,0.2)]",
            "active:scale-[0.98]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
          )}
          title="Assistente com IA"
          aria-label="Abrir assistente de IA"
        >
          <BrainIcon className="h-7 w-7" />
        </button>
      ) : null}
    </div>
  );
}
