"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiLoadProyectos } from "@/lib/api-client";
import { Proyecto } from "@/lib/types";
import { calcularAvance, getPasoActual } from "@/lib/workflow";
import { formatMonto } from "@/lib/money";
import { colorPorArea } from "@/lib/areaColors";
import {
  FolderOpen,
  Clock,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Banknote,
  UserRound,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

const DIA_MS = 24 * 60 * 60 * 1000;

type Periodo = "mes" | "mes_anterior" | "3meses" | "anio" | "todo";

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "mes", label: "Este mes" },
  { value: "mes_anterior", label: "Mes anterior" },
  { value: "3meses", label: "Últimos 3 meses" },
  { value: "anio", label: "Este año" },
  { value: "todo", label: "Todo" },
];

/** Rango [desde, hasta) del período elegido. null = sin límite. */
function rangoPeriodo(p: Periodo): { desde: number | null; hasta: number | null } {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  switch (p) {
    case "mes":
      return { desde: new Date(y, m, 1).getTime(), hasta: null };
    case "mes_anterior":
      return { desde: new Date(y, m - 1, 1).getTime(), hasta: new Date(y, m, 1).getTime() };
    case "3meses":
      return { desde: new Date(y, m - 2, 1).getTime(), hasta: null };
    case "anio":
      return { desde: new Date(y, 0, 1).getTime(), hasta: null };
    default:
      return { desde: null, hasta: null };
  }
}

function enRango(iso: string | undefined, r: { desde: number | null; hasta: number | null }) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (r.desde != null && t < r.desde) return false;
  if (r.hasta != null && t >= r.hasta) return false;
  return true;
}

