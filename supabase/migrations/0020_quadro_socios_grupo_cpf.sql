-- CPF do sócio no quadro societário do grupo.

alter table public.quadro_socios_grupo
  add column if not exists cpf text;

comment on column public.quadro_socios_grupo.cpf is
  'CPF do sócio (11 dígitos, sem formatação).';
