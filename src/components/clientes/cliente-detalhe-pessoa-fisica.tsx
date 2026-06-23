import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { CopyButton } from "@/components/ui/copy-button";
import {
  formatDocumentoCliente,
  tituloNomeCliente,
} from "@/lib/cliente-tipo-pessoa";
import {
  situacaoIndicatorClass,
  situacaoPillProps,
  type SituacaoEmpresa,
} from "@/lib/cliente-situacao";
import { responsavelJuridicoParaExibicao } from "@/lib/responsaveis-padrao";
import {
  ChartBarIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  ScaleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import type { ComponentType, ReactNode } from "react";

function formatCep(cep: string | null | undefined): string | null {
  if (!cep) return null;
  const digits = String(cep).replace(/\D/g, "");
  if (digits.length !== 8) return cep;
  return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

function telHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? `tel:+55${digits}` : null;
}

type ClienteDetalhePessoaFisicaProps = {
  id: string;
  cliente: Record<string, unknown>;
  servicos: Record<string, unknown> | null | undefined;
  responsaveis: Record<string, unknown>;
  grupoNome: string;
  situacao: SituacaoEmpresa;
  canEdit: boolean;
};

export function ClienteDetalhePessoaFisica({
  id,
  cliente,
  servicos,
  responsaveis,
  grupoNome,
  situacao,
  canEdit,
}: ClienteDetalhePessoaFisicaProps) {
  const situacaoPill = situacaoPillProps(situacao);
  const nome = tituloNomeCliente(cliente as { razao_social?: string | null });
  const cpf = formatDocumentoCliente(cliente.cnpj as string | null | undefined);
  const email = (cliente.email as string | null | undefined)?.trim() || null;
  const telefone =
    (cliente.contato_telefone as string | null | undefined)?.trim() || null;
  const celular =
    (cliente.contato_celular as string | null | undefined)?.trim() || null;
  const responsavelComercial = responsaveis?.responsavel_comercial
    ? String(responsaveis.responsavel_comercial).trim()
    : null;

  const juridicoItens = [
    { key: "civel", label: "Cível", active: Boolean(servicos?.juridico_civel) },
    {
      key: "trabalhista",
      label: "Trabalhista",
      active: Boolean(servicos?.juridico_trabalhista),
    },
    {
      key: "licitacao",
      label: "Licitação",
      active: Boolean(servicos?.juridico_licitacao),
    },
    { key: "penal", label: "Penal", active: Boolean(servicos?.juridico_penal) },
    {
      key: "empresarial",
      label: "Empresarial",
      active: Boolean(servicos?.juridico_empresarial),
    },
  ].filter((item) => item.active);

  const responsavelJuridico = responsavelJuridicoParaExibicao(
    responsaveis?.responsavel_juridico as string | null | undefined,
    servicos
  );

  const enderecoLinhas = [
    cliente.logradouro,
    cliente.complemento,
    cliente.bairro,
  ]
    .filter(Boolean)
    .join(" · ");

  const cidadeUf = [cliente.cidade, cliente.estado].filter(Boolean).join(" / ");
  const cepFmt = formatCep(cliente.cep as string | null | undefined);
  const temEndereco =
    Boolean(cepFmt) || Boolean(enderecoLinhas) || Boolean(cidadeUf);
  const enderecoCompleto = [cepFmt ? `CEP ${cepFmt}` : null, enderecoLinhas, cidadeUf]
    .filter(Boolean)
    .join(" — ");

  return (
    <div className="space-y-8">
      <div className="glass-panel overflow-hidden rounded-3xl border border-neutral-800/80">
        <div className="border-b border-blue-500/20 bg-gradient-to-br from-blue-950/40 via-neutral-950/20 to-transparent px-6 py-6 md:px-8 md:py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-950/50 shadow-[0_0_24px_rgba(59,130,246,0.12)]">
                <UserIcon className="h-8 w-8 text-blue-300" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-start gap-2">
                  <div
                    className={clsx(
                      "mt-2 h-2.5 w-2.5 shrink-0 rounded-full",
                      situacaoIndicatorClass(situacao)
                    )}
                  />
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                    <h1 className="break-words text-2xl font-bold tracking-tight text-white md:text-3xl">
                      {nome}
                    </h1>
                    <CopyButton value={nome} label="nome" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill label="Pessoa Física" tone="neutral" />
                  <Pill label={situacaoPill.label} tone={situacaoPill.tone} />
                  {canEdit ? (
                    <a
                      href={`/clientes/${id}/edit`}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-900/80 px-3 py-1 text-xs font-medium text-neutral-200 transition hover:border-neutral-500 hover:text-white"
                    >
                      <PencilIcon className="h-3 w-3" />
                      Editar
                    </a>
                  ) : null}
                </div>
                <CampoComCopiar
                  label="CPF"
                  value={`CPF ${cpf}`}
                  copyValue={cpf}
                  mono
                />
                {grupoNome !== "Sem grupo vinculado" ? (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-amber-200">
                    <ChartBarIcon className="h-4 w-4 text-amber-500" />
                    Grupo: {grupoNome}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-neutral-800/50 sm:grid-cols-3">
          <ContatoRapido
            icon={EnvelopeIcon}
            label="E-mail"
            value={email}
            href={email ? `mailto:${email}` : null}
          />
          <ContatoRapido
            icon={PhoneIcon}
            label="Telefone"
            value={telefone}
            href={telHref(telefone)}
          />
          <ContatoRapido
            icon={DevicePhoneMobileIcon}
            label="Celular"
            value={celular}
            href={telHref(celular)}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card
            title="Serviços Jurídicos"
            action={<ScaleIcon className="h-4 w-4 text-blue-400" />}
            className="border-blue-500/15 bg-blue-950/10"
          >
            {juridicoItens.length === 0 ? (
              <p className="text-sm italic text-neutral-500">
                Nenhum serviço jurídico contratado.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {juridicoItens.map((item) => (
                  <Pill key={item.key} label={item.label} tone="warning" />
                ))}
              </div>
            )}
          </Card>

          <Card title="Endereço" action={<MapPinIcon className="h-4 w-4 text-neutral-500" />}>
            {temEndereco ? (
              <div className="space-y-3 text-sm">
                {cepFmt ? (
                  <CampoComCopiar label="CEP" value={cepFmt} compact />
                ) : null}
                {enderecoLinhas ? (
                  <CampoComCopiar
                    label="Logradouro"
                    value={String(enderecoLinhas)}
                    compact
                  />
                ) : null}
                {cidadeUf ? (
                  <CampoComCopiar
                    label="Cidade / UF"
                    value={String(cidadeUf)}
                    compact
                  />
                ) : null}
                {enderecoCompleto ? (
                  <CampoComCopiar
                    label="Endereço completo"
                    value={enderecoCompleto}
                    compact
                  />
                ) : null}
              </div>
            ) : (
              <p className="text-sm italic text-neutral-500">
                Endereço não informado.
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            title="Responsável Jurídico"
            action={<ScaleIcon className="h-4 w-4 text-blue-400" />}
          >
            <p className="whitespace-pre-line text-sm font-semibold text-neutral-200">
              {responsavelJuridico}
            </p>
          </Card>

          {responsavelComercial ? (
            <Card
              title="Responsável Comercial"
              action={<UserIcon className="h-4 w-4 text-neutral-500" />}
            >
              <CampoComCopiar
                label="Responsável comercial"
                value={responsavelComercial}
              />
            </Card>
          ) : null}

          {grupoNome !== "Sem grupo vinculado" ? (
            <Card
              title="Grupo Econômico"
              action={<ChartBarIcon className="h-4 w-4 text-amber-500" />}
            >
              <p className="font-medium text-amber-200">{grupoNome}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CampoComCopiar({
  label,
  value,
  copyValue,
  icon,
  mono,
  multiline,
  compact,
  valueClassName,
}: {
  label: string;
  value: string | null | undefined;
  copyValue?: string | null;
  icon?: ReactNode;
  mono?: boolean;
  multiline?: boolean;
  compact?: boolean;
  valueClassName?: string;
}) {
  const display = value?.trim() || "—";
  const toCopy = copyValue?.trim() || (display !== "—" ? display : "");

  return (
    <div
      className={clsx(
        "flex items-start justify-between gap-3",
        compact ? "rounded-lg bg-neutral-900/30 px-3 py-2" : ""
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-neutral-500">
          {label}
        </p>
        <p
          className={clsx(
            "flex items-center gap-1.5 font-medium text-neutral-200",
            mono && "font-mono text-sm text-blue-100/90",
            multiline && "whitespace-pre-line text-sm font-semibold",
            !mono && !multiline && "text-sm",
            valueClassName
          )}
        >
          {icon}
          <span className={clsx(multiline ? "" : "truncate")}>{display}</span>
        </p>
      </div>
      <CopyButton value={toCopy} label={label} />
    </div>
  );
}

function ContatoRapido({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  href: string | null;
}) {
  const className =
    "flex items-start gap-3 bg-neutral-950/40 px-5 py-4 transition-colors hover:bg-neutral-900/50";

  const conteudo = (
    <>
      <Icon className="h-4 w-4 shrink-0 text-neutral-500" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-neutral-500">
          {label}
        </p>
        <p
          className={clsx(
            "truncate text-sm font-medium",
            value ? "text-neutral-100" : "text-neutral-600"
          )}
        >
          {value ?? "—"}
        </p>
      </div>
    </>
  );

  return (
    <div className={className}>
      {value && href ? (
        <a href={href} className="flex min-w-0 flex-1 items-start gap-3">
          {conteudo}
        </a>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{conteudo}</div>
      )}
      <CopyButton value={value} label={label} />
    </div>
  );
}
