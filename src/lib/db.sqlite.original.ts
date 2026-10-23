/**
 * Base de datos SQLite (better-sqlite3) para BPM Bluren.
 * Ubicación: data/bpm.db
 * Optimizado para concurrencia multi-usuario en red local (WAL mode).
 */
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { PLANTILLAS, AREAS_DEFAULT, USUARIOS_DEFAULT } from "./data-seed";
import type { Area, Usuario, Proyecto, Plantilla, ProyectoPaso, PagoParcial, Moneda } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "bpm.db");
const LEGACY_JSON_PATH = path.join(DATA_DIR, "bpm.json");

const globalForDb = globalThis as unknown as {
  __sqliteDb?: Database.Database;
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function initDb(): Database.Database {
  if (globalForDb.__sqliteDb) {
    return globalForDb.__sqliteDb;
  }

  ensureDataDir();
  const db = new Database(DB_PATH);

  // Modo WAL: Permite lecturas y escrituras simultáneas en red local sin bloqueos
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  // Crear tablas principales
  db.exec(`
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
      area_id TEXT NOT NULL,
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
  `);

  // Sembrar datos iniciales o migrar desde bpm.json si la base está nueva
  seedOrMigrateIfEmpty(db);

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__sqliteDb = db;
  }

  return db;
}

