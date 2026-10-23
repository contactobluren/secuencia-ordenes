"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiUpsertProyecto, apiLoadPlantillas } from "@/lib/api-client";
import { crearPasosDesdePlantilla } from "@/lib/workflow";
import { Proyecto, Plantilla, MONEDAS } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { parseMonto } from "@/lib/money";

const inputClass =
  "w-full px-4 py-2.5 border border-slate-700 rounded-xl bg-[#0f172a] text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none";

export default function ProyectoForm() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(false);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [form, setForm] = useState({
    titulo: "",
    nombre_cliente: "",
    codigo_proyecto: "",
    canal_venta: "",
    moneda: "ARS",
    presupuesto_estimado: "",
    monto_anticipo: "",
    email_contacto: "",
    telefono: "",
    direccion_obra: "",
    notas: "",
    plantilla_id: "",
  });
  const [errorMonto, setErrorMonto] = useState("");

  useEffect(() => {
    apiLoadPlantillas()
      .then((list) => {
        setPlantillas(list);
        if (list[0] && !form.plantilla_id) {
          setForm((f) => ({ ...f, plantilla_id: list[0].id }));
        }
      })
      .catch(console.error);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario) return;
    setLoading(true);

    const plantilla = plantillas.find((p) => p.id === form.plantilla_id);
    if (!plantilla) {
      alert("Plantilla no encontrada");
      setLoading(false);
      return;
    }

    const presupuesto = parseMonto(form.presupuesto_estimado);
    const anticipo = parseMonto(form.monto_anticipo);
    if (presupuesto == null || presupuesto <= 0) {
      setErrorMonto("Ingresá un presupuesto válido (número, hasta 2 decimales).");
      setLoading(false);
      return;
    }
    if (anticipo == null || anticipo < 0) {
      setErrorMonto("Ingresá un monto de anticipo válido (0 o más, hasta 2 decimales).");
      setLoading(false);
      return;
    }
    if (anticipo > presupuesto) {
      setErrorMonto("El anticipo no puede ser mayor al presupuesto.");
      setLoading(false);
      return;
    }
    setErrorMonto("");

    const codigo =
      form.codigo_proyecto.trim().toUpperCase() ||
      `PRJ-${Date.now().toString().slice(-6)}`;

    const montoSaldo = Math.round((presupuesto - anticipo) * 100) / 100;

    const nuevo: Proyecto = {
      id: crypto.randomUUID(),
      titulo: form.titulo.trim(),
      nombre_cliente: form.nombre_cliente.trim(),
      codigo_proyecto: codigo,
      canal_venta: form.canal_venta.trim(),
      moneda: form.moneda,
      presupuesto_estimado: presupuesto,
      monto_anticipo: anticipo,
      monto_saldo: montoSaldo,
      email_contacto: form.email_contacto.trim(),
      telefono: form.telefono.trim(),
      direccion_obra: form.direccion_obra.trim(),
      notas: form.notas.trim(),
      plantilla_id: plantilla.id,
      plantilla_nombre: plantilla.nombre,
      pasos: crearPasosDesdePlantilla(plantilla),
      pagos: [],
      created_at: new Date().toISOString(),
      creado_por: usuario.nombre,
      estado_general: "En curso",
    };

    try {
      await apiUpsertProyecto(nuevo);
      router.push(`/proyectos/${nuevo.id}`);
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar el proyecto");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
      <div className="bg-[#121a2b] rounded-2xl shadow-lg border border-slate-800 p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Nuevo proyecto</h2>
          <p className="text-sm text-slate-500 mt-1">
            Completá los datos de la obra / pedido. Luego se carga la secuencia según el tipo de entrada.
          </p>
        </div>

        {/* Tipo de entrada */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Tipo de entrada / Secuencia *
          </label>
          <select
            name="plantilla_id"
            required
            value={form.plantilla_id}
            onChange={handleChange}
            className={inputClass}
          >
            {plantillas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.pasos.length} pasos)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Título del proyecto *
            </label>
            <input
              type="text"
              name="titulo"
              required
              value={form.titulo}
              onChange={handleChange}
              className={inputClass}
              placeholder="Ej: Aberturas PH López – Fase 1"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Cliente / Razón social *
            </label>
            <input
              type="text"
              name="nombre_cliente"
              required
              value={form.nombre_cliente}
              onChange={handleChange}
              className={inputClass}
              placeholder="Ej: Constructora ABC S.A. / Juan Pérez"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Código / ID de proyecto
            </label>
            <input
              type="text"
              name="codigo_proyecto"
              value={form.codigo_proyecto}
              onChange={handleChange}
              className={inputClass + " uppercase"}
              placeholder="Auto si lo dejás vacío"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Moneda *
            </label>
            <select name="moneda" required value={form.moneda} onChange={handleChange} className={inputClass}>
              {MONEDAS.map((m) => (
                <option key={m.code} value={m.code}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Presupuesto total *
            </label>
            <input
              type="text"
              name="presupuesto_estimado"
              required
              inputMode="decimal"
              value={form.presupuesto_estimado}
              onChange={(e) => {
                handleChange(e);
                setErrorMonto("");
              }}
              className={inputClass}
              placeholder="Ej: 1250000,50"
            />
            <p className="text-[11px] text-slate-500 mt-1">Solo números, hasta 2 decimales (usar coma o punto).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Monto anticipo *
            </label>
            <input
              type="text"
              name="monto_anticipo"
              required
              inputMode="decimal"
              value={form.monto_anticipo}
              onChange={(e) => {
                handleChange(e);
                setErrorMonto("");
              }}
              className={inputClass}
              placeholder="Ej: 400000,00"
            />
            <p className="text-[11px] text-slate-500 mt-1">El paso COBRO ANTICIPO solo avanza si se completa este monto (pagos parciales permitidos).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email de contacto
            </label>
            <input
              type="email"
              name="email_contacto"
              value={form.email_contacto}
              onChange={handleChange}
              className={inputClass}
              placeholder="cliente@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              className={inputClass}
              placeholder="+54 11 ..."
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Dirección de obra
            </label>
            <input
              type="text"
              name="direccion_obra"
              value={form.direccion_obra}
              onChange={handleChange}
              className={inputClass}
              placeholder="Calle, número, localidad"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Canal de venta
            </label>
            <input
              type="text"
              name="canal_venta"
              value={form.canal_venta}
              onChange={handleChange}
              className={inputClass}
              placeholder="Showroom, Web, Referido..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Descripción / Notas iniciales
          </label>
          <textarea
            name="notas"
            rows={4}
            value={form.notas}
            onChange={handleChange}
            className={inputClass + " resize-none"}
            placeholder="Observaciones, alcance, plazos, particularidades de la obra..."
          />
        </div>

        {/* Preview secuencia */}
        {form.plantilla_id && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-300 mb-2">Secuencia que se cargará</p>
            <div className="flex flex-wrap gap-2">
              {plantillas.find((p) => p.id === form.plantilla_id)?.pasos.map((paso) => (
                <span
                  key={paso.orden}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0f172a] rounded-lg text-xs font-medium text-slate-300 border border-slate-700"
                >
                  <span className="text-blue-400 font-bold">{paso.orden}.</span>
                  {paso.nombre_hito}
                  <span className="text-slate-500">({paso.area_responsable})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {errorMonto && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">
            {errorMonto}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-500 disabled:opacity-50 transition shadow-lg shadow-blue-600/20"
          >
            {loading ? "Creando..." : "Crear proyecto y abrir secuencia"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}
