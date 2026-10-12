/* =====================================================================
 * config.js - Datos de conexion al backend (Supabase)
 * ---------------------------------------------------------------------
 * Rellena aqui los DOS valores de tu proyecto Supabase para que TODOS
 * los usuarios queden conectados automaticamente, sin escribir nada.
 *
 *   SUPABASE_URL      -> Project URL          (ej. https://abcd1234.supabase.co)
 *   SUPABASE_ANON_KEY -> anon public key      (la que empieza con eyJ... )
 *
 * Nota: la key "anon" es PUBLICA (va en el navegador de cada usuario).
 * La seguridad real la dan las POLITICAS (RLS) de Supabase: con Supabase
 * Auth activado, solo los usuarios con sesion iniciada acceden a los datos
 * (ver activar_auth.sql).
 *
 * AUTH_EMAIL_DOMAIN: los usuarios entran con "usuario + contrasena"; por
 * dentro la app convierte "usuario" en "usuario@AUTH_EMAIL_DOMAIN" para
 * Supabase Auth. Ej.: usuario "admin" -> "admin@intransit.gt".
 * ===================================================================== */
window.APP_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  AUTH_EMAIL_DOMAIN: "intransit.gt",
  /* Supabase Auth (login con sesion). DESACTIVADO por ahora:
   * la app valida el login contra la tabla local `usuarios`.
   * Ponlo en true SOLO despues de crear las cuentas en Supabase
   * (Authentication > Users) y de correr activar_auth.sql. */
  AUTH_ENABLED: true,
};