function seedOrMigrateIfEmpty(db: Database.Database) {
  const rowCount = db.prepare("SELECT COUNT(*) as count FROM areas").get() as { count: number };
  if (rowCount.count > 0) {
    return; // Ya tiene datos
  }

  // 1. Si existe bpm.json, migrar todos los datos automáticamente
  if (fs.existsSync(LEGACY_JSON_PATH)) {
    try {
      const raw = fs.readFileSync(LEGACY_JSON_PATH, "utf-8");
      const legacy = JSON.parse(raw);

      const insertArea = db.prepare(`
        INSERT OR REPLACE INTO areas (id, nombre, descripcion, activo)
        VALUES (@id, @nombre, @descripcion, @activo)
      `);
      const insertUsuario = db.prepare(`
        INSERT OR REPLACE INTO usuarios (id, nombre, email, password, area_id, area_nombre, activo)
        VALUES (@id, @nombre, @email, @password, @areaId, @areaNombre, @activo)
      `);
      const insertPlantilla = db.prepare(`
        INSERT OR REPLACE INTO plantillas (id, nombre, pasos_json)
        VALUES (@id, @nombre, @pasos_json)
      `);
      const insertProyecto = db.prepare(`
        INSERT OR REPLACE INTO proyectos (
          id, codigo_proyecto, titulo, nombre_cliente, canal_venta, moneda,
          presupuesto_estimado, monto_anticipo, monto_saldo, email_contacto,
          telefono, direccion_obra, notas, plantilla_id, plantilla_nombre,
          pasos_json, pagos_json, estado_general, created_at, creado_por
        ) VALUES (
          @id, @codigo_proyecto, @titulo, @nombre_cliente, @canal_venta, @moneda,
          @presupuesto_estimado, @monto_anticipo, @monto_saldo, @email_contacto,
          @telefono, @direccion_obra, @notas, @plantilla_id, @plantilla_nombre,
          @pasos_json, @pagos_json, @estado_general, @created_at, @creado_por
        )
      `);

      const migrationTx = db.transaction(() => {
        // Áreas
        for (const a of legacy.areas || []) {
          insertArea.run({
            id: a.id,
            nombre: a.nombre,
            descripcion: a.descripcion || null,
            activo: a.activo !== false ? 1 : 0,
          });
        }
        // Usuarios
        for (const u of legacy.usuarios || []) {
          insertUsuario.run({
            id: u.id,
            nombre: u.nombre,
            email: u.email,
            password: u.password || "1234",
            areaId: u.areaId || "a1",
            areaNombre: u.areaNombre || "Comercial",
            activo: u.activo !== false ? 1 : 0,
          });
        }
        // Plantillas
        for (const p of legacy.plantillas || []) {
          insertPlantilla.run({
            id: p.id,
            nombre: p.nombre,
            pasos_json: JSON.stringify(p.pasos || []),
          });
        }
        // Proyectos
        for (const pr of legacy.proyectos || []) {
          const presup =
            typeof pr.presupuesto_estimado === "number"
              ? pr.presupuesto_estimado
              : Number(String(pr.presupuesto_estimado || "0").replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
          const anticipo =
            typeof pr.monto_anticipo === "number"
              ? pr.monto_anticipo
              : Number(pr.monto_anticipo) || 0;
          insertProyecto.run({
            id: pr.id,
            codigo_proyecto: pr.codigo_proyecto,
            titulo: pr.titulo || pr.nombre_cliente || "",
            nombre_cliente: pr.nombre_cliente,
            canal_venta: pr.canal_venta || null,
            moneda: pr.moneda || "ARS",
            presupuesto_estimado: presup,
            monto_anticipo: anticipo,
            monto_saldo: pr.monto_saldo != null ? Number(pr.monto_saldo) : null,
            email_contacto: pr.email_contacto || null,
            telefono: pr.telefono || null,
            direccion_obra: pr.direccion_obra || null,
            notas: pr.notas || null,
            plantilla_id: pr.plantilla_id,
            plantilla_nombre: pr.plantilla_nombre,
            pasos_json: JSON.stringify(pr.pasos || []),
            pagos_json: JSON.stringify(pr.pagos || []),
            estado_general: pr.estado_general || "En curso",
            created_at: pr.created_at || new Date().toISOString(),
            creado_por: pr.creado_por || null,
          });
        }
      });

      migrationTx();
      console.log("[SQLite] Datos migrados exitosamente desde bpm.json a data/bpm.db");
      return;
    } catch (err) {
      console.error("[SQLite] Error al migrar desde bpm.json, sembrando valores por defecto:", err);
    }
  }

  // 2. Si no hay bpm.json, sembrar defaults
  const seedTx = db.transaction(() => {
    const insertArea = db.prepare(
      "INSERT INTO areas (id, nombre, descripcion, activo) VALUES (@id, @nombre, @descripcion, @activo)"
    );
    for (const a of AREAS_DEFAULT) {
      insertArea.run({ id: a.id, nombre: a.nombre, descripcion: a.descripcion || null, activo: a.activo ? 1 : 0 });
    }
    const insertUsuario = db.prepare(
      "INSERT INTO usuarios (id, nombre, email, password, area_id, area_nombre, activo) VALUES (@id, @nombre, @email, @password, @areaId, @areaNombre, @activo)"
    );
    for (const u of USUARIOS_DEFAULT) {
      insertUsuario.run({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        password: u.password,
        areaId: u.areaId,
        areaNombre: u.areaNombre,
        activo: u.activo ? 1 : 0,
      });
    }
    const insertPlantilla = db.prepare(
      "INSERT INTO plantillas (id, nombre, pasos_json) VALUES (@id, @nombre, @pasos_json)"
    );
    for (const p of PLANTILLAS) {
      insertPlantilla.run({ id: p.id, nombre: p.nombre, pasos_json: JSON.stringify(p.pasos) });
    }
  });

  seedTx();
  console.log("[SQLite] Base de datos data/bpm.db inicializada con datos semilla");
}

export function getDatabase(): Database.Database {
  return initDb();
}

// -------------------------------------------------------------
// Áreas
// -------------------------------------------------------------

export async function dbLoadAreas(): Promise<Area[]> {
  const db = getDatabase();
  const rows = db.prepare("SELECT id, nombre, descripcion, activo FROM areas ORDER BY nombre ASC").all() as any[];
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion || undefined,
    activo: Boolean(r.activo),
  }));
}

