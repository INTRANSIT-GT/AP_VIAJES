-- =====================================================================
-- perfiles.sql  -  Asigna el PERFIL (rol) de las 41 cuentas en la app.
-- ---------------------------------------------------------------------
-- QUE HACE:
--   Inserta/actualiza una fila por cada persona en la tabla public.usuarios.
--   El "USUARIO" es el correo (con eso entra y la app encuentra su ROL).
--   Es idempotente: puedes correrlo varias veces sin miedo.
--
-- CUANDO EJECUTARLO:
--   En Supabase -> SQL Editor -> New query -> pega todo -> Run.
--   DEBE salir: "Success. No rows returned".
--
-- CAMBIAR UN ROL LUEGO:
--   Edita la linea del correo y cambia el rol, o hazlo desde la app
--   (Administracion -> tabla Usuarios) entrando como admin.
--
-- ROLES VALIDOS: admin, gerente_comercial, gerente_transporte,
--                facturador, validador, operativo
-- =====================================================================

insert into public."usuarios" ("ID_USUARIO","USUARIO","NOMBRE","ROL","ACTIVO")
values
  ('sdelacerda@intransit.com.gt','sdelacerda@intransit.com.gt','Salvador de la Cerda','admin','Si'),
  ('administracion@intransit.com.gt','administracion@intransit.com.gt','Carolina De la Cerda','admin','Si'),
  ('manuelarias@intransit.com.gt','manuelarias@intransit.com.gt','Manuel Arias','admin','Si'),
  ('ventas@intransit.com.gt','ventas@intransit.com.gt','Maria Fernanda Quinonez','gerente_comercial','Si'),
  ('ksoto@intransit.com.gt','ksoto@intransit.com.gt','Kandy Soto','gerente_transporte','Si'),
  ('lmeneses@intransit.com.gt','lmeneses@intransit.com.gt','Luis Meneses','gerente_transporte','Si'),
  ('calidad@intransit.com.gt','calidad@intransit.com.gt','Luis Salvatierra','gerente_transporte','Si'),
  ('rchinchilla@intransit.com.gt','rchinchilla@intransit.com.gt','Roberto Chinchilla','gerente_transporte','Si'),
  ('creditos-cobros@intransit.com.gt','creditos-cobros@intransit.com.gt','Bryan Garcia','facturador','Si'),
  ('facturacion2@intransit.com.gt','facturacion2@intransit.com.gt','Estefani Vicente','facturador','Si'),
  ('asistente.rrhh@intransit.com.gt','asistente.rrhh@intransit.com.gt','Yesenia Orellana','facturador','Si'),
  ('nominas2@intransit.com.gt','nominas2@intransit.com.gt','Kevin Bautista','facturador','Si'),
  ('control@intransit.com.gt','control@intransit.com.gt','Sofia Gonzalez','validador','Si'),
  ('auditoria@confyansa.com.gt','auditoria@confyansa.com.gt','Angela Gomez','validador','Si'),
  ('sac@intransit.com.gt','sac@intransit.com.gt','Alejandra Gonzales','operativo','Si'),
  ('proyectos@intransit.com.gt','proyectos@intransit.com.gt','Carmen Rousselin','operativo','Si'),
  ('analista@intransit.com.gt','analista@intransit.com.gt','Cesar Obrego','operativo','Si'),
  ('mercadeo.intransit.centroamerica@gmail.com','mercadeo.intransit.centroamerica@gmail.com','Cristel Estrada','operativo','Si'),
  ('auxiliar-rrh2@intransit.com.gt','auxiliar-rrh2@intransit.com.gt','Dafne Esquivel','operativo','Si'),
  ('reclutamiento-2@intransit.com.gt','reclutamiento-2@intransit.com.gt','Joaquin Iglesias','operativo','Si'),
  ('auxiliar-rrhh@intransit.com.gt','auxiliar-rrhh@intransit.com.gt','Vacante RRHH','operativo','Si'),
  ('torre.control@intransit.com.gt','torre.control@intransit.com.gt','Jose Perez y Felipe Osorio','operativo','Si'),
  ('comercial@intransit.com.gt','comercial@intransit.com.gt','Katherine Urizar','operativo','Si'),
  ('reclutamiento@intransit.com.gt','reclutamiento@intransit.com.gt','Laura Conde','operativo','Si'),
  ('taller@intransit.com.gt','taller@intransit.com.gt','Juan Jose Soto','operativo','Si'),
  ('operacion.sj@intransit.com.gt','operacion.sj@intransit.com.gt','Luis David Chun','operativo','Si'),
  ('supervisor1@intransit.com.gt','supervisor1@intransit.com.gt','Luis Gonzales','operativo','Si'),
  ('coordinador1@intransit.com.gt','coordinador1@intransit.com.gt','Mar Aguilar','operativo','Si'),
  ('rrhh@intransit.com.gt','rrhh@intransit.com.gt','Odra Borrayo','operativo','Si'),
  ('transporte1@intransit.com.gt','transporte1@intransit.com.gt','Manuel Ixcot','operativo','Si'),
  ('bodega@intransit.com.gt','bodega@intransit.com.gt','Rodolfo Ochoa','operativo','Si'),
  ('rcanahui@intransit.com.gt','rcanahui@intransit.com.gt','Ruben Canahui','operativo','Si'),
  ('asistente.sac@intransit.com.gt','asistente.sac@intransit.com.gt','Vacante Comercial','operativo','Si'),
  ('supervisor2@intransit.com.gt','supervisor2@intransit.com.gt','Mario Cordon','operativo','Si'),
  ('procesos@intransit.com.gt','procesos@intransit.com.gt','Nora Rivera','operativo','Si'),
  ('maquila.omnia@intransit.com.gt','maquila.omnia@intransit.com.gt','Ronald Saquil','operativo','Si'),
  ('outsourcing@intransit.com.gt','outsourcing@intransit.com.gt','Melissa Lopez Guillen','operativo','Si'),
  ('supervision.teculutan@intransit.com.gt','supervision.teculutan@intransit.com.gt','Romario Hernandez','operativo','Si'),
  ('supervisionintransit@gmail.com','supervisionintransit@gmail.com','Pedro Juarez','operativo','Si'),
  ('afelix@intransit.com.gt','afelix@intransit.com.gt','Alexander Felix','operativo','Si'),
  ('analista.rrhh@intransit.com.gt','analista.rrhh@intransit.com.gt','Leticia Tunche','operativo','Si')
on conflict ("ID_USUARIO") do update
  set "USUARIO" = excluded."USUARIO",
      "NOMBRE"  = excluded."NOMBRE",
      "ROL"     = excluded."ROL",
      "ACTIVO"  = excluded."ACTIVO";

-- Verificacion: debe devolver 41
select count(*) as total_perfiles from public."usuarios";
