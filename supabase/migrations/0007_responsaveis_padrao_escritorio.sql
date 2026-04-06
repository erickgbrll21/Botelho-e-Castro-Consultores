-- Responsáveis padrão do escritório em todas as empresas já cadastradas

update public.responsaveis_internos
set
  responsavel_financeiro = 'Maria de Fátima da Silva Furtado',
  responsavel_dp = 'Aline Ferreira Santos',
  responsavel_contabil = 'Waldir Marcio Valladares';

insert into public.responsaveis_internos (
  cliente_id,
  responsavel_financeiro,
  responsavel_dp,
  responsavel_contabil
)
select
  c.id,
  'Maria de Fátima da Silva Furtado',
  'Aline Ferreira Santos',
  'Waldir Marcio Valladares'
from public.clientes c
where not exists (
  select 1 from public.responsaveis_internos r where r.cliente_id = c.id
);
