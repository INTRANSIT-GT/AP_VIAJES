/* =====================================================================
 * app.js - Logica del prototipo "Registro de Viajes"
 * ---------------------------------------------------------------------
 *  - Login + control de accesos (por usuario y por cliente asignado)
 *  - Bitacora: registra quien entra/sale
 *  - Menu de 3 opciones: Registro de Viajes / Consultar Viajes / Admin
 *  - Formulario con autollenado y desplegables filtrados por cliente
 * ===================================================================== */

/* ------------------------------- Utils ---------------------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const nowStr = () => {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const num = (v) => (v === "" || v == null ? "" : Number(v));
const sugViaticos = (km) => (km === "" || isNaN(km) ? "" : Math.round(Number(km) * 4.5));

/* --------------- Estatus y flujo de aprobacion/facturacion -------- */
const STATUS_PLANIFICADO = "Planificado";
const STATUS_EN_TRANSITO = "En transito";
const STATUS_COMPLETADO = "Completado";
const STATUS_LIQUIDADO = "Liquidado";
const STATUS_APROBADO = "Aprobado";
const STATUS_RECHAZADO = "Rechazado";
const STATUS_FACTURADO = "Facturado";
const STATUS_LIST = [STATUS_PLANIFICADO, STATUS_EN_TRANSITO, STATUS_COMPLETADO, STATUS_LIQUIDADO, STATUS_APROBADO, STATUS_RECHAZADO, STATUS_FACTURADO];
/* El operativo solo puede asignar estos estatus */
const STATUS_OPERATIVO = [STATUS_PLANIFICADO, STATUS_EN_TRANSITO, STATUS_COMPLETADO, STATUS_LIQUIDADO];
/* Estatus bloqueados para edicion (no-admin) */
const STATUS_BLOQUEADOS = [STATUS_LIQUIDADO, STATUS_APROBADO, STATUS_FACTURADO];

/* ------------------------------- Estado --------------------------- */
const state = {
  user: null,
  view: "registro",
  form: {},
  editId: null,
  consulta: { cliente: "", status: "", desde: "", hasta: "", texto: "" },
  consultarEliminados: false,
  validacion: { cliente: "", status: "", texto: "" },
  facturacion: { cliente: "", texto: "" },
  dashboard: { cliente: "", desde: "", hasta: "" },
  flotaTab: "unidades",
  adminTab: "bitacora",
};

/* --------------------------- Control de acceso -------------------- */
function allowedClientes() {
  if (!state.user) return [];
  if (state.user.ROL === "admin") return Store.all("clientes");
  const ids = Store.find("usuario_cliente", (r) => r.ID_USUARIO === state.user.ID_USUARIO)
    .map((r) => r.ID_CLIENTE);
  return Store.all("clientes").filter((c) => ids.includes(c.ID_CLIENTE));
}

/* ------------------------- Roles y permisos ----------------------- */
const ROLE_LABELS = {
  admin: "Administrador",
  operativo: "Operativo",
  validador: "Validador",
  facturador: "Facturador",
  gerente_transporte: "Gerente Transporte",
  gerente_comercial: "Gerente Comercial",
};
const roleLabel = (r) => ROLE_LABELS[r] || r;
const ROLES = Object.keys(ROLE_LABELS);

/* Catalogo de permisos (se administra desde la pestana Permisos). */
const PERMISOS_CATALOGO = [
  { key: "tablero_ver", grupo: "Tablero", label: "Ver tablero ejecutivo" },
  { key: "viajes_ver", grupo: "Viajes", label: "Ver viajes (consultar)" },
  { key: "viajes_ver_todos", grupo: "Viajes", label: "Ver viajes de todos los clientes" },
  { key: "viajes_scope_facturado", grupo: "Viajes", label: "Solo ver viajes Aprobado/Facturado" },
  { key: "viajes_crear", grupo: "Viajes", label: "Crear / registrar viajes" },
  { key: "viajes_editar", grupo: "Viajes", label: "Editar viajes (no bloqueados)" },
  { key: "viajes_eliminar", grupo: "Viajes", label: "Eliminar viajes (deja registro)" },
  { key: "viajes_validar", grupo: "Viajes", label: "Validar: aprobar / rechazar" },
  { key: "viajes_facturar", grupo: "Viajes", label: "Asignar numero de factura" },
  { key: "tablas_ver", grupo: "Tablas", label: "Ver catalogo de tablas" },
  { key: "cargas_masivas", grupo: "Tablas", label: "Cargas masivas (plantilla / importar)" },
  { key: "tablas_editar_clientes", grupo: "Tablas", label: "Editar Clientes" },
  { key: "tablas_editar_tarifas", grupo: "Tablas", label: "Editar Tarifas" },
  { key: "tablas_editar_unidades", grupo: "Tablas", label: "Editar Unidades" },
  { key: "tablas_editar_pilotos", grupo: "Tablas", label: "Editar Pilotos" },
  { key: "tablas_editar_proveedores", grupo: "Tablas", label: "Editar Proveedores" },
  { key: "tablas_editar_rutas", grupo: "Tablas", label: "Editar Rutas" },
  { key: "tablas_editar_usuarios", grupo: "Tablas", label: "Editar Usuarios / accesos" },
  { key: "tarifas_ver", grupo: "Tarifas", label: "Ver tarifas" },
  { key: "mem_gestionar", grupo: "Tarifas", label: "Cargar tabla MEM" },
  { key: "flota_ver", grupo: "Flota", label: "Ver datos de Flota (unidades, mantenimientos, gastos)" },
  { key: "flota_sincronizar", grupo: "Flota", label: "Sincronizar con Fleetio" },
  { key: "usuarios_gestionar", grupo: "Usuarios", label: "Gestionar cuentas de usuarios" },
  { key: "permisos_gestionar", grupo: "Usuarios", label: "Administrar permisos (solo admin)" },
];
const PERMISOS_KEYS = PERMISOS_CATALOGO.map((p) => p.key);

/* Permisos por defecto de cada rol (el admin siempre tiene todo). */
const PERMISOS_DEFAULT = {
  admin: PERMISOS_KEYS.slice(),
  operativo: ["viajes_ver", "viajes_crear", "viajes_editar"],
  validador: ["viajes_ver", "viajes_ver_todos", "viajes_validar"],
  facturador: ["viajes_ver", "viajes_scope_facturado", "viajes_facturar", "flota_ver"],
  gerente_transporte: ["tablero_ver", "viajes_ver", "viajes_ver_todos", "viajes_editar", "viajes_eliminar", "tablas_ver", "tarifas_ver", "tablas_editar_unidades", "tablas_editar_pilotos", "tablas_editar_proveedores", "tablas_editar_rutas", "usuarios_gestionar", "flota_ver", "flota_sincronizar"],
  gerente_comercial: ["tablero_ver", "viajes_ver", "viajes_ver_todos", "tablas_ver", "tarifas_ver", "tablas_editar_clientes", "tablas_editar_tarifas", "flota_ver"],
};

/* Siembra la tabla de permisos si esta vacia (una fila por rol+permiso). */
function ensurePermisos() {
  if (Store.all("permisos").length) return;
  const rows = [];
  ROLES.forEach((rol) => {
    PERMISOS_KEYS.forEach((perm) => {
      rows.push({ ROL: rol, PERMISO: perm, HABILITADO: (PERMISOS_DEFAULT[rol] || []).includes(perm) ? "Si" : "No" });
    });
  });
  Store.db.permisos = rows;
  Store.persist();
}

function permHabilitado(rol, perm) {
  if (rol === "admin") return true; // el admin siempre tiene todo
  const p = Store.find("permisos", (x) => x.ROL === rol && x.PERMISO === perm)[0];
  return !!(p && p.HABILITADO === "Si");
}
function can(perm) { return state.user ? permHabilitado(state.user.ROL, perm) : false; }

/* Mapa tabla del catalogo -> permiso de edicion. */
const CATALOGO_EDIT_PERM = {
  clientes: "tablas_editar_clientes", tarifas: "tablas_editar_tarifas",
  unidades: "tablas_editar_unidades", pilotos: "tablas_editar_pilotos",
  proveedores: "tablas_editar_proveedores", rutas: "tablas_editar_rutas",
  usuarios: "tablas_editar_usuarios", usuario_cliente: "tablas_editar_usuarios",
};
function canEditTable(key) { return !!CATALOGO_EDIT_PERM[key] && can(CATALOGO_EDIT_PERM[key]); }

/* Alias semantico: ver tarifas. */
function canSeeTarifas() { return can("tarifas_ver"); }
/* Columnas de viaje visibles segun el rol (oculta tarifa a quien no puede verla). */
function visibleViajeColumns() {
  return canSeeTarifas() ? VIAJES_ALL_COLUMNS : VIAJES_ALL_COLUMNS.filter((c) => !VIAJES_TARIFA_COLUMNS.includes(c));
}
/* Estatus que puede asignar el usuario en el formulario de viaje. */
function statusOptionsForForm() {
  if (state.user.ROL === "admin") return STATUS_LIST;
  return STATUS_OPERATIVO;
}

/* Regla de edicion de un viaje segun su estatus y permisos. */
function canEditViaje(v) {
  if (!v || v.ELIMINADO === "Si") return false;
  if (!can("viajes_editar")) return false;
  if (state.user.ROL !== "admin" && STATUS_BLOQUEADOS.includes(v.STATUS)) return false;
  return true;
}

/* ------------------------------- Toast ---------------------------- */
let toastTimer;
function toast(msg, type = "") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast " + (type === "ok" ? "ok" : type === "err" ? "err" : "");
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2600);
}

/* ------------------------------- Modal ---------------------------- */
function openModal(html) {
  $("#modal-box").innerHTML = html;
  $("#modal").classList.remove("hidden");
}
function closeModal() {
  $("#modal").classList.add("hidden");
  $("#modal-box").innerHTML = "";
}

/* ------------------------------ Bitacora -------------------------- */
function addBitacora(accion) {
  Store.insert("bitacora", {
    ID_BITACORA: Store.nextId("bitacora", "ID_BITACORA", "B-", 5),
    ID_USUARIO: state.user ? state.user.ID_USUARIO : "",
    USUARIO: state.user ? state.user.USUARIO : "anonimo",
    FECHA: nowStr(),
    ACCION: accion,
    EQUIPO: `${navigator.platform || ""} · ${navigator.userAgent.slice(0, 60)}`,
  });
}

/* ============================= LOGIN ============================== */
async function handleLogin(e) {
  e.preventDefault();
  const u = $("#login-user").value.trim();
  const p = $("#login-pass").value;
  const err = $("#login-error");
  const btn = $("#login-form").querySelector('button[type="submit"]');
  const showErr = (m) => { err.textContent = m; err.classList.remove("hidden"); };

  if (!u || !p) { showErr("Escribe usuario y contrasena."); return; }
  if (btn) { btn.disabled = true; btn.textContent = "Entrando..."; }

  try {
    // Con Supabase Auth activo: valida contra la sesion (email interno).
    let authOk = false;
    if (Store.authEnabled()) {
      try {
        await Store.authSignIn(u, p);
        authOk = true;
      } catch (e2) {
        const offline = /Failed to fetch|NetworkError|load failed|Network request failed/i.test(e2.message || "");
        if (!offline) {
          showErr("Usuario o contrasena incorrectos, o la cuenta no existe en Supabase (Authentication → Users).");
          return;
        }
        // Sin red: se permite entrar con la validacion local (modo offline).
      }
    }

    let user = Store.all("usuarios").find((x) => String(x.USUARIO).toLowerCase() === u.toLowerCase());
    if (!user && authOk) {
      // Trae el perfil (y los permisos) desde la nube, de forma directa.
      let pullErr = "";
      try { user = await Store.fetchPerfil(u); } catch (e) { pullErr = e.message; }
      try { await Store.cloudPullTable("permisos"); } catch (e) { if (!pullErr) pullErr = e.message; }
    }
    if (!user) {
      showErr("Tu cuenta no tiene perfil asignado en la app." +
        (pullErr ? " Detalle de la nube: " + pullErr
                 : " Revisa en Supabase (tabla usuarios) que exista una fila con tu correo en USUARIO y ACTIVO = Si."));
      return;
    }
    if (!authOk && user.PASSWORD !== p) { showErr("Usuario o contrasena incorrectos."); return; }
    if (user.ACTIVO !== "Si") { showErr("El usuario esta inactivo. Contacta al administrador."); return; }

    err.classList.add("hidden");
    state.user = user;
    addBitacora("Login");
    enterApp();
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Entrar"; }
  }
}

/* Restaura la sesion de Supabase Auth guardada en este dispositivo. */
function restoreCloudSession() {
  if (!Store.authEnabled() || !Store.session) return;
  Store.ensureToken()
    .then(async () => {
      const name = Store.session.username;
      let u = Store.all("usuarios").find((x) => String(x.USUARIO).toLowerCase() === String(name).toLowerCase());
      if (!u) { try { u = await Store.fetchPerfil(name); } catch (e) {} }
      if (!u || u.ACTIVO !== "Si") throw new Error("sin perfil");
      state.user = u;
      enterApp();
    })
    .catch(() => Store.clearSession());
}

function syncStateText() {
  const el = $("#sync-state");
  if (el) el.textContent = Store.cloudEnabled() ? "Nube activa (datos compartidos)" : (Store.syncUrl ? "Sync activo (Excel nube)" : "Datos locales");
}

function enterApp() {
  $("#login-view").classList.add("hidden");
  $("#app-view").classList.remove("hidden");
  $("#user-avatar").textContent = state.user.NOMBRE.charAt(0).toUpperCase();
  $("#user-name").textContent = state.user.NOMBRE;
  $("#user-role").textContent = roleLabel(state.user.ROL);
  syncStateText();
  renderNav();
  route("registro");
  // Con backend en la nube: sincroniza en segundo plano al entrar.
  if (Store.cloudEnabled()) {
    Store.cloudPushAll().then(() => Store.cloudPullAll())
      .then(() => { syncStateText(); renderCurrent(); toast("Datos sincronizados", "ok"); })
      .catch((e) => { syncStateText(); toast("Sin conexion a la nube: " + e.message, "err"); });
  }
}

function handleLogout() {
  addBitacora("Logout");
  if (Store.authEnabled() && Store.hasSession && Store.hasSession()) Store.authSignOut().catch(() => {});
  state.user = null;
  state.form = {};
  $("#app-view").classList.add("hidden");
  $("#app-view").classList.remove("nav-open");
  $("#login-view").classList.remove("hidden");
  $("#login-pass").value = "";
}

/* ============================ NAVEGACION ========================== */
const MENU = [
  { id: "tablero", label: "Tablero", perm: "tablero_ver" },
  { id: "registro", label: "Registro de Viajes", perm: "viajes_crear" },
  { id: "consultar", label: "Consultar Viajes", perm: "viajes_ver" },
  { id: "validacion", label: "Validacion", perm: "viajes_validar" },
  { id: "facturacion", label: "Facturacion", perm: "viajes_facturar" },
  { id: "tarifas", label: "Tarifas", perm: "tarifas_ver" },
  { id: "flota", label: "Flota", perm: "flota_ver" },
  { id: "admin", label: "Administracion", perm: "tablas_ver" },
  { id: "permisos", label: "Permisos", perm: "permisos_gestionar" },
];
function menuForRole() { return MENU.filter((m) => can(m.perm)); }

