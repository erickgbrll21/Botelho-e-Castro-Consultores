-- Celular adicional de contato (principalmente pessoa física).

alter table public.clientes
  add column if not exists contato_celular text;

comment on column public.clientes.contato_celular is
  'Celular de contato do cliente (complementar ao contato_telefone).';
