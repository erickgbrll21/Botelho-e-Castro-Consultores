-- Situação operacional: ativa, paralisada (amarelo na UI), desativada
alter table public.clientes
  add column if not exists situacao_empresa text not null default 'ativa'
    check (situacao_empresa in ('ativa', 'paralisada', 'desativada'));

update public.clientes
set situacao_empresa = 'desativada'
where coalesce(ativo, true) = false;

comment on column public.clientes.situacao_empresa is
  'ativa = operação normal; paralisada = suspensa temporariamente; desativada = baixa/no carteira';
