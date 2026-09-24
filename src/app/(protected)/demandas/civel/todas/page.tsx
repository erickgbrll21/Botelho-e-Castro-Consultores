import type { DemandaFiltrosParams } from "@/lib/demandas";
import { TodasAsDemandas } from "../../_telas/todas";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<DemandaFiltrosParams & { excluida?: string }>;
}) {
  return <TodasAsDemandas setor="civel" searchParams={searchParams} />;
}
