import { Plantilla, Proyecto, ProyectoPaso, UsuarioSesion } from "./types";
import { conceptoDesdeHito, cobroCompleto, esPasoCobro, montoObjetivo } from "./money";

export function crearPasosDesdePlantilla(plantilla: Plantilla): ProyectoPaso[] {
  return plantilla.pasos.map((p, idx) => ({
    id: crypto.randomUUID(),
    orden: p.orden,
    nombre_hito: p.nombre_hito,
    area_responsable: p.area_responsable,
    estado: idx === 0 ? "Pendiente" : "Bloqueado",
  }));
}

type Actor = Pick<UsuarioSesion, "id" | "nombre" | "areaNombre" | "activo">;

export function puedeValidar(
  paso: ProyectoPaso,
  pasos: ProyectoPaso[],
  usuario: Actor
): boolean {
  if (!usuario.activo) return false;
  if (paso.estado !== "Pendiente") return false;
  if (usuario.areaNombre !== "Admin" && usuario.areaNombre !== paso.area_responsable) {
    return false;
  }
  if (paso.orden === 1) return true;
  const anterior = pasos.find((p) => p.orden === paso.orden - 1);
  return anterior?.estado === "Aprobado";
}

/**
 * Puede revertir el último paso aprobado de su área (o Admin cualquier último aprobado).
 * Solo el paso aprobado "más adelante" (no se puede romper la cadena).
 */
export function puedeRevertir(
  paso: ProyectoPaso,
  pasos: ProyectoPaso[],
  usuario: Actor
): boolean {
  if (!usuario.activo) return false;
  if (paso.estado !== "Aprobado") return false;
  if (usuario.areaNombre !== "Admin" && usuario.areaNombre !== paso.area_responsable) {
    return false;
  }
  // Solo si no hay un paso posterior ya aprobado
  const posterioresAprobados = pasos.some(
    (p) => p.orden > paso.orden && p.estado === "Aprobado"
  );
  return !posterioresAprobados;
}

export function validarPaso(
  proyecto: Proyecto,
  pasoId: string,
  usuario: Actor,
  observaciones?: string
): Proyecto {
  const pasos = [...proyecto.pasos];
  const idx = pasos.findIndex((p) => p.id === pasoId);
  if (idx === -1) return proyecto;

  const paso = pasos[idx];
  if (esPasoCobro(paso.nombre_hito)) {
    const concepto = conceptoDesdeHito(paso.nombre_hito);
    if (concepto && montoObjetivo(proyecto, concepto) > 0 && !cobroCompleto(proyecto, concepto)) {
      // No avanzar si el cobro no está completo
      return proyecto;
    }
  }

  pasos[idx] = {
    ...pasos[idx],
    estado: "Aprobado",
    validacion: {
      validado_por: usuario.nombre,
      validado_por_id: usuario.id,
      fecha_hora: new Date().toISOString(),
      observaciones,
    },
  };

  if (idx + 1 < pasos.length) {
    pasos[idx + 1] = { ...pasos[idx + 1], estado: "Pendiente" };
  }

  const todosAprobados = pasos.every((p) => p.estado === "Aprobado");

  return {
    ...proyecto,
    pasos,
    estado_general: todosAprobados ? "Completado" : "En curso",
  };
}

export function revertirPaso(
  proyecto: Proyecto,
  pasoId: string,
  usuario: Actor,
  motivo?: string
): Proyecto {
  const pasos = [...proyecto.pasos];
  const idx = pasos.findIndex((p) => p.id === pasoId);
  if (idx === -1) return proyecto;

  pasos[idx] = {
    ...pasos[idx],
    estado: "Pendiente",
    validacion: undefined,
    ultimo_reverso: {
      revertido_por: usuario.nombre,
      revertido_por_id: usuario.id,
      fecha_hora: new Date().toISOString(),
      motivo,
    },
  };

  // Bloquear siguientes
  for (let i = idx + 1; i < pasos.length; i++) {
    pasos[i] = {
      ...pasos[i],
      estado: "Bloqueado",
      validacion: undefined,
    };
  }

  return {
    ...proyecto,
    pasos,
    estado_general: "En curso",
  };
}

export function calcularAvance(pasos: ProyectoPaso[]): number {
  if (pasos.length === 0) return 0;
  const aprobados = pasos.filter((p) => p.estado === "Aprobado").length;
  return Math.round((aprobados / pasos.length) * 100);
}

export function getPasoActual(pasos: ProyectoPaso[]): ProyectoPaso | undefined {
  return pasos.find((p) => p.estado === "Pendiente") || pasos[pasos.length - 1];
}

export function calcularEficienciaPasos(
  proyectos: Proyecto[]
): Record<string, { count: number; avgHours: number }> {
  const buckets: Record<string, number[]> = {};

  for (const proy of proyectos) {
    const aprobados = proy.pasos
      .filter((p) => p.estado === "Aprobado" && p.validacion)
      .sort((a, b) => a.orden - b.orden);

    for (let i = 1; i < aprobados.length; i++) {
      const prev = aprobados[i - 1];
      const curr = aprobados[i];
      if (!prev.validacion || !curr.validacion) continue;
      const t0 = new Date(prev.validacion.fecha_hora).getTime();
      const t1 = new Date(curr.validacion.fecha_hora).getTime();
      const hours = (t1 - t0) / (1000 * 60 * 60);
      if (hours < 0) continue;
      const key = curr.nombre_hito;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(hours);
    }
  }

  const result: Record<string, { count: number; avgHours: number }> = {};
  for (const [key, arr] of Object.entries(buckets)) {
    const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
    result[key] = { count: arr.length, avgHours: Math.round(avg * 10) / 10 };
  }
  return result;
}
