-- Rótulo da filial (ex.: Filial 01, Filial 02) quando tipo_unidade = Filial
alter table public.clientes add column if not exists identificacao_filial text;

comment on column public.clientes.identificacao_filial is
  'Texto livre exibido no painel quando a unidade é Filial (ex.: Filial 01).';