function mediana(valores: number[]) {
  if (valores.length === 0) return 0;
  const s = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function sumaPagos(p: Proyecto, r?: { desde: number | null; hasta: number | null }) {
  return (p.pagos || [])
    .filter((pg) => !r || enRango(pg.fecha, r))
    .reduce((s, pg) => s + (Number(pg.monto) || 0), 0);
}

/** Fecha desde la que el proyecto está en su paso actual. */
function inicioPasoActual(p: Proyecto): number {
  let ultimo = new Date(p.created_at).getTime() || 0;
  for (const paso of p.pasos) {
    if (paso.estado === "Aprobado" && paso.validacion?.fecha_hora) {
      ultimo = Math.max(ultimo, new Date(paso.validacion.fecha_hora).getTime() || 0);
    }
    if (paso.ultimo_reverso?.fecha_hora) {
      ultimo = Math.max(ultimo, new Date(paso.ultimo_reverso.fecha_hora).getTime() || 0);
    }
  }
  return ultimo;
}

function formatDias(d: number) {
  if (d < 1) return `${Math.round(d * 24)} h`;
  return `${Math.round(d * 10) / 10} días`;
}

/** Montos agrupados por moneda, mostrados en líneas. */
function MontosPorMoneda({ valores, className }: { valores: Record<string, number>; className?: string }) {
  const entradas = Object.entries(valores).filter(([, v]) => Math.abs(v) > 0.004);
  if (entradas.length === 0) return <div className={className}>{formatMonto(0, "ARS")}</div>;
  return (
    <div className={className}>
      {entradas.map(([moneda, v]) => (
        <div key={moneda}>{formatMonto(v, moneda)}</div>
      ))}
    </div>
  );
}

function sumarEn(acc: Record<string, number>, moneda: string, monto: number) {
  acc[moneda] = Math.round(((acc[moneda] || 0) + monto) * 100) / 100;
}

const cardClass = "bg-[#121a2b] rounded-2xl border border-slate-800 p-5";
const selectClass =
  "px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500";

export default function MetricasPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>("todo");
  const [diasTrabado, setDiasTrabado] = useState(7);
  const [tipoEficiencia, setTipoEficiencia] = useState("");

  useEffect(() => {
    apiLoadProyectos()
      .then(setProyectos)
      .catch(console.error)
      .finally(() => setCargando(false));
  }, []);

  const rango = useMemo(() => rangoPeriodo(periodo), [periodo]);

  /** Proyectos dados de alta en el período, sin cancelados. */
  const delPeriodo = useMemo(
    () =>
      proyectos.filter(
        (p) => p.estado_general !== "Cancelado" && (periodo === "todo" || enRango(p.created_at, rango))
      ),
    [proyectos, periodo, rango]
  );

  const activos = useMemo(() => proyectos.filter((p) => p.estado_general === "En curso"), [proyectos]);

  // --- Indicadores principales ---
  const kpis = useMemo(() => {
    const completados = delPeriodo.filter((p) => p.estado_general === "Completado").length;
    const avanceActivos =
      activos.length === 0
        ? 0
        : Math.round(activos.reduce((s, p) => s + calcularAvance(p.pasos), 0) / activos.length);
    return { nuevos: delPeriodo.length, activos: activos.length, completados, avanceActivos };
  }, [delPeriodo, activos]);

  // --- Cobranzas ---
  const cobranzas = useMemo(() => {
    const vendido: Record<string, number> = {};
    const cobrado: Record<string, number> = {};
    const pendiente: Record<string, number> = {};
    for (const p of delPeriodo) {
      sumarEn(vendido, String(p.moneda || "ARS"), Number(p.presupuesto_estimado) || 0);
    }
    for (const p of proyectos) {
      if (p.estado_general === "Cancelado") continue;
      const moneda = String(p.moneda || "ARS");
      sumarEn(cobrado, moneda, sumaPagos(p, periodo === "todo" ? undefined : rango));
      const falta = (Number(p.presupuesto_estimado) || 0) - sumaPagos(p);
      if (falta > 0.004) sumarEn(pendiente, moneda, falta);
    }
    return { vendido, cobrado, pendiente };
  }, [proyectos, delPeriodo, periodo, rango]);

  // --- Ventas por vendedor ---
  const porVendedor = useMemo(() => {
    const map = new Map<string, { nombre: string; cantidad: number; montos: Record<string, number> }>();
    for (const p of delPeriodo) {
      const key = p.vendedor_id || "__sin__";
      const nombre = p.vendedor_id ? p.vendedor_nombre || "Sin nombre" : "Sin vendedor";
      if (!map.has(key)) map.set(key, { nombre, cantidad: 0, montos: {} });
      const item = map.get(key)!;
      item.cantidad++;
      sumarEn(item.montos, String(p.moneda || "ARS"), Number(p.presupuesto_estimado) || 0);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (a.id === "__sin__" ? 1 : b.id === "__sin__" ? -1 : b.cantidad - a.cantidad));
  }, [delPeriodo]);
  const maxVendedor = Math.max(1, ...porVendedor.map((v) => v.cantidad));

  // --- Proyectos trabados ---
  const trabados = useMemo(() => {
    const ahora = Date.now();
    return activos
      .map((p) => {
        const actual = getPasoActual(p.pasos);
        return {
          proyecto: p,
          paso: actual,
          dias: (ahora - inicioPasoActual(p)) / DIA_MS,
        };
      })
      .filter((t) => t.dias >= diasTrabado)
      .sort((a, b) => b.dias - a.dias);
  }, [activos, diasTrabado]);

  // --- Proyectos por tipo ---
  const porTipo = useMemo(() => {
    const map: Record<string, number> = {};
    delPeriodo.forEach((p) => {
      map[p.plantilla_nombre] = (map[p.plantilla_nombre] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [delPeriodo]);
  const maxTipo = Math.max(1, ...porTipo.map(([, n]) => n));

  // --- Tiempo por paso (mediana en días) ---
  const tipos = useMemo(() => {
    const map = new Map<string, string>();
    proyectos.forEach((p) => map.set(p.plantilla_id, p.plantilla_nombre));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [proyectos]);

  const tiempoPorPaso = useMemo(() => {
    const buckets = new Map<string, { orden: number; area: string; dias: number[] }>();
    for (const p of proyectos) {
      if (p.estado_general === "Cancelado") continue;
      if (tipoEficiencia && p.plantilla_id !== tipoEficiencia) continue;
      const pasos = [...p.pasos].sort((a, b) => a.orden - b.orden);
      let anterior = new Date(p.created_at).getTime();
      for (const paso of pasos) {
        if (paso.estado !== "Aprobado" || !paso.validacion?.fecha_hora) break;
        const t = new Date(paso.validacion.fecha_hora).getTime();
        if (Number.isNaN(t) || Number.isNaN(anterior)) break;
        const dias = (t - anterior) / DIA_MS;
        anterior = t;
        if (dias < 0) continue;
        if (!buckets.has(paso.nombre_hito)) {
          buckets.set(paso.nombre_hito, { orden: paso.orden, area: paso.area_responsable, dias: [] });
        }
        buckets.get(paso.nombre_hito)!.dias.push(dias);
      }
    }
    return Array.from(buckets.entries())
      .map(([hito, b]) => ({ hito, area: b.area, orden: b.orden, mediana: mediana(b.dias), muestras: b.dias.length }))
      .sort((a, b) => (tipoEficiencia ? a.orden - b.orden : b.mediana - a.mediana));
  }, [proyectos, tipoEficiencia]);

  if (cargando) {
    return <p className="text-slate-500 py-20 text-center">Cargando métricas...</p>;
  }

  const etiquetaPeriodo = PERIODOS.find((p) => p.value === periodo)?.label ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Métricas</h1>
          <p className="text-sm text-slate-500 mt-1">Ventas, cobranzas y tiempos de proceso</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400">
          Período
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} className={selectClass}>
            {PERIODOS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Proyectos nuevos", hint: etiquetaPeriodo, value: kpis.nuevos, icon: FolderOpen, color: "text-blue-400" },
          { label: "En curso", hint: "hoy", value: kpis.activos, icon: Clock, color: "text-amber-400" },
          { label: "Completados", hint: etiquetaPeriodo, value: kpis.completados, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Avance promedio", hint: "proyectos en curso", value: `${kpis.avanceActivos}%`, icon: TrendingUp, color: "text-violet-400" },
        ].map((k) => (
          <div key={k.label} className="bg-[#121a2b] rounded-2xl border border-slate-800 p-4 shadow-sm">
            <div className={`flex items-center gap-2 text-xs font-medium mb-1 ${k.color}`}>
              <k.icon className="w-4 h-4" /> {k.label}
            </div>
            <div className="text-2xl font-bold text-white">{k.value}</div>
            <div className="text-[11px] text-slate-500">{k.hint}</div>
          </div>
        ))}
      </div>

      {/* Cobranzas */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <Banknote className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-200">Cobranzas</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-4">
            <div className="text-xs text-slate-400">Vendido</div>
            <MontosPorMoneda valores={cobranzas.vendido} className="text-lg font-bold text-white mt-1" />
            <div className="text-[11px] text-slate-500 mt-1">Presupuestos de proyectos nuevos · {etiquetaPeriodo}</div>
          </div>
          <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-4">
            <div className="text-xs text-slate-400">Cobrado</div>
            <MontosPorMoneda valores={cobranzas.cobrado} className="text-lg font-bold text-emerald-400 mt-1" />
            <div className="text-[11px] text-slate-500 mt-1">Pagos registrados · {etiquetaPeriodo}</div>
          </div>
          <div className="bg-[#0f172a] rounded-xl border border-amber-500/30 p-4">
            <div className="text-xs text-slate-400">Pendiente de cobro</div>
            <MontosPorMoneda valores={cobranzas.pendiente} className="text-lg font-bold text-amber-400 mt-1" />
            <div className="text-[11px] text-slate-500 mt-1">Presupuesto menos pagos · todos los proyectos no cancelados</div>
          </div>
        </div>
      </div>

      {/* Proyectos trabados */}
      <div className={cardClass}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Proyectos trabados <span className="text-slate-500 font-normal">({trabados.length})</span>
            </h2>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Sin avanzar hace más de
            <select value={diasTrabado} onChange={(e) => setDiasTrabado(Number(e.target.value))} className={selectClass}>
              {[3, 7, 15, 30, 60].map((d) => (
                <option key={d} value={d}>{d} días</option>
              ))}
            </select>
          </label>
        </div>
        {trabados.length === 0 ? (
          <p className="text-sm text-slate-500">No hay proyectos en curso que lleven más de {diasTrabado} días en el mismo paso. 🎉</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {trabados.map(({ proyecto: p, paso, dias }) => {
              const col = colorPorArea(paso?.area_responsable);
              return (
                <Link
                  key={p.id}
                  href={`/proyectos/${p.id}`}
                  className="flex items-center gap-3 py-2.5 hover:bg-slate-800/40 rounded-lg px-2 -mx-2 transition"
                >
                  <span className={`w-1.5 h-8 rounded-full shrink-0 ${col.bar}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-100 truncate">{p.titulo || p.nombre_cliente}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {p.nombre_cliente} · {p.codigo_proyecto} · {paso?.area_responsable}: {paso?.nombre_hito}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold shrink-0 ${dias >= 30 ? "text-red-400" : "text-amber-400"}`}>
                    {Math.floor(dias)} días
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ventas por vendedor */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <UserRound className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-200">Ventas por vendedor</h2>
            <span className="text-xs text-slate-500">· {etiquetaPeriodo}</span>
          </div>
          {porVendedor.length === 0 ? (
            <p className="text-sm text-slate-500">Sin proyectos en el período.</p>
          ) : (
            <div className="space-y-3">
              {porVendedor.map((v) => (
                <div key={v.id}>
                  <div className="flex justify-between gap-2 text-xs mb-1">
                    <span className={`font-medium truncate ${v.id === "__sin__" ? "text-slate-500 italic" : "text-slate-300"}`}>
                      {v.nombre}
                    </span>
                    <span className="text-slate-400 shrink-0 text-right">
                      {v.cantidad} proy. ·{" "}
                      {Object.entries(v.montos).map(([m, n], i) => (
                        <span key={m}>{i > 0 && " + "}{formatMonto(n, m)}</span>
                      ))}
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${v.id === "__sin__" ? "bg-slate-600" : "bg-gradient-to-r from-sky-600 to-sky-400"}`}
                      style={{ width: `${(v.cantidad / maxVendedor) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Proyectos por tipo */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-200">Proyectos por tipo</h2>
            <span className="text-xs text-slate-500">· {etiquetaPeriodo}</span>
          </div>
          {porTipo.length === 0 ? (
            <p className="text-sm text-slate-500">Sin proyectos en el período.</p>
          ) : (
            <div className="space-y-3">
              {porTipo.map(([nombre, cant]) => (
                <div key={nombre}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium truncate pr-2">{nombre}</span>
                    <span className="text-slate-500">{cant}</span>
                  </div>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                      style={{ width: `${(cant / maxTipo) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tiempo por paso */}
      <div className={cardClass}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-200">Tiempo típico por paso</h2>
          </div>
          <select value={tipoEficiencia} onChange={(e) => setTipoEficiencia(e.target.value)} className={selectClass}>
            <option value="">Todos los tipos</option>
            {tipos.map(([id, nombre]) => (
              <option key={id} value={id}>{nombre}</option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-slate-500 mb-4">
          Cuánto tarda normalmente cada paso en aprobarse desde el paso anterior (mediana, no se distorsiona por casos aislados).
          {!tipoEficiencia && " Elegí un tipo para verlo en el orden de la secuencia."}
        </p>
        {tiempoPorPaso.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay suficientes aprobaciones para calcular.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tiempoPorPaso.map((t) => (
              <div key={t.hito} className="bg-[#0f172a] rounded-xl border border-slate-800 p-3">
                <div className="text-sm font-medium text-slate-200 truncate">{t.hito}</div>
                <div className="text-[11px] text-slate-500">{t.area}</div>
                <div className="text-lg font-bold text-amber-400 mt-1">{formatDias(t.mediana)}</div>
                <div className="text-[11px] text-slate-500">{t.muestras} {t.muestras === 1 ? "proyecto" : "proyectos"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