function renderNav() {
  $("#nav").innerHTML = menuForRole().map((m) =>
    `<button class="nav-item ${state.view === m.id ? "active" : ""}" data-nav="${m.id}">${esc(m.label)}</button>`
  ).join("");
}

function route(view) {
  // Si el usuario no tiene permitida la vista, redirige a la primera disponible.
  // Excepcion: "registro" se permite al estar editando un viaje (permiso viajes_editar).
  const menu = menuForRole();
  const permitido = menu.some((m) => m.id === view) || (view === "registro" && state.editId && can("viajes_editar"));
  if (!permitido) view = menu.length ? menu[0].id : "consultar";
  state.view = view;
  renderNav();
  const titles = {
    tablero: ["Tablero ejecutivo", "Indicadores principales de la operacion."],
    registro: ["Registro de Viajes", "Captura un nuevo viaje. Los campos se autocompletan al seleccionar cliente, unidad y ruta."],
    consultar: ["Consultar Viajes", "Solo se muestran los viajes segun tu acceso."],
    validacion: ["Validacion de viajes", "Revisa los viajes liquidados: aprueba o rechaza con tus comentarios."],
    facturacion: ["Facturacion", "Asigna el numero de factura a los viajes aprobados por el validador."],
    tarifas: ["Tarifas", "Tarifas de cobro al cliente y de pago al OPL, y el precio MEM del dia."],
    flota: ["Flota (Fleetio)", "Unidades, mantenimientos y gastos descargados de Fleetio."],
    admin: ["Administracion", "Catalogos, usuarios, bitacora y exportacion."],
    permisos: ["Permisos por rol", "Solo el administrador puede administrar los permisos."],
  };
  $("#view-title").textContent = (titles[view] || ["", ""])[0];
  $("#view-sub").textContent = (titles[view] || ["", ""])[1];
  renderCurrent();
}

function renderCurrent() {
  if (state.view === "tablero") viewDashboard();
  else if (state.view === "registro") viewRegistro();
  else if (state.view === "consultar") viewConsultar();
  else if (state.view === "validacion") viewValidacion();
  else if (state.view === "facturacion") viewFacturacion();
  else if (state.view === "tarifas") viewTarifas();
  else if (state.view === "flota") viewFlota();
  else if (state.view === "admin") viewAdmin();
  else if (state.view === "permisos") viewPermisos();
}

/* ==================== OPCION 1: REGISTRO DE VIAJES ================ */
function clienteOptions() {
  return allowedClientes().map((c) => ({ value: c.ID_CLIENTE, label: `${c.CLIENTE} (${c.ID_CLIENTE})` }));
}
function unidadOptions(clienteId) {
  if (!clienteId) return [];
  return Store.find("unidades", (u) => u.ID_CLIENTE === clienteId)
    .map((u) => ({ value: u.UNIDAD, label: `${u.UNIDAD} · ${u.TC} · ${u.PILOTO}` }));
}
function rutaOptions(clienteId) {
  if (!clienteId) return [];
  return Store.find("rutas", (r) => r.ID_CLIENTE === clienteId)
    .map((r) => ({ value: r.ID_RUTA, label: `${r.ORIGEN} → ${r.DESTINO} (${r.KM} km)` }));
}
function pilotoOptions() {
  return Store.all("pilotos").map((p) => ({ value: p.PILOTO, label: p.PILOTO }));
}
function proveedorOptions() {
  return Store.all("proveedores").map((p) => ({ value: p.OPL, label: `${p.OPL} · ${p.PROVEEDOR}` }));
}

/* ----------------- Tarifas y ajuste de combustible ---------------- */
function resolveRutaId() {
  if (state.form.RUTA) return state.form.RUTA;
  const r = Store.find("rutas", (x) => x.ID_CLIENTE === state.form["ID-CLIENTE"] && x.ORIGEN === state.form.ORIGEN && x.DESTINO === state.form.DESTINO)[0];
  return r ? r.ID_RUTA : "";
}
function tarifaFor(rutaId, opl) {
  if (!rutaId || !opl) return null;
  const t = Store.find("tarifas", (x) => x.ID_RUTA === rutaId && x.OPL === opl)[0];
  if (!t) return null;
  // Solo se usan tarifas activas (sin estatus se considera activa)
  return (!t.ESTATUS || t.ESTATUS === "Activo") ? t : null;
}
/* Precio del diesel del MEM para una fecha (tabla mem).
 * Usa la fecha exacta; si no existe, toma el mas reciente anterior. */
function memPrecioParaFecha(fecha) {
  if (!fecha) return null;
  const rows = Store.all("mem").filter((r) => r.FECHA && r.PRECIO_DIESEL !== "" && r.PRECIO_DIESEL != null);
  const exact = rows.find((r) => r.FECHA === fecha);
  if (exact) return { valor: Number(exact.PRECIO_DIESEL), fecha: exact.FECHA, aprox: false };
  const prev = rows.filter((r) => r.FECHA <= fecha).sort((a, b) => b.FECHA.localeCompare(a.FECHA))[0];
  if (prev) return { valor: Number(prev.PRECIO_DIESEL), fecha: prev.FECHA, aprox: true };
  return null;
}
/* Factor = ((costoDiesel - Q pactado) / Q pactado) * (% combustible / 100) */
function factorCombustible(tarifa, precioDiesel) {
  const qp = Number(tarifa.Q_DIESEL_PACTADO || 0);
  if (!qp) return 0;
  return ((Number(precioDiesel) - qp) / qp) * (Number(tarifa.COMBUSTIBLE_PCT || 0) / 100);
}
/* Ajuste = factor * tarifa. Si es negativo, se deja en 0. */
function calcAjuste(tarifa, tarifaBase, precioDiesel) {
  if (!tarifa || !tarifaBase) return 0;
  const monto = factorCombustible(tarifa, precioDiesel) * Number(tarifaBase);
  return monto > 0 ? Math.round(monto * 100) / 100 : 0;
}
/* Valores de tarifa/ajuste que se cargan automaticamente al viaje.
 * El precio del diesel se toma del MEM de la FECHA_PLAN del viaje. */
function tarifaCargada() {
  const t = tarifaFor(resolveRutaId(), state.form.OPL);
  if (!t) return null;
  const memInfo = memPrecioParaFecha(state.form.FECHA_PLAN);
  const precio = memInfo ? memInfo.valor : 0;
  return {
    TARIFA_CLIENTE: num(t.TARIFA_CLIENTE),
    TARIFA_OPL: num(t.TARIFA_OPL),
    Q_DIESEL_PACTADO: num(t.Q_DIESEL_PACTADO),
    COMBUSTIBLE_PCT: num(t.COMBUSTIBLE_PCT),
    PRECIO_MEM: memInfo ? precio : "",
    AJUSTE_COMBUSTIBLE: calcAjuste(t, t.TARIFA_CLIENTE, precio),
    AJUSTE_COMBUSTIBLE_OPL: calcAjuste(t, t.TARIFA_OPL, precio),
  };
}
/* Panel informativo (solo roles con acceso a tarifas) para el alta. */
function tarifaInfoHTML() {
  if (!canSeeTarifas()) return "";
  const t = tarifaFor(resolveRutaId(), state.form.OPL);
  if (!t) return `<div class="alert alert-info">Selecciona ruta y OPL para cargar la tarifa y calcular el ajuste de combustible.</div>`;
  const fecha = state.form.FECHA_PLAN;
  const memInfo = memPrecioParaFecha(fecha);
  const precio = memInfo ? memInfo.valor : 0;
  const ajC = calcAjuste(t, t.TARIFA_CLIENTE, precio);
  const ajO = calcAjuste(t, t.TARIFA_OPL, precio);
  const aviso = !memInfo
    ? `<div class="alert alert-warn">No hay precio MEM para la fecha de plan (${esc(fecha || "sin fecha")}). Carga la tabla MEM o el ajuste sera 0.</div>`
    : (memInfo.aprox ? ` <span class="muted small">(usando el MEM del ${esc(memInfo.fecha)}, mas cercano)</span>` : "");
  return `<div class="alert alert-info">
    <b>Tarifa cargada automaticamente.</b>${aviso}<br>
    Tarifa cliente: <b>$${Number(t.TARIFA_CLIENTE).toLocaleString("en-US")}</b> ·
    Tarifa OPL: <b>$${Number(t.TARIFA_OPL).toLocaleString("en-US")}</b> ·
    % combustible: <b>${esc(t.COMBUSTIBLE_PCT)}%</b> ·
    Q diesel pactado: <b>${esc(t.Q_DIESEL_PACTADO)}</b> ·
    MEM (fecha plan ${esc(fecha || "-")}): <b>${memInfo ? esc(precio) : "-"}</b><br>
    Ajuste combustible (cliente): <b>$${ajC.toLocaleString("en-US")}</b> ·
    Ajuste combustible (OPL): <b>$${ajO.toLocaleString("en-US")}</b>
  </div>`;
}

/* --------------------- Tabla MEM (carga manual) ------------------- */
function toISODate(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  return "";
}
/* Lee el archivo del MEM y devuelve filas {FECHA, PRECIO_DIESEL} usando
 * la columna "Aceite Combustible Diésel". */
function parseMemTable(data, tipo) {
  if (!hasXLSX()) throw new Error("No se cargo el lector XLSX.");
  const wb = XLSX.read(data, { type: tipo || "array" });
  const wanted = /aceite\s*combustible\s*di[eé]sel/i;
  for (const name of wb.SheetNames) {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });
    let hdrR = -1, hdrC = -1;
    for (let r = 0; r < aoa.length && hdrR < 0; r++) {
      const row = aoa[r] || [];
      for (let c = 0; c < row.length; c++) {
        if (typeof row[c] === "string" && wanted.test(row[c])) { hdrR = r; hdrC = c; break; }
      }
    }
    if (hdrR < 0) continue;
    const rows = [];
    for (let r = hdrR + 1; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const raw = row[hdrC];
      const val = Number(typeof raw === "string" ? raw.replace(/[^0-9.]/g, "") : raw);
      if (raw === null || raw === "" || isNaN(val) || val <= 0) continue;
      let fecha = "";
      for (let c = 0; c < row.length; c++) { if (c === hdrC) continue; const d = toISODate(row[c]); if (d) { fecha = d; break; } }
      if (!fecha) continue;
      rows.push({ FECHA: fecha, PRECIO_DIESEL: Math.round(val * 100) / 100 });
    }
    if (rows.length) return rows;
  }
  throw new Error('No se encontro la columna "Aceite Combustible Diésel".');
}
function cargarTablaMem(file) {
  if (!file) return;
  const isCSV = /\.csv$/i.test(file.name);
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseMemTable(reader.result, isCSV ? "string" : "array");
      if (!confirm(`Se cargara la tabla MEM con ${rows.length} renglones (reemplaza la actual). ¿Continuar?`)) return;
      Store.db.mem = rows.sort((a, b) => a.FECHA.localeCompare(b.FECHA));
      Store.persist();
      Store.push("mem").catch(() => {});
      addBitacora("Cargar tabla MEM (" + rows.length + ")");
      toast("Tabla MEM cargada: " + rows.length + " renglones", "ok");
      renderCurrent();
    } catch (e) { toast("Error al leer el MEM: " + e.message, "err"); }
  };
  if (isCSV) reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

const REG_GROUPS = [
  { title: "Identificacion del viaje", cols: 3, fields: [
    { key: "ID_VIAJE", label: "ID Viaje", type: "readonly" },
    { key: "CODIGO_VIAJE", label: "Codigo de Viaje", type: "readonly" },
    { key: "No. TRANSPORTE", label: "No. Transporte", type: "text" },
    { key: "STATUS", label: "Status", type: "select", options: () => statusOptionsForForm().map((v) => ({ value: v, label: v })) },
    { key: "OPL", label: "OPL (Proveedor)", type: "select", options: proveedorOptions },
    { key: "FECHA_PLAN", label: "Fecha Plan", type: "date", required: true },
    { key: "FECHA_FIN", label: "Fecha Fin", type: "date" },
  ] },
  { title: "Cliente", cols: 3, fields: [
    { key: "ID-CLIENTE", label: "Cliente", type: "select", required: true, options: clienteOptions },
    { key: "CLIENTE", label: "Nombre Cliente", type: "readonly" },
    { key: "CLIENTE_PADRE", label: "Cliente Padre", type: "readonly" },
  ] },
  { title: "Unidad y piloto", cols: 3, fields: [
    { key: "UNIDAD", label: "Unidad", type: "select", required: true, options: () => unidadOptions(state.form["ID-CLIENTE"]) },
    { key: "TC", label: "TC", type: "readonly" },
    { key: "PILOTO", label: "Piloto", type: "select", required: true, options: pilotoOptions },
    { key: "CAPACIDAD_CARGA", label: "Capacidad de Carga (kg)", type: "readonly" },
    { key: "TIPO_DE_CARGA", label: "Tipo de Carga", type: "readonly" },
  ] },
  { title: "Ruta", cols: 3, fields: [
    { key: "RUTA", label: "Ruta asignada al cliente", type: "select", helper: true, options: () => rutaOptions(state.form["ID-CLIENTE"]) },
    { key: "ORIGEN", label: "Origen", type: "readonly", required: true },
    { key: "DESTINO", label: "Destino", type: "readonly", required: true },
    { key: "TIPO_RUTA", label: "Tipo de Ruta", type: "readonly" },
    { key: "KM", label: "KM", type: "number", required: true },
  ] },
  { title: "Carga y viaticos", cols: 3, fields: [
    { key: "CARGA_VIAJE", label: "Carga del Viaje (kg)", type: "number" },
    { key: "Viáticos", label: "Viaticos", type: "number", hint: "Sugerido a partir de los KM (editable)" },
    { key: "OBSERVACIONES", label: "Observaciones", type: "textarea" },
  ] },
];

function ensureDraft() {
  const empty = { RUTA: "" };
  VIAJES_COLUMNS.forEach((k) => (empty[k] = ""));
  state.form = Object.assign(empty, state.form);
  if (!state.form.FECHA_PLAN) state.form.FECHA_PLAN = today();
  if (!state.form.STATUS) state.form.STATUS = STATUS_PLANIFICADO;

  const cl = allowedClientes();
  if (!state.form["ID-CLIENTE"] && cl.length === 1) {
    state.form["ID-CLIENTE"] = cl[0].ID_CLIENTE;
    applyAutofill("ID-CLIENTE");
  }
  if (!state.form.ID_VIAJE) {
    state.form.ID_VIAJE = Store.nextId("viajes", "ID_VIAJE", "V-", 5);
  }
  if (!state.form.CODIGO_VIAJE && state.form["ID-CLIENTE"]) {
    state.form.CODIGO_VIAJE = genCodigo(state.form["ID-CLIENTE"]);
  }
}

