/* =====================================================================
 * store.js - Capa de datos del prototipo
 * ---------------------------------------------------------------------
 * Modos de operacion:
 *   1) LOCAL (por defecto) : los datos viven en el navegador (localStorage).
 *      Es el modo con el que funciona el prototipo HOY, sin configurar nada.
 *   2) SYNC con Excel en OneDrive/SharePoint (o Google Sheet):
 *      Se define una URL de un flujo (Power Automate / Apps Script) que lee
 *      y escribe el libro de Excel en la nube. El modo local sigue siendo la
 *      fuente de verdad; el remoto se usa para EMPUJAR (push) y JALAR (pull).
 *
 * Contrato esperado del endpoint remoto (POST JSON):
 *   { action: "list" | "upsert" | "replace", table: "viajes", payload: [] }
 *   Respuesta: { ok: true, rows: [...] }
 *
 * Las tablas del libro deben llamarse igual que aqui: clientes, pilotos,
 * unidades, rutas, usuarios, usuario_cliente, viajes, bitacora.
 * ===================================================================== */

const DB_KEY = "registro_viajes_db_v9";
const SYNC_KEY = "registro_viajes_sync_url";

const TABLES = [
  "clientes", "pilotos", "proveedores", "unidades", "rutas", "tarifas", "mem",
  "usuarios", "usuario_cliente", "viajes", "bitacora", "permisos",
];

/* Columnas oficiales de la tabla VIAJES (para CSV/SQL y export) --------- */
const VIAJES_COLUMNS = [
  "ID_VIAJE", "UNIDAD", "TC", "PILOTO", "ORIGEN", "DESTINO",
  "No. TRANSPORTE", "STATUS", "CARGA_VIAJE", "CAPACIDAD_CARGA",
  "TIPO_DE_CARGA", "FECHA_PLAN", "KM", "OBSERVACIONES", "OPL",
  "CLIENTE_PADRE", "CLIENTE", "ID-CLIENTE", "Viáticos", "TIPO_RUTA",
  "FECHA_FIN", "CODIGO_VIAJE",
];

/* Columnas de flujo de aprobacion/facturacion y auditoria de baja */
const VIAJES_WORKFLOW_COLUMNS = [
  "REVISADO_POR", "FECHA_REVISION", "NUMERO_FACTURA", "FECHA_FACTURA", "COMENTARIO_VALIDACION",
  "ELIMINADO", "ELIMINADO_POR", "FECHA_ELIMINACION",
];

/* Columnas de tarifa/combustible cargadas automaticamente al viaje.
 * Son confidenciales: solo las ven facturacion, revisor y admin. */
const VIAJES_TARIFA_COLUMNS = [
  "TARIFA_CLIENTE", "TARIFA_OPL", "Q_DIESEL_PACTADO", "COMBUSTIBLE_PCT",
  "PRECIO_MEM", "AJUSTE_COMBUSTIBLE", "AJUSTE_COMBUSTIBLE_OPL",
];

const VIAJES_ALL_COLUMNS = VIAJES_COLUMNS.concat(VIAJES_WORKFLOW_COLUMNS, VIAJES_TARIFA_COLUMNS);

/* Clave primaria por tabla (para sincronizar en la nube y generar el esquema). */
const PK = {
  clientes: ["ID_CLIENTE"], pilotos: ["PILOTO"], proveedores: ["OPL"], unidades: ["UNIDAD"],
  rutas: ["ID_RUTA"], tarifas: ["ID_RUTA", "OPL"], mem: ["FECHA"],
  usuarios: ["ID_USUARIO"], usuario_cliente: ["ID_USUARIO", "ID_CLIENTE"],
  viajes: ["ID_VIAJE"], bitacora: ["ID_BITACORA"], permisos: ["ROL", "PERMISO"],
};

/* Columnas numericas por tabla (para import y sincronizacion). */
const NUMERIC_COLS = {
  viajes: ["CARGA_VIAJE", "CAPACIDAD_CARGA", "KM", "Viáticos"],
  unidades: ["CAPACIDAD_CARGA"],
  rutas: ["KM"],
  tarifas: ["TARIFA_CLIENTE", "TARIFA_OPL", "COMBUSTIBLE_PCT", "Q_DIESEL_PACTADO"],
  mem: ["PRECIO_DIESEL"],
};