export async function dbUpsertArea(area: Area): Promise<void> {
  const db = getDatabase();
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO areas (id, nombre, descripcion, activo)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nombre = excluded.nombre,
        descripcion = excluded.descripcion,
        activo = excluded.activo
    `).run(area.id, area.nombre, area.descripcion || null, area.activo ? 1 : 0);

    // Sincronizar nombre en usuarios
    db.prepare("UPDATE usuarios SET area_nombre = ? WHERE area_id = ?").run(area.nombre, area.id);
  });
  tx();
}

export async function dbDeleteArea(id: string): Promise<void> {
  const db = getDatabase();
  db.prepare("DELETE FROM areas WHERE id = ?").run(id);
}

// -------------------------------------------------------------
// Usuarios
// -------------------------------------------------------------

export async function dbLoadUsuarios(): Promise<Usuario[]> {
  const db = getDatabase();
  const rows = db
    .prepare(
      "SELECT id, nombre, email, password, area_id AS areaId, area_nombre AS areaNombre, activo FROM usuarios ORDER BY nombre ASC"
    )
    .all() as any[];
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    email: r.email,
    password: r.password,
    areaId: r.areaId,
    areaNombre: r.areaNombre,
    activo: Boolean(r.activo),
  }));
}

export async function dbUpsertUsuario(u: Usuario): Promise<void> {
  const db = getDatabase();
  const existing = db.prepare("SELECT password FROM usuarios WHERE id = ?").get(u.id) as { password?: string } | undefined;
  const passwordToUse = u.password || existing?.password || "1234";

  db.prepare(`
    INSERT INTO usuarios (id, nombre, email, password, area_id, area_nombre, activo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      nombre = excluded.nombre,
      email = excluded.email,
      password = excluded.password,
      area_id = excluded.area_id,
      area_nombre = excluded.area_nombre,
      activo = excluded.activo
  `).run(u.id, u.nombre, u.email, passwordToUse, u.areaId, u.areaNombre, u.activo ? 1 : 0);
}

export async function dbDeleteUsuario(id: string): Promise<void> {
  const db = getDatabase();
  db.prepare("DELETE FROM usuarios WHERE id = ?").run(id);
}

export async function dbAuthenticate(email: string, password: string): Promise<Usuario | null> {
  const db = getDatabase();
  const row = db
    .prepare(
      "SELECT id, nombre, email, password, area_id AS areaId, area_nombre AS areaNombre, activo FROM usuarios WHERE LOWER(email) = LOWER(?) AND password = ? AND activo = 1"
    )
    .get(email, password) as any;
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    password: row.password,
    areaId: row.areaId,
    areaNombre: row.areaNombre,
    activo: Boolean(row.activo),
  };
}

// -------------------------------------------------------------
// Plantillas
// -------------------------------------------------------------

export async function dbLoadPlantillas(): Promise<Plantilla[]> {
  const db = getDatabase();
  const rows = db.prepare("SELECT id, nombre, pasos_json FROM plantillas ORDER BY nombre ASC").all() as any[];
  return rows.map((r) => {
    let pasos = [];
    try {
      pasos = JSON.parse(r.pasos_json);
    } catch {}
    return {
      id: r.id,
      nombre: r.nombre,
      pasos,
    };
  });
}

export async function dbUpsertPlantilla(plantilla: Plantilla): Promise<void> {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO plantillas (id, nombre, pasos_json)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      nombre = excluded.nombre,
      pasos_json = excluded.pasos_json
  `).run(plantilla.id, plantilla.nombre, JSON.stringify(plantilla.pasos || []));
}

export async function dbDeletePlantilla(id: string): Promise<void> {
  const db = getDatabase();
  db.prepare("DELETE FROM plantillas WHERE id = ?").run(id);
}

// -------------------------------------------------------------
// Proyectos
// -------------------------------------------------------------

function mapProyectoRow(r: any): Proyecto {
  let pasos: ProyectoPaso[] = [];
  try {
    pasos = JSON.parse(r.pasos_json);
  } catch {}

  let pagos: PagoParcial[] = [];
  try {
    pagos = JSON.parse(r.pagos_json);
  } catch {}

  return {
    id: r.id,
    codigo_proyecto: r.codigo_proyecto,
    titulo: r.titulo || r.nombre_cliente || "",
    nombre_cliente: r.nombre_cliente,
    canal_venta: r.canal_venta || "",
    moneda: (r.moneda as Moneda) || "ARS",
    presupuesto_estimado: Number(r.presupuesto_estimado) || 0,
    monto_anticipo: Number(r.monto_anticipo) || 0,
    monto_saldo: r.monto_saldo != null ? Number(r.monto_saldo) : undefined,
    email_contacto: r.email_contacto || "",
    telefono: r.telefono || "",
    direccion_obra: r.direccion_obra || "",
    notas: r.notas || "",
    plantilla_id: r.plantilla_id,
    plantilla_nombre: r.plantilla_nombre,
    pasos,
    pagos,
    estado_general: r.estado_general || "En curso",
    created_at: r.created_at,
    creado_por: r.creado_por || undefined,
  };
}