function genCodigo(clienteId) {
  const d = (state.form.FECHA_PLAN || today()).replace(/-/g, "");
  const n = Store.all("viajes").filter((v) => v["ID-CLIENTE"] === clienteId).length + 1;
  return `${clienteId.replace(/-/g, "")}-${d}-${String(n).padStart(3, "0")}`;
}

function applyAutofill(changed) {
  const v = state.form;
  if (changed === "ID-CLIENTE") {
    const c = Store.find("clientes", (x) => x.ID_CLIENTE === v["ID-CLIENTE"])[0];
    v.CLIENTE = c ? c.CLIENTE : "";
    v.CLIENTE_PADRE = c ? c.CLIENTE_PADRE : "";
    ["UNIDAD", "TC", "PILOTO", "CAPACIDAD_CARGA", "TIPO_DE_CARGA", "RUTA", "ORIGEN", "DESTINO", "TIPO_RUTA", "KM"].forEach((k) => (v[k] = ""));
    v.CODIGO_VIAJE = v["ID-CLIENTE"] ? genCodigo(v["ID-CLIENTE"]) : "";
  }
  if (changed === "UNIDAD") {
    const u = Store.find("unidades", (x) => x.UNIDAD === v.UNIDAD)[0];
    if (u) {
      v.TC = u.TC; v.PILOTO = u.PILOTO;
      v.CAPACIDAD_CARGA = u.CAPACIDAD_CARGA; v.TIPO_DE_CARGA = u.TIPO_DE_CARGA;
      v.OPL = u.OPL || v.OPL;
    }
  }
  if (changed === "RUTA") {
    const r = Store.find("rutas", (x) => x.ID_RUTA === v.RUTA)[0];
    if (r) {
      v.ORIGEN = r.ORIGEN; v.DESTINO = r.DESTINO;
      v.KM = r.KM; v.TIPO_RUTA = r.TIPO_RUTA;
      v["Viáticos"] = sugViaticos(r.KM);
    }
  }
  if (changed === "KM" && v.KM !== "") v["Viáticos"] = sugViaticos(v.KM);
  if (changed === "FECHA_PLAN" && v["ID-CLIENTE"]) v.CODIGO_VIAJE = genCodigo(v["ID-CLIENTE"]);
}

function fieldHTML(f) {
  const val = state.form[f.key] == null ? "" : state.form[f.key];
  const req = f.required ? ' required' : "";
  let control = "";
  if (f.type === "select") {
    const opts = (f.options ? f.options() : []) || [];
    const ro = !opts.length && state.form[f.key] === "" ? "" : "";
    control = `<select data-key="${esc(f.key)}"${req}>
      <option value="">-- Seleccionar --</option>
      ${opts.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(val) ? "selected" : ""}>${esc(o.label)}</option>`).join("")}
    </select>`;
  } else if (f.type === "readonly") {
    control = `<input type="text" data-key="${esc(f.key)}" value="${esc(val)}" readonly />`;
  } else if (f.type === "textarea") {
    control = `<textarea data-key="${esc(f.key)}">${esc(val)}</textarea>`;
  } else {
    control = `<input type="${f.type}" data-key="${esc(f.key)}" value="${esc(val)}" />`;
  }
  const hint = f.hint ? `<span class="muted small">${esc(f.hint)}</span>` : "";
  return `<label class="field"><span>${esc(f.label)}${f.required ? " *" : ""}</span>${control}${hint}</label>`;
}

function viewRegistro() {
  ensureDraft();
  const groups = REG_GROUPS.map((g) =>
    `<div class="grid grid-${g.cols}">
      <div class="field-group-title">${esc(g.title)}</div>
      ${g.fields.map(fieldHTML).join("")}
    </div>`
  ).join("");

  const cli = state.form["ID-CLIENTE"];
  const cap = Number(state.form.CAPACIDAD_CARGA || 0);
  const carga = Number(state.form.CARGA_VIAJE || 0);
  const warn = cap && carga > cap
    ? `<div class="alert alert-warn">La carga (${carga}) supera la capacidad de la unidad (${cap}). Verifica antes de guardar.</div>` : "";

  $("#content").innerHTML = `
    <div class="card">
      <div class="card-head">
        <div>
          <h3>${state.editId ? "Ajustar viaje " + esc(state.editId) : "Datos del viaje"}</h3>
          <p class="muted small">Los campos grises se llenan automaticamente.</p>
        </div>
        <div>
          ${state.editId ? `<button class="btn" id="btn-cancel-edit">Cancelar edicion</button>` : `<button class="btn" id="btn-reset-viaje">Limpiar</button>`}
          <button class="btn btn-primary" id="btn-save-viaje">${state.editId ? "Guardar cambios" : "Guardar viaje"}</button>
        </div>
      </div>
      ${state.editId ? `<div class="alert alert-info">Editando un viaje existente. Puedes modificar los campos y guardar los cambios.</div>` : ""}
      ${groups}
      ${tarifaInfoHTML()}
      ${warn}
      <div id="form-msg"></div>
    </div>`;
}

/* Carga un viaje existente en el formulario para ajustarlo.
 * Regla: un viaje Terminado solo puede modificarlo un administrador. */
function startEdit(id) {
  const v = Store.all("viajes").find((x) => x.ID_VIAJE === id);
  if (!v) return;
  if (!canEditViaje(v)) {
    if (v.ELIMINADO === "Si") toast("El viaje esta eliminado.", "err");
    else if (!can("viajes_editar")) toast("Tu perfil no puede ajustar viajes.", "err");
    else toast(`Este viaje esta "${v.STATUS}" (bloqueado). Solo un administrador puede modificarlo.`, "err");
    return;
  }
  if (STATUS_BLOQUEADOS.includes(v.STATUS)) toast("Viaje en validacion/facturacion: seras registrado como quien lo ajusta.", "");
  state.editId = id;
  state.form = Object.assign({ RUTA: "" }, clone(v));
  const r = Store.find("rutas", (x) => x.ID_CLIENTE === v["ID-CLIENTE"] && x.ORIGEN === v.ORIGEN && x.DESTINO === v.DESTINO)[0];
  if (r) state.form.RUTA = r.ID_RUTA;
  route("registro");
}

function saveViaje() {
  const v = state.form;
  const errs = [];
  if (!v["ID-CLIENTE"]) errs.push("Selecciona un cliente");
  if (!v.UNIDAD) errs.push("Selecciona una unidad");
  if (!v.PILOTO) errs.push("Selecciona un piloto");
  if (!v.ORIGEN || !v.DESTINO) errs.push("Selecciona una ruta (origen/destino)");
  if (!v.FECHA_PLAN) errs.push("Indica la Fecha Plan");
  if (v.KM === "" || isNaN(v.KM)) errs.push("Indica los KM");
  if (errs.length) { toast(errs.join(" · "), "err"); return; }

  if (v.CAPACIDAD_CARGA && Number(v.CARGA_VIAJE) > Number(v.CAPACIDAD_CARGA)) {
    if (!confirm(`La carga (${v.CARGA_VIAJE}) supera la capacidad (${v.CAPACIDAD_CARGA}). ¿Guardar de todas formas?`)) return;
  }

  const row = {};
  VIAJES_COLUMNS.forEach((k) => (row[k] = v[k] == null ? "" : v[k]));
  row.ID_VIAJE = v.ID_VIAJE || Store.nextId("viajes", "ID_VIAJE", "V-", 5);
  row.CODIGO_VIAJE = v.CODIGO_VIAJE || genCodigo(v["ID-CLIENTE"]);
  ["CARGA_VIAJE", "CAPACIDAD_CARGA", "KM", "Viáticos"].forEach((k) => (row[k] = num(row[k])));

  // Carga automatica de tarifa y ajuste de combustible (ruta + OPL)
  const tp = tarifaCargada();
  if (tp) Object.assign(row, tp);

  if (state.editId) {
    const prev = Store.all("viajes").find((x) => x.ID_VIAJE === state.editId);
    if (prev && !canEditViaje(prev)) {
      toast(`No puedes modificar un viaje en estatus ${prev.STATUS}.`, "err");
      return;
    }
    // Un viaje Rechazado, al corregirlo, vuelve a validacion (Liquidado)
    if (prev && prev.STATUS === STATUS_RECHAZADO) {
      if (state.user.ROL !== "admin") row.STATUS = STATUS_LIQUIDADO;
      if (row.STATUS !== STATUS_RECHAZADO) row.COMENTARIO_VALIDACION = "";
    }
    Store.update("viajes", (r) => r.ID_VIAJE === state.editId, row);
    toast(`Viaje ${state.editId} actualizado`, "ok");
  } else {
    VIAJES_WORKFLOW_COLUMNS.forEach((k) => { if (row[k] === undefined) row[k] = ""; });
    VIAJES_TARIFA_COLUMNS.forEach((k) => { if (row[k] === undefined) row[k] = ""; });
    if (!row.ELIMINADO) row.ELIMINADO = "No";
    Store.insert("viajes", row);
    toast(`Viaje ${row.ID_VIAJE} registrado correctamente`, "ok");
  }
  resetForm();
  afterForm();
}

function resetForm() { state.form = {}; state.editId = null; }
/* Tras guardar/cancelar el formulario: si el usuario no tiene menu de
 * registro (p.ej. Gerente Transporte que solo edita), vuelve a Consultar. */
function afterForm() {
  if (state.view === "registro" && !can("viajes_crear")) route("consultar");
  else renderCurrent();
}

/* ==================== OPCION 2: CONSULTAR VIAJES ================== */
function statusBadge(s) {
  const map = {
    "Planificado": "blue", "En transito": "amber", "Completado": "blue", "Liquidado": "amber",
    "Aprobado": "green", "Facturado": "green", "Rechazado": "red",
  };
  return `<span class="badge ${map[s] || "gray"}">${esc(s || "-")}</span>`;
}

/* Base de viajes que el usuario puede ver (alcance por permisos).
 * - viajes_scope_facturado: solo Aprobado/Facturado
 * - viajes_ver_todos: todos los clientes; si no, solo los asignados
 * - oculta eliminados salvo que se pidan explicitamente. */
function viajesVisibles(incluirEliminados) {
  let rows = Store.all("viajes");
  if (!incluirEliminados) rows = rows.filter((v) => v.ELIMINADO !== "Si");
  if (can("viajes_ver_todos")) {
    // Ve todo (admin y quien tenga el permiso): sin filtro de cliente ni estado.
  } else if (can("viajes_scope_facturado")) {
    rows = rows.filter((v) => [STATUS_APROBADO, STATUS_FACTURADO].includes(v.STATUS));
  } else {
    const ids = allowedClientes().map((c) => c.ID_CLIENTE);
    rows = rows.filter((v) => ids.includes(v["ID-CLIENTE"]));
  }
  return rows;
}

function filteredViajes() {
  const f = state.consulta;
  return viajesVisibles(state.consultarEliminados).filter((v) => {
    if (state.consultarEliminados && v.ELIMINADO !== "Si") return false;
    if (f.cliente && v["ID-CLIENTE"] !== f.cliente) return false;
    if (f.status && v.STATUS !== f.status) return false;
    if (f.desde && String(v.FECHA_PLAN || "") < f.desde) return false;
    if (f.hasta && String(v.FECHA_PLAN || "") > f.hasta) return false;
    if (f.texto) {
      const hay = [v.ID_VIAJE, v.CODIGO_VIAJE, v.PILOTO, v.UNIDAD, v.ORIGEN, v.DESTINO, v.CLIENTE, v["No. TRANSPORTE"], v.NUMERO_FACTURA].join(" ").toLowerCase();
      if (!hay.includes(f.texto.toLowerCase())) return false;
    }
    return true;
  });
}

function viewConsultar() {
  const rows = filteredViajes();
  const km = rows.reduce((a, r) => a + (Number(r.KM) || 0), 0);
  const carga = rows.reduce((a, r) => a + (Number(r.CARGA_VIAJE) || 0), 0);
  const viaticos = rows.reduce((a, r) => a + (Number(r["Viáticos"]) || 0), 0);
  const f = state.consulta;
  const cliOpts = clientesFiltro().map((c) => ({ value: c.ID_CLIENTE, label: c.CLIENTE }));
  const puedeEliminar = can("viajes_eliminar");

  $("#content").innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="muted small">Viajes</div><div class="n">${rows.length}</div></div>
      <div class="kpi"><div class="muted small">KM totales</div><div class="n">${km.toLocaleString("en-US")}</div></div>
      <div class="kpi"><div class="muted small">Carga total (kg)</div><div class="n">${carga.toLocaleString("en-US")}</div></div>
      <div class="kpi"><div class="muted small">Viaticos</div><div class="n">$${viaticos.toLocaleString("en-US")}</div></div>
    </div>

    <div class="card">
      <div class="card-head">
        <div><h3>${state.consultarEliminados ? "Viajes eliminados" : "Viajes registrados"}</h3><p class="muted small">Filtra y exporta a Excel/CSV.</p></div>
        <div>
          ${puedeEliminar ? `<button class="btn" id="btn-toggle-eliminados">${state.consultarEliminados ? "Ver activos" : "Ver eliminados"}</button>` : ""}
          <button class="btn btn-success" id="btn-export-viajes">Exportar a Excel (CSV)</button>
        </div>
      </div>

      <div class="toolbar">
        <label class="field"><span>Cliente</span>
          <select data-f="cliente"><option value="">Todos</option>
            ${cliOpts.map((o) => `<option value="${esc(o.value)}" ${f.cliente === o.value ? "selected" : ""}>${esc(o.label)}</option>`).join("")}
          </select></label>
        <label class="field"><span>Status</span>
          <select data-f="status"><option value="">Todos</option>
            ${STATUS_LIST.map((s) => `<option value="${esc(s)}" ${f.status === s ? "selected" : ""}>${esc(s)}</option>`).join("")}
          </select></label>
        <label class="field"><span>Fecha desde</span><input type="date" data-f="desde" value="${esc(f.desde)}" /></label>
        <label class="field"><span>Fecha hasta</span><input type="date" data-f="hasta" value="${esc(f.hasta)}" /></label>
        <label class="field" style="min-width:200px"><span>Buscar</span><input type="text" data-f="texto" placeholder="ID, codigo, piloto, ruta..." value="${esc(f.texto)}" /></label>
        <button class="btn" id="btn-clear-filtros">Limpiar</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>ID Viaje</th><th>Codigo</th><th>Cliente</th><th>Unidad</th><th>Piloto</th>
            <th>Ruta</th><th>Status</th><th>Fecha Plan</th><th>KM</th><th>Carga</th><th>Viaticos</th><th>Factura / Comentario</th><th></th>
          </tr></thead>
          <tbody>
            ${rows.length ? rows.map((r) => `
              <tr>
                <td class="strong">${esc(r.ID_VIAJE)}</td>
                <td>${esc(r.CODIGO_VIAJE)}</td>
                <td>${esc(r.CLIENTE)}</td>
                <td>${esc(r.UNIDAD)}</td>
                <td>${esc(r.PILOTO)}</td>
                <td>${esc(r.ORIGEN)} → ${esc(r.DESTINO)}</td>
                <td>${statusBadge(r.STATUS)}</td>
                <td>${esc(r.FECHA_PLAN)}</td>
                <td>${esc(r.KM)}</td>
                <td>${esc(r.CARGA_VIAJE)}</td>
                <td>${esc(r["Viáticos"])}</td>
                <td class="wrap">${r.NUMERO_FACTURA ? "Factura " + esc(r.NUMERO_FACTURA) : (r.COMENTARIO_VALIDACION ? esc(r.COMENTARIO_VALIDACION) : "")}</td>
                <td>
                  <button class="btn btn-sm" data-ver="${esc(r.ID_VIAJE)}">Ver</button>
                  ${canEditViaje(r) ? `<button class="btn btn-sm btn-primary" data-edit="${esc(r.ID_VIAJE)}">Editar</button>` : ""}
                  ${puedeEliminar && r.ELIMINADO !== "Si" ? `<button class="btn btn-sm btn-danger" data-del-viaje="${esc(r.ID_VIAJE)}">Eliminar</button>` : ""}
                </td>
              </tr>`).join("") : `<tr><td colspan="13" class="muted" style="text-align:center;padding:24px">Sin viajes para los filtros seleccionados.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}

