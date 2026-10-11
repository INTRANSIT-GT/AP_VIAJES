-- Esquema para Supabase (PostgreSQL)
-- Ejecuta TODO esto en el SQL Editor de tu proyecto Supabase antes de sincronizar.
-- En el prototipo todas las columnas son TEXT y el acceso con la clave anon
-- queda permitido (create policy proto_all). Para produccion usa autenticacion real.

create table if not exists public."clientes" (
  "ID_CLIENTE" text,
  "CLIENTE" text,
  "CLIENTE_PADRE" text,
  "SERVICIO" text,
  "NOMBRE_USUARIO_PRINCIPAL" text,
  "CORREO" text,
  "TELEFONO" text,
  "LINK_CONTRATO" text,
  primary key ("ID_CLIENTE")
);
alter table public."clientes" enable row level security;
drop policy if exists proto_all on public."clientes";
create policy proto_all on public."clientes" for all using (true) with check (true);

create table if not exists public."pilotos" (
  "PILOTO" text,
  "LICENCIA" text,
  "TELEFONO" text,
  primary key ("PILOTO")
);
alter table public."pilotos" enable row level security;
drop policy if exists proto_all on public."pilotos";
create policy proto_all on public."pilotos" for all using (true) with check (true);

create table if not exists public."proveedores" (
  "OPL" text,
  "PROVEEDOR" text,
  "NOMBRE_CONTACTO" text,
  "CORREO" text,
  "TELEFONO" text,
  primary key ("OPL")
);
alter table public."proveedores" enable row level security;
drop policy if exists proto_all on public."proveedores";
create policy proto_all on public."proveedores" for all using (true) with check (true);

create table if not exists public."unidades" (
  "UNIDAD" text,
  "TC" text,
  "PILOTO" text,
  "CAPACIDAD_CARGA" text,
  "TIPO_DE_CARGA" text,
  "ID_CLIENTE" text,
  "OPL" text,
  "STATUS" text,
  primary key ("UNIDAD")
);
alter table public."unidades" enable row level security;
drop policy if exists proto_all on public."unidades";
create policy proto_all on public."unidades" for all using (true) with check (true);

create table if not exists public."rutas" (
  "ID_RUTA" text,
  "ORIGEN" text,
  "DESTINO" text,
  "KM" text,
  "TIPO_RUTA" text,
  "ID_CLIENTE" text,
  primary key ("ID_RUTA")
);
alter table public."rutas" enable row level security;
drop policy if exists proto_all on public."rutas";
create policy proto_all on public."rutas" for all using (true) with check (true);

create table if not exists public."tarifas" (
  "ID_RUTA" text,
  "OPL" text,
  "TARIFA_CLIENTE" text,
  "TARIFA_OPL" text,
  "COMBUSTIBLE_PCT" text,
  "Q_DIESEL_PACTADO" text,
  "FECHA_CREACION" text,
  "ESTATUS" text,
  primary key ("ID_RUTA", "OPL")
);
alter table public."tarifas" enable row level security;
drop policy if exists proto_all on public."tarifas";
create policy proto_all on public."tarifas" for all using (true) with check (true);

create table if not exists public."mem" (
  "FECHA" text,
  "PRECIO_DIESEL" text,
  primary key ("FECHA")
);
alter table public."mem" enable row level security;
drop policy if exists proto_all on public."mem";
create policy proto_all on public."mem" for all using (true) with check (true);

create table if not exists public."usuarios" (
  "ID_USUARIO" text,
  "USUARIO" text,
  "PASSWORD" text,
  "NOMBRE" text,
  "ROL" text,
  "ACTIVO" text,
  primary key ("ID_USUARIO")
);
alter table public."usuarios" enable row level security;
drop policy if exists proto_all on public."usuarios";
create policy proto_all on public."usuarios" for all using (true) with check (true);

create table if not exists public."usuario_cliente" (
  "ID_USUARIO" text,
  "ID_CLIENTE" text,
  primary key ("ID_USUARIO", "ID_CLIENTE")
);
alter table public."usuario_cliente" enable row level security;
drop policy if exists proto_all on public."usuario_cliente";
create policy proto_all on public."usuario_cliente" for all using (true) with check (true);

create table if not exists public."viajes" (
  "ID_VIAJE" text,
  "UNIDAD" text,
  "TC" text,
  "PILOTO" text,
  "ORIGEN" text,
  "DESTINO" text,
  "No. TRANSPORTE" text,
  "STATUS" text,
  "CARGA_VIAJE" text,
  "CAPACIDAD_CARGA" text,
  "TIPO_DE_CARGA" text,
  "FECHA_PLAN" text,
  "KM" text,
  "OBSERVACIONES" text,
  "OPL" text,
  "CLIENTE_PADRE" text,
  "CLIENTE" text,
  "ID-CLIENTE" text,
  "Viáticos" text,
  "TIPO_RUTA" text,
  "FECHA_FIN" text,
  "CODIGO_VIAJE" text,
  "REVISADO_POR" text,
  "FECHA_REVISION" text,
  "NUMERO_FACTURA" text,
  "FECHA_FACTURA" text,
  "COMENTARIO_VALIDACION" text,
  "ELIMINADO" text,
  "ELIMINADO_POR" text,
  "FECHA_ELIMINACION" text,
  "TARIFA_CLIENTE" text,
  "TARIFA_OPL" text,
  "Q_DIESEL_PACTADO" text,
  "COMBUSTIBLE_PCT" text,
  "PRECIO_MEM" text,
  "AJUSTE_COMBUSTIBLE" text,
  "AJUSTE_COMBUSTIBLE_OPL" text,
  primary key ("ID_VIAJE")
);
alter table public."viajes" enable row level security;
drop policy if exists proto_all on public."viajes";
create policy proto_all on public."viajes" for all using (true) with check (true);

create table if not exists public."bitacora" (
  "ID_BITACORA" text,
  "ID_USUARIO" text,
  "USUARIO" text,
  "FECHA" text,
  "ACCION" text,
  "EQUIPO" text,
  primary key ("ID_BITACORA")
);
alter table public."bitacora" enable row level security;
drop policy if exists proto_all on public."bitacora";
create policy proto_all on public."bitacora" for all using (true) with check (true);

create table if not exists public."permisos" (
  "ROL" text,
  "PERMISO" text,
  "HABILITADO" text,
  primary key ("ROL", "PERMISO")
);
alter table public."permisos" enable row level security;
drop policy if exists proto_all on public."permisos";
create policy proto_all on public."permisos" for all using (true) with check (true);

