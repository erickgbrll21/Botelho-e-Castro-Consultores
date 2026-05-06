-- 0012_servicos_bpo_financeiro_valor.sql
-- Adiciona o valor (mensal) do serviço de BPO Financeiro por cliente.

alter table public.servicos_contratados
  add column if not exists valor_bpo_financeiro numeric null;

comment on column public.servicos_contratados.valor_bpo_financeiro is
  'Valor mensal do serviço de BPO Financeiro (quando contratado).';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'servicos_contratados_valor_bpo_financeiro_nonneg'
  ) then
    alter table public.servicos_contratados
      add constraint servicos_contratados_valor_bpo_financeiro_nonneg
      check (valor_bpo_financeiro is null or valor_bpo_financeiro >= 0);
  end if;
end $$;