function eliminarViaje(id) {
  const v = Store.all("viajes").find((x) => x.ID_VIAJE === id);
  if (!v) return;
  if (!can("viajes_eliminar")) { toast("Tu perfil no puede eliminar viajes.", "err"); return; }
  if (!confirm(`¿Eliminar el viaje ${id}? Se conserva un registro de auditoria (no se borra fisicamente).`)) return;
  Store.update("viajes", (r) => r.ID_VIAJE === id, { ELIMINADO: "Si", ELIMINADO_POR: state.user.USUARIO, FECHA_ELIMINACION: nowStr() });
  addBitacora("Eliminar viaje " + id);
  toast(`Viaje ${id} eliminado (registro conservado)`, "ok");
  renderCurrent();
}

function verViaje(id) {
  const r = Store.all("viajes").find((v) => v.ID_VIAJE === id);
  if (!r) return;
  openModal(`
    <h3>Detalle del viaje ${esc(r.ID_VIAJE)}</h3>
    <div class="table-wrap"><table>
      <tbody>
        ${visibleViajeColumns().map((k) => `<tr><th style="position:static;width:180px">${esc(k)}</th><td class="wrap">${esc(r[k])}</td></tr>`).join("")}
      </tbody>
    </table></div>
    <div class="modal-actions"><button class="btn btn-primary" onclick="closeModal()">Cerrar</button></div>`);
}

/* ================== SECCION: VALIDACION (validador) ============== */
function clientesFiltro() {
  if (state.user.ROL === "admin" || can("viajes_ver_todos") || can("viajes_scope_facturado")) return Store.all("clientes");
  return allowedClientes();
}

