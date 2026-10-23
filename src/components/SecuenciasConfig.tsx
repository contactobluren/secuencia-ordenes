"use client";

import { useEffect, useState } from "react";
import { Plantilla, PasoPlantilla } from "@/lib/types";
import {
  apiLoadPlantillas,
  apiUpsertPlantilla,
  apiDeletePlantilla,
  apiLoadAreas,
} from "@/lib/api-client";
import { Area } from "@/lib/types";
import { Plus, Pencil, Trash2, Save, X, GitBranch } from "lucide-react";

const inputClass =
  "w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500";

export default function SecuenciasConfig() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [editando, setEditando] = useState<Plantilla | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [nombre, setNombre] = useState("");
  const [pasos, setPasos] = useState<PasoPlantilla[]>([]);

  const load = async () => {
    const [p, a] = await Promise.all([apiLoadPlantillas(), apiLoadAreas()]);
    setPlantillas(p);
    setAreas(a.filter((x) => x.activo));
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const abrirNuevo = () => {
    setNuevo(true);
    setEditando(null);
    setNombre("");
    setPasos([
      {
        orden: 1,
        nombre_hito: "ALTA",
        area_responsable: areas[0]?.nombre || "Comercial",
      },
    ]);
  };

  const abrirEditar = (p: Plantilla) => {
    setNuevo(false);
    setEditando(p);
    setNombre(p.nombre);
    setPasos(p.pasos.map((s) => ({ ...s })));
  };

  const addPaso = () => {
    setPasos((prev) => [
      ...prev,
      {
        orden: prev.length + 1,
        nombre_hito: "",
        area_responsable: areas[0]?.nombre || "Comercial",
      },
    ]);
  };

  const updatePaso = (idx: number, field: keyof PasoPlantilla, value: string | number) => {
    setPasos((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  };

  const removePaso = (idx: number) => {
    setPasos((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, orden: i + 1 }))
    );
  };

  const guardar = async () => {
    if (!nombre.trim()) {
      alert("El nombre de la secuencia es obligatorio");
      return;
    }
    if (pasos.length === 0 || pasos.some((s) => !s.nombre_hito.trim())) {
      alert("Todos los pasos deben tener nombre");
      return;
    }
    const plantilla: Plantilla = {
      id: editando?.id || crypto.randomUUID(),
      nombre: nombre.trim().toUpperCase(),
      pasos: pasos.map((s, i) => ({
        orden: i + 1,
        nombre_hito: s.nombre_hito.trim().toUpperCase(),
        area_responsable: s.area_responsable,
        descripcion: s.descripcion,
      })),
    };
    await apiUpsertPlantilla(plantilla);
    await load();
    setNuevo(false);
    setEditando(null);
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta secuencia? Los proyectos ya creados no se modifican.")) return;
    await apiDeletePlantilla(id);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-400">
          Solo el administrador puede crear o editar secuencias (tipos de entrada).
          Varios usuarios del mismo rol comparten los mismos permisos de aprobación.
        </p>
        <button
          onClick={abrirNuevo}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 shrink-0"
        >
          <Plus className="w-4 h-4" /> Nueva secuencia
        </button>
      </div>

      {(nuevo || editando) && (
        <div className="bg-[#121a2b] rounded-2xl border border-blue-500/30 p-5 space-y-4">
          <h2 className="font-semibold text-white">
            {nuevo ? "Nueva secuencia" : `Editar: ${editando?.nombre}`}
          </h2>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClass}
              placeholder="Ej: ABERTURAS PREMIUM"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-400">Pasos ordenados</label>
              <button
                type="button"
                onClick={addPaso}
                className="text-xs text-blue-400 hover:underline"
              >
                + Agregar paso
              </button>
            </div>
            {pasos.map((paso, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center bg-[#0f172a] rounded-xl p-2 border border-slate-800"
              >
                <div className="col-span-1 text-xs text-slate-500 text-center font-bold">
                  {idx + 1}
                </div>
                <div className="col-span-5">
                  <input
                    value={paso.nombre_hito}
                    onChange={(e) => updatePaso(idx, "nombre_hito", e.target.value)}
                    className={inputClass}
                    placeholder="Nombre del hito"
                  />
                </div>
                <div className="col-span-5">
                  <select
                    value={paso.area_responsable}
                    onChange={(e) => updatePaso(idx, "area_responsable", e.target.value)}
                    className={inputClass}
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.nombre}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => removePaso(idx)}
                    className="p-1.5 text-slate-500 hover:text-red-400"
                    disabled={pasos.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={guardar}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 inline-flex items-center gap-1"
            >
              <Save className="w-4 h-4" /> Guardar secuencia
            </button>
            <button
              onClick={() => {
                setNuevo(false);
                setEditando(null);
              }}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium inline-flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {plantillas.map((p) => (
          <div
            key={p.id}
            className="bg-[#121a2b] rounded-2xl border border-slate-800 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">{p.nombre}</h3>
                  <span className="text-xs text-slate-500">{p.pasos.length} pasos</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {p.pasos.map((s) => (
                    <span
                      key={s.orden}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#0f172a] border border-slate-700 text-slate-300"
                    >
                      {s.orden}. {s.nombre_hito}{" "}
                      <span className="text-slate-500">({s.area_responsable})</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => abrirEditar(p)}
                  className="p-2 text-slate-500 hover:text-blue-400 rounded-lg"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => eliminar(p.id)}
                  className="p-2 text-slate-500 hover:text-red-400 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
