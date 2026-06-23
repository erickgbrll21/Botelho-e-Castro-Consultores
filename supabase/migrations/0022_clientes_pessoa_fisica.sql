-- Suporte a cadastro de pessoa física em clientes.

alter table public.clientes
  add column if not exists tipo_pessoa text not null default 'pj';

alter table public.clientes
  drop constraint if exists clientes_tipo_pessoa_check;

alter table public.clientes
  add constraint clientes_tipo_pessoa_check
  check (tipo_pessoa in ('pj', 'pf'));

alter table public.clientes
  add column if not exists email text;

comment on column public.clientes.tipo_pessoa is
  'pj = pessoa jurídica (CNPJ 14 dígitos); pf = pessoa física (CPF 11 dígitos no campo cnpj).';

comment on column public.clientes.email is
  'E-mail de contato do cliente (principalmente pessoa física).';

create index if not exists clientes_cpf_btree
  on public.clientes (cnpj)
  where cnpj is not null and length(cnpj) = 11;
