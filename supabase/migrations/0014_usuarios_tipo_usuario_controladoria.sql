-- 0014_usuarios_tipo_usuario_controladoria.sql
-- `usuarios.tipo_usuario` é TEXT com CHECK constraint: expandir para incluir "controladoria".

alter table public.usuarios
  drop constraint if exists usuarios_tipo_usuario_check;

alter table public.usuarios
  add constraint usuarios_tipo_usuario_check
  check (
    tipo_usuario = any (
      array[
        'admin'::text,
        'user'::text,
        'diretor'::text,
        'financeiro'::text,
        'controladoria'::text
      ]
    )
  );

