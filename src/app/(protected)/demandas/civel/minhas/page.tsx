import type { DemandaFiltrosParams } from "@/lib/demandas";
import { MinhasDemandas } from "../../_telas/minhas";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<DemandaFiltrosParams>;
}) {
  return <MinhasDemandas setor="civel" searchParams={searchParams} />;
}
