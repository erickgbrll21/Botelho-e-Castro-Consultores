-- Acelera buscas usadas pelo assistente (ilike em razao_social) e igualdade em cnpj.
-- Requer: executar após a tabela clientes existir.
create extension if not exists pg_trgm;

create index if not exists clientes_cnpj_btree
  on public.clientes (cnpj)
  where cnpj is not null and length(cnpj) = 14;

create index if not exists clientes_razao_social_trgm
  on public.clientes
  using gin (razao_social gin_trgm_ops);

comment on index public.clientes_razao_social_trgm is
  'Busca por aproximação (ilike) na razão social — assistente BCC.';
