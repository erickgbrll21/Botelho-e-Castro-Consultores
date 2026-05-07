-- 0013_user_role_controladoria.sql
-- Adiciona o papel "controladoria" ao enum `user_role`.

do $$
begin
  -- Este projeto usa `tipo_usuario` como TEXT com CHECK constraint.
  -- Mantemos esta migração segura caso um dia vire enum.
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'user_role'
  ) then
    execute 'alter type public.user_role add value if not exists ''controladoria''';
  end if;
exception
  when duplicate_object then
    -- Em caso de corrida/execução repetida, ignora.
    null;
end $$;

