import Link from "next/link";
import clsx from "clsx";
import {
  queryStringFiltros,
  temFiltroAtivo,
  type DemandaFiltros,
  type PeriodoFiltro,
  type PrazoFiltro,
  type StatusFiltro,
} from "@/lib/demandas";
import type { TipoServicoRow, UsuarioAtribuivel } from "@/lib/demandas-queries";

const INPUT =
  "w-full min-w-0 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-100 focus:outline-none";

type FiltroRapido = {
  label: string;
  override: Partial<DemandaFiltros>;
  ativo: boolean;
};

/**
 * Filtros em formulário GET (mesmo padrão das outras telas do painel):
 * a URL guarda o estado e cards, gráficos e tabela são recalculados no servidor.
 */
export function DemandasFiltros({
  filtros,
  tipos,
  usuarios,
  basePath,
}: {
  filtros: DemandaFiltros;
  tipos: TipoServicoRow[];
  /** Ausente na tela do funcionário (escopo já é o próprio usuário). */
  usuarios?: UsuarioAtribuivel[];
  basePath: string;
}) {
  // Clicar novamente em um atalho ativo remove o filtro.
  const periodoRapido = (valor: PeriodoFiltro, label: string): FiltroRapido => {
    const ativo = filtros.periodo === valor;
    return {
      label,
      ativo,
      override: { periodo: ativo ? "" : valor, de: "", ate: "", pagina: 1 },
    };
  };

  const statusRapido = (valor: StatusFiltro, label: string): FiltroRapido => {
    const ativo = filtros.status === valor;
    return {
      label,
      ativo,
      override: { status: ativo ? "" : valor, pagina: 1 },
    };
  };

  const prazoRapido = (valor: PrazoFiltro, label: string): FiltroRapido => {
    const ativo = filtros.prazo === valor;
    return {
      label,
      ativo,
      override: { prazo: ativo ? "" : valor, pagina: 1 },
    };
  };

  const rapidos: FiltroRapido[] = [
    periodoRapido("hoje", "Hoje"),
    periodoRapido("semana", "Esta semana"),
    periodoRapido("mes", "Este mês"),
    statusRapido("pendente", "Pendentes"),
    statusRapido("em_andamento", "Em andamento"),
    statusRapido("aguardando_confirmacao", "Aguardando confirmação"),
    statusRapido("concluida", "Confirmadas pelo gestor"),
    statusRapido("atrasada", "Atrasadas"),
    prazoRapido("vence_hoje", "Vencem hoje"),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {rapidos.map((rapido) => (
          <Link
            key={rapido.label}
            href={`${basePath}${queryStringFiltros(filtros, rapido.override)}`}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              rapido.ativo
                ? "border-neutral-600 bg-neutral-800 text-white"
                : "border-neutral-800/80 bg-neutral-900/50 text-neutral-300 hover:bg-neutral-900 hover:text-white"
            )}
          >
            {rapido.label}
          </Link>
        ))}
        {temFiltroAtivo(filtros) ? (
          <Link
            href={basePath}
            className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-100 transition hover:bg-red-500/20"
          >
            Limpar filtros
          </Link>
        ) : null}
      </div>

      <form
        action={basePath}
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"
      >
        {/* Mantém o atalho de período ao aplicar os demais filtros. */}
        <input type="hidden" name="periodo" value={filtros.periodo} />

        <div className="sm:col-span-2 xl:col-span-2">
          <label className="sr-only" htmlFor="filtro-q">
            Pesquisar
          </label>
          <input
            id="filtro-q"
            name="q"
            defaultValue={filtros.q}
            placeholder="Pesquisar título, descrição ou protocolo..."
            className={INPUT}
          />
        </div>

        {usuarios ? (
          <div>
            <label className="sr-only" htmlFor="filtro-responsavel">
              Funcionário
            </label>
            <select
              id="filtro-responsavel"
              name="responsavel"
              defaultValue={filtros.responsavel}
              className={INPUT}
            >
              <option value="">Todos os funcionários</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label className="sr-only" htmlFor="filtro-tipo">
            Tipo de serviço
          </label>
          <select
            id="filtro-tipo"
            name="tipo"
            defaultValue={filtros.tipo}
            className={INPUT}
          >
            <option value="">Todos os tipos</option>
            {tipos.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nome}
                {tipo.ativo ? "" : " (inativo)"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="sr-only" htmlFor="filtro-status">
            Status
          </label>
          <select
            id="filtro-status"
            name="status"
            defaultValue={filtros.status}
            className={INPUT}
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em andamento</option>
            <option value="aguardando_confirmacao">
              Confirmada pelo usuário
            </option>
            <option value="concluida">Confirmada pelo gestor</option>
            <option value="atrasada">Atrasada</option>
          </select>
        </div>

        <div>
          <label className="sr-only" htmlFor="filtro-prazo">
            Prazo
          </label>
          <select
            id="filtro-prazo"
            name="prazo"
            defaultValue={filtros.prazo}
            className={INPUT}
          >
            <option value="">Qualquer prazo</option>
            <option value="vence_hoje">Vence hoje</option>
            <option value="proximos_7">Próximos 7 dias</option>
            <option value="atrasadas">Atrasadas</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:col-span-2">
          <div>
            <label
              className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-500"
              htmlFor="filtro-de"
            >
              Criadas de
            </label>
            <input
              id="filtro-de"
              type="date"
              name="de"
              defaultValue={filtros.de}
              className={INPUT}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-500"
              htmlFor="filtro-ate"
            >
              até
            </label>
            <input
              id="filtro-ate"
              type="date"
              name="ate"
              defaultValue={filtros.ate}
              className={INPUT}
            />
          </div>
        </div>

        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <button
            type="submit"
            className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
          >
            Aplicar filtros
          </button>
        </div>
      </form>
    </div>
  );
}
