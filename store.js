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

/* Columnas PRIVADAS: nunca se suben a la nube ni se exportan/plantilla.
 * (Las contraseñas las maneja Supabase Auth, no la base compartida.) */
const PRIVATE_COLUMNS = { usuarios: ["PASSWORD"] };

/* Configuracion del backend en la nube (Supabase). */
const CLOUD_KEY = "registro_viajes_cloud";
/* Sesion de Supabase Auth (token JWT) de este dispositivo. */
const AUTH_KEY = "registro_viajes_auth";
/* Dominio para convertir el "usuario" en email de Supabase Auth. */
const AUTH_DOMAIN_DEFAULT = "intransit.gt";

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
  session: null,
  authDomain: AUTH_DOMAIN_DEFAULT,

  /* -------------------------------------------------------------- */
  init() {
    // Config de la nube: prioridad a lo guardado en este navegador;
    // si no hay nada, usa los valores de config.js (window.APP_CONFIG).
    const cfg = (typeof window !== "undefined" && window.APP_CONFIG) || {};
    const preset = {
      url: String(cfg.SUPABASE_URL || "").trim().replace(/\/+$/, ""),
      key: String(cfg.SUPABASE_ANON_KEY || "").trim(),
    };
    this.cloud = { url: "", key: "" };
    try {
      const rawCloud = safeStorage.get(CLOUD_KEY);
      if (rawCloud) {
        const c = JSON.parse(rawCloud);
        this.cloud = { url: (c.url || "").trim(), key: (c.key || "").trim() };
      }
    } catch (e) { this.cloud = { url: "", key: "" }; }
    if (!this.cloud.url || !this.cloud.key) {
      if (preset.url && preset.key) this.cloud = preset;
    }

    // Dominio de email para el login (Supabase Auth) y sesion guardada.
    this.authDomain = String(cfg.AUTH_EMAIL_DOMAIN || AUTH_DOMAIN_DEFAULT).trim() || AUTH_DOMAIN_DEFAULT;
    this._authEnabled = !!cfg.AUTH_ENABLED;
    this.session = null;
    try {
      const rawAuth = safeStorage.get(AUTH_KEY);
      if (rawAuth) this.session = JSON.parse(rawAuth);
    } catch (e) { this.session = null; }

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

  /* Supabase Auth activo (requiere nube + AUTH_ENABLED en config.js). */
  authEnabled() { return !!(this._authEnabled && this.cloudEnabled()); },

  setCloud(url, key) {
    this.cloud = { url: (url || "").trim().replace(/\/+$/, ""), key: (key || "").trim() };
    if (this.cloudEnabled()) safeStorage.set(CLOUD_KEY, JSON.stringify(this.cloud));
    else safeStorage.remove(CLOUD_KEY);
    return this.cloud;
  },

  clearCloud() { this.cloud = { url: "", key: "" }; safeStorage.remove(CLOUD_KEY); },

  _cloudHeaders(extra) {
    // Si hay sesion iniciada (Supabase Auth) se usa su token; si no, la anon key.
    const token = (this.session && this.session.access_token) ? this.session.access_token : this.cloud.key;
    return Object.assign({
      "apikey": this.cloud.key,
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json",
    }, extra || {});
  },

  async _cloudFetch(path, opts) {
    if (!this.cloudEnabled()) throw new Error("Backend en la nube no configurado.");
    if (this.session) { try { await this.ensureToken(); } catch (e) { /* se reintenta abajo y fallara con 401 */ } }
    const base = (this.cloud.url || "").replace(/\/+$/, "");
    const res = await fetch(base + "/rest/v1/" + path, {
      method: (opts && opts.method) || "GET",
      headers: this._cloudHeaders(opts && opts.Prefer ? { Prefer: opts.Prefer } : null),
      body: opts && opts.body,
    });
    const txt = await res.text();
    if (!res.ok) {
      let detail = res.status + " " + res.statusText;
      if (res.status === 401 || res.status === 403) detail = "Sesion no valida o sin permiso. Inicia sesion de nuevo.";
      try { const j = txt ? JSON.parse(txt) : null; if (j && (j.message || j.details || j.hint)) detail += " - " + (j.message || j.details || j.hint); } catch (e) {}
      throw new Error(detail);
    }
    return txt ? JSON.parse(txt) : null;
  },

  /* ================= Supabase Auth (login con sesion) ============== */
  /* El "usuario" se convierte en un email interno (usuario@dominio). */
  emailFor(username) {
    const u = String(username || "").trim();
    return u.includes("@") ? u : u + "@" + this.authDomain;
  },

  loadSession() {
    try { const r = safeStorage.get(AUTH_KEY); this.session = r ? JSON.parse(r) : null; }
    catch (e) { this.session = null; }
    return this.session;
  },
  saveSession(s) {
    this.session = s || null;
    if (s) safeStorage.set(AUTH_KEY, JSON.stringify(s));
    else safeStorage.remove(AUTH_KEY);
  },
  clearSession() { this.saveSession(null); },

  async _authFetch(path, body) {
    const base = (this.cloud.url || "").replace(/\/+$/, "");
    const res = await fetch(base + "/auth/v1" + path, {
      method: "POST",
      headers: { "apikey": this.cloud.key, "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const txt = await res.text();
    let json = null; try { json = txt ? JSON.parse(txt) : null; } catch (e) {}
    if (!res.ok) {
      const msg = (json && (json.error_description || json.msg || json.error || json.message)) || (res.status + " " + res.statusText);
      const err = new Error(msg); err.status = res.status; throw err;
    }
    return json;
  },

  async authSignIn(username, password) {
    if (!this.cloudEnabled()) throw new Error("La nube no esta configurada.");
    const email = this.emailFor(username);
    const j = await this._authFetch("/token?grant_type=password", { email, password });
    this.saveSession({
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: Date.now() + (Number(j.expires_in || 3600) * 1000),
      email,
      username: String(username || "").trim(),
    });
    return this.session;
  },

  async authRefresh() {
    if (!this.session || !this.session.refresh_token) throw new Error("No hay sesion.");
    const j = await this._authFetch("/token?grant_type=refresh_token", { refresh_token: this.session.refresh_token });
    this.saveSession(Object.assign({}, this.session, {
      access_token: j.access_token,
      refresh_token: j.refresh_token || this.session.refresh_token,
      expires_at: Date.now() + (Number(j.expires_in || 3600) * 1000),
    }));
    return this.session;
  },

  /* Devuelve un token valido (renueva si esta por expirar). */
  async ensureToken() {
    if (!this.session) return null;
    if (Date.now() > (Number(this.session.expires_at) || 0) - 60000) await this.authRefresh();
    return this.session.access_token;
  },

  async authSignOut() {
    const tok = this.session && this.session.access_token;
    const base = (this.cloud.url || "").replace(/\/+$/, "");
    this.clearSession(); // local inmediato (no esperar a la red)
    try {
      if (tok) {
        await fetch(base + "/auth/v1/logout", {
          method: "POST",
          headers: { "apikey": this.cloud.key, "Authorization": "Bearer " + tok },
        });
      }
    } catch (e) {}
  },

  hasSession() { return !!(this.session && this.session.access_token); },

  /* Convierte cada valor a texto para que encaje con columnas TEXT.
   * Omite las columnas privadas (p. ej. contraseñas). */
  _stringify(table, row) {
    const priv = PRIVATE_COLUMNS[table] || [];
    const out = {};
    Object.keys(row).forEach((k) => {
      if (priv.includes(k)) return;
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
    await this._cloudFetch("clientes?select=*&limit=1", {});
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
      Prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify(rows.map((r) => this._stringify(table, r))),
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
      const rows = await this._cloudFetch(table + "?select=*&limit=100000", {});
      if (!Array.isArray(rows)) continue;
      const priv = PRIVATE_COLUMNS[table] || [];
      // Conserva las columnas privadas locales (p. ej. PASSWORD para modo offline).
      const localPriv = {};
      if (priv.length) {
        const keyOf = (r) => (PK[table] || []).map((k) => String(r[k])).join("|");
        this.all(table).forEach((r) => { localPriv[keyOf(r)] = priv.reduce((a, k) => { a[k] = r[k]; return a; }, {}); });
      }
      this.db[table] = rows.map((r) => {
        const row = this._coerce(table, r);
        if (priv.length) Object.assign(row, localPriv[(PK[table] || []).map((k) => String(row[k])).join("|")] || {});
        return row;
      });
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
