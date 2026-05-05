-- 0011_servicos_bpo_financeiro.sql
-- Adiciona o serviço "BPO Financeiro" à tabela `servicos_contratados`.

alter table public.servicos_contratados
  add column if not exists bpo_financeiro boolean not null default false;

comment on column public.servicos_contratados.bpo_financeiro is
  'Serviço de BPO Financeiro contratado pelo cliente.';
