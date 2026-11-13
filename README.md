# BPM Bluren — Hojas de Secuencia

Aplicación web (y PWA instalable) para seguir, validar y cobrar las órdenes de trabajo y proyectos de Bluren mediante Hojas de Secuencia por área.

- **Producción:** https://secuencia-ordenes.vercel.app/
- **Repositorio:** `contactobluren/secuencia-ordenes` (rama `main`)

---

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript + Tailwind CSS.
- **Supabase**: base de datos (tablas `usuarios`, `areas`, `plantillas`, `proyectos`) y autenticación (Supabase Auth).
- **Vercel**: hosting. Cada `git push` a `main` se publica automáticamente.

---

## Funcionalidades

1. **Alta de proyectos**: código, cliente, vendedor (usuario del área Comercial), canal de venta, moneda, presupuesto, anticipo, contacto y dirección de obra.
2. **Secuencia dinámica**: los pasos se generan según la plantilla (tipo de entrada) elegida.
3. **Validación por área**: cada usuario aprueba los pasos de su área; *Admin* puede aprobar cualquiera. Se registra quién, cuándo y observaciones.
4. **Pagos**: cobros parciales de anticipo y saldo por medio de pago.
5. **Resumen y métricas**: proyectos por sector, filtros (tipo, estado, canal, vendedor) y % de avance.
6. **Configuración** (solo Admin): usuarios, áreas y secuencias.

---

## Cómo se publica un cambio

1. Modificar el código en esta carpeta.
2. Subirlo a GitHub (`git push origin main`).
3. Vercel lo despliega solo en 1–2 minutos. Verificar en https://secuencia-ordenes.vercel.app/

Si un cambio necesita columnas nuevas en Supabase, **primero** se crean en Supabase (SQL Editor) y **después** se publica el código.

---

## Desarrollo local (opcional)

Requiere el archivo `.env.local` (no se sube a GitHub) con:

```text
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_SECRET_KEY=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

```bash
npm install
npm run dev
```

Ojo: en local la app usa la **misma base de Supabase que producción**.

---

## Versión anterior (SQLite)

La versión original funcionaba en una PC de la oficina con SQLite. Ese código y los datos viejos se movieron a `D:\BMP-Bluren\archivo-version-sqlite\` y también quedan en el historial de Git.
