import { TiposServico } from "../../_telas/tipos";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ criado?: string; renomeado?: string }>;
}) {
  return <TiposServico setor="civel" searchParams={searchParams} />;
}
