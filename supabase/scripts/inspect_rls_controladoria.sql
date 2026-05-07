-- inspect_rls_controladoria.sql
-- Diagnóstico do erro 500 ao salvar com usuário tipo_usuario='controladoria'.
-- Rode estas queries no SQL Editor do Supabase (uma de cada vez ou tudo junto)
-- e cole o resultado de cada bloco numerado.

-- =========================================================
-- 1) Confirma se a função is_elevated_role já lista 'controladoria'.
--    Se NÃO listar, a migration 0016 não foi aplicada nesse projeto.
-- =========================================================
select
  p.proname as funcao,
  pg_get_function_arguments(p.oid) as argumentos,
  pg_get_functiondef(p.oid) as definicao
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'is_elevated_role';

-- =========================================================
-- 2) Lista TODAS as policies em public.* mostrando expressao USING e WITH CHECK.
--    Procuramos linhas em que `qual` ou `with_check` cite 'admin','diretor','financeiro'
--    SEM mencionar 'controladoria' — essas estao bloqueando o controladoria.
-- =========================================================
select
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  array_to_string(roles, ', ') as roles,
  qual         as using_expr,
  with_check   as with_check_expr
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- =========================================================
-- 3) Lista APENAS as policies suspeitas (citam admin/diretor/financeiro
--    sem citar 'controladoria'). Se voltar 0 linhas, RLS provavelmente nao e a causa.
-- =========================================================
select
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and (
    (qual is not null and qual ilike '%admin%' and qual ilike '%diretor%'
       and qual ilike '%financeiro%' and qual not ilike '%controladoria%')
    or
    (with_check is not null and with_check ilike '%admin%' and with_check ilike '%diretor%'
       and with_check ilike '%financeiro%' and with_check not ilike '%controladoria%')
  )
order by tablename, policyname;

-- =========================================================
-- 4) Lista triggers em tabelas envolvidas no salvar do cliente.
--    Triggers podem fazer checks adicionais por tipo_usuario.
-- =========================================================
select
  event_object_schema as schema,
  event_object_table  as tabela,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('clientes', 'servicos_contratados', 'responsaveis_internos', 'logs_sistema');

-- =========================================================
-- 5) Lista CHECK constraints da tabela usuarios — o tipo_usuario 'controladoria'
--    precisa estar listado, senao qualquer INSERT/UPDATE quebra. Esperamos
--    a constraint atualizada na migration 0014.
-- =========================================================
select
  conname as nome,
  pg_get_constraintdef(c.oid) as definicao
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname  = 'usuarios'
  and c.contype  = 'c';

-- =========================================================
-- 6) Mostra os usuarios com tipo_usuario='controladoria' (sem dados sensiveis).
--    Apenas para confirmar que existem.
-- =========================================================
select id, email, tipo_usuario, ativo
from public.usuarios
where tipo_usuario = 'controladoria';
