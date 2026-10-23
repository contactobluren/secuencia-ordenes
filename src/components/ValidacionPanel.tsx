"use client";

import { useState, useEffect } from "react";
import { Proyecto, ProyectoPaso } from "@/lib/types";
import { apiGetProyecto, apiUpsertProyecto, apiDeleteProyecto } from "@/lib/api-client";
import {
  esPasoCobro,
  conceptoDesdeHito,
  totalPagado,
  montoObjetivo,
  saldoPendiente,
  cobroCompleto,
  formatMonto,
  parseMonto,
} from "@/lib/money";
import type { PagoParcial } from "@/lib/types";
import {
  puedeValidar,
  puedeRevertir,
  validarPaso,
  revertirPaso,
  calcularAvance,
} from "@/lib/workflow";
import { useAuth } from "@/hooks/useAuth";
import { formatFecha } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  Lock,
  ArrowLeft,
  User,
  Calendar,
  RotateCcw,
  MapPin,
  Phone,
  Mail,
  Banknote,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props {
  proyectoId: string;
}

export default function ValidacionPanel({ proyectoId }: Props) {
  const { usuario } = useAuth();
  const router = useRouter();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [pasoAValidar, setPasoAValidar] = useState<ProyectoPaso | null>(null);
  const [pasoARevertir, setPasoARevertir] = useState<ProyectoPaso | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [motivoReverso, setMotivoReverso] = useState("");
  const [pasoDetalle, setPasoDetalle] = useState<ProyectoPaso | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [editForm, setEditForm] = useState({
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
    estado_general: "En curso" as Proyecto["estado_general"],
  });
  const [pasoPago, setPasoPago] = useState<ProyectoPaso | null>(null);
  const [pagoForm, setPagoForm] = useState({ monto: "", medio: "Transferencia", observaciones: "" });
  const [errorPago, setErrorPago] = useState("");

  useEffect(() => {
    apiGetProyecto(proyectoId).then(setProyecto).catch(console.error);
  }, [proyectoId]);

  if (!proyecto || !usuario) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Cargando proyecto...</p>
        <Link href="/" className="mt-4 inline-block text-blue-400 hover:underline">
          Volver al resumen
        </Link>
      </div>
    );
  }

  const avance = calcularAvance(proyecto.pasos);
  const actor = {
    id: usuario.id,
    nombre: usuario.nombre,
    areaNombre: usuario.areaNombre,
    activo: usuario.activo,
  };
  const isAdmin = usuario.areaNombre === "Admin";

  const abrirEditar = () => {
    setEditForm({
      titulo: proyecto.titulo || "",
      nombre_cliente: proyecto.nombre_cliente || "",
      codigo_proyecto: proyecto.codigo_proyecto || "",
      canal_venta: proyecto.canal_venta || "",
      moneda: String(proyecto.moneda || "ARS"),
      presupuesto_estimado: String(proyecto.presupuesto_estimado ?? ""),
      monto_anticipo: String(proyecto.monto_anticipo ?? ""),
      email_contacto: proyecto.email_contacto || "",
      telefono: proyecto.telefono || "",
      direccion_obra: proyecto.direccion_obra || "",
      notas: proyecto.notas || "",
      estado_general: proyecto.estado_general,
    });
    setEditando(true);
  };

  const guardarDatosProyecto = async () => {
    if (!editForm.nombre_cliente.trim()) {
      alert("El cliente / razón social es obligatorio");
      return;
    }
    const presup = parseMonto(editForm.presupuesto_estimado);
    const ant = parseMonto(editForm.monto_anticipo);
    if (presup == null || presup <= 0) {
      alert("Presupuesto inválido (número > 0, hasta 2 decimales)");
      return;
    }
    if (ant == null || ant < 0 || ant > presup) {
      alert("Anticipo inválido (0 o más, y no mayor al presupuesto)");
      return;
    }
    setGuardandoDatos(true);
    const actualizado: Proyecto = {
      ...proyecto,
      titulo: editForm.titulo.trim(),
      nombre_cliente: editForm.nombre_cliente.trim(),
      codigo_proyecto: editForm.codigo_proyecto.trim().toUpperCase() || proyecto.codigo_proyecto,
      canal_venta: editForm.canal_venta.trim(),
      moneda: editForm.moneda,
      presupuesto_estimado: presup,
      monto_anticipo: ant,
      monto_saldo: Math.round((presup - ant) * 100) / 100,
      email_contacto: editForm.email_contacto.trim(),
      telefono: editForm.telefono.trim(),
      direccion_obra: editForm.direccion_obra.trim(),
      notas: editForm.notas.trim(),
      estado_general: editForm.estado_general,
      pagos: proyecto.pagos || [],
    };
    try {
      await apiUpsertProyecto(actualizado);
      setProyecto(actualizado);
      setEditando(false);
    } catch (e) {
      console.error(e);
      alert("No se pudieron guardar los datos");
    }
    setGuardandoDatos(false);
  };

  const eliminarProyecto = async () => {
    const nombre = proyecto.titulo || proyecto.nombre_cliente;
    if (
      !confirm(
        `¿Eliminar el proyecto "${nombre}"?\n\nSe borrará de forma permanente, incluyendo el historial de validaciones.`
      )
    ) {
      return;
    }
    if (!confirm("Confirmá de nuevo: esta acción no se puede deshacer.")) return;
    try {
      await apiDeleteProyecto(proyecto.id);
      router.push("/");
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar el proyecto");
    }
  };

  const registrarPago = async () => {
    if (!pasoPago) return;
    const concepto = conceptoDesdeHito(pasoPago.nombre_hito);
    if (!concepto) return;
    const monto = parseMonto(pagoForm.monto);
    if (monto == null || monto <= 0) {
      setErrorPago("Ingresá un monto válido mayor a 0 (hasta 2 decimales).");
      return;
    }
    const pend = saldoPendiente(proyecto, concepto);
    if (monto > pend + 0.001) {
      setErrorPago(`El monto supera el pendiente (${formatMonto(pend, proyecto.moneda)}).`);
      return;
    }
    setErrorPago("");
    const pago: PagoParcial = {
      id: crypto.randomUUID(),
      concepto,
      monto,
      fecha: new Date().toISOString(),
      medio: pagoForm.medio || "Transferencia",
      registrado_por: usuario.nombre,
      registrado_por_id: usuario.id,
      observaciones: pagoForm.observaciones.trim() || undefined,
    };
    const actualizado: Proyecto = {
      ...proyecto,
      pagos: [...(proyecto.pagos || []), pago],
    };
    try {
      await apiUpsertProyecto(actualizado);
      setProyecto(actualizado);
      setPagoForm({ monto: "", medio: "Transferencia", observaciones: "" });
      if (cobroCompleto(actualizado, concepto)) {
        // auto-sugerir validar
        setPasoPago(null);
        setPasoAValidar(pasoPago);
      }
    } catch (e) {
      console.error(e);
      alert("No se pudo registrar el pago");
    }
  };

  const handleConfirmarValidacion = async () => {
    if (!pasoAValidar) return;
    if (esPasoCobro(pasoAValidar.nombre_hito)) {
      const conc = conceptoDesdeHito(pasoAValidar.nombre_hito);
      if (conc && !cobroCompleto(proyecto, conc)) {
        alert("Todavía hay saldo pendiente. Registrá los pagos hasta completar el monto.");
        return;
      }
    }
    setConfirmando(true);
    const actualizado = validarPaso(
      proyecto,
      pasoAValidar.id,
      actor,
      observaciones || undefined
    );
    try {
      await apiUpsertProyecto(actualizado);
      setProyecto(actualizado);
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar la validación");
    }
    setPasoAValidar(null);
    setObservaciones("");
    setPasoDetalle(null);
    setConfirmando(false);
  };

  const handleConfirmarReverso = async () => {
    if (!pasoARevertir) return;
    setConfirmando(true);
    const actualizado = revertirPaso(
      proyecto,
      pasoARevertir.id,
      actor,
      motivoReverso || undefined
    );
    try {
      await apiUpsertProyecto(actualizado);
      setProyecto(actualizado);
    } catch (e) {
      console.error(e);
      alert("No se pudo revertir el paso");
    }
    setPasoARevertir(null);
    setMotivoReverso("");
    setPasoDetalle(null);
    setConfirmando(false);
  };

  const estadoColor = (estado: string) => {
    switch (estado) {
      case "Aprobado":
        return { text: "text-emerald-400" };
      case "Pendiente":
        return { text: "text-amber-400" };
      default:
        return { text: "text-slate-500" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {proyecto.titulo || proyecto.nombre_cliente}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {proyecto.nombre_cliente}
            {proyecto.codigo_proyecto && ` · ${proyecto.codigo_proyecto}`}
            {" · "}
            {proyecto.plantilla_nombre}
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2">
          <span
            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
              proyecto.estado_general === "Completado"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-blue-500/15 text-blue-300"
            }`}
          >
            {proyecto.estado_general}
          </span>
          {isAdmin && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={abrirEditar}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
              >
                <Pencil className="w-3.5 h-3.5" /> Editar datos
              </button>
              <button
                type="button"
                onClick={eliminarProyecto}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Datos del proyecto */}
      <div className="bg-[#121a2b] rounded-2xl border border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        {proyecto.direccion_obra && (
          <div className="flex items-start gap-2 text-slate-300">
            <MapPin className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <span>{proyecto.direccion_obra}</span>
          </div>
        )}
        {proyecto.telefono && (
          <div className="flex items-center gap-2 text-slate-300">
            <Phone className="w-4 h-4 text-slate-500 shrink-0" />
            {proyecto.telefono}
          </div>
        )}
        {proyecto.email_contacto && (
          <div className="flex items-center gap-2 text-slate-300">
            <Mail className="w-4 h-4 text-slate-500 shrink-0" />
            {proyecto.email_contacto}
          </div>
        )}
        {(proyecto.presupuesto_estimado != null && Number(proyecto.presupuesto_estimado) > 0) && (
          <div className="flex items-center gap-2 text-slate-300">
            <Banknote className="w-4 h-4 text-slate-500 shrink-0" />
            {formatMonto(proyecto.presupuesto_estimado, proyecto.moneda)}
          </div>
        )}
        {proyecto.canal_venta && (
          <div className="text-slate-400">
            Canal: <span className="text-slate-300">{proyecto.canal_venta}</span>
          </div>
        )}
        {proyecto.creado_por && (
          <div className="text-slate-400">
            Alta por: <span className="text-slate-300">{proyecto.creado_por}</span>
          </div>
        )}
      </div>

      {proyecto.notas && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-100">
          <strong>Notas:</strong> {proyecto.notas}
        </div>
      )}

      {/* Resumen económico */}
      <div className="bg-[#121a2b] rounded-2xl border border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">Moneda</p>
          <p className="font-semibold text-slate-100">{proyecto.moneda || "ARS"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Presupuesto</p>
          <p className="font-semibold text-slate-100">{formatMonto(proyecto.presupuesto_estimado, proyecto.moneda)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Anticipo (objetivo)</p>
          <p className="font-semibold text-amber-300">{formatMonto(proyecto.monto_anticipo, proyecto.moneda)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Pagado: {formatMonto(totalPagado(proyecto.pagos, "ANTICIPO"), proyecto.moneda)}
            {" · "}
            Pendiente: {formatMonto(Math.max(0, saldoPendiente(proyecto, "ANTICIPO")), proyecto.moneda)}
          </p>
        </div>
      </div>


      {/* Barra de avance */}
      <div className="bg-[#121a2b] rounded-2xl border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300">Avance del proyecto</span>
          <span className="text-lg font-bold text-blue-400">{avance}%</span>
        </div>
        <div className="relative w-full h-5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
            style={{ width: `${Math.max(avance, 8)}%` }}
          >
            {avance >= 15 && (
              <span className="text-[10px] font-bold text-white">{avance}%</span>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          {proyecto.pasos.filter((p) => p.estado === "Aprobado").length} de{" "}
          {proyecto.pasos.length} hitos completados
        </p>
      </div>

      {/* Secuencia horizontal */}
      <div className="bg-[#121a2b] rounded-2xl border border-slate-800 p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Secuencia de pasos</h2>

        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="flex items-start min-w-max gap-0">
            {proyecto.pasos.map((paso, idx) => {
              const colors = estadoColor(paso.estado);
              const puede = puedeValidar(paso, proyecto.pasos, actor);
              const puedeRev = puedeRevertir(paso, proyecto.pasos, actor);
              const isLast = idx === proyecto.pasos.length - 1;

              return (
                <div key={paso.id} className="flex items-start">
                  <button
                    type="button"
                    onClick={() => setPasoDetalle(paso)}
                    className="flex flex-col items-center w-[110px] sm:w-[130px] focus:outline-none"
                  >
                    <div
                      className={`
                        relative z-10 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all
                        ${
                          paso.estado === "Aprobado"
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : paso.estado === "Pendiente"
                            ? "bg-amber-500/10 border-amber-500 text-amber-400 ring-4 ring-amber-500/20"
                            : "bg-slate-800 border-slate-600 text-slate-500"
                        }
                      `}
                    >
                      {paso.estado === "Aprobado" ? (
                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : paso.estado === "Pendiente" ? (
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : (
                        <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </div>

                    <p className={`mt-2 text-[11px] sm:text-xs font-semibold text-center leading-tight px-1 ${colors.text}`}>
                      {paso.nombre_hito}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 text-center">
                      {paso.area_responsable}
                    </p>

                    {paso.validacion && (
                      <p className="text-[9px] text-emerald-500/80 mt-1 text-center leading-tight px-1">
                        {paso.validacion.validado_por}
                        <br />
                        {formatFecha(paso.validacion.fecha_hora)}
                      </p>
                    )}

                    <div className="mt-2 flex flex-col gap-1 items-center">
                      {puede && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (esPasoCobro(paso.nombre_hito)) {
                              const conc = conceptoDesdeHito(paso.nombre_hito);
                              if (conc && !cobroCompleto(proyecto, conc)) {
                                setPasoPago(paso);
                                return;
                              }
                            }
                            setPasoAValidar(paso);
                          }}
                          className="px-2.5 py-1 bg-blue-600 text-white text-[10px] sm:text-xs font-medium rounded-lg hover:bg-blue-500"
                        >
                          {esPasoCobro(paso.nombre_hito) &&
                          !cobroCompleto(proyecto, conceptoDesdeHito(paso.nombre_hito) || "")
                            ? "Registrar pago"
                            : "Validar"}
                        </span>
                      )}
                      {puedeRev && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setPasoARevertir(paso);
                          }}
                          className="px-2.5 py-1 bg-slate-700 text-amber-300 text-[10px] sm:text-xs font-medium rounded-lg hover:bg-slate-600 inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Revertir
                        </span>
                      )}
                    </div>
                  </button>

                  {!isLast && (
                    <div className="flex items-center pt-5 sm:pt-6 -mx-1">
                      <div
                        className={`h-0.5 w-6 sm:w-8 ${
                          paso.estado === "Aprobado" ? "bg-emerald-500" : "bg-slate-700"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-4">
          Tocá un paso para ver el detalle · El área responsable (o Admin) puede validar o revertir el último aprobado
        </p>
      </div>

      {/* Detalle del paso */}
      {pasoDetalle && (
        <div className="bg-[#121a2b] rounded-2xl border border-slate-800 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">#{pasoDetalle.orden}</span>
                <h3 className="font-semibold text-white text-lg">{pasoDetalle.nombre_hito}</h3>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Responsable: <strong className="text-slate-200">{pasoDetalle.area_responsable}</strong>
              </p>

              {pasoDetalle.validacion ? (
                <div className="mt-4 space-y-2 text-sm bg-[#0f172a] rounded-xl p-3 border border-slate-800">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                    Aprobación registrada
                  </p>
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <strong>{pasoDetalle.validacion.validado_por}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatFecha(pasoDetalle.validacion.fecha_hora)}
                  </div>
                  {pasoDetalle.validacion.observaciones && (
                    <p className="text-xs text-slate-400 italic">
                      “{pasoDetalle.validacion.observaciones}”
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  {pasoDetalle.estado === "Pendiente"
                    ? "Pendiente de validación."
                    : "Bloqueado hasta completar el paso anterior."}
                </p>
              )}

              {pasoDetalle.ultimo_reverso && (
                <div className="mt-3 text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                  Último reverso: {pasoDetalle.ultimo_reverso.revertido_por} ·{" "}
                  {formatFecha(pasoDetalle.ultimo_reverso.fecha_hora)}
                  {pasoDetalle.ultimo_reverso.motivo && (
                    <span className="block text-amber-200/70 mt-0.5">
                      Motivo: {pasoDetalle.ultimo_reverso.motivo}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              {pasoDetalle.estado === "Pendiente" &&
                puedeValidar(pasoDetalle, proyecto.pasos, actor) && (
                  <button
                    onClick={() => setPasoAValidar(pasoDetalle)}
                    className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-500"
                  >
                    Validar paso
                  </button>
                )}
              {puedeRevertir(pasoDetalle, proyecto.pasos, actor) && (
                <button
                  onClick={() => setPasoARevertir(pasoDetalle)}
                  className="px-4 py-2 bg-slate-700 text-amber-300 text-sm font-medium rounded-xl hover:bg-slate-600 inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> Revertir
                </button>
              )}
              <button
                onClick={() => setPasoDetalle(null)}
                className="text-xs text-slate-500 hover:text-slate-300 mt-1"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal validar */}
      {pasoAValidar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#121a2b] rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 border border-slate-700">
            <div>
              <h2 className="text-xl font-bold text-white">Confirmar aprobación</h2>
              <p className="text-sm text-slate-400 mt-2">
                Vas a aprobar <strong className="text-slate-200">{pasoAValidar.nombre_hito}</strong> como{" "}
                <strong className="text-slate-200">{usuario.nombre}</strong> ({usuario.areaNombre}).
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Se registrará tu nombre y la fecha/hora exactas.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Observaciones (opcional)
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPasoAValidar(null);
                  setObservaciones("");
                }}
                className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarValidacion}
                disabled={confirmando}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-500 disabled:opacity-50"
              >
                {confirmando ? "Guardando..." : "Confirmar aprobación"}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Modal registrar pago parcial */}
      {pasoPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
          <div className="bg-[#121a2b] rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-700 my-6">
            <div>
              <h2 className="text-xl font-bold text-white">Registrar pago</h2>
              <p className="text-sm text-slate-400 mt-1">{pasoPago.nombre_hito}</p>
            </div>
            {(() => {
              const conc = conceptoDesdeHito(pasoPago.nombre_hito) || "";
              const obj = montoObjetivo(proyecto, conc);
              const pag = totalPagado(proyecto.pagos, conc);
              const pend = Math.max(0, saldoPendiente(proyecto, conc));
              const pct = obj > 0 ? Math.min(100, Math.round((pag / obj) * 100)) : 0;
              return (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>Objetivo</span>
                    <strong>{formatMonto(obj, proyecto.moneda)}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Pagado</span>
                    <strong>{formatMonto(pag, proyecto.moneda)}</strong>
                  </div>
                  <div className="flex justify-between text-amber-300">
                    <span>Pendiente</span>
                    <strong>{formatMonto(pend, proyecto.moneda)}</strong>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  {(proyecto.pagos || []).filter((x) => x.concepto === conc).length > 0 && (
                    <ul className="max-h-28 overflow-y-auto text-xs text-slate-400 space-y-1 border border-slate-800 rounded-lg p-2">
                      {(proyecto.pagos || [])
                        .filter((x) => x.concepto === conc)
                        .map((x) => (
                          <li key={x.id} className="flex justify-between gap-2">
                            <span>{formatFecha(x.fecha)} · {x.medio || "—"} · {x.registrado_por}</span>
                            <span className="text-slate-200">{formatMonto(x.monto, proyecto.moneda)}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              );
            })()}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Monto de este pago *</label>
              <input
                value={pagoForm.monto}
                onChange={(e) => setPagoForm((f) => ({ ...f, monto: e.target.value }))}
                inputMode="decimal"
                className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 150000,00"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Medio</label>
              <select
                value={pagoForm.medio}
                onChange={(e) => setPagoForm((f) => ({ ...f, medio: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none"
              >
                <option>Transferencia</option>
                <option>Efectivo</option>
                <option>Cheque</option>
                <option>Tarjeta</option>
                <option>Mercado Pago</option>
                <option>Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Observaciones</label>
              <input
                value={pagoForm.observaciones}
                onChange={(e) => setPagoForm((f) => ({ ...f, observaciones: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none"
              />
            </div>
            {errorPago && <p className="text-sm text-red-400">{errorPago}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setPasoPago(null); setErrorPago(""); }} className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-medium">Cerrar</button>
              <button type="button" onClick={registrarPago} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500">Registrar pago</button>
            </div>
            <p className="text-[11px] text-slate-500">El paso solo se puede validar cuando el pendiente llegue a cero.</p>
          </div>
        </div>
      )}

      {/* Modal editar datos (Admin) */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
          <div className="bg-[#121a2b] rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-700 my-8">
            <h2 className="text-xl font-bold text-white">Editar datos del proyecto</h2>
            <p className="text-xs text-slate-500">Solo administrador · No modifica la secuencia de pasos ya cargada.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Título</label>
                <input value={editForm.titulo} onChange={(e) => setEditForm((f) => ({ ...f, titulo: e.target.value }))} className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Cliente / Razón social *</label>
                <input value={editForm.nombre_cliente} onChange={(e) => setEditForm((f) => ({ ...f, nombre_cliente: e.target.value }))} className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Código</label>
                <input value={editForm.codigo_proyecto} onChange={(e) => setEditForm((f) => ({ ...f, codigo_proyecto: e.target.value }))} className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Moneda</label>
                <select value={editForm.moneda} onChange={(e) => setEditForm((f) => ({ ...f, moneda: e.target.value }))} className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="UYU">UYU</option>
                  <option value="BRL">BRL</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Presupuesto</label>
                <input value={editForm.presupuesto_estimado} onChange={(e) => setEditForm((f) => ({ ...f, presupuesto_estimado: e.target.value }))} inputMode="decimal" className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Monto anticipo</label>
                <input value={editForm.monto_anticipo} onChange={(e) => setEditForm((f) => ({ ...f, monto_anticipo: e.target.value }))} inputMode="decimal" className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email</label>
                <input type="email" value={editForm.email_contacto} onChange={(e) => setEditForm((f) => ({ ...f, email_contacto: e.target.value }))} className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Teléfono</label>
                <input value={editForm.telefono} onChange={(e) => setEditForm((f) => ({ ...f, telefono: e.target.value }))} className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Dirección de obra</label>
                <input value={editForm.direccion_obra} onChange={(e) => setEditForm((f) => ({ ...f, direccion_obra: e.target.value }))} className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Canal de venta</label>
                <input value={editForm.canal_venta} onChange={(e) => setEditForm((f) => ({ ...f, canal_venta: e.target.value }))} className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Estado general</label>
                <select value={editForm.estado_general} onChange={(e) => setEditForm((f) => ({ ...f, estado_general: e.target.value as Proyecto["estado_general"] }))} className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="En curso">En curso</option>
                  <option value="Completado">Completado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Notas</label>
                <textarea rows={3} value={editForm.notas} onChange={(e) => setEditForm((f) => ({ ...f, notas: e.target.value }))} className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditando(false)} className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-xl">Cancelar</button>
              <button type="button" onClick={guardarDatosProyecto} disabled={guardandoDatos} className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-500 disabled:opacity-50">{guardandoDatos ? "Guardando..." : "Guardar cambios"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal revertir */}
      {pasoARevertir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#121a2b] rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 border border-amber-500/30">
            <div>
              <h2 className="text-xl font-bold text-white">Revertir paso</h2>
              <p className="text-sm text-slate-400 mt-2">
                Vas a volver atrás <strong className="text-slate-200">{pasoARevertir.nombre_hito}</strong>.
                Los pasos siguientes quedarán bloqueados de nuevo.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Motivo (opcional)
              </label>
              <textarea
                value={motivoReverso}
                onChange={(e) => setMotivoReverso(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                placeholder="Ej: Error en datos, falta documentación..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPasoARevertir(null);
                  setMotivoReverso("");
                }}
                className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarReverso}
                disabled={confirmando}
                className="flex-1 px-4 py-2.5 bg-amber-600 text-white font-medium rounded-xl hover:bg-amber-500 disabled:opacity-50"
              >
                {confirmando ? "Guardando..." : "Confirmar reverso"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
