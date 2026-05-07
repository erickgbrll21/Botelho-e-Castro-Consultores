-- 0016_role_controladoria_policies.sql
-- Estende permissões de "controladoria" para se equiparar a admin/diretor/financeiro nas policies RLS.
--
-- Sintomas que isso resolve:
--   - Usuário controladoria recebe 500 ao salvar valor de contrato (UPDATE em
--     clientes / servicos_contratados / responsaveis_internos bloqueado por RLS).
--   - Usuário controladoria não vê /logs (SELECT em logs_sistema bloqueado).
--
-- Ações:
--   1) Atualiza/cria a função auxiliar public.is_elevated_role() incluindo controladoria.
--   2) Atualiza a policy de SELECT em logs_sistema (definida na migration 0003) para incluir controladoria.
--   3) Varredura defensiva: para qualquer policy em public.* cuja expressão liste
--      'admin','diretor','financeiro' SEM 'controladoria', recria a policy
--      adicionando 'controladoria' à lista.
--
-- A migration é idempotente e só altera policies cujas expressões já estão no padrão esperado.

-- 1) Função auxiliar (caso seja usada em policies). Mantemos security definer.
create or replace function public.is_elevated_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.tipo_usuario in ('admin', 'diretor', 'financeiro', 'controladoria')
  );
$$;

-- 2) logs_sistema: SELECT também para controladoria (a 0003 só listava admin/diretor/financeiro).
drop policy if exists "Apenas perfis autorizados podem visualizar logs"
  on public.logs_sistema;

create policy "Apenas perfis autorizados podem visualizar logs"
on public.logs_sistema
for select
to authenticated
using (
  exists (
    select 1 from public.usuarios
    where usuarios.id = auth.uid()
      and usuarios.tipo_usuario in (
        'admin',
        'diretor',
        'financeiro',
        'controladoria'
      )
  )
);

-- 3) Varredura defensiva em pg_policies do schema public.
-- Reescreve apenas policies cuja expressão (qual ou with_check) contenha a tripla
-- 'admin','diretor','financeiro' sem 'controladoria'. A reescrita troca a tripla
-- por 'admin','diretor','financeiro','controladoria' usando regex.
do $$
declare
  pol record;
  q   text;
  c   text;
  changed boolean;
  cmd_kind text;
  roles_csv text;
  permissive_kw text;
  ddl text;
  pattern text;
begin
  pattern := $regex$('admin'\s*,\s*'diretor'\s*,\s*'financeiro')$regex$;

  for pol in
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        ( qual is not null
          and qual ~* $regex$'admin'\s*,\s*'diretor'\s*,\s*'financeiro'$regex$
          and qual !~* $regex$'controladoria'$regex$ )
        or
        ( with_check is not null
          and with_check ~* $regex$'admin'\s*,\s*'diretor'\s*,\s*'financeiro'$regex$
          and with_check !~* $regex$'controladoria'$regex$ )
      )
  loop
    q := pol.qual;
    c := pol.with_check;
    changed := false;

    if q is not null and q ~* $regex$'admin'\s*,\s*'diretor'\s*,\s*'financeiro'$regex$
                    and q !~* $regex$'controladoria'$regex$ then
      q := regexp_replace(q, pattern, $$\1, 'controladoria'$$, 'gi');
      changed := true;
    end if;

    if c is not null and c ~* $regex$'admin'\s*,\s*'diretor'\s*,\s*'financeiro'$regex$
                    and c !~* $regex$'controladoria'$regex$ then
      c := regexp_replace(c, pattern, $$\1, 'controladoria'$$, 'gi');
      changed := true;
    end if;

    if not changed then
      continue;
    end if;

    cmd_kind := upper(pol.cmd);                              -- SELECT/INSERT/UPDATE/DELETE/ALL
    permissive_kw := case when pol.permissive = 'PERMISSIVE'
                          then 'PERMISSIVE' else 'RESTRICTIVE' end;
    roles_csv := coalesce(array_to_string(pol.roles, ', '), 'public');

    -- Recria a policy com a expressão atualizada
    execute format('drop policy if exists %I on %I.%I',
                   pol.policyname, pol.schemaname, pol.tablename);

    ddl := format(
      'create policy %I on %I.%I as %s for %s to %s',
      pol.policyname,
      pol.schemaname,
      pol.tablename,
      permissive_kw,
      cmd_kind,
      roles_csv
    );

    if q is not null then
      ddl := ddl || format(' using (%s)', q);
    end if;
    if c is not null then
      ddl := ddl || format(' with check (%s)', c);
    end if;

    execute ddl;
  end loop;
end $$;
