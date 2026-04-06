-- Marcar empresas como paralisadas (painel amarelo) para os CNPJs informados.
-- Requer coluna situacao_empresa (migração 0006).

update public.clientes
set
  situacao_empresa = 'paralisada',
  ativo = true
where replace(replace(replace(cnpj, '.', ''), '/', ''), '-', '') in (
  '05703694000228',
  '05703694000490',
  '05703694000309',
  '05703694000570',
  '05703694000651',
  '05703694000732',
  '05703694000147',
  '00808662000273',
  '00808662000192'
);