function viewValidacion() {
  const f = state.validacion;
  const all = viajesVisibles();
  const pend = all.filter((v) => v.STATUS === STATUS_LIQUIDADO).length;
  const aprob = all.filter((v) => v.STATUS === STATUS_APROBADO).length;
  const rech = all.filter((v) => v.STATUS === STATUS_RECHAZADO).length;

  const rows = all.filter((v) => {
    if (f.status) { if (v.STATUS !== f.status) return false; }
    else if (v.STATUS !== STATUS_LIQUIDADO) return false;
    if (f.cliente && v["ID-CLIENTE"] !== f.cliente) return false;
    if (f.texto) {
      const hay = [v.ID_VIAJE, v.CODIGO_VIAJE, v.PILOTO, v.UNIDAD, v.CLIENTE, v["No. TRANSPORTE"], v.COMENTARIO_VALIDACION].join(" ").toLowerCase();
      if (!hay.includes(f.texto.toLowerCase())) return false;
    }
    return true;
  });

  $("#content").innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="muted small">Por validar (Liquidado)</div><div class="n">${pend}</div></div>
      <div class="kpi"><div class="muted small">Aprobados</div><div class="n">${aprob}</div></div>
      <div class="kpi"><div class="muted small">Rechazados</div><div class="n">${rech}</div></div>
    </div>
    <div class="card">
      <div class="card-head"><div><h3>Validacion de viajes liquidados</h3>
        <p class="muted small">Aprueba o rechaza enviando tus comentarios. Los rechazados regresan al operativo.</p></div></div>
      <div class="toolbar">
        <label class="field"><span>Cliente</span><select data-vf="cliente"><option value="">Todos</option>
          ${clientesFiltro().map((c) => `<option value="${esc(c.ID_CLIENTE)}" ${f.cliente === c.ID_CLIENTE ? "selected" : ""}>${esc(c.CLIENTE)}</option>`).join("")}</select></label>
        <label class="field"><span>Mostrar</span><select data-vf="status">
          <option value="" ${f.status === "" ? "selected" : ""}>Por validar (Liquidado)</option>
          ${[STATUS_LIQUIDADO, STATUS_APROBADO, STATUS_RECHAZADO].map((s) => `<option value="${esc(s)}" ${f.status === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
        <label class="field" style="min-width:220px"><span>Buscar</span><input type="text" data-vf="texto" value="${esc(f.texto)}" /></label>
        <button class="btn" id="btn-clear-validacion">Limpiar</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>ID Viaje</th><th>Codigo</th><th>Cliente</th><th>Unidad</th><th>Piloto</th><th>Ruta</th><th>Fecha Plan</th><th>KM</th><th>Status</th><th>Comentario</th><th>Acciones</th></tr></thead>
        <tbody>
          ${rows.length ? rows.map((r) => {
            let acts = `<button class="btn btn-sm" data-ver="${esc(r.ID_VIAJE)}">Ver</button>`;
            if (can("viajes_validar") && r.STATUS === STATUS_LIQUIDADO) {
              acts += ` <button class="btn btn-sm btn-success" data-aprobar="${esc(r.ID_VIAJE)}">Aprobar</button>`;
              acts += ` <button class="btn btn-sm btn-danger" data-rechazar="${esc(r.ID_VIAJE)}">Rechazar</button>`;
            }
            return `<tr>
              <td class="strong">${esc(r.ID_VIAJE)}</td><td>${esc(r.CODIGO_VIAJE)}</td><td>${esc(r.CLIENTE)}</td>
              <td>${esc(r.UNIDAD)}</td><td>${esc(r.PILOTO)}</td><td>${esc(r.ORIGEN)} → ${esc(r.DESTINO)}</td>
              <td>${esc(r.FECHA_PLAN)}</td><td>${esc(r.KM)}</td><td>${statusBadge(r.STATUS)}</td>
              <td class="wrap">${esc(r.COMENTARIO_VALIDACION)}</td><td>${acts}</td></tr>`;
          }).join("") : `<tr><td colspan="11" class="muted" style="text-align:center;padding:24px">No hay viajes para validar.</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
}

/* ================== SECCION: FACTURACION (facturador) ============ */
function viewFacturacion() {
  const f = state.facturacion;
  const all = viajesVisibles();
  const porFacturar = all.filter((v) => v.STATUS === STATUS_APROBADO);
  const facturados = all.filter((v) => v.STATUS === STATUS_FACTURADO);

  const rows = all.filter((v) => {
    if (f.cliente && v["ID-CLIENTE"] !== f.cliente) return false;
    if (f.texto) {
      const hay = [v.ID_VIAJE, v.CODIGO_VIAJE, v.PILOTO, v.UNIDAD, v.CLIENTE, v.NUMERO_FACTURA].join(" ").toLowerCase();
      if (!hay.includes(f.texto.toLowerCase())) return false;
    }
    return true;
  });

  $("#content").innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="muted small">Aprobados por facturar</div><div class="n">${porFacturar.length}</div></div>
      <div class="kpi"><div class="muted small">Facturados</div><div class="n">${facturados.length}</div></div>
    </div>
    <div class="card">
      <div class="card-head"><div><h3>Facturacion de viajes aprobados</h3>
        <p class="muted small">Asigna el numero de factura a los viajes aprobados por el validador.</p></div></div>
      <div class="toolbar">
        <label class="field"><span>Cliente</span><select data-fc="cliente"><option value="">Todos</option>
          ${clientesFiltro().map((c) => `<option value="${esc(c.ID_CLIENTE)}" ${f.cliente === c.ID_CLIENTE ? "selected" : ""}>${esc(c.CLIENTE)}</option>`).join("")}</select></label>
        <label class="field" style="min-width:220px"><span>Buscar</span><input type="text" data-fc="texto" value="${esc(f.texto)}" /></label>
        <button class="btn" id="btn-clear-facturacion">Limpiar</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>ID Viaje</th><th>Codigo</th><th>Cliente</th><th>Unidad</th><th>Piloto</th><th>Ruta</th><th>KM</th><th>Status</th><th>Factura</th><th>Acciones</th></tr></thead>
        <tbody>
          ${rows.length ? rows.map((r) => {
            let acts = `<button class="btn btn-sm" data-ver="${esc(r.ID_VIAJE)}">Ver</button>`;
            if (can("viajes_facturar") && r.STATUS === STATUS_APROBADO) acts += ` <button class="btn btn-sm btn-primary" data-facturar="${esc(r.ID_VIAJE)}">Asignar factura</button>`;
            return `<tr>
              <td class="strong">${esc(r.ID_VIAJE)}</td><td>${esc(r.CODIGO_VIAJE)}</td><td>${esc(r.CLIENTE)}</td>
              <td>${esc(r.UNIDAD)}</td><td>${esc(r.PILOTO)}</td><td>${esc(r.ORIGEN)} → ${esc(r.DESTINO)}</td><td>${esc(r.KM)}</td>
              <td>${statusBadge(r.STATUS)}</td>
              <td class="wrap">${r.NUMERO_FACTURA ? esc(r.NUMERO_FACTURA) + (r.FECHA_FACTURA ? " (" + esc(r.FECHA_FACTURA) + ")" : "") : ""}</td>
              <td>${acts}</td></tr>`;
          }).join("") : `<tr><td colspan="10" class="muted" style="text-align:center;padding:24px">No hay viajes para facturar.</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
}

function aprobarViaje(id) {
  const v = Store.all("viajes").find((x) => x.ID_VIAJE === id);
  if (!v) return;
  if (!can("viajes_validar") || v.STATUS !== STATUS_LIQUIDADO) { toast("No puedes validar este viaje.", "err"); return; }
  openModal(`
    <h3>Aprobar viaje ${esc(id)}</h3>
    <p class="muted small">Comentario del validador (opcional).</p>
    <label class="field"><span>Comentario</span><textarea id="comentario-val"></textarea></label>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-success" id="btn-confirm-aprobar">Aprobar</button>
    </div>`);
  $("#btn-confirm-aprobar").onclick = () => {
    const c = $("#comentario-val").value.trim();
    Store.update("viajes", (r) => r.ID_VIAJE === id, { STATUS: STATUS_APROBADO, COMENTARIO_VALIDACION: c, REVISADO_POR: state.user.USUARIO, FECHA_REVISION: nowStr() });
    addBitacora("Aprobar " + id + (c ? " - " + c : ""));
    toast(`Viaje ${id} aprobado`, "ok");
    closeModal();
    renderCurrent();
  };
}

function openRechazarModal(id) {
  const v = Store.all("viajes").find((x) => x.ID_VIAJE === id);
  if (!v) return;
  if (!can("viajes_validar") || v.STATUS !== STATUS_LIQUIDADO) { toast("No puedes rechazar este viaje.", "err"); return; }
  openModal(`
    <h3>Rechazar viaje ${esc(id)}</h3>
    <p class="muted small">El viaje regresara al usuario operativo para que lo corrija.</p>
    <label class="field"><span>Comentario / motivo del rechazo *</span><textarea id="motivo-rechazo" placeholder="Describe que debe corregirse"></textarea></label>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-danger" id="btn-confirm-rechazar">Rechazar</button>
    </div>`);
  $("#btn-confirm-rechazar").onclick = () => {
    const m = $("#motivo-rechazo").value.trim();
    if (!m) { toast("Indica el motivo del rechazo.", "err"); return; }
    Store.update("viajes", (r) => r.ID_VIAJE === id, { STATUS: STATUS_RECHAZADO, COMENTARIO_VALIDACION: m, REVISADO_POR: state.user.USUARIO, FECHA_REVISION: nowStr() });
    addBitacora("Rechazar " + id + " - " + m);
    toast(`Viaje ${id} rechazado; regresa al operativo`, "ok");
    closeModal();
    renderCurrent();
  };
}

function openFacturarModal(id) {
  const v = Store.all("viajes").find((x) => x.ID_VIAJE === id);
  if (!v) return;
  if (!can("viajes_facturar") || v.STATUS !== STATUS_APROBADO) { toast("Solo se factura viajes aprobados por el validador.", "err"); return; }
  openModal(`
    <h3>Asignar factura al viaje ${esc(id)}</h3>
    <p class="muted small">El numero de factura es obligatorio.</p>
    <label class="field"><span>Numero de factura *</span><input type="text" id="num-factura" placeholder="ej. F-2026-0001" /></label>
    <label class="field"><span>Fecha de factura</span><input type="date" id="fecha-factura" value="${today()}" /></label>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-confirm-facturar">Facturar</button>
    </div>`);
  $("#btn-confirm-facturar").onclick = () => {
    const nf = $("#num-factura").value.trim();
    if (!nf) { toast("El numero de factura es obligatorio.", "err"); return; }
    Store.update("viajes", (r) => r.ID_VIAJE === id, { STATUS: STATUS_FACTURADO, NUMERO_FACTURA: nf, FECHA_FACTURA: $("#fecha-factura").value || today() });
    addBitacora("Facturar " + id + " (#" + nf + ")");
    toast(`Viaje ${id} facturado`, "ok");
    closeModal();
    renderCurrent();
  };
}

/* ---------------------- Exportacion CSV de viajes ----------------- */
function toCSV(rows, columns) {
  const q = (v) => {
    let s = v == null ? "" : String(v);
    // Evita inyeccion de formulas en Excel/Sheets (CWE-1236).
    if (/^[=+@\t\r]/.test(s) || (s.charAt(0) === "-" && isNaN(Number(s)))) s = "'" + s;
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => q(r[c])).join(","))].join("\r\n");
}
function download(filename, content, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ================ OPCION 3: ADMINISTRACION / CATALOGOS ============ */
const CATALOGS = {
  bitacora: { label: "Bitacora de accesos", table: "bitacora", readonly: true, pk: ["ID_BITACORA"], fields: [
    { key: "ID_BITACORA", label: "ID" }, { key: "USUARIO", label: "Usuario" },
    { key: "FECHA", label: "Fecha / Hora" }, { key: "ACCION", label: "Accion" },
    { key: "EQUIPO", label: "Equipo" },
  ] },
  clientes: { label: "Clientes", table: "clientes", pk: ["ID_CLIENTE"], fields: [
    { key: "ID_CLIENTE", label: "ID Cliente", type: "text", pk: true, required: true },
    { key: "CLIENTE", label: "Cliente", type: "text", required: true },
    { key: "CLIENTE_PADRE", label: "Cliente Padre", type: "text" },
    { key: "GRUPO_FLEETIO", label: "Grupo en Fleetio (sigla)", type: "text" },
    { key: "SERVICIO", label: "Servicio", type: "text" },
    { key: "NOMBRE_USUARIO_PRINCIPAL", label: "Usuario Principal", type: "text" },
    { key: "CORREO", label: "Correo", type: "text" },
    { key: "TELEFONO", label: "Telefono", type: "text" },
    { key: "LINK_CONTRATO", label: "Link de Contrato", type: "text" },
  ] },
  unidades: { label: "Unidades", table: "unidades", pk: ["UNIDAD"], fields: [
    { key: "UNIDAD", label: "Unidad", type: "text", pk: true, required: true },
    { key: "TC", label: "TC", type: "text" },
    { key: "PILOTO", label: "Piloto", type: "select", source: "pilotos:PILOTO" },
    { key: "CAPACIDAD_CARGA", label: "Capacidad (kg)", type: "number" },
    { key: "TIPO_DE_CARGA", label: "Tipo de Carga", type: "select", options: ["Carga seca", "Refrigerada", "Granel", "Peligrosa"] },
    { key: "ID_CLIENTE", label: "Cliente", type: "select", source: "clientes:ID_CLIENTE" },
    { key: "OPL", label: "OPL (Proveedor)", type: "select", source: "proveedores:OPL" },
    { key: "STATUS", label: "Status", type: "select", options: ["Activa", "Mantenimiento", "Inactiva"] },
  ] },
  pilotos: { label: "Pilotos", table: "pilotos", pk: ["PILOTO"], fields: [
    { key: "PILOTO", label: "Piloto", type: "text", pk: true, required: true },
    { key: "LICENCIA", label: "Licencia", type: "text" },
    { key: "TELEFONO", label: "Telefono", type: "text" },
  ] },
  proveedores: { label: "Proveedores (OPL)", table: "proveedores", pk: ["OPL"], fields: [
    { key: "OPL", label: "OPL", type: "text", pk: true, required: true },
    { key: "PROVEEDOR", label: "Proveedor", type: "text", required: true },
    { key: "NOMBRE_CONTACTO", label: "Nombre Contacto", type: "text" },
    { key: "CORREO", label: "Correo", type: "text" },
    { key: "TELEFONO", label: "Telefono", type: "text" },
  ] },
  tarifas: { label: "Tarifas", table: "tarifas", pk: ["ID_RUTA", "OPL"], fields: [
    { key: "ID_RUTA", label: "ID Ruta", type: "select", source: "rutas:ID_RUTA", pk: true, required: true },
    { key: "OPL", label: "OPL", type: "select", source: "proveedores:OPL", pk: true, required: true },
    { key: "TARIFA_CLIENTE", label: "Tarifa Cliente", type: "number" },
    { key: "TARIFA_OPL", label: "Tarifa OPL", type: "number" },
    { key: "COMBUSTIBLE_PCT", label: "% Combustible", type: "number" },
    { key: "Q_DIESEL_PACTADO", label: "Q Diesel Pactado", type: "number" },
    { key: "FECHA_CREACION", label: "Fecha Creacion", type: "date" },
    { key: "ESTATUS", label: "Estatus", type: "select", options: ["Activo", "Inactivo"] },
  ] },
  rutas: { label: "Rutas", table: "rutas", pk: ["ID_RUTA"], fields: [
    { key: "ID_RUTA", label: "ID Ruta", type: "text", pk: true, required: true },
    { key: "ORIGEN", label: "Origen", type: "text", required: true },
    { key: "DESTINO", label: "Destino", type: "text", required: true },
    { key: "KM", label: "KM", type: "number" },
    { key: "TIPO_RUTA", label: "Tipo Ruta", type: "select", options: ["Local", "Foranea", "Nacional"] },
    { key: "ID_CLIENTE", label: "Cliente", type: "select", source: "clientes:ID_CLIENTE" },
  ] },
  usuarios: { label: "Usuarios", table: "usuarios", pk: ["ID_USUARIO"], fields: [
    { key: "ID_USUARIO", label: "ID Usuario", type: "text", pk: true, required: true },
    { key: "USUARIO", label: "Usuario", type: "text", required: true },
    { key: "PASSWORD", label: "Contrasena", type: "text", required: true },
    { key: "NOMBRE", label: "Nombre", type: "text" },
    { key: "ROL", label: "Rol", type: "select", options: ROLES },
    { key: "ACTIVO", label: "Activo", type: "select", options: ["Si", "No"] },
  ] },
  usuario_cliente: { label: "Accesos (usuario-cliente)", table: "usuario_cliente", pk: ["ID_USUARIO", "ID_CLIENTE"], fields: [
    { key: "ID_USUARIO", label: "Usuario", type: "select", source: "usuarios:ID_USUARIO", pk: true, required: true },
    { key: "ID_CLIENTE", label: "Cliente", type: "select", source: "clientes:ID_CLIENTE", pk: true, required: true },
  ] },
};

/* ================== SECCION: FLOTA (Fleetio) ====================== */
function viewFlota() {
  if (!can("flota_ver")) {
    $("#content").innerHTML = `<div class="card"><div class="alert alert-error">Acceso restringido. Tu perfil no puede ver la flota.</div></div>`;
    return;
  }
  const tab = state.flotaTab || "unidades";
  const unidades = Store.all("unidades");
  const mants = Store.all("mantenimientos");
  const gastos = Store.all("gastos");
  const cliById = {};
  Store.all("clientes").forEach((c) => { cliById[c.ID_CLIENTE] = c.CLIENTE; });

  const totalMant = mants.reduce((a, m) => a + (Number(m.TOTAL) || 0), 0);
  const totalGastos = gastos.reduce((a, g) => a + (Number(g.MONTO) || 0), 0);
  const puedeSync = can("flota_sincronizar");
  const ultima = unidades.concat(mants, gastos).map((r) => r.FLOTA_ACTUALIZADO).filter(Boolean).sort().pop() || "";
  const money = (v) => "$" + (Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const tabs = [
    { id: "unidades", label: `Unidades (${unidades.length})` },
    { id: "mantenimientos", label: `Mantenimientos (${mants.length})` },
    { id: "gastos", label: `Gastos (${gastos.length})` },
  ];

  let body = "";
  if (tab === "unidades") {
    const rows = unidades.slice().sort((a, b) => String(a.UNIDAD).localeCompare(String(b.UNIDAD)));
    body = `<div class="table-wrap"><table>
      <thead><tr><th>Unidad</th><th>Tipo</th><th>Status</th><th>Cliente</th><th>Marca / Modelo</th><th>Año</th><th>Medidor</th><th>Color</th></tr></thead>
      <tbody>${rows.length ? rows.map((r) => `<tr>
        <td class="strong">${esc(r.UNIDAD)}</td><td>${esc(r.TIPO_UNIDAD)}</td><td>${esc(r.STATUS)}</td>
        <td>${esc(cliById[r.ID_CLIENTE] || r.GRUPO || "")}</td>
        <td>${esc([r.MARCA, r.MODELO].filter(Boolean).join(" "))}</td><td>${esc(r.ANIO)}</td>
        <td>${esc(r.MEDIDOR)}${r.MEDIDOR_UNIDAD ? " " + esc(r.MEDIDOR_UNIDAD) : ""}</td><td>${esc(r.COLOR)}</td>
      </tr>`).join("") : `<tr><td colspan="8" class="muted" style="text-align:center;padding:24px">Sin unidades.${puedeSync ? " Usa “Sincronizar Flota”." : " Pide a un administrador que sincronice."}</td></tr>`}</tbody>
    </table></div>`;
  } else if (tab === "mantenimientos") {
    const rows = mants.slice().sort((a, b) => String(b.FECHA).localeCompare(String(a.FECHA)));
    body = `<div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Unidad</th><th>Referencia</th><th>Estado</th><th>Proveedor</th><th>Medidor</th><th>Mano de obra</th><th>Repuestos</th><th>Total</th></tr></thead>
      <tbody>${rows.length ? rows.map((r) => `<tr>
        <td>${esc(String(r.FECHA).slice(0, 10))}</td><td class="strong">${esc(r.UNIDAD)}</td><td>${esc(r.REFERENCIA)}</td>
        <td>${esc(r.ESTADO)}</td><td>${esc(r.PROVEEDOR)}</td><td>${esc(r.MEDIDOR)}</td>
        <td>${money(r.MANO_OBRA)}</td><td>${money(r.REPUESTOS)}</td><td class="strong">${money(r.TOTAL)}</td>
      </tr>`).join("") : `<tr><td colspan="9" class="muted" style="text-align:center;padding:24px">Sin mantenimientos.</td></tr>`}</tbody>
    </table></div>`;
  } else {
    const rows = gastos.slice().sort((a, b) => String(b.FECHA).localeCompare(String(a.FECHA)));
    body = `<div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Unidad</th><th>Tipo</th><th>Proveedor</th><th>Monto</th><th>Notas</th></tr></thead>
      <tbody>${rows.length ? rows.map((r) => `<tr>
        <td>${esc(String(r.FECHA).slice(0, 10))}</td><td class="strong">${esc(r.UNIDAD)}</td><td>${esc(r.TIPO)}</td>
        <td>${esc(r.PROVEEDOR)}</td><td class="strong">${money(r.MONTO)}</td><td class="wrap">${esc(r.NOTAS)}</td>
      </tr>`).join("") : `<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">Sin gastos.</td></tr>`}</tbody>
    </table></div>`;
  }

  $("#content").innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="muted small">Unidades</div><div class="n">${unidades.length}</div></div>
      <div class="kpi"><div class="muted small">Mantenimientos</div><div class="n">${mants.length}</div></div>
      <div class="kpi"><div class="muted small">Costo mantenimientos</div><div class="n">${money(totalMant)}</div></div>
      <div class="kpi"><div class="muted small">Gastos</div><div class="n">${money(totalGastos)}</div></div>
    </div>
    <div class="card">
      <div class="card-head">
        <div><h3>Flota (Fleetio)</h3><p class="muted small">Datos descargados de Fleetio.${ultima ? " Ultima sincronizacion: " + esc(ultima.slice(0, 16).replace("T", " ")) : ""}</p></div>
        <div>${puedeSync ? `<button class="btn btn-primary" id="btn-flota-sync">Sincronizar Flota</button>` : ""}</div>
      </div>
      <div class="toolbar">
        ${tabs.map((t) => `<button class="btn ${tab === t.id ? "btn-primary" : ""}" data-flotatab="${t.id}">${esc(t.label)}</button>`).join(" ")}
        <span id="flota-msg" class="muted small"></span>
      </div>
      ${body}
    </div>`;
}

async function syncFlotaNow() {
  const m = $("#flota-msg");
  if (m) m.textContent = "Sincronizando con Fleetio...";
  const btn = $("#btn-flota-sync");
  if (btn) { btn.disabled = true; btn.textContent = "Sincronizando..."; }
  try {
    const r = await Store.syncFlota();
    try { await Store.cloudPullAll(); } catch (e) {}
    toast(`Flota sincronizada: ${r.unidades || 0} unidades, ${r.mantenimientos || 0} mantenimientos, ${r.gastos || 0} gastos`, "ok");
    renderCurrent();
  } catch (e) {
    if (m) m.textContent = "Error: " + e.message;
    toast("No se pudo sincronizar: " + e.message, "err");
    if (btn) { btn.disabled = false; btn.textContent = "Sincronizar Flota"; }
  }
}

function viewAdmin() {
  if (!can("tablas_ver")) {
    $("#content").innerHTML = `<div class="card"><div class="alert alert-error">Acceso restringido. Tu perfil no puede ver las tablas.</div></div>`;
    return;
  }
  const tabKeys = Object.keys(CATALOGS).filter((k) => k !== "tarifas");
  const tabs = tabKeys.map((k) =>
    `<button class="tab ${state.adminTab === k ? "active" : ""}" data-tab="${k}">${esc(CATALOGS[k].label)}</button>`
  ).join("");
  const cargas = can("cargas_masivas");

  $("#content").innerHTML = `
    <div class="card">
      <div class="card-head">
        <div><h3>Administracion de tablas</h3><p class="muted small">Puedes ver todas las tablas; editar unicamente las que tu perfil permite.</p></div>
        <div>
          ${cargas ? `
          <button class="btn btn-primary" id="btn-plantilla">Descargar plantilla</button>
          <button class="btn btn-success" id="btn-cargar">Cargar datos</button>
          <button class="btn" id="btn-export-all">Exportar datos</button>
          <button class="btn" id="btn-export-sql">Exportar SQL</button>
          <button class="btn btn-danger" id="btn-reset-demo">Restablecer demo</button>
          <input type="file" id="import-file" accept=".xlsx,.xls,.csv,.json" class="hidden" />` : ""}
        </div>
      </div>
      ${cargas ? `<div class="alert alert-info small">
        <b>Cargas masivas:</b> descarga la <b>plantilla</b> (.xlsx con una hoja por tabla), llenala y usa <b>Cargar datos</b>. Tambien acepta <b>.json</b> (respaldo completo) o <b>.csv</b> (se carga en la pestana activa).
      </div>` : ""}
      <div class="tabs">${tabs}</div>
      <div id="catalog-host"></div>
    </div>`;
  renderCatalog();
}

function catalogFields(cat) {
  // Con Supabase Auth activo, la contrasena la maneja Auth: se oculta del panel.
  return cat.fields.filter((f) => !(f.key === "PASSWORD" && Store.authEnabled && Store.authEnabled()));
}

function renderCatalog() {
  const key = state.adminTab;
  const cat = CATALOGS[key];
  const rows = Store.all(cat.table);
  const host = $("#catalog-host");
  const cols = catalogFields(cat);
  const editable = !!canEditTable(key) && !cat.readonly;

  host.innerHTML = `
    <div class="card-head">
      <h3>${esc(cat.label)} <span class="muted small">(${rows.length} registros)</span>
        ${editable ? "" : '<span class="badge gray">solo lectura</span>'}</h3>
      ${editable ? `<button class="btn btn-primary" data-cat-new="${key}">Nuevo</button>` : ""}
    </div>
    <div class="table-wrap"><table>
      <thead><tr>${cols.map((c) => `<th>${esc(c.label)}</th>`).join("")}${editable ? "<th></th>" : ""}</tr></thead>
      <tbody>
        ${rows.length ? rows.map((r, i) => `<tr>
          ${cols.map((c) => `<td class="wrap">${c.key === "SERVICIO" ? servicioIcono(r[c.key], 16) : ""}${esc(r[c.key])}</td>`).join("")}
          ${editable ? `<td>
            <button class="btn btn-sm" data-cat-edit="${key}" data-idx="${i}">Editar</button>
            <button class="btn btn-sm btn-danger" data-cat-del="${key}" data-idx="${i}">Eliminar</button>
          </td>` : ""}
        </tr>`).join("") : `<tr><td colspan="${cols.length + (editable ? 1 : 0)}" class="muted" style="text-align:center;padding:20px">Sin registros.</td></tr>`}
      </tbody>
    </table></div>`;
}

function sourceOptions(src) {
  const [table, field] = src.split(":");
  return Store.all(table).map((r) => ({ value: r[field], label: r[field] }));
}

function catalogFieldHTML(f, row) {
  const val = row && row[f.key] != null ? row[f.key] : "";
  let ctl;
  if (f.type === "select") {
    const opts = f.source ? sourceOptions(f.source) : (f.options || []).map((o) => ({ value: o, label: o }));
    ctl = `<select data-cfield="${esc(f.key)}"><option value="">-- Seleccionar --</option>
      ${opts.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(val) ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select>`;
  } else {
    ctl = `<input type="${f.type === "number" ? "number" : "text"}" data-cfield="${esc(f.key)}" value="${esc(val)}" ${f.pk ? "" : ""} />`;
  }
  return `<label class="field"><span>${esc(f.label)}${f.required ? " *" : ""}</span>${ctl}</label>`;
}

function openCatalogForm(key, idx) {
  if (!canEditTable(key)) { toast("Tu perfil no puede modificar esta tabla.", "err"); return; }
  const cat = CATALOGS[key];
  const fields = catalogFields(cat);
  const row = idx == null ? {} : Store.all(cat.table)[idx];
  if (idx == null) {
    if (cat.fields.some((f) => f.key === "FECHA_CREACION")) row.FECHA_CREACION = today();
    if (cat.fields.some((f) => f.key === "ESTATUS")) row.ESTATUS = "Activo";
  }
  openModal(`
    <h3>${idx == null ? "Nuevo" : "Editar"} - ${esc(cat.label)}</h3>
    <div class="grid grid-2">${fields.map((f) => catalogFieldHTML(f, row)).join("")}</div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-cat-save">Guardar</button>
    </div>`);

  $("#btn-cat-save").onclick = () => {
    const obj = {};
    fields.forEach((f) => {
      const el = $(`[data-cfield="${f.key}"]`);
      obj[f.key] = f.type === "number" && el.value !== "" ? Number(el.value) : el.value.trim();
    });
    // Conserva las columnas privadas (p. ej. PASSWORD en modo offline).
    ((typeof PRIVATE_COLUMNS !== "undefined" && PRIVATE_COLUMNS[cat.table]) || []).forEach((k) => { if (row[k] != null) obj[k] = row[k]; });
    for (const f of fields) {
      if (f.required && !obj[f.key]) { toast(`El campo "${f.label}" es obligatorio`, "err"); return; }
    }
    const matchRow = (r, o) => cat.pk.every((k) => String(r[k]) === String(o[k]));
    if (idx == null) {
      if (Store.all(cat.table).some((r) => matchRow(r, obj))) { toast("Ya existe un registro con esa clave.", "err"); return; }
      Store.insert(cat.table, obj);
      toast("Registro creado", "ok");
    } else {
      Store.update(cat.table, (r, i) => i === idx, obj);
      toast("Registro actualizado", "ok");
    }
    closeModal();
    refreshCatalogView();
  };
}

function deleteCatalogRow(key, idx) {
  if (!canEditTable(key)) { toast("Tu perfil no puede modificar esta tabla.", "err"); return; }
  const cat = CATALOGS[key];
  if (!confirm("¿Eliminar este registro?")) return;
  Store.remove(cat.table, (r, i) => i === idx);
  toast("Registro eliminado", "ok");
  refreshCatalogView();
}

/* Re-render de catalogos o de tarifas segun la vista activa. */
function refreshCatalogView() {
  if (state.view === "tarifas") viewTarifas();
  else renderCatalog();
}

/* ================== SECCION: TARIFAS Y MEM ======================== */
function viewTarifas() {
  const rows = Store.all("tarifas");
  const memRows = Store.all("mem").slice().sort((a, b) => b.FECHA.localeCompare(a.FECHA));
  const ultimoMem = memRows[0];
  const canEditTar = can("tablas_editar_tarifas");
  const canEditMem = can("mem_gestionar");

  const rutaLabel = (id) => { const r = Store.find("rutas", (x) => x.ID_RUTA === id)[0]; return r ? `${r.ORIGEN} → ${r.DESTINO}` : ""; };
  const oplLabel = (id) => { const p = Store.find("proveedores", (x) => x.OPL === id)[0]; return p ? p.PROVEEDOR : ""; };

  $("#content").innerHTML = `
    <div class="card">
      <div class="card-head">
        <div><h3>Tabla MEM (precio diesel diario)</h3>
          <p class="muted small">Se carga desde el archivo del MEM (columna "Aceite Combustible Diésel"). El ajuste usa el precio de la FECHA PLAN del viaje.</p></div>
        <div>
          <span class="badge blue">Ultimo: ${ultimoMem ? esc(ultimoMem.PRECIO_DIESEL) + " Q (" + esc(ultimoMem.FECHA) + ")" : "sin datos"}</span>
          ${canEditMem ? `<label class="btn btn-primary" style="cursor:pointer">Cargar tabla MEM (.xlsx)<input type="file" id="mem-file" accept=".xlsx,.xls,.csv" class="hidden" /></label>` : ""}
        </div>
      </div>
      ${canEditMem ? `<div class="alert alert-info small">La carga reemplaza el contenido de la tabla MEM. Tambien puedes incluir la hoja <b>mem</b> en la plantilla de Administracion.</div>` : `<div class="alert alert-info">Solo admin y quien tenga el permiso de MEM pueden cargar la tabla.</div>`}
      <div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Precio diesel (Q)</th></tr></thead>
        <tbody>
          ${memRows.length ? memRows.slice(0, 20).map((m) => `<tr><td>${esc(m.FECHA)}</td><td>${esc(m.PRECIO_DIESEL)}</td></tr>`).join("") : `<tr><td colspan="2" class="muted" style="text-align:center;padding:16px">Sin registros. Carga la tabla MEM.</td></tr>`}
        </tbody>
      </table></div>
      ${memRows.length > 20 ? `<p class="muted small">Mostrando los ultimos 20 de ${memRows.length} renglones.</p>` : ""}
    </div>

    <div class="card">
      <div class="card-head">
        <div><h3>Tarifas por ruta y OPL</h3><p class="muted small">Solo las tarifas <b>Activas</b> se cargan al crear un viaje. El ajuste de combustible se calcula por viaje.</p></div>
        ${canEditTar ? `<button class="btn btn-primary" data-cat-new="tarifas">Nueva tarifa</button>` : ""}
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Ruta</th><th>OPL</th><th>Proveedor</th><th>Tarifa Cliente</th><th>Tarifa OPL</th>
          <th>% Comb.</th><th>Q Diesel</th><th>Margen</th><th>Fecha Creacion</th><th>Estatus</th>${canEditTar ? "<th></th>" : ""}
        </tr></thead>
        <tbody>
          ${rows.length ? rows.map((t, i) => {
            const activo = !t.ESTATUS || t.ESTATUS === "Activo";
            return `<tr>
            <td class="wrap">${esc(t.ID_RUTA)} ${esc(rutaLabel(t.ID_RUTA))}</td>
            <td>${esc(t.OPL)}</td>
            <td>${esc(oplLabel(t.OPL))}</td>
            <td>$${Number(t.TARIFA_CLIENTE || 0).toLocaleString("en-US")}</td>
            <td>$${Number(t.TARIFA_OPL || 0).toLocaleString("en-US")}</td>
            <td>${esc(t.COMBUSTIBLE_PCT)}%</td>
            <td>${esc(t.Q_DIESEL_PACTADO)}</td>
            <td>$${Number((t.TARIFA_CLIENTE || 0) - (t.TARIFA_OPL || 0)).toLocaleString("en-US")}</td>
            <td>${esc(t.FECHA_CREACION)}</td>
            <td><span class="badge ${activo ? "green" : "gray"}">${activo ? "Activo" : "Inactivo"}</span></td>
            ${canEditTar ? `<td>
              <button class="btn btn-sm" data-tar-toggle="${i}">${activo ? "Desactivar" : "Activar"}</button>
              <button class="btn btn-sm" data-cat-edit="tarifas" data-idx="${i}">Editar</button>
              <button class="btn btn-sm btn-danger" data-cat-del="tarifas" data-idx="${i}">Eliminar</button>
            </td>` : ""}
          </tr>`; }).join("") : `<tr><td colspan="${canEditTar ? 11 : 10}" class="muted" style="text-align:center;padding:20px">Sin tarifas.</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
}

/* ================== SECCION: TABLERO EJECUTIVO ==================== */
function dashboardRows() {
  const f = state.dashboard;
  return viajesVisibles().filter((v) => {
    if (f.cliente && v["ID-CLIENTE"] !== f.cliente) return false;
    if (f.desde && String(v.FECHA_PLAN || "") < f.desde) return false;
    if (f.hasta && String(v.FECHA_PLAN || "") > f.hasta) return false;
    return true;
  });
}
const money = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");
const num0 = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");
const sumBy = (arr, f) => arr.reduce((a, r) => a + (Number(f(r)) || 0), 0);

/* Lineas de servicio de la marca In Transit (iconos del brandbook).
 * El campo SERVICIO de clientes es texto libre, asi que se clasifica
 * por palabras clave; si no coincide ninguna, se asume Transporte. */
const SERVICIO_LINEAS = [
  { key: "almacenaje", img: "assets/svc-almacenaje.png", label: "Servicio de Almacenaje", re: /almacen|bodega|warehouse|storage|inventario/i },
  { key: "transporte", img: "assets/svc-transporte.png", label: "Servicio de Transporte", re: /transport|distribu|frio|ruta|log[ií]stic|dedicad|reparto|entrega|flota/i },
  { key: "personal", img: "assets/svc-personal.png", label: "Personal Operativo y Administrativo", re: /personal|admin|operativ|outsourc|recurso|n[oó]mina|gente/i },
  { key: "reacondicionamiento", img: "assets/svc-reacondicionamiento.png", label: "Reacondicionamiento de Producto", re: /reacondicion|remanufac|reparaci|refurb|acondicion/i },
];
function servicioLinea(texto) {
  const t = String(texto || "");
  for (const s of SERVICIO_LINEAS) if (s.re.test(t)) return s;
  return SERVICIO_LINEAS[1];
}
function servicioDeCliente(nombre) {
  const c = Store.find("clientes", (x) => x.CLIENTE === nombre)[0];
  return c ? c.SERVICIO : "";
}
function servicioIcono(texto, size) {
  const s = servicioLinea(texto);
  return `<img class="svc-ico" src="${s.img}" alt="${esc(s.label)}" title="${esc(s.label)}" style="height:${size || 16}px" />`;
}

function barRow(label, value, max, rightText, iconHTML) {
  const pct = max ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return `<div class="bar-row">
    <div class="bar-label">${iconHTML ? iconHTML + " " : ""}${esc(label)}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
    <div class="bar-value">${esc(rightText != null ? rightText : value)}</div>
  </div>`;
}
function groupCount(rows, keyFn) {
  const m = new Map();
  rows.forEach((r) => { const k = keyFn(r) || "(sin dato)"; m.set(k, (m.get(k) || 0) + 1); });
  return Array.from(m, ([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
}
function groupSum(rows, keyFn, valFn) {
  const m = new Map();
  rows.forEach((r) => { const k = keyFn(r) || "(sin dato)"; m.set(k, (m.get(k) || 0) + (Number(valFn(r)) || 0)); });
  return Array.from(m, ([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
}

function viewDashboard() {
  const f = state.dashboard;
  const rows = dashboardRows();
  const allowed = clientesFiltro();

  const ingresos = sumBy(rows, (v) => Number(v.TARIFA_CLIENTE) + Number(v.AJUSTE_COMBUSTIBLE));
  const costos = sumBy(rows, (v) => Number(v.TARIFA_OPL) + Number(v.AJUSTE_COMBUSTIBLE_OPL));
  const margen = ingresos - costos;
  const facturados = rows.filter((v) => v.STATUS === STATUS_FACTURADO);
  const facturadoMonto = sumBy(facturados, (v) => Number(v.TARIFA_CLIENTE) + Number(v.AJUSTE_COMBUSTIBLE));
  const pendientes = rows.filter((v) => v.STATUS === STATUS_LIQUIDADO).length;
  const kmTotal = sumBy(rows, (v) => v.KM);
  const cargaTotal = sumBy(rows, (v) => v.CARGA_VIAJE);

  // Distribuciones
  const porEstatus = STATUS_LIST.map((s) => ({ k: s, v: rows.filter((r) => r.STATUS === s).length }));
  const maxEstatus = Math.max(1, ...porEstatus.map((x) => x.v));
  const porCliente = groupCount(rows, (r) => r.CLIENTE);
  const maxCliente = Math.max(1, ...porCliente.map((x) => x.v));
  const porOpl = groupSum(rows, (r) => r.OPL, (r) => Number(r.TARIFA_CLIENTE) - Number(r.TARIFA_OPL));
  const maxOpl = Math.max(1, ...porOpl.map((x) => Math.abs(x.v)));
  const porMes = groupCount(rows, (r) => String(r.FECHA_PLAN || "").slice(0, 7)).sort((a, b) => a.k.localeCompare(b.k));
  const maxMes = Math.max(1, ...porMes.map((x) => x.v));
  const topRutas = groupSum(rows, (r) => `${r.ORIGEN} → ${r.DESTINO}`, (r) => r.KM).slice(0, 5);
  const maxRuta = Math.max(1, ...topRutas.map((x) => x.v));
  const ultimoMem = Store.all("mem").slice().sort((a, b) => b.FECHA.localeCompare(a.FECHA))[0];
  const mem = ultimoMem ? `${ultimoMem.PRECIO_DIESEL} Q (${ultimoMem.FECHA})` : "-";

  $("#content").innerHTML = `
    <div class="toolbar">
      <label class="field"><span>Cliente</span>
        <select data-db="cliente"><option value="">Todos</option>
          ${allowed.map((c) => `<option value="${esc(c.ID_CLIENTE)}" ${f.cliente === c.ID_CLIENTE ? "selected" : ""}>${esc(c.CLIENTE)}</option>`).join("")}
        </select></label>
      <label class="field"><span>Fecha desde</span><input type="date" data-db="desde" value="${esc(f.desde)}" /></label>
      <label class="field"><span>Fecha hasta</span><input type="date" data-db="hasta" value="${esc(f.hasta)}" /></label>
      <button class="btn" id="btn-clear-dashboard">Limpiar</button>
      <div class="spacer"></div>
      <span class="badge blue">Ultimo MEM: ${esc(mem)}</span>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="muted small">Viajes</div><div class="n">${num0(rows.length)}</div></div>
      <div class="kpi"><div class="muted small">KM totales</div><div class="n">${num0(kmTotal)}</div></div>
      <div class="kpi"><div class="muted small">Carga total (kg)</div><div class="n">${num0(cargaTotal)}</div></div>
      <div class="kpi"><div class="muted small">Pendientes de revision</div><div class="n">${num0(pendientes)}</div></div>
      <div class="kpi"><div class="muted small">Ingresos estimados</div><div class="n">${money(ingresos)}</div></div>
      <div class="kpi"><div class="muted small">Costo estimado (OPL)</div><div class="n">${money(costos)}</div></div>
      <div class="kpi"><div class="muted small">Margen estimado</div><div class="n" style="color:${margen >= 0 ? "var(--green)" : "var(--red)"}">${money(margen)}</div></div>
      <div class="kpi"><div class="muted small">Facturado (${facturados.length})</div><div class="n">${money(facturadoMonto)}</div></div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h3>Viajes por estatus</h3>
        <div style="margin-top:12px">
          ${porEstatus.map((x) => barRow(x.k, x.v, maxEstatus, String(x.v))).join("")}
        </div>
      </div>
      <div class="card">
        <h3>Viajes por cliente</h3>
        <div style="margin-top:12px">
          ${porCliente.length ? porCliente.map((x) => barRow(x.k, x.v, maxCliente, String(x.v), servicioIcono(servicioDeCliente(x.k), 16))).join("") : '<p class="muted">Sin datos.</p>'}
        </div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h3>Viajes por mes (Fecha Plan)</h3>
        <div style="margin-top:12px">
          ${porMes.length ? porMes.map((x) => barRow(x.k, x.v, maxMes, String(x.v))).join("") : '<p class="muted">Sin datos.</p>'}
        </div>
      </div>
      <div class="card">
        <h3>Margen por OPL (estimado)</h3>
        <div style="margin-top:12px">
          ${porOpl.length ? porOpl.map((x) => barRow(x.k, Math.abs(x.v), maxOpl, money(x.v))).join("") : '<p class="muted">Sin datos.</p>'}
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Top rutas por KM</h3>
      <div style="margin-top:12px">
        ${topRutas.length ? topRutas.map((x) => barRow(x.k, x.v, maxRuta, num0(x.v) + " km")).join("") : '<p class="muted">Sin datos.</p>'}
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div><h3>Lineas de servicio In Transit</h3>
          <p class="muted small">Viajes del periodo agrupados por el servicio del cliente.</p></div>
      </div>
      <div class="svc-strip">
        ${SERVICIO_LINEAS.map((s) => {
          const n = rows.filter((v) => servicioLinea(servicioDeCliente(v.CLIENTE)).key === s.key).length;
          return `<div class="svc-cell">
            <img src="${s.img}" alt="${esc(s.label)}" />
            <div class="svc-name">${esc(s.label)}</div>
            <div class="svc-count">${n} viaje${n === 1 ? "" : "s"}</div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
}

/* ================== SECCION: PERMISOS (solo admin) =============== */
function viewPermisos() {
  if (!can("permisos_gestionar")) {
    $("#content").innerHTML = `<div class="card"><div class="alert alert-error">Acceso restringido. Solo el administrador administra los permisos.</div></div>`;
    return;
  }
  const grupos = [...new Set(PERMISOS_CATALOGO.map((p) => p.grupo))];
  let body = "";
  grupos.forEach((g) => {
    body += `<tr><td colspan="${ROLES.length + 1}" class="field-group-title">${esc(g)}</td></tr>`;
    PERMISOS_CATALOGO.filter((p) => p.grupo === g).forEach((p) => {
      body += `<tr><td class="wrap"><b>${esc(p.label)}</b><br><span class="muted small">${esc(p.key)}</span></td>`;
      ROLES.forEach((rol) => {
        if (rol === "admin") body += `<td style="text-align:center"><span class="badge green">Si</span></td>`;
        else body += `<td style="text-align:center"><input type="checkbox" data-perm="${esc(p.key)}" data-rol="${esc(rol)}" ${permHabilitado(rol, p.key) ? "checked" : ""} /></td>`;
      });
      body += `</tr>`;
    });
  });
  $("#content").innerHTML = `
    <div class="card">
      <div class="card-head">
        <div><h3>Matriz de permisos por rol</h3><p class="muted small">Marca o desmarca permisos. El Administrador siempre tiene todo (no editable).</p></div>
        <button class="btn" id="btn-reset-permisos">Restablecer por defecto</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Permiso</th>${ROLES.map((r) => `<th style="text-align:center">${esc(roleLabel(r))}</th>`).join("")}</tr></thead>
        <tbody>${body}</tbody>
      </table></div>
    </div>`;
}

/* ------------------------- Exportacion SQL ------------------------ */
/* PK y NUMERIC_COLS se definen en store.js (fuente unica). */

function dbColumns(table) {
  if (table === "viajes") return VIAJES_ALL_COLUMNS;
  if (table === "permisos") return ["ROL", "PERMISO", "HABILITADO"];
  return columnsOfTable(table);
}

/* Columnas oficiales de una tabla (se toman del SEED para garantizar orden) */
function columnsOfTable(table) {
  if (table === "viajes") return VIAJES_ALL_COLUMNS;
  const rows = (SEED[table] && SEED[table].length) ? SEED[table] : Store.all(table);
  const cols = [];
  rows.forEach((r) => Object.keys(r).forEach((k) => { if (!cols.includes(k)) cols.push(k); }));
  const priv = (typeof PRIVATE_COLUMNS !== "undefined" && PRIVATE_COLUMNS[table]) || [];
  return cols.filter((c) => !priv.includes(c));
}

function inferSQLType(rows, col) {
  let numeric = true, intl = true, dateOnly = true, maxLen = 0, any = false;
  rows.forEach((r) => {
    const v = r[col];
    if (v === "" || v == null) return;
    any = true;
    const s = String(v); maxLen = Math.max(maxLen, s.length);
    if (isNaN(Number(v))) numeric = false; else if (!Number.isInteger(Number(v))) intl = false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) dateOnly = false;
  });
  if (!any) return "VARCHAR(255)";
  if (dateOnly) return "DATE";
  if (numeric) return intl ? "INT" : "DECIMAL(12,2)";
  return `VARCHAR(${Math.min(Math.max(maxLen + 10, 50), 255)})`;
}

function q(v) {
  if (v === "" || v == null) return "NULL";
  if (typeof v === "number") return v;
  if (!isNaN(Number(v)) && String(v).trim() !== "") return v;
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function generateSQL() {
  let out = "-- Esquema SQL generado por el prototipo Registro de Viajes\n";
  out += "-- Notas de relaciones (sugeridas):\n";
  out += "--   viajes.ID-CLIENTE      -> clientes.ID_CLIENTE\n";
  out += "--   viajes.UNIDAD          -> unidades.UNIDAD\n";
  out += "--   viajes.PILOTO          -> pilotos.PILOTO\n";
  out += "--   viajes.OPL             -> proveedores.OPL\n";
  out += "--   unidades.OPL           -> proveedores.OPL\n";
  out += "--   unidades.ID_CLIENTE    -> clientes.ID_CLIENTE\n";
  out += "--   tarifas.ID_RUTA        -> rutas.ID_RUTA\n";
  out += "--   tarifas.OPL            -> proveedores.OPL\n";
  out += "--   rutas.ID_CLIENTE       -> clientes.ID_CLIENTE\n";
  out += "--   usuario_cliente.*      -> usuarios / clientes\n\n";

  TABLES.forEach((t) => {
    const rows = Store.all(t);
    const cols = [];
    rows.forEach((r) => Object.keys(r).forEach((k) => { if (!cols.includes(k)) cols.push(k); }));
    if (!cols.length) return;
    const pk = PK[t] || [];
    out += `CREATE TABLE ${t} (\n`;
    const lines = cols.map((c) => {
      let def = `  \`${c}\` ${inferSQLType(rows, c)}`;
      if (pk.length === 1 && pk[0] === c) def += " NOT NULL";
      return def;
    });
    if (pk.length) lines.push(`  PRIMARY KEY (${pk.map((k) => "`" + k + "`").join(", ")})`);
    out += lines.join(",\n") + "\n);\n\n";

    rows.forEach((r) => {
      out += `INSERT INTO ${t} (${cols.map((c) => "`" + c + "`").join(", ")}) VALUES (${cols.map((c) => q(r[c])).join(", ")});\n`;
    });
    out += "\n";
  });
  return out;
}

/* ================== PLANTILLA / CARGA DE DATOS =================== */
function hasXLSX() { return typeof window.XLSX !== "undefined"; }

function coerceRow(table, row) {
  const nums = NUMERIC_COLS[table] || [];
  const out = {};
  Object.keys(row).forEach((k) => {
    let v = row[k];
    if (nums.includes(k) && v !== "" && v != null && !isNaN(Number(v))) v = Number(v);
    out[k] = v;
  });
  return out;
}

/* Exporta un libro .xlsx con una hoja por tabla. Si falta el lector XLSX,
 * cae a un respaldo .json con la misma estructura. */
function exportWorkbook(dataByTable, filename, headersOnly) {
  if (hasXLSX()) {
    const wb = XLSX.utils.book_new();
    Object.keys(dataByTable).forEach((t) => {
      const cols = columnsOfTable(t);
      const rows = headersOnly ? [] : dataByTable[t];
      const ws = XLSX.utils.json_to_sheet(rows, { header: cols });
      XLSX.utils.book_append_sheet(wb, ws, t.slice(0, 31));
    });
    XLSX.writeFile(wb, filename);
  } else {
    download(filename.replace(/\.xlsx$/i, ".json"), JSON.stringify(dataByTable, null, 2), "application/json");
    toast("Descargado en formato JSON (no se cargo el lector de Excel).", "");
  }
}

function exportTemplate() {
  const empty = {};
  TABLES.forEach((t) => (empty[t] = []));
  exportWorkbook(empty, "plantilla_viajes.xlsx", true);
  toast("Plantilla descargada.", "ok");
}

function exportAllData() {
  const data = {};
  TABLES.forEach((t) => (data[t] = Store.all(t)));
  exportWorkbook(data, "datos_viajes.xlsx", false);
  toast("Datos exportados.", "ok");
}

function handleImportFile(file) {
  if (!file) return;
  const isJSON = /\.json$/i.test(file.name);
  const isCSV = /\.csv$/i.test(file.name);
  const reader = new FileReader();
  reader.onload = () => {
    let bySheet = {};
    try {
      if (isJSON) {
        bySheet = JSON.parse(reader.result);
      } else if (hasXLSX()) {
        const wb = XLSX.read(reader.result, { type: isCSV ? "string" : "array" });
        wb.SheetNames.forEach((n) => { bySheet[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: "" }); });
        // Un CSV trae una sola hoja sin nombre de tabla: se asigna a la pestana activa
        if (isCSV && wb.SheetNames.length === 1 && !TABLES.includes(wb.SheetNames[0])) {
          bySheet = {}; bySheet[CATALOGS[state.adminTab] ? state.adminTab : "viajes"] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
        }
      } else {
        toast("Para cargar Excel/CSV necesitas conexion (lector XLSX). Puedes cargar un .json.", "err");
        return;
      }
    } catch (e) { toast("No se pudo leer el archivo: " + e.message, "err"); return; }
    applyImport(bySheet);
  };
  if (isJSON || isCSV) reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

function applyImport(bySheet) {
  const known = Object.keys(bySheet).filter((n) => TABLES.includes(n) && Array.isArray(bySheet[n]));
  if (!known.length) { toast("El archivo no contiene hojas de tablas conocidas.", "err"); return; }
  if (!confirm(`Se reemplazaran por completo estas tablas:\n\n${known.join(", ")}\n\n¿Continuar?`)) return;
  known.forEach((t) => {
    Store.db[t] = bySheet[t].map((r) => coerceRow(t, r));
    Store.persist();
    Store.push(t).catch(() => {});
  });
  toast(`Datos cargados: ${known.join(", ")}`, "ok");
  renderCurrent();
}

/* ========================= SINCRONIZACION ========================= */
function qIdent(c) { return '"' + String(c).replace(/"/g, '""') + '"'; }

/* Esquema PostgreSQL listo para pegar en el SQL Editor de Supabase. */
function cloudSchemaSQL() {
  let out = "-- Esquema para Supabase (PostgreSQL)\n";
  out += "-- Ejecuta TODO esto en el SQL Editor de tu proyecto Supabase antes de sincronizar.\n";
  out += "-- En el prototipo todas las columnas son TEXT y el acceso con la clave anon\n";
  out += "-- queda permitido (create policy proto_all). Para produccion usa autenticacion real.\n\n";
  TABLES.forEach((t) => {
    const cols = dbColumns(t);
    if (!cols.length) return;
    const pk = PK[t] || [];
    const lines = cols.map((c) => `  ${qIdent(c)} text`);
    if (pk.length) lines.push(`  primary key (${pk.map(qIdent).join(", ")})`);
    out += `create table if not exists public."${t}" (\n${lines.join(",\n")}\n);\n`;
    out += `alter table public."${t}" enable row level security;\n`;
    out += `drop policy if exists proto_all on public."${t}";\n`;
    out += `create policy proto_all on public."${t}" for all using (true) with check (true);\n\n`;
  });
  return out;
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove(); return Promise.resolve(true);
  } catch (e) { return Promise.resolve(false); }
}

function openCloudModal() {
  const esAdmin = !!(state.user && String(state.user.ROL).toLowerCase() === "admin");
  const hasCloud = Store.cloudEnabled();

  // Usuarios que NO son admin: solo los botones de sincronizacion, sin la
  // configuracion (URL, llave, esquema) ni los pasos tecnicos.
  if (!esAdmin) {
    openModal(`
      <h3>Nube (datos compartidos)</h3>
      <p class="muted small">${hasCloud
        ? "Usa estos botones para traer o enviar los datos compartidos de este dispositivo."
        : "La nube no esta configurada en este dispositivo. Pide a un administrador que la active."}</p>
      <div class="toolbar">
        <button class="btn" id="btn-cloud-sync" ${hasCloud ? "" : "disabled"}>Sincronizar</button>
        <button class="btn" id="btn-cloud-push" ${hasCloud ? "" : "disabled"}>Enviar mis cambios</button>
        <button class="btn" id="btn-cloud-pull" ${hasCloud ? "" : "disabled"}>Bajar datos</button>
      </div>
      <div id="cloud-msg" class="hidden"></div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="btn-cloud-close">Cerrar</button>
      </div>`);

    const msg = (text, cls) => { const m = $("#cloud-msg"); m.className = "alert " + (cls || "alert-info") + " small"; m.textContent = text; };
    $("#btn-cloud-close").onclick = () => closeModal();
    $("#btn-cloud-sync").onclick = async () => {
      msg("Sincronizando...");
      try { await Store.cloudPushAll(); await Store.cloudPullAll(); msg("Datos sincronizados.", "alert-success"); syncStateText(); renderCurrent(); toast("Datos sincronizados", "ok"); }
      catch (e) { msg("No se pudo sincronizar: " + e.message, "alert-error"); }
    };
    $("#btn-cloud-push").onclick = async () => {
      msg("Enviando...");
      try { const r = await Store.cloudPushAll(); const total = r.reduce((a, x) => a + (x.count || 0), 0); msg(`Enviados ${total} registros.`, "alert-success"); syncStateText(); }
      catch (e) { msg("No se pudo enviar: " + e.message, "alert-error"); }
    };
    $("#btn-cloud-pull").onclick = async () => {
      msg("Bajando...");
      try { await Store.cloudPullAll(); msg("Datos descargados.", "alert-success"); syncStateText(); renderCurrent(); }
      catch (e) { msg("No se pudo bajar: " + e.message, "alert-error"); }
    };
    return;
  }

  openModal(`
    <h3>Nube (datos compartidos)</h3>
    <p class="muted small">Conecta un proyecto de Supabase para que todos los telefonos y PCs vean los mismos datos. Sin configurarlo, la app funciona solo con los datos de este dispositivo.</p>
    <div class="alert alert-info small">
      <b>Pasos:</b> 1) Crea un proyecto gratis en supabase.com.
      2) En <b>SQL Editor</b>, ejecuta el esquema (boton "Ver esquema").
      3) En <b>Project Settings &rarr; API</b> copia la <b>Project URL</b> y la <b>anon public key</b> y pegalas aqui.
    </div>
    <label class="field"><span>Project URL</span>
      <input type="text" id="cloud-url" value="${esc(Store.cloud.url)}" placeholder="https://xxxxxxxx.supabase.co" autocomplete="off" /></label>
    <label class="field"><span>anon public key</span>
      <textarea id="cloud-key" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." rows="2">${esc(Store.cloud.key)}</textarea></label>
    <div id="cloud-msg" class="hidden"></div>
    <div class="toolbar">
      <button class="btn" id="btn-cloud-schema">Ver esquema SQL</button>
      <button class="btn" id="btn-cloud-test">Probar conexion</button>
      <button class="btn btn-primary" id="btn-cloud-save">Guardar</button>
    </div>
    <div class="toolbar">
      <button class="btn" id="btn-cloud-sync" ${hasCloud ? "" : "disabled"}>Sincronizar</button>
      <button class="btn" id="btn-cloud-push" ${hasCloud ? "" : "disabled"}>Subir este equipo &rarr; nube</button>
      <button class="btn" id="btn-cloud-pull" ${hasCloud ? "" : "disabled"}>Bajar nube &rarr; este equipo</button>
    </div>
    <p class="muted small">Al guardar registros, la app sube automaticamente la tabla correspondiente. "Subir" manda todo lo de este equipo; "Bajar" reemplaza lo local con lo de la nube.</p>
    <div class="modal-actions">
      <button class="btn" id="btn-cloud-clear" ${hasCloud ? "" : "disabled"}>Desconectar</button>
      <button class="btn btn-primary" id="btn-cloud-close">Cerrar</button>
    </div>`);

  const msg = (text, cls) => { const m = $("#cloud-msg"); m.className = "alert " + (cls || "alert-info") + " small"; m.textContent = text; };
  const saveConfig = () => {
    const u = $("#cloud-url"), k = $("#cloud-key");
    return (u && k) ? Store.setCloud(u.value, k.value) : { url: Store.cloud.url, key: Store.cloud.key };
  };

  $("#btn-cloud-close").onclick = () => closeModal();
  $("#btn-cloud-save").onclick = () => {
    const c = saveConfig();
    syncStateText();
    msg(c.url && c.key ? "Guardado. La nube queda activa en este dispositivo." : "Guardado. La nube queda desactivada.", "alert-success");
    toast("Configuracion de nube guardada", "ok");
  };
  $("#btn-cloud-test").onclick = async () => {
    saveConfig();
    msg("Probando conexion...");
    try { await Store.cloudTest(); msg("Conexion correcta. Las tablas existen.", "alert-success"); }
    catch (e) { msg("Fallo la conexion: " + e.message + " (revisa URL/clave y que hayas ejecutado el esquema).", "alert-error"); }
  };
  $("#btn-cloud-schema").onclick = () => {
    openModal(`
      <h3>Esquema SQL (Supabase)</h3>
      <p class="muted small">Pega esto en Supabase &rarr; SQL Editor &rarr; New query &rarr; Run.</p>
      <textarea id="schema-sql" readonly rows="14" style="font-family:ui-monospace,Consolas,monospace;font-size:.78rem;white-space:pre">${esc(cloudSchemaSQL())}</textarea>
      <div class="modal-actions">
        <button class="btn" id="btn-schema-download">Descargar .sql</button>
        <button class="btn" id="btn-schema-copy">Copiar</button>
        <button class="btn btn-primary" id="btn-schema-close">Cerrar</button>
      </div>`);
    $("#btn-schema-close").onclick = () => closeModal();
    $("#btn-schema-copy").onclick = () => copyText(cloudSchemaSQL()).then((ok) => toast(ok ? "SQL copiado" : "No se pudo copiar", ok ? "ok" : "err"));
    $("#btn-schema-download").onclick = () => download("esquema_supabase.sql", cloudSchemaSQL(), "text/plain;charset=utf-8");
  };
  $("#btn-cloud-sync").onclick = async () => {
    saveConfig(); msg("Sincronizando...");
    try {
      await Store.cloudPushAll(); await Store.cloudPullAll();
      msg("Datos sincronizados.", "alert-success"); syncStateText(); renderCurrent();
      toast("Datos sincronizados", "ok");
    } catch (e) { msg("No se pudo sincronizar: " + e.message, "alert-error"); }
  };
  $("#btn-cloud-push").onclick = async () => {
    saveConfig(); msg("Subiendo...");
    try {
      const r = await Store.cloudPushAll();
      const total = r.reduce((a, x) => a + (x.count || 0), 0);
      msg(`Subidos ${total} registros.`, "alert-success"); syncStateText();
    } catch (e) { msg("No se pudo subir: " + e.message, "alert-error"); }
  };
  $("#btn-cloud-pull").onclick = async () => {
    saveConfig(); msg("Bajando...");
    try {
      await Store.cloudPullAll();
      msg("Datos descargados de la nube.", "alert-success"); syncStateText(); renderCurrent();
    } catch (e) { msg("No se pudo bajar: " + e.message, "alert-error"); }
  };
  $("#btn-cloud-clear").onclick = () => {
    if (!confirm("¿Desconectar la nube en este dispositivo? Los datos locales se conservan.")) return;
    Store.clearCloud(); syncStateText(); closeModal();
    toast("Nube desconectada", "ok");
  };
}

/* ========================= EVENTOS GLOBALES ======================= */
function bindEvents() {
  $("#login-form").addEventListener("submit", handleLogin);
  $("#btn-logout").addEventListener("click", handleLogout);
  $("#btn-sync").addEventListener("click", openCloudModal);
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });

  // Instalacion como app (PWA): el navegador ofrece el prompt.
  let deferredPrompt = null;
  const btnInstall = $("#btn-install");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); deferredPrompt = e; if (btnInstall) btnInstall.classList.remove("hidden");
  });
  window.addEventListener("appinstalled", () => { if (btnInstall) btnInstall.classList.add("hidden"); });
  if (btnInstall) btnInstall.addEventListener("click", async () => {
    if (!deferredPrompt) { toast("Usa el menu del navegador: 'Agregar a pantalla de inicio'.", ""); return; }
    deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null;
    btnInstall.classList.add("hidden");
  });

  // Menu lateral desplegable (solo movil): boton hamburguesa + fondo.
  const openNav = (on) => {
    const app = $("#app-view");
    app.classList.toggle("nav-open", !!on);
    const btn = $("#btn-menu");
    if (btn) btn.setAttribute("aria-expanded", on ? "true" : "false");
  };
  $("#btn-menu").addEventListener("click", () => openNav(!$("#app-view").classList.contains("nav-open")));
  $("#nav-backdrop").addEventListener("click", () => openNav(false));

  $("#nav").addEventListener("click", (e) => {
    const b = e.target.closest("[data-nav]");
    if (b) { route(b.dataset.nav); openNav(false); }
  });

  const content = $("#content");

  content.addEventListener("change", (e) => {
    if (e.target.id === "import-file") { handleImportFile(e.target.files[0]); e.target.value = ""; return; }
    if (e.target.id === "mem-file") { cargarTablaMem(e.target.files[0]); e.target.value = ""; return; }
    const pmEl = e.target.closest("[data-perm]");
    if (pmEl) {
      const rol = pmEl.dataset.rol, perm = pmEl.dataset.perm, val = pmEl.checked ? "Si" : "No";
      if (Store.find("permisos", (x) => x.ROL === rol && x.PERMISO === perm).length)
        Store.update("permisos", (x) => x.ROL === rol && x.PERMISO === perm, { HABILITADO: val });
      else Store.insert("permisos", { ROL: rol, PERMISO: perm, HABILITADO: val });
      addBitacora(`Permiso ${rol}.${perm}=${val}`);
      toast("Permiso actualizado", "ok");
      return;
    }
    const dbEl = e.target.closest("[data-db]");
    if (dbEl) { state.dashboard[dbEl.dataset.db] = dbEl.value; if (state.view === "tablero") renderCurrent(); return; }
    const vfEl = e.target.closest("[data-vf]");
    if (vfEl) { state.validacion[vfEl.dataset.vf] = vfEl.value; if (state.view === "validacion") renderCurrent(); return; }
    const fcEl = e.target.closest("[data-fc]");
    if (fcEl) { state.facturacion[fcEl.dataset.fc] = fcEl.value; if (state.view === "facturacion") renderCurrent(); return; }
    const fEl = e.target.closest("[data-f]");
    if (fEl) { state.consulta[fEl.dataset.f] = fEl.value; if (state.view === "consultar") renderCurrent(); return; }
    const kEl = e.target.closest("[data-key]");
    if (kEl) { state.form[kEl.dataset.key] = kEl.value; applyAutofill(kEl.dataset.key); renderCurrent(); }
  });

  content.addEventListener("click", (e) => {
    const t = e.target;
    if (t.id === "btn-save-viaje") return saveViaje();
    if (t.id === "btn-reset-viaje" || t.id === "btn-cancel-edit") { resetForm(); afterForm(); return; }
    if (t.id === "btn-export-viajes") return download("viajes.csv", toCSV(filteredViajes(), visibleViajeColumns()));
    if (t.id === "btn-flota-sync") return syncFlotaNow();
    const ft = t.closest("[data-flotatab]");
    if (ft) { state.flotaTab = ft.dataset.flotatab; renderCurrent(); return; }
    if (t.id === "btn-clear-filtros") { state.consulta = { cliente: "", status: "", desde: "", hasta: "", texto: "" }; renderCurrent(); return; }
    if (t.id === "btn-toggle-eliminados") { state.consultarEliminados = !state.consultarEliminados; renderCurrent(); return; }
    if (t.id === "btn-export-sql") return download("esquema_viajes.sql", generateSQL(), "text/plain;charset=utf-8");
    if (t.id === "btn-export-csv-all") return download("viajes.csv", toCSV(filteredViajes(), visibleViajeColumns()));
    if (t.id === "btn-plantilla") return exportTemplate();
    if (t.id === "btn-export-all") return exportAllData();
    if (t.id === "btn-cargar") { document.getElementById("import-file").click(); return; }
    if (t.id === "btn-clear-validacion") { state.validacion = { cliente: "", status: "", texto: "" }; renderCurrent(); return; }
    if (t.id === "btn-clear-facturacion") { state.facturacion = { cliente: "", texto: "" }; renderCurrent(); return; }
    if (t.id === "btn-clear-dashboard") { state.dashboard = { cliente: "", desde: "", hasta: "" }; renderCurrent(); return; }
    if (t.id === "btn-reset-permisos") { Store.db.permisos = []; Store.persist(); ensurePermisos(); toast("Permisos restablecidos", "ok"); renderCurrent(); return; }
    const tgl = t.closest("[data-tar-toggle]");
    if (tgl) {
      const i = Number(tgl.dataset.tarToggle);
      const cur = Store.all("tarifas")[i];
      const activo = !cur.ESTATUS || cur.ESTATUS === "Activo";
      Store.update("tarifas", (r, idx) => idx === i, { ESTATUS: activo ? "Inactivo" : "Activo" });
      addBitacora(`Tarifa ${cur.ID_RUTA}/${cur.OPL} -> ${activo ? "Inactivo" : "Activo"}`);
      toast(`Tarifa ${activo ? "desactivada" : "activada"}`, "ok");
      renderCurrent();
      return;
    }
    if (t.id === "btn-reset-demo") { if (confirm("¿Restablecer los datos de demostracion? Se perderan los cambios.")) { Store.reset(); ensurePermisos(); toast("Datos restablecidos", "ok"); refreshCatalogView(); } return; }

    const apro = t.closest("[data-aprobar]");
    if (apro) return aprobarViaje(apro.dataset.aprobar);
    const rech = t.closest("[data-rechazar]");
    if (rech) return openRechazarModal(rech.dataset.rechazar);
    const fact = t.closest("[data-facturar]");
    if (fact) return openFacturarModal(fact.dataset.facturar);
    const delv = t.closest("[data-del-viaje]");
    if (delv) return eliminarViaje(delv.dataset.delViaje);

    const tab = t.closest("[data-tab]");
    if (tab) { state.adminTab = tab.dataset.tab; viewAdmin(); return; }
    const ver = t.closest("[data-ver]");
    if (ver) return verViaje(ver.dataset.ver);
    const edt = t.closest("[data-edit]");
    if (edt) return startEdit(edt.dataset.edit);
    const nw = t.closest("[data-cat-new]");
    if (nw) return openCatalogForm(nw.dataset.catNew, null);
    const ed = t.closest("[data-cat-edit]");
    if (ed) return openCatalogForm(ed.dataset.catEdit, Number(ed.dataset.idx));
    const dl = t.closest("[data-cat-del]");
    if (dl) return deleteCatalogRow(dl.dataset.catDel, Number(dl.dataset.idx));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  try { Store.init(); } catch (e) { console.error("Store.init", e); }
  try { ensurePermisos(); } catch (e) { console.error("ensurePermisos", e); }
  bindEvents();
  // Si ya hay una sesion de Supabase Auth en este dispositivo, entra directo.
  try { restoreCloudSession(); } catch (e) { console.error("restoreCloudSession", e); }
  // Diagnostico visible en caso de que no haya usuarios cargados
  if (!Store.all("usuarios").length) {
    const err = $("#login-error");
    if (err) { err.textContent = "No se pudieron cargar los usuarios iniciales."; err.classList.remove("hidden"); }
  }
});
