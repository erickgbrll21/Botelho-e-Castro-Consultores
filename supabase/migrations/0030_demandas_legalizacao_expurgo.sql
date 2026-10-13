-- Demandas de Legalização confirmadas pelo gestor saem da operação
-- 60 dias depois de concluida_em. O snapshot fica só para o relatório mensal.

create table if not exists public.demandas_legalizacao_arquivo (
  id uuid primary key,
  titulo text not null,
  descricao text,
  tipo_servico_nome text,
  responsavel_id uuid,
  responsavel_nome text,
  protocolo text,
  observacoes text,
  cnpj text,
  empresa_nome text,
  empresa_fantasia text,
  prazo_final timestamptz,
  concluida_em timestamptz,
  created_at timestamptz not null,
  arquivada_em timestamptz not null default now()
);

create index if not exists demandas_legalizacao_arquivo_created_at_idx
  on public.demandas_legalizacao_arquivo (created_at);

create index if not exists demandas_legalizacao_concluida_expurgo_idx
  on public.demandas (concluida_em)
  where setor = 'legalizacao' and status = 'concluida';

alter table public.demandas_legalizacao_arquivo enable row level security;

drop policy if exists "demandas_legalizacao_arquivo_select_gestor"
  on public.demandas_legalizacao_arquivo;
create policy "demandas_legalizacao_arquivo_select_gestor"
  on public.demandas_legalizacao_arquivo
  for select
  to authenticated
  using (public.demandas_is_gestor());

grant select on public.demandas_legalizacao_arquivo to authenticated;

create or replace function public.expurgar_demandas_legalizacao_confirmadas()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removidas integer := 0;
begin
  if auth.uid() is not null and not public.demandas_is_gestor() then
    raise exception 'Sem permissão para expurgar demandas.'
      using errcode = '42501';
  end if;

  insert into public.demandas_legalizacao_arquivo (
    id,
    titulo,
    descricao,
    tipo_servico_nome,
    responsavel_id,
    responsavel_nome,
    protocolo,
    observacoes,
    cnpj,
    empresa_nome,
    empresa_fantasia,
    prazo_final,
    concluida_em,
    created_at
  )
  select
    d.id,
    d.titulo,
    d.descricao,
    ts.nome,
    d.responsavel_id,
    ur.nome,
    d.protocolo,
    d.observacoes,
    d.cnpj,
    d.empresa_nome,
    d.empresa_fantasia,
    d.prazo_final,
    d.concluida_em,
    d.created_at
  from public.demandas d
  left join public.tipos_servico ts on ts.id = d.tipo_servico_id
  left join public.usuarios ur on ur.id = d.responsavel_id
  where d.setor = 'legalizacao'
    and d.status = 'concluida'
    and d.concluida_em is not null
    and d.concluida_em < now() - interval '60 days'
  on conflict (id) do nothing;

  delete from public.demandas d
  where d.setor = 'legalizacao'
    and d.status = 'concluida'
    and d.concluida_em is not null
    and d.concluida_em < now() - interval '60 days';

  get diagnostics removidas = row_count;
  return removidas;
end;
$$;

revoke all on function public.expurgar_demandas_legalizacao_confirmadas() from public;
grant execute on function public.expurgar_demandas_legalizacao_confirmadas()
  to authenticated, service_role;

comment on function public.expurgar_demandas_legalizacao_confirmadas() is
  'Copia para o arquivo do relatório e apaga demandas de Legalização confirmadas pelo gestor há mais de 60 dias.';

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    begin
      perform cron.unschedule('expurgar-demandas-legalizacao');
    exception
      when others then
        null;
    end;
    perform cron.schedule(
      'expurgar-demandas-legalizacao',
      '15 6 * * *',
      'select public.expurgar_demandas_legalizacao_confirmadas()'
    );
  end if;
exception
  when others then
    null;
end $$;
