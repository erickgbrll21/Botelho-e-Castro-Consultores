import {
  calcFaturamentoMensalClientes,
  fetchClientesAtivosFaturamento,
  fetchDashboardCardMetrics,
  type DashboardCardMetrics,
} from "@/lib/dashboard-metrics";

export type DepartamentoDashboardMetrics = DashboardCardMetrics;

export { calcFaturamentoMensalClientes as calcFaturamentoMensalDepartamento };

export async function fetchDepartamentoDashboardMetrics(
  supabase: any,
  opts: {
    servicosEmbed: string;
    applyDepartmentFilter: (query: any) => any;
    grupoId?: string;
    gruposById: Map<string, { nome: string; valor_contrato: number | null }>;
    startOfMonth: Date;
    startOfNextMonth: Date;
    inicioMes: string;
    inicioProximoMes: string;
  }
): Promise<DepartamentoDashboardMetrics> {
  return fetchDashboardCardMetrics(supabase, {
    applyScopeFilter: opts.applyDepartmentFilter,
    servicosEmbed: opts.servicosEmbed,
    grupoId: opts.grupoId,
    gruposById: opts.gruposById,
    startOfMonth: opts.startOfMonth,
    startOfNextMonth: opts.startOfNextMonth,
    inicioMes: opts.inicioMes,
    inicioProximoMes: opts.inicioProximoMes,
  });
}

export async function fetchClientesAtivosDepartamentoFaturamento(
  supabase: any,
  opts: {
    servicosEmbed: string;
    applyDepartmentFilter: (query: any) => any;
    grupoId?: string;
    gruposById: Map<string, { nome: string; valor_contrato: number | null }>;
  }
) {
  return fetchClientesAtivosFaturamento(supabase, {
    applyScopeFilter: opts.applyDepartmentFilter,
    servicosEmbed: opts.servicosEmbed,
    grupoId: opts.grupoId,
    gruposById: opts.gruposById,
  });
}
