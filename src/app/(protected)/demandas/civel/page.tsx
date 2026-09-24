import type { DemandaFiltrosParams } from "@/lib/demandas";
import { DemandasDashboard } from "../_telas/dashboard";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<DemandaFiltrosParams>;
}) {
  return <DemandasDashboard setor="civel" searchParams={searchParams} />;
}
