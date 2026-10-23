/** Colores y estilos por área / sector para identificar dónde están frenados los proyectos */

export interface AreaColorStyle {
  bg: string;
  bgHover: string;
  text: string;
  border: string;
  borderLeft: string;
  bar: string;
  dot: string;
  badge: string;
  label: string;
}

export const AREA_COLORS: Record<string, AreaColorStyle> = {
  Comercial: {
    bg: "bg-sky-500/15",
    bgHover: "hover:bg-sky-500/25",
    text: "text-sky-300",
    border: "border-sky-500/40",
    borderLeft: "border-l-sky-500",
    bar: "bg-sky-500",
    dot: "bg-sky-400",
    badge: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    label: "Comercial",
  },
  Administracion: {
    bg: "bg-violet-500/15",
    bgHover: "hover:bg-violet-500/25",
    text: "text-violet-300",
    border: "border-violet-500/40",
    borderLeft: "border-l-violet-500",
    bar: "bg-violet-500",
    dot: "bg-violet-400",
    badge: "bg-violet-500/20 text-violet-300 border-violet-500/40",
    label: "Administración",
  },
  Produccion: {
    bg: "bg-amber-500/15",
    bgHover: "hover:bg-amber-500/25",
    text: "text-amber-300",
    border: "border-amber-500/40",
    borderLeft: "border-l-amber-500",
    bar: "bg-amber-500",
    dot: "bg-amber-400",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    label: "Producción",
  },
  Compras: {
    bg: "bg-teal-500/15",
    bgHover: "hover:bg-teal-500/25",
    text: "text-teal-300",
    border: "border-teal-500/40",
    borderLeft: "border-l-teal-500",
    bar: "bg-teal-500",
    dot: "bg-teal-400",
    badge: "bg-teal-500/20 text-teal-300 border-teal-500/40",
    label: "Compras",
  },
  Instalaciones: {
    bg: "bg-rose-500/15",
    bgHover: "hover:bg-rose-500/25",
    text: "text-rose-300",
    border: "border-rose-500/40",
    borderLeft: "border-l-rose-500",
    bar: "bg-rose-500",
    dot: "bg-rose-400",
    badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    label: "Instalaciones",
  },
  Logistica: {
    bg: "bg-orange-500/15",
    bgHover: "hover:bg-orange-500/25",
    text: "text-orange-300",
    border: "border-orange-500/40",
    borderLeft: "border-l-orange-500",
    bar: "bg-orange-500",
    dot: "bg-orange-400",
    badge: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    label: "Logística",
  },
  Contabilidad: {
    bg: "bg-indigo-500/15",
    bgHover: "hover:bg-indigo-500/25",
    text: "text-indigo-300",
    border: "border-indigo-500/40",
    borderLeft: "border-l-indigo-500",
    bar: "bg-indigo-500",
    dot: "bg-indigo-400",
    badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
    label: "Contabilidad",
  },
  Tecnica: {
    bg: "bg-cyan-500/15",
    bgHover: "hover:bg-cyan-500/25",
    text: "text-cyan-300",
    border: "border-cyan-500/40",
    borderLeft: "border-l-cyan-500",
    bar: "bg-cyan-500",
    dot: "bg-cyan-400",
    badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    label: "Técnica",
  },
  Admin: {
    bg: "bg-slate-500/15",
    bgHover: "hover:bg-slate-500/25",
    text: "text-slate-300",
    border: "border-slate-500/40",
    borderLeft: "border-l-slate-500",
    bar: "bg-slate-500",
    dot: "bg-slate-400",
    badge: "bg-slate-500/20 text-slate-300 border-slate-500/40",
    label: "Admin",
  },
};

export const COMPLETADO_COLOR: AreaColorStyle = {
  bg: "bg-emerald-500/15",
  bgHover: "hover:bg-emerald-500/25",
  text: "text-emerald-300",
  border: "border-emerald-500/40",
  borderLeft: "border-l-emerald-500",
  bar: "bg-emerald-500",
  dot: "bg-emerald-400",
  badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  label: "Completado",
};

export const FALLBACK_COLOR: AreaColorStyle = {
  bg: "bg-fuchsia-500/15",
  bgHover: "hover:bg-fuchsia-500/25",
  text: "text-fuchsia-300",
  border: "border-fuchsia-500/40",
  borderLeft: "border-l-fuchsia-500",
  bar: "bg-fuchsia-500",
  dot: "bg-fuchsia-400",
  badge: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
  label: "Otro sector",
};

export function normalizeAreaName(name: string): string {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const NORMALIZED_MAP: Record<string, AreaColorStyle> = {};
for (const [key, val] of Object.entries(AREA_COLORS)) {
  NORMALIZED_MAP[normalizeAreaName(key)] = val;
}
// Variantes comunes
NORMALIZED_MAP["administracion"] = AREA_COLORS.Administracion;
NORMALIZED_MAP["produccion"] = AREA_COLORS.Produccion;
NORMALIZED_MAP["logistica"] = AREA_COLORS.Logistica;
NORMALIZED_MAP["tecnica"] = AREA_COLORS.Tecnica;

export function colorPorArea(area?: string, completado?: boolean): AreaColorStyle {
  if (completado) return COMPLETADO_COLOR;
  if (!area) return AREA_COLORS.Admin;

  const key = normalizeAreaName(area);
  if (NORMALIZED_MAP[key]) {
    return NORMALIZED_MAP[key];
  }

  return {
    ...FALLBACK_COLOR,
    label: area,
  };
}
