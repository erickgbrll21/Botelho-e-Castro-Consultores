import clsx from "clsx";
import { Pill } from "@/components/ui/pill";
import { formatDateTimePtBR } from "@/lib/format-date";
import {
  diasAteOPrazo,
  labelSituacaoPrazo,
  labelStatus,
  situacaoPrazo,
  type SituacaoPrazo,
} from "@/lib/demandas";
import type { DemandaStatus } from "@/types/database";

/**
 * Status estruturados + a condição derivada "atrasada".
 * Conclusão em duas etapas: confirmada pelo usuário → confirmada pelo gestor.
 */
export function StatusBadge({
  status,
  atrasada = false,
}: {
  status: DemandaStatus;
  atrasada?: boolean;
}) {
  if (status === "concluida") {
    return <Pill label="✓ Confirmada pelo gestor" tone="success" />;
  }

  if (status === "aguardando_confirmacao") {
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        <Pill label="Confirmada pelo usuário" tone="warning" />
        {atrasada ? <Pill label="Atrasada" tone="critical" /> : null}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Pill
        label={status === "pendente" ? "? Pendente" : labelStatus(status)}
        tone={status === "em_andamento" ? "warning" : "neutral"}
      />
      {atrasada ? <Pill label="Atrasada" tone="critical" /> : null}
    </span>
  );
}

const PRAZO_UI: Record<SituacaoPrazo, { texto: string; ponto: string }> = {
  concluida: { texto: "text-neutral-400", ponto: "bg-neutral-600" },
  aguardando_confirmacao: {
    texto: "text-sky-200",
    ponto: "bg-sky-400",
  },
  atrasada: { texto: "text-red-300", ponto: "bg-red-400" },
  vence_hoje: { texto: "text-amber-200", ponto: "bg-amber-400" },
  proxima: { texto: "text-amber-200/80", ponto: "bg-amber-500/70" },
  no_prazo: { texto: "text-neutral-300", ponto: "bg-emerald-500/80" },
};

/** Prazo com destaque + classificação automática. */
export function PrazoDestaque({
  prazoFinal,
  status,
  className,
  compacto = false,
}: {
  prazoFinal: string;
  status: DemandaStatus;
  className?: string;
  compacto?: boolean;
}) {
  const situacao = situacaoPrazo({ prazo_final: prazoFinal, status });
  const dias = diasAteOPrazo(prazoFinal);
  const ui = PRAZO_UI[situacao];

  return (
    <div className={clsx("min-w-0", className)}>
      <p
        className={clsx(
          "font-semibold tabular-nums",
          compacto ? "text-sm" : "text-base",
          ui.texto
        )}
      >
        {formatDateTimePtBR(prazoFinal, {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-500">
        <span
          className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", ui.ponto)}
          aria-hidden
        />
        {labelSituacaoPrazo(situacao, dias)}
      </p>
    </div>
  );
}