export async function dbLoadProyectos(): Promise<Proyecto[]> {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM proyectos ORDER BY created_at DESC").all() as any[];
  return rows.map(mapProyectoRow);
}

export async function dbGetProyecto(id: string): Promise<Proyecto | undefined> {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM proyectos WHERE id = ?").get(id) as any;
  return row ? mapProyectoRow(row) : undefined;
}

export async function dbUpsertProyecto(proyecto: Proyecto): Promise<void> {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO proyectos (
      id, codigo_proyecto, titulo, nombre_cliente, canal_venta, moneda,
      presupuesto_estimado, monto_anticipo, monto_saldo, email_contacto,
      telefono, direccion_obra, notas, plantilla_id, plantilla_nombre,
      pasos_json, pagos_json, estado_general, created_at, creado_por
    ) VALUES (
      @id, @codigo_proyecto, @titulo, @nombre_cliente, @canal_venta, @moneda,
      @presupuesto_estimado, @monto_anticipo, @monto_saldo, @email_contacto,
      @telefono, @direccion_obra, @notas, @plantilla_id, @plantilla_nombre,
      @pasos_json, @pagos_json, @estado_general, @created_at, @creado_por
    )
    ON CONFLICT(id) DO UPDATE SET
      codigo_proyecto = excluded.codigo_proyecto,
      titulo = excluded.titulo,
      nombre_cliente = excluded.nombre_cliente,
      canal_venta = excluded.canal_venta,
      moneda = excluded.moneda,
      presupuesto_estimado = excluded.presupuesto_estimado,
      monto_anticipo = excluded.monto_anticipo,
      monto_saldo = excluded.monto_saldo,
      email_contacto = excluded.email_contacto,
      telefono = excluded.telefono,
      direccion_obra = excluded.direccion_obra,
      notas = excluded.notas,
      plantilla_id = excluded.plantilla_id,
      plantilla_nombre = excluded.plantilla_nombre,
      pasos_json = excluded.pasos_json,
      pagos_json = excluded.pagos_json,
      estado_general = excluded.estado_general,
      creado_por = excluded.creado_por
  `).run({
    id: proyecto.id,
    codigo_proyecto: proyecto.codigo_proyecto,
    titulo: proyecto.titulo || proyecto.nombre_cliente || "",
    nombre_cliente: proyecto.nombre_cliente,
    canal_venta: proyecto.canal_venta || null,
    moneda: proyecto.moneda || "ARS",
    presupuesto_estimado: Number(proyecto.presupuesto_estimado) || 0,
    monto_anticipo: Number(proyecto.monto_anticipo) || 0,
    monto_saldo: proyecto.monto_saldo != null ? Number(proyecto.monto_saldo) : null,
    email_contacto: proyecto.email_contacto || null,
    telefono: proyecto.telefono || null,
    direccion_obra: proyecto.direccion_obra || null,
    notas: proyecto.notas || null,
    plantilla_id: proyecto.plantilla_id,
    plantilla_nombre: proyecto.plantilla_nombre,
    pasos_json: JSON.stringify(proyecto.pasos || []),
    pagos_json: JSON.stringify(proyecto.pagos || []),
    estado_general: proyecto.estado_general || "En curso",
    created_at: proyecto.created_at || new Date().toISOString(),
    creado_por: proyecto.creado_por || null,
  });
}

export async function dbDeleteProyecto(id: string): Promise<void> {
  const db = getDatabase();
  db.prepare("DELETE FROM proyectos WHERE id = ?").run(id);
}

export function getDbPath() {
  return DB_PATH;
}

export function newId() {
  return randomUUID();
}
