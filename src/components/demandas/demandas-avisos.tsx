import { ExclamationTriangleIcon, InboxIcon } from "@heroicons/react/24/outline";

/** Migration 0024 ainda não aplicada no banco do ambiente. */
export function ModuloNaoInstalado() {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
      <p className="flex items-center gap-2 font-semibold">
        <ExclamationTriangleIcon className="h-5 w-5 shrink-0" aria-hidden />
        Banco de dados sem as tabelas de demandas
      </p>
      <p className="mt-2 text-amber-100/90">
        Aplique a migration{" "}
        <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs">
          supabase/migrations/0024_demandas_modulo.sql
        </code>{" "}
        no Supabase (SQL Editor ou <span className="font-mono">supabase db push</span>)
        para habilitar o Controle de Demandas.
      </p>
    </div>
  );
}

export function ErroCarregamento({ mensagem }: { mensagem: string }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
      <p className="flex items-center gap-2 font-semibold">
        <ExclamationTriangleIcon className="h-5 w-5 shrink-0" aria-hidden />
        Não foi possível carregar os dados
      </p>
      <p className="mt-1 text-red-100/90">{mensagem}</p>
    </div>
  );
}

export function EstadoVazio({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-800 px-4 py-12 text-center">
      <InboxIcon className="h-8 w-8 text-neutral-600" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-neutral-200">{titulo}</p>
        {descricao ? (
          <p className="mt-1 text-sm text-neutral-500">{descricao}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function AvisoSucesso({ mensagem }: { mensagem: string }) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
      {mensagem}
    </div>
  );
}
