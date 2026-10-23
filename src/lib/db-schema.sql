-- ==============================================================================
-- BPM Bluren — Schema SQLite (data/bpm.db)
-- Soporta concurrencia en Intranet (WAL mode)
-- ==============================================================================

PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  area_id TEXT NOT NULL REFERENCES areas(id),
  area_nombre TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS plantillas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  pasos_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proyectos (
  id TEXT PRIMARY KEY,
  codigo_proyecto TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  nombre_cliente TEXT NOT NULL,
  canal_venta TEXT,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  presupuesto_estimado REAL NOT NULL DEFAULT 0,
  monto_anticipo REAL NOT NULL DEFAULT 0,
  monto_saldo REAL,
  email_contacto TEXT,
  telefono TEXT,
  direccion_obra TEXT,
  notas TEXT,
  plantilla_id TEXT NOT NULL,
  plantilla_nombre TEXT NOT NULL,
  pasos_json TEXT NOT NULL,
  pagos_json TEXT NOT NULL DEFAULT '[]',
  estado_general TEXT NOT NULL DEFAULT 'En curso',
  created_at TEXT NOT NULL,
  creado_por TEXT
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_proyectos_codigo ON proyectos(codigo_proyecto);
CREATE INDEX IF NOT EXISTS idx_proyectos_created_at ON proyectos(created_at);
