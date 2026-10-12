-- =====================================================================
-- activar_auth.sql  -  Cerrar el acceso de la base a solo usuarios con
-- sesion iniciada (Supabase Auth).
-- ---------------------------------------------------------------------
-- QUE HACE:
--   Reemplaza la politica abierta "proto_all" (que dejaba entrar a
--   cualquiera con la anon key) por una politica "auth_all" que SOLO
--   permite el acceso al rol "authenticated" (usuarios con sesion).
--
-- CUANDO EJECUTARLO:
--   DESPUES de crear las cuentas en Authentication -> Users.
--   Si lo ejecutas antes de tener cuentas, nadie podra entrar hasta
--   que crees al menos un usuario.
--
-- Es idempotente: puedes volver a ejecutarlo sin problema.
-- Pegalo en Supabase -> SQL Editor -> Run.
-- =====================================================================

do $$
declare
  r record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    -- Quita la politica abierta (acceso anonimo) si existe.
    execute format('drop policy if exists proto_all on public.%I', r.tablename);
    -- Politica para usuarios autenticados (con sesion).
    execute format('drop policy if exists auth_all on public.%I', r.tablename);
    execute format(
      'create policy auth_all on public.%I for all to authenticated using (true) with check (true)',
      r.tablename
    );
  end loop;
end $$;

-- Quita la columna de contrasenas de la tabla compartida: las credenciales
-- las maneja ahora Supabase Auth (no deben vivir en el backend de datos).
alter table public."usuarios" drop column if exists "PASSWORD";
