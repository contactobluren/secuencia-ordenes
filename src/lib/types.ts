export type EstadoHito = "Pendiente" | "Aprobado" | "Bloqueado";

export type Moneda = "ARS" | "USD" | "EUR" | "UYU" | "BRL";

export const MONEDAS: { code: Moneda; label: string; symbol: string }[] = [
  { code: "ARS", label: "Peso argentino (ARS)", symbol: "$" },
  { code: "USD", label: "Dólar (USD)", symbol: "US$" },
  { code: "EUR", label: "Euro (EUR)", symbol: "€" },
  { code: "UYU", label: "Peso uruguayo (UYU)", symbol: "$U" },
  { code: "BRL", label: "Real (BRL)", symbol: "R$" },
];

export interface Area {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  areaId: string;
  areaNombre: string;
  activo: boolean;
}

export type UsuarioSesion = Omit<Usuario, "password">;

export interface PasoPlantilla {
  orden: number;
  nombre_hito: string;
  area_responsable: string;
  descripcion?: string;
}

export interface Plantilla {
  id: string;
  nombre: string;
  pasos: PasoPlantilla[];
}

export interface ValidacionInfo {
  validado_por: string;
  validado_por_id?: string;
  fecha_hora: string;
  observaciones?: string;
}

export interface ReversoInfo {
  revertido_por: string;
  revertido_por_id?: string;
  fecha_hora: string;
  motivo?: string;
}

export interface ProyectoPaso {
  id: string;
  orden: number;
  nombre_hito: string;
  area_responsable: string;
  estado: EstadoHito;
  validacion?: ValidacionInfo;
  ultimo_reverso?: ReversoInfo;
}

/** Pago parcial asociado a un concepto de cobro (ANTICIPO, SALDO, …) */
export interface PagoParcial {
  id: string;
  concepto: string;
  monto: number;
  fecha: string;
  medio?: string;
  registrado_por: string;
  registrado_por_id?: string;
  observaciones?: string;
}

export interface Proyecto {
  id: string;
  titulo: string;
  nombre_cliente: string;
  codigo_proyecto: string;
  canal_venta: string;
  /** Usuario del área Comercial asignado como vendedor */
  vendedor_id?: string;
  /** Nombre del vendedor (copia para mostrar aunque el usuario cambie) */
  vendedor_nombre?: string;
  /** Código ISO de moneda */
  moneda: Moneda | string;
  /** Presupuesto total (número con hasta 2 decimales) */
  presupuesto_estimado: number;
  /** Monto objetivo del anticipo */
  monto_anticipo: number;
  /** Monto objetivo del saldo (u otros conceptos opcionales) */
  monto_saldo?: number;
  email_contacto: string;
  telefono: string;
  direccion_obra: string;
  notas: string;
  plantilla_id: string;
  plantilla_nombre: string;
  pasos: ProyectoPaso[];
  /** Historial de cobros parciales */
  pagos: PagoParcial[];
  created_at: string;
  creado_por?: string;
  estado_general: "En curso" | "Completado" | "Cancelado";
}
