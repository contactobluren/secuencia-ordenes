"use client";

import { useEffect, useState, useMemo } from "react";
import { apiLoadProyectos } from "@/lib/api-client";
import { Proyecto } from "@/lib/types";
import { calcularAvance, calcularEficienciaPasos } from "@/lib/workflow";
import {
  FolderOpen,
  Clock,
  CheckCircle2,
  TrendingUp,
  BarChart3,
} from "lucide-react";

export default function MetricasPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [showEficiencia, setShowEficiencia] = useState(true);

  useEffect(() => {
    apiLoadProyectos().then(setProyectos).catch(console.error);
  }, []);

  const total = proyectos.length;
  const enCurso = proyectos.filter((p) => p.estado_general === "En curso").length;
  const completados = proyectos.filter((p) => p.estado_general === "Completado").length;
  const avancePromedio =
    total === 0
      ? 0
      : Math.round(proyectos.reduce((s, p) => s + calcularAvance(p.pasos), 0) / total);

  const porTipo = useMemo(() => {
    const map: Record<string, number> = {};
    proyectos.forEach((p) => {
      map[p.plantilla_nombre] = (map[p.plantilla_nombre] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [proyectos]);

  const maxTipo = porTipo.length ? Math.max(...porTipo.map(([, n]) => n)) : 1;

  const eficiencia = useMemo(() => calcularEficienciaPasos(proyectos), [proyectos]);
  const eficienciaSorted = Object.entries(eficiencia).sort((a, b) => b[1].avgHours - a[1].avgHours);

  // Avance por proyecto (top)
  const porAvance = useMemo(() => {
    return [...proyectos]
      .map((p) => ({ nombre: p.nombre_cliente, codigo: p.codigo_proyecto, avance: calcularAvance(p.pasos) }))
      .sort((a, b) => b.avance - a.avance)
      .slice(0, 10);
  }, [proyectos]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Métricas</h1>
        <p className="text-sm text-slate-500 mt-1">Indicadores de gestión y eficiencia de procesos</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total proyectos", value: total, icon: FolderOpen, color: "text-blue-400" },
          { label: "En curso", value: enCurso, icon: Clock, color: "text-amber-400" },
          { label: "Completados", value: completados, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Avance promedio", value: `${avancePromedio}%`, icon: TrendingUp, color: "text-violet-400" },
        ].map((k) => (
          <div key={k.label} className="bg-[#121a2b] rounded-2xl border border-slate-800 p-4 shadow-sm">
            <div className={`flex items-center gap-2 text-xs font-medium mb-1 ${k.color}`}>
              <k.icon className="w-4 h-4" /> {k.label}
            </div>
            <div className="text-2xl font-bold text-white">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#121a2b] rounded-2xl border border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-200">Proyectos por tipo</h2>
          </div>
          {porTipo.length === 0 ? (
            <p className="text-sm text-slate-500">Sin datos aún</p>
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

        <div className="bg-[#121a2b] rounded-2xl border border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200">Avance por proyecto</h2>
          </div>
          {porAvance.length === 0 ? (
            <p className="text-sm text-slate-500">Sin proyectos</p>
          ) : (
            <div className="space-y-3">
              {porAvance.map((p) => (
                <div key={p.codigo}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium truncate pr-2">{p.nombre}</span>
                    <span className="text-slate-400">{p.avance}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                      style={{ width: `${p.avance}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#121a2b] rounded-2xl border border-slate-800 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-200">Eficiencia por paso</h2>
            </div>
            <button
              onClick={() => setShowEficiencia((v) => !v)}
              className="text-xs text-blue-400 hover:underline"
            >
              {showEficiencia ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {!showEficiencia ? (
            <p className="text-sm text-slate-500">
              Tiempo promedio entre aprobaciones consecutivas (métrica operativa).
            </p>
          ) : eficienciaSorted.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aún no hay suficientes aprobaciones consecutivas para calcular.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {eficienciaSorted.map(([hito, data]) => (
                <div key={hito} className="bg-[#0f172a] rounded-xl border border-slate-800 p-3">
                  <div className="text-sm font-medium text-slate-200">{hito}</div>
                  <div className="text-lg font-bold text-amber-400 mt-1">~{data.avgHours}h</div>
                  <div className="text-[11px] text-slate-500">{data.count} muestras</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
