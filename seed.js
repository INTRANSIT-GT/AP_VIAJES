/* =====================================================================
 * seed.js - Datos iniciales del prototipo "Registro de Viajes"
 * ---------------------------------------------------------------------
 * Cada propiedad de nivel superior es una TABLA; cada arreglo contiene
 * filas (objetos) cuyas claves son los CAMPOS/COLUMNAS.
 * ===================================================================== */

const SEED = {
  /* --------------------------------------------------------------- */
  clientes: [
    { ID_CLIENTE: "CLI-001", CLIENTE: "Transportes del Norte SA", CLIENTE_PADRE: "Grupo Corporativo GN", SERVICIO: "Transporte dedicado", NOMBRE_USUARIO_PRINCIPAL: "Roberto Diaz", CORREO: "roberto.diaz@norte.com", TELEFONO: "81-1000-2000", LINK_CONTRATO: "https://contratos.gn/cli-001" },
    { ID_CLIENTE: "CLI-002", CLIENTE: "Logistica Peninsular",    CLIENTE_PADRE: "Grupo Logisti-K",       SERVICIO: "Distribucion regional", NOMBRE_USUARIO_PRINCIPAL: "Sofia Marin", CORREO: "sofia.marin@peninsular.com", TELEFONO: "99-3000-4000", LINK_CONTRATO: "https://contratos.k/cli-002" },
    { ID_CLIENTE: "CLI-003", CLIENTE: "Alimentos MX",            CLIENTE_PADRE: "Corporativo Nutri",     SERVICIO: "Cadena de frio",        NOMBRE_USUARIO_PRINCIPAL: "Hector Luna", CORREO: "hector.luna@alimentosmx.com", TELEFONO: "55-5000-6000", LINK_CONTRATO: "https://contratos.nutri/cli-003" },
  ],

  /* --------------------------------------------------------------- */
  pilotos: [
    { PILOTO: "Juan Perez Lopez",   LICENCIA: "A-123456", TELEFONO: "555-101-2020" },
    { PILOTO: "Maria Gomez Ruiz",   LICENCIA: "A-223344", TELEFONO: "555-202-3030" },
    { PILOTO: "Carlos Ramirez",     LICENCIA: "B-334455", TELEFONO: "555-303-4040" },
    { PILOTO: "Luis Hernandez",     LICENCIA: "A-445566", TELEFONO: "555-404-5050" },
    { PILOTO: "Ana Torres",         LICENCIA: "B-556677", TELEFONO: "555-505-6060" },
    { PILOTO: "Pedro Sanchez",      LICENCIA: "A-667788", TELEFONO: "555-606-7070" },
  ],

  /* --------------------------------------------------------------- */
  proveedores: [
    { OPL: "OPL-9001", PROVEEDOR: "Logistica Global SA", NOMBRE_CONTACTO: "Laura Mendez", CORREO: "contacto@logglobal.com", TELEFONO: "55-1111-2222" },
    { OPL: "OPL-9002", PROVEEDOR: "Transportes Rapidos", NOMBRE_CONTACTO: "Ivan Ortega", CORREO: "ops@transrapidos.com", TELEFONO: "33-3333-4444" },
    { OPL: "OPL-9003", PROVEEDOR: "Red Fria MX",         NOMBRE_CONTACTO: "Paola Rivas", CORREO: "trafico@redfria.mx", TELEFONO: "81-5555-6666" },
  ],

  /* --------------------------------------------------------------- */
  unidades: [
    { UNIDAD: "TR-101", TC: "T3S2", PILOTO: "Juan Perez Lopez", CAPACIDAD_CARGA: 30000, TIPO_DE_CARGA: "Carga seca", ID_CLIENTE: "CLI-001", OPL: "OPL-9001", STATUS: "Activa" },
    { UNIDAD: "TR-102", TC: "T3S2", PILOTO: "Maria Gomez Ruiz", CAPACIDAD_CARGA: 32000, TIPO_DE_CARGA: "Refrigerada", ID_CLIENTE: "CLI-001", OPL: "OPL-9001", STATUS: "Activa" },
    { UNIDAD: "TR-201", TC: "T2S1", PILOTO: "Carlos Ramirez",   CAPACIDAD_CARGA: 18000, TIPO_DE_CARGA: "Carga seca", ID_CLIENTE: "CLI-002", OPL: "OPL-9002", STATUS: "Activa" },
    { UNIDAD: "TR-202", TC: "T3S3", PILOTO: "Luis Hernandez",   CAPACIDAD_CARGA: 40000, TIPO_DE_CARGA: "Granel", ID_CLIENTE: "CLI-002", OPL: "OPL-9002", STATUS: "Mantenimiento" },
    { UNIDAD: "TR-301", TC: "T3S2", PILOTO: "Ana Torres",       CAPACIDAD_CARGA: 28000, TIPO_DE_CARGA: "Refrigerada", ID_CLIENTE: "CLI-003", OPL: "OPL-9003", STATUS: "Activa" },
    { UNIDAD: "TR-302", TC: "T2S2", PILOTO: "Pedro Sanchez",    CAPACIDAD_CARGA: 22000, TIPO_DE_CARGA: "Carga seca", ID_CLIENTE: "CLI-003", OPL: "OPL-9003", STATUS: "Activa" },
  ],

  /* --------------------------------------------------------------- */
  rutas: [
    { ID_RUTA: "R-001", ORIGEN: "CDMX", DESTINO: "Monterrey", KM: 900, TIPO_RUTA: "Foranea", ID_CLIENTE: "CLI-001" },
    { ID_RUTA: "R-002", ORIGEN: "CDMX", DESTINO: "Queretaro", KM: 220, TIPO_RUTA: "Local", ID_CLIENTE: "CLI-001" },
    { ID_RUTA: "R-003", ORIGEN: "Guadalajara", DESTINO: "Merida", KM: 1900, TIPO_RUTA: "Foranea", ID_CLIENTE: "CLI-002" },
    { ID_RUTA: "R-004", ORIGEN: "Monterrey", DESTINO: "Saltillo", KM: 90, TIPO_RUTA: "Local", ID_CLIENTE: "CLI-002" },
    { ID_RUTA: "R-005", ORIGEN: "CDMX", DESTINO: "Veracruz", KM: 400, TIPO_RUTA: "Foranea", ID_CLIENTE: "CLI-003" },
    { ID_RUTA: "R-006", ORIGEN: "Puebla", DESTINO: "Oaxaca", KM: 340, TIPO_RUTA: "Foranea", ID_CLIENTE: "CLI-003" },
  ],

  /* --------------------------------------------------------------- */
  tarifas: [
    { ID_RUTA: "R-001", OPL: "OPL-9001", TARIFA_CLIENTE: 48000, TARIFA_OPL: 40000, COMBUSTIBLE_PCT: 30, Q_DIESEL_PACTADO: 28.50, FECHA_CREACION: "2026-09-15", ESTATUS: "Activo" },
    { ID_RUTA: "R-002", OPL: "OPL-9001", TARIFA_CLIENTE: 12000, TARIFA_OPL: 9500,  COMBUSTIBLE_PCT: 30, Q_DIESEL_PACTADO: 28.50, FECHA_CREACION: "2026-09-15", ESTATUS: "Activo" },
    { ID_RUTA: "R-003", OPL: "OPL-9002", TARIFA_CLIENTE: 90000, TARIFA_OPL: 78000, COMBUSTIBLE_PCT: 35, Q_DIESEL_PACTADO: 29.00, FECHA_CREACION: "2026-09-18", ESTATUS: "Activo" },
    { ID_RUTA: "R-004", OPL: "OPL-9002", TARIFA_CLIENTE: 6000,  TARIFA_OPL: 4500,  COMBUSTIBLE_PCT: 35, Q_DIESEL_PACTADO: 29.00, FECHA_CREACION: "2026-09-18", ESTATUS: "Activo" },
    { ID_RUTA: "R-005", OPL: "OPL-9003", TARIFA_CLIENTE: 25000, TARIFA_OPL: 21000, COMBUSTIBLE_PCT: 32, Q_DIESEL_PACTADO: 28.75, FECHA_CREACION: "2026-09-22", ESTATUS: "Activo" },
    { ID_RUTA: "R-006", OPL: "OPL-9003", TARIFA_CLIENTE: 22000, TARIFA_OPL: 18000, COMBUSTIBLE_PCT: 32, Q_DIESEL_PACTADO: 28.75, FECHA_CREACION: "2026-09-22", ESTATUS: "Inactivo" },
  ],

  /* --------------------------------------------------------------- */
  /* MEM: tabla de precios diarios del diesel (se carga desde el
   * archivo del MEM; NO es una conexion en vivo). ----------------- */
  mem: [
    { FECHA: "2026-09-01", PRECIO_DIESEL: 31.00 },
    { FECHA: "2026-09-20", PRECIO_DIESEL: 30.85 },
    { FECHA: "2026-10-02", PRECIO_DIESEL: 31.05 },
    { FECHA: "2026-10-05", PRECIO_DIESEL: 31.10 },
    { FECHA: "2026-10-08", PRECIO_DIESEL: 31.20 },
    { FECHA: "2026-10-12", PRECIO_DIESEL: 31.35 },
  ],

  /* --------------------------------------------------------------- */
  usuarios: [
    { ID_USUARIO: "U-001", USUARIO: "admin",       PASSWORD: "admin123", NOMBRE: "Administrador General",  ROL: "admin",              ACTIVO: "Si" },
    { ID_USUARIO: "U-002", USUARIO: "operativo",   PASSWORD: "demo123",  NOMBRE: "Operador Norte",          ROL: "operativo",          ACTIVO: "Si" },
    { ID_USUARIO: "U-003", USUARIO: "peninsular",  PASSWORD: "demo123",  NOMBRE: "Operador Peninsular",     ROL: "operativo",          ACTIVO: "Si" },
    { ID_USUARIO: "U-004", USUARIO: "validador",   PASSWORD: "demo123",  NOMBRE: "Validador de Viajes",     ROL: "validador",          ACTIVO: "Si" },
    { ID_USUARIO: "U-005", USUARIO: "facturador",  PASSWORD: "demo123",  NOMBRE: "Encargado de Facturacion", ROL: "facturador",        ACTIVO: "Si" },
    { ID_USUARIO: "U-006", USUARIO: "gtransporte", PASSWORD: "demo123",  NOMBRE: "Gerente de Transporte",   ROL: "gerente_transporte", ACTIVO: "Si" },
    { ID_USUARIO: "U-007", USUARIO: "gcomercial",  PASSWORD: "demo123",  NOMBRE: "Gerente Comercial",       ROL: "gerente_comercial",  ACTIVO: "Si" },
  ],

  /* Control de acceso: a que clientes puede ver cada usuario (los perfiles
   * con "ver todos" no dependen de esta tabla). --------------------- */
  usuario_cliente: [
    { ID_USUARIO: "U-002", ID_CLIENTE: "CLI-001" },
    { ID_USUARIO: "U-003", ID_CLIENTE: "CLI-002" },
  ],

  /* --------------------------------------------------------------- */
  viajes: [
    { ID_VIAJE: "V-00001", UNIDAD: "TR-101", TC: "T3S2", PILOTO: "Juan Perez Lopez", ORIGEN: "CDMX", DESTINO: "Monterrey", "No. TRANSPORTE": "NT-5501", STATUS: "Liquidado", CARGA_VIAJE: 28000, CAPACIDAD_CARGA: 30000, TIPO_DE_CARGA: "Carga seca", FECHA_PLAN: "2026-09-01", KM: 900, OBSERVACIONES: "Entrega sin novedad", OPL: "OPL-9001", CLIENTE_PADRE: "Grupo Corporativo GN", CLIENTE: "Transportes del Norte SA", "ID-CLIENTE": "CLI-001", Viáticos: 3200, TIPO_RUTA: "Foranea", FECHA_FIN: "2026-09-03", CODIGO_VIAJE: "CLI001-20260901-001", REVISADO_POR: "", FECHA_REVISION: "", NUMERO_FACTURA: "", FECHA_FACTURA: "", COMENTARIO_VALIDACION: "", ELIMINADO: "No", ELIMINADO_POR: "", FECHA_ELIMINACION: "", TARIFA_CLIENTE: 48000, TARIFA_OPL: 40000, Q_DIESEL_PACTADO: 28.50, COMBUSTIBLE_PCT: 30, PRECIO_MEM: 31.00, AJUSTE_COMBUSTIBLE: 1263.16, AJUSTE_COMBUSTIBLE_OPL: 1052.63 },
    { ID_VIAJE: "V-00002", UNIDAD: "TR-201", TC: "T2S1", PILOTO: "Carlos Ramirez", ORIGEN: "Guadalajara", DESTINO: "Merida", "No. TRANSPORTE": "NT-5502", STATUS: "En transito", CARGA_VIAJE: 17000, CAPACIDAD_CARGA: 18000, TIPO_DE_CARGA: "Carga seca", FECHA_PLAN: "2026-10-05", KM: 1900, OBSERVACIONES: "", OPL: "OPL-9002", CLIENTE_PADRE: "Grupo Logisti-K", CLIENTE: "Logistica Peninsular", "ID-CLIENTE": "CLI-002", Viáticos: 6100, TIPO_RUTA: "Foranea", FECHA_FIN: "", CODIGO_VIAJE: "CLI002-20261005-001", REVISADO_POR: "", FECHA_REVISION: "", NUMERO_FACTURA: "", FECHA_FACTURA: "", COMENTARIO_VALIDACION: "", ELIMINADO: "No", ELIMINADO_POR: "", FECHA_ELIMINACION: "", TARIFA_CLIENTE: "", TARIFA_OPL: "", Q_DIESEL_PACTADO: "", COMBUSTIBLE_PCT: "", PRECIO_MEM: "", AJUSTE_COMBUSTIBLE: "", AJUSTE_COMBUSTIBLE_OPL: "" },
    { ID_VIAJE: "V-00003", UNIDAD: "TR-301", TC: "T3S2", PILOTO: "Ana Torres", ORIGEN: "CDMX", DESTINO: "Veracruz", "No. TRANSPORTE": "NT-5503", STATUS: "Planificado", CARGA_VIAJE: 26000, CAPACIDAD_CARGA: 28000, TIPO_DE_CARGA: "Refrigerada", FECHA_PLAN: "2026-10-12", KM: 400, OBSERVACIONES: "Requiere cadena de frio", OPL: "OPL-9003", CLIENTE_PADRE: "Corporativo Nutri", CLIENTE: "Alimentos MX", "ID-CLIENTE": "CLI-003", Viáticos: 1500, TIPO_RUTA: "Foranea", FECHA_FIN: "", CODIGO_VIAJE: "CLI003-20261012-001", REVISADO_POR: "", FECHA_REVISION: "", NUMERO_FACTURA: "", FECHA_FACTURA: "", COMENTARIO_VALIDACION: "", ELIMINADO: "No", ELIMINADO_POR: "", FECHA_ELIMINACION: "", TARIFA_CLIENTE: "", TARIFA_OPL: "", Q_DIESEL_PACTADO: "", COMBUSTIBLE_PCT: "", PRECIO_MEM: "", AJUSTE_COMBUSTIBLE: "", AJUSTE_COMBUSTIBLE_OPL: "" },
    { ID_VIAJE: "V-00004", UNIDAD: "TR-201", TC: "T2S1", PILOTO: "Carlos Ramirez", ORIGEN: "Monterrey", DESTINO: "Saltillo", "No. TRANSPORTE": "NT-5504", STATUS: "Facturado", CARGA_VIAJE: 15000, CAPACIDAD_CARGA: 18000, TIPO_DE_CARGA: "Carga seca", FECHA_PLAN: "2026-09-20", KM: 90, OBSERVACIONES: "", OPL: "OPL-9002", CLIENTE_PADRE: "Grupo Logisti-K", CLIENTE: "Logistica Peninsular", "ID-CLIENTE": "CLI-002", Viáticos: 600, TIPO_RUTA: "Local", FECHA_FIN: "2026-09-20", CODIGO_VIAJE: "CLI002-20260920-001", REVISADO_POR: "validador", FECHA_REVISION: "2026-09-26 10:00:00", NUMERO_FACTURA: "F-2026-0231", FECHA_FACTURA: "2026-09-28", COMENTARIO_VALIDACION: "Correcto", ELIMINADO: "No", ELIMINADO_POR: "", FECHA_ELIMINACION: "", TARIFA_CLIENTE: 6000, TARIFA_OPL: 4500, Q_DIESEL_PACTADO: 29.00, COMBUSTIBLE_PCT: 35, PRECIO_MEM: 30.85, AJUSTE_COMBUSTIBLE: 133.97, AJUSTE_COMBUSTIBLE_OPL: 100.47 },
    { ID_VIAJE: "V-00005", UNIDAD: "TR-102", TC: "T3S2", PILOTO: "Maria Gomez Ruiz", ORIGEN: "CDMX", DESTINO: "Queretaro", "No. TRANSPORTE": "", STATUS: "Rechazado", CARGA_VIAJE: 20000, CAPACIDAD_CARGA: 32000, TIPO_DE_CARGA: "Refrigerada", FECHA_PLAN: "2026-10-02", KM: 220, OBSERVACIONES: "", OPL: "OPL-9001", CLIENTE_PADRE: "Grupo Corporativo GN", CLIENTE: "Transportes del Norte SA", "ID-CLIENTE": "CLI-001", Viáticos: 990, TIPO_RUTA: "Local", FECHA_FIN: "2026-10-03", CODIGO_VIAJE: "CLI001-20261002-001", REVISADO_POR: "validador", FECHA_REVISION: "2026-10-06 16:20:00", NUMERO_FACTURA: "", FECHA_FACTURA: "", COMENTARIO_VALIDACION: "Falta el numero de transporte", ELIMINADO: "No", ELIMINADO_POR: "", FECHA_ELIMINACION: "", TARIFA_CLIENTE: "", TARIFA_OPL: "", Q_DIESEL_PACTADO: "", COMBUSTIBLE_PCT: "", PRECIO_MEM: "", AJUSTE_COMBUSTIBLE: "", AJUSTE_COMBUSTIBLE_OPL: "" },
  ],

  /* --------------------------------------------------------------- */
  bitacora: [
    { ID_BITACORA: "B-00001", ID_USUARIO: "U-002", USUARIO: "operativo", FECHA: "2026-10-06 08:15:00", ACCION: "Login", EQUIPO: "Equipo demo" },
  ],
};
