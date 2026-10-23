"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiLoadProyectos, apiDeleteProyecto } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { Proyecto } from "@/lib/types";
import { calcularAvance, getPasoActual } from "@/lib/workflow";
import { formatFecha } from "@/lib/utils";
import { colorPorArea, AREA_COLORS, COMPLETADO_COLOR } from "@/lib/areaColors";
import { Search, Filter, ChevronRight, CheckCircle2, Plus } from "lucide-react";

export default function Dashboard() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.areaNombre === "Admin";
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroCanal, setFiltroCanal] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroArea, setFiltroArea] = useState("");

  useEffect(() => {
    apiLoadProyectos().then(setProyectos).catch(console.error);
  }, []);

  const filtrados = useMemo(() => {
    return proyectos.filter((p) => {
      if (
        filtroCliente &&
        !(p.titulo || "").toLowerCase().includes(filtroCliente.toLowerCase()) &&
        !p.nombre_cliente.toLowerCase().includes(filtroCliente.toLowerCase()) &&
        !p.codigo_proyecto.toLowerCase().includes(filtroCliente.toLowerCase())
      )
        return false;
      if (filtroCanal && !(p.canal_venta || "").toLowerCase().includes(filtroCanal.toLowerCase()))
        return false;
      if (filtroTipo && p.plantilla_id !== filtroTipo) return false;
      if (filtroEstado && p.estado_general !== filtroEstado) return false;
      if (filtroArea) {
        if (filtroArea === "__completado__") {
          if (p.estado_general !== "Completado") return false;
        } else {
          const actual = getPasoActual(p.pasos);
          if (p.estado_general === "Completado" || actual?.area_responsable !== filtroArea)
            return false;
        }
      }
      return true;
    });
  }, [proyectos, filtroCliente, filtroCanal, filtroTipo, filtroEstado, filtroArea]);

  const tiposUnicos = useMemo(() => {
    const map = new Map<string, string>();
    proyectos.forEach((p) => map.set(p.plantilla_id, p.plantilla_nombre));
    return Array.from(map.entries());
  }, [proyectos]);

  /** Conteo de proyectos frenados por área */
  const porSector = useMemo(() => {
    const counts: Record<string, number> = {};
    let completados = 0;
    for (const p of proyectos) {
      if (p.estado_general === "Completado") {
        completados++;
        continue;
      }
      const actual = getPasoActual(p.pasos);
      const area = actual?.area_responsable || "Sin área";
      counts[area] = (counts[area] || 0) + 1;
    }
    return { counts, completados };
  }, [proyectos]);

  const inputClass =
    "w-full px-3 py-2 border border-slate-700 rounded-lg text-sm bg-[#0f172a] text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Resumen de proyectos</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filtrados.length} proyecto{filtrados.length !== 1 ? "s" : ""} · vista por sector
          </p>
        </div>
        <Link
          href="/proyectos/nuevo"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" /> Nuevo proyecto
        </Link>
      </div>

      {/* Tarjetas por sector — dónde están frenados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(AREA_COLORS)
          .filter(([k]) => k !== "Admin")
          .map(([area, col]) => {
            const n = porSector.counts[area] || 0;
            const active = filtroArea === area;
            return (
              <button
                key={area}
                type="button"
                onClick={() => setFiltroArea(active ? "" : area)}
                className={`text-left rounded-2xl border p-4 transition ${col.bg} ${col.border} ${
                  active ? "ring-2 ring-offset-2 ring-offset-[#0b1220] ring-white/30" : "hover:opacity-90"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                  <span className={`text-xs font-semibold ${col.text}`}>{area}</span>
                </div>
                <div className="text-2xl font-bold text-white">{n}</div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {n === 1 ? "proyecto en espera" : "proyectos en espera"}
                </p>
              </button>
            );
          })}
        <button
          type="button"
          onClick={() =>
            setFiltroArea(filtroArea === "__completado__" ? "" : "__completado__")
          }
          className={`text-left rounded-2xl border p-4 transition ${COMPLETADO_COLOR.bg} ${
            COMPLETADO_COLOR.border
          } ${
            filtroArea === "__completado__"
              ? "ring-2 ring-offset-2 ring-offset-[#0b1220] ring-white/30"
              : "hover:opacity-90"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full ${COMPLETADO_COLOR.dot}`} />
            <span className={`text-xs font-semibold ${COMPLETADO_COLOR.text}`}>Completados</span>
          </div>
          <div className="text-2xl font-bold text-white">{porSector.completados}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">finalizados</p>
        </button>
      </div>

      {/* Otras áreas no estándar */}
      {Object.keys(porSector.counts).some((k) => !AREA_COLORS[k]) && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(porSector.counts)
            .filter(([k]) => !AREA_COLORS[k])
            .map(([area, n]) => {
              const col = colorPorArea(area);
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => setFiltroArea(filtroArea === area ? "" : area)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${col.bg} ${col.text} ${col.border}`}
                >
                  {area}: {n}
                </button>
              );
            })}
        </div>
      )}

      <div className="bg-[#121a2b] rounded-2xl border border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-400">
          <Filter className="w-4 h-4" /> Filtros
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Título, cliente o código..."
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className={inputClass + " pl-9"}
            />
          </div>
          <input
            type="text"
            placeholder="Canal de venta..."
            value={filtroCanal}
            onChange={(e) => setFiltroCanal(e.target.value)}
            className={inputClass}
          />
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className={inputClass}
          >
            <option value="">Todos los tipos</option>
            {tiposUnicos.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className={inputClass}
          >
            <option value="">Todos los estados</option>
            <option value="En curso">En curso</option>
            <option value="Completado">Completado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>
        {filtroArea && (
          <button
            type="button"
            onClick={() => setFiltroArea("")}
            className="mt-3 text-xs text-blue-400 hover:underline"
          >
            Quitar filtro de sector
          </button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="bg-[#121a2b] rounded-2xl border border-slate-800 p-12 text-center">
          <p className="text-slate-500">No hay proyectos que coincidan.</p>
          <Link
            href="/proyectos/nuevo"
            className="mt-4 inline-block text-blue-400 font-medium hover:underline"
          >
            Crear el primero →
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-[#121a2b] rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#0f172a] border-b border-slate-800">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400">Proyecto</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400">
                    Frenado en / Estado
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400">Avance</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400">Creado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtrados.map((p) => {
                  const avance = calcularAvance(p.pasos);
                  const actual = getPasoActual(p.pasos);
                  const done = p.estado_general === "Completado";
                  const col = colorPorArea(actual?.area_responsable, done);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-8 rounded-full shrink-0 ${col.bar}`} />
                          <div>
                            <div className="font-medium text-slate-100">
                              {p.titulo || p.nombre_cliente}
                            </div>
                            <div className="text-xs text-slate-500">
                              {p.nombre_cliente} · {p.codigo_proyecto}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{p.plantilla_nombre}</td>
                      <td className="px-4 py-3">
                        {done ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${col.bg} ${col.text} border ${col.border}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completado
                          </span>
                        ) : (
                          <div>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${col.bg} ${col.text} ${col.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                              {actual?.area_responsable}
                            </span>
                            <div className="text-xs text-slate-500 mt-1 pl-1">
                              Paso: {actual?.nombre_hito}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${col.bar}`}
                              style={{ width: `${avance}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-400">{avance}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatFecha(p.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <Link
                            href={`/proyectos/${p.id}`}
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
                          >
                            Ver <ChevronRight className="w-4 h-4" />
                          </Link>
                          {isAdmin && (
                            <button
                              type="button"
                              title="Eliminar"
                              onClick={async (e) => {
                                e.preventDefault();
                                if (!confirm(`¿Eliminar "${p.titulo || p.nombre_cliente}"?`)) return;
                                if (!confirm("Confirmá: no se puede deshacer.")) return;
                                try {
                                  await apiDeleteProyecto(p.id);
                                  setProyectos((list) => list.filter((x) => x.id !== p.id));
                                } catch {
                                  alert("No se pudo eliminar");
                                }
                              }}
                              className="text-xs text-red-400/80 hover:text-red-400"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {filtrados.map((p) => {
              const avance = calcularAvance(p.pasos);
              const actual = getPasoActual(p.pasos);
              const done = p.estado_general === "Completado";
              const col = colorPorArea(actual?.area_responsable, done);
              return (
                <Link
                  key={p.id}
                  href={`/proyectos/${p.id}`}
                  className={`block bg-[#121a2b] rounded-2xl border p-4 hover:border-blue-500/40 transition ${col.border}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-100 truncate">
                        {p.titulo || p.nombre_cliente}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">
                        {p.nombre_cliente} · {p.plantilla_nombre}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 shrink-0" />
                  </div>
                  <div className="mt-3">
                    {done ? (
                      <span
                        className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${col.bg} ${col.text}`}
                      >
                        Completado
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${col.bg} ${col.text} ${col.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                        {actual?.area_responsable} · {actual?.nombre_hito}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${col.bar}`}
                        style={{ width: `${avance}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-400">{avance}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
