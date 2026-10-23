import { MONEDAS, type Moneda, type PagoParcial, type Proyecto } from "./types";

/** Parsea entrada de usuario a número con 2 decimales. Acepta 1.234,56 o 1234.56 */
export function parseMonto(raw: string): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/[^\d.,\-]/g, "");
  if (!s || s === "-" || s === "." || s === ",") return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // 1.234,56 → punto miles, coma decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(",", ".");
  }

  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export function formatMonto(n: number | string | undefined | null, moneda?: string): string {
  const num = typeof n === "string" ? parseMonto(n) ?? 0 : Number(n) || 0;
  const code = (moneda || "ARS") as Moneda;
  const meta = MONEDAS.find((m) => m.code === code);
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: code.length === 3 ? code : "ARS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    const sym = meta?.symbol || "$";
    return `${sym} ${num.toFixed(2)}`;
  }
}

/** Concepto de cobro a partir del nombre del hito */
export function conceptoDesdeHito(nombreHito: string): string | null {
  const u = nombreHito.toUpperCase().trim();
  if (!u.includes("COBRO")) return null;
  if (u.includes("ANTICIPO")) return "ANTICIPO";
  if (u.includes("PROVISION")) return "SALDO_PROVISION";
  if (u.includes("INSTALACION") || u.includes("INSTALACIÓN")) return "SALDO_INSTALACION";
  if (u.includes("SALDO")) return "SALDO";
  return "COBRO";
}

export function esPasoCobro(nombreHito: string): boolean {
  return nombreHito.toUpperCase().includes("COBRO");
}

export function totalPagado(pagos: PagoParcial[] | undefined, concepto: string): number {
  if (!pagos?.length) return 0;
  const t = pagos
    .filter((p) => p.concepto === concepto)
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);
  return Math.round(t * 100) / 100;
}

export function montoObjetivo(proyecto: Proyecto, concepto: string): number {
  if (concepto === "ANTICIPO") return Number(proyecto.monto_anticipo) || 0;
  if (concepto === "SALDO") {
    if (proyecto.monto_saldo != null && proyecto.monto_saldo > 0) {
      return Number(proyecto.monto_saldo);
    }
    const total = Number(proyecto.presupuesto_estimado) || 0;
    const ant = Number(proyecto.monto_anticipo) || 0;
    return Math.max(0, Math.round((total - ant) * 100) / 100);
  }
  // Otros conceptos: si no hay monto específico, 0 (Admin puede registrar igual)
  return 0;
}

export function saldoPendiente(proyecto: Proyecto, concepto: string): number {
  const obj = montoObjetivo(proyecto, concepto);
  const pag = totalPagado(proyecto.pagos, concepto);
  return Math.round((obj - pag) * 100) / 100;
}

export function cobroCompleto(proyecto: Proyecto, concepto: string): boolean {
  const obj = montoObjetivo(proyecto, concepto);
  if (obj <= 0) return false;
  return totalPagado(proyecto.pagos, concepto) + 0.001 >= obj;
}

export function estadoPagoLabel(proyecto: Proyecto, concepto: string): string {
  const obj = montoObjetivo(proyecto, concepto);
  const pag = totalPagado(proyecto.pagos, concepto);
  if (obj <= 0) return "Sin monto definido";
  if (pag <= 0) return "Sin pagos";
  if (pag + 0.001 >= obj) return "Pagado";
  return "Pago parcial";
}
