import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Sky (Comercial)
    "bg-sky-500/15", "hover:bg-sky-500/25", "text-sky-300", "border-sky-500/40", "border-l-sky-500", "bg-sky-500", "bg-sky-400", "bg-sky-500/20",
    // Violet (Administración)
    "bg-violet-500/15", "hover:bg-violet-500/25", "text-violet-300", "border-violet-500/40", "border-l-violet-500", "bg-violet-500", "bg-violet-400", "bg-violet-500/20",
    // Amber (Producción / Taller)
    "bg-amber-500/15", "hover:bg-amber-500/25", "text-amber-300", "border-amber-500/40", "border-l-amber-500", "bg-amber-500", "bg-amber-400", "bg-amber-500/20",
    // Emerald (Completado)
    "bg-emerald-500/15", "hover:bg-emerald-500/25", "text-emerald-300", "border-emerald-500/40", "border-l-emerald-500", "bg-emerald-500", "bg-emerald-400", "bg-emerald-500/20",
    // Teal (Compras)
    "bg-teal-500/15", "hover:bg-teal-500/25", "text-teal-300", "border-teal-500/40", "border-l-teal-500", "bg-teal-500", "bg-teal-400", "bg-teal-500/20",
    // Rose (Instalaciones)
    "bg-rose-500/15", "hover:bg-rose-500/25", "text-rose-300", "border-rose-500/40", "border-l-rose-500", "bg-rose-500", "bg-rose-400", "bg-rose-500/20",
    // Orange (Logística)
    "bg-orange-500/15", "hover:bg-orange-500/25", "text-orange-300", "border-orange-500/40", "border-l-orange-500", "bg-orange-500", "bg-orange-400", "bg-orange-500/20",
    // Indigo (Contabilidad)
    "bg-indigo-500/15", "hover:bg-indigo-500/25", "text-indigo-300", "border-indigo-500/40", "border-l-indigo-500", "bg-indigo-500", "bg-indigo-400", "bg-indigo-500/20",
    // Cyan (Técnica)
    "bg-cyan-500/15", "hover:bg-cyan-500/25", "text-cyan-300", "border-cyan-500/40", "border-l-cyan-500", "bg-cyan-500", "bg-cyan-400", "bg-cyan-500/20",
    // Fuchsia (Otros)
    "bg-fuchsia-500/15", "hover:bg-fuchsia-500/25", "text-fuchsia-300", "border-fuchsia-500/40", "border-l-fuchsia-500", "bg-fuchsia-500", "bg-fuchsia-400", "bg-fuchsia-500/20",
    // Slate (Admin)
    "bg-slate-500/15", "hover:bg-slate-500/25", "text-slate-300", "border-slate-500/40", "border-l-slate-500", "bg-slate-500", "bg-slate-400", "bg-slate-500/20",
    // Border widths
    "border-l-4", "border-l-2",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
    },
  },
  plugins: [],
};
export default config;