/* Configuracion del backend en la nube (Supabase). */
const CLOUD_KEY = "registro_viajes_cloud";

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

/* Almacenamiento a prueba de fallos: si el navegador bloquea localStorage
 * (algunos previsualizadores / modo privado), se usa memoria en RAM para que
 * la app siga funcionando igual dentro de la sesion. */
const _mem = {};
const safeStorage = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return Object.prototype.hasOwnProperty.call(_mem, k) ? _mem[k] : null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { _mem[k] = v; } },
  remove(k) { try { localStorage.removeItem(k); } catch (e) { delete _mem[k]; } },
};

const Store = {
  db: null,
  syncUrl: safeStorage.get(SYNC_KEY) || "",
  cloud: { url: "", key: "" },

  /* -------------------------------------------------------------- */
  init() {
    // Config de la nube (si esta guardada)
    try {
      const rawCloud = safeStorage.get(CLOUD_KEY);
      if (rawCloud) { const c = JSON.parse(rawCloud); this.cloud = { url: (c.url || "").trim(), key: (c.key || "").trim() }; }
    } catch (e) { this.cloud = { url: "", key: "" }; }

    let raw = null;
    try { raw = safeStorage.get(DB_KEY); } catch (e) { raw = null; }
    if (raw) {
      try { this.db = JSON.parse(raw); }
      catch (e) { this.db = clone(SEED); }
    } else {
      this.db = clone(SEED);
      this.persist();
    }
    // Garantiza que existan todas las tablas
    TABLES.forEach((t) => { if (!Array.isArray(this.db[t])) this.db[t] = []; });
    // Si por cualquier motivo no hay usuarios, recarga desde el seed
    if (!this.db.usuarios || !this.db.usuarios.length) this.db.usuarios = clone(SEED.usuarios);
    return this;
  },

  persist() { safeStorage.set(DB_KEY, JSON.stringify(this.db)); },

  /* ----------------------- Operaciones CRUD ---------------------- */
  all(table) { return this.db[table] || []; },

  /* Devuelve filas que cumplen el predicado (o todas). */
  find(table, predicate) {
    const rows = this.all(table);
    return predicate ? rows.filter(predicate) : rows;
  },

  insert(table, row) {
    this.db[table].push(row);
    this.persist();
    this.push(table).catch(() => {});
    return row;
  },

  /* Actualiza las filas que cumplan el predicado con los campos de patch. */
  update(table, predicate, patch) {
    let n = 0;
    this.db[table].forEach((row, i) => {
      if (predicate(row, i)) { Object.assign(row, patch); n++; }
    });
    if (n) { this.persist(); this.push(table).catch(() => {}); }
    return n;
  },

  remove(table, predicate) {
    const before = this.db[table].length;
    this.db[table] = this.db[table].filter((row, i) => !predicate(row, i));
    if (this.db[table].length !== before) { this.persist(); this.push(table).catch(() => {}); }
    return before - this.db[table].length;
  },

  /* Genera el siguiente folio de una tabla: prefijo + numero consecutivo. */
  nextId(table, idField, prefix, pad = 5) {
    let max = 0;
    this.all(table).forEach((r) => {
      const m = String(r[idField] || "").match(/(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return `${prefix}${String(max + 1).padStart(pad, "0")}`;
  },

  reset() {
    this.db = clone(SEED);
    this.persist();
    return this.db;
  },

  /* ============ Sincronizacion con backend en la nube ============= */
  /* Modo A: Supabase (REST/PostgREST) -> datos compartidos entre todos
   * los dispositivos. Modo B (respaldo): endpoint tipo Excel/Power
   * Automate via URL. Si no hay nada configurado, la app es 100% local. */

  setSyncUrl(url) {
    this.syncUrl = (url || "").trim();
    if (this.syncUrl) safeStorage.set(SYNC_KEY, this.syncUrl);
    else safeStorage.remove(SYNC_KEY);
  },

  /* ---- Config del backend Supabase ---- */
  cloudEnabled() { return !!(this.cloud.url && this.cloud.key); },

  setCloud(url, key) {
    this.cloud = { url: (url || "").trim().replace(/\/+$/, ""), key: (key || "").trim() };
    if (this.cloudEnabled()) safeStorage.set(CLOUD_KEY, JSON.stringify(this.cloud));
    else safeStorage.remove(CLOUD_KEY);
    return this.cloud;
  },

  clearCloud() { this.cloud = { url: "", key: "" }; safeStorage.remove(CLOUD_KEY); },

  _cloudHeaders(extra) {
    return Object.assign({
      "apikey": this.cloud.key,
      "Authorization": "Bearer " + this.cloud.key,
      "Content-Type": "application/json",
    }, extra || {});
  },

  async _cloudFetch(path, opts) {
    if (!this.cloudEnabled()) throw new Error("Backend en la nube no configurado.");
    const base = (this.cloud.url || "").replace(/\/+$/, "");
    const res = await fetch(base + "/rest/v1/" + path, opts);
    if (!res.ok) {
      let detail = res.status + " " + res.statusText;
      try { const j = await res.json(); if (j && (j.message || j.details || j.hint)) detail += " - " + (j.message || j.details || j.hint); } catch (e) {}
      throw new Error(detail);
    }
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  },

  /* Convierte cada valor a texto para que encaje con columnas TEXT. */
  _stringify(row) {
    const out = {};
    Object.keys(row).forEach((k) => {
      const v = row[k];
      out[k] = (v === null || v === undefined) ? null : String(v);
    });
    return out;
  },

  /* Aplica el tipo numerico a las columnas conocidas tras descargar. */
  _coerce(table, row) {
    const nums = NUMERIC_COLS[table] || [];
    const out = {};
    Object.keys(row).forEach((k) => {
      let v = row[k];
      if (v === null || v === undefined) { out[k] = ""; return; }
      if (nums.includes(k) && v !== "" && !isNaN(Number(v))) v = Number(v);
      out[k] = v;
    });
    return out;
  },

  /* Prueba de conexion: intenta leer una fila de "clientes". */
  async cloudTest() {
    await this._cloudFetch("clientes?select=*&limit=1", { headers: this._cloudHeaders() });
    return true;
  },

  /* Sube (upsert) una tabla completa a Supabase. */
  async cloudPushTable(table) {
    const rows = this.all(table);
    if (!rows.length) return { ok: true, table, count: 0 };
    const pk = (PK[table] || []).join(",");
    const qs = pk ? ("?on_conflict=" + encodeURIComponent(pk)) : "";
    await this._cloudFetch(table + qs, {
      method: "POST",
      headers: this._cloudHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(rows.map((r) => this._stringify(r))),
    });
    return { ok: true, table, count: rows.length };
  },

  /* Sube todas las tablas. */
  async cloudPushAll() {
    const res = [];
    for (const table of TABLES) res.push(await this.cloudPushTable(table));
    return res;
  },

  /* Descarga todas las tablas y reemplaza las locales. */
  async cloudPullAll() {
    for (const table of TABLES) {
      const rows = await this._cloudFetch(table + "?select=*&limit=100000", { headers: this._cloudHeaders() });
      if (Array.isArray(rows)) this.db[table] = rows.map((r) => this._coerce(table, r));
    }
    this.persist();
    return this.db;
  },

  /* ---- Empuje automatico al guardar (usa nube o el endpoint legacy) ---- */
  async push(table) {
    if (this.cloudEnabled()) {
      try { return await this.cloudPushTable(table); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (!this.syncUrl) return { ok: false, skipped: true };
    const res = await fetch(this.syncUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "replace", table, payload: this.all(table) }),
    });
    return res.json();
  },

  async pullAll() {
    if (this.cloudEnabled()) return this.cloudPullAll();
    if (!this.syncUrl) throw new Error("No hay backend de sincronizacion configurado.");
    for (const table of TABLES) {
      const res = await fetch(this.syncUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", table }),
      });
      const json = await res.json();
      if (json && Array.isArray(json.rows)) this.db[table] = json.rows;
    }
    this.persist();
    return this.db;
  },
};
