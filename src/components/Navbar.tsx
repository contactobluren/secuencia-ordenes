"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, LogOut, BarChart3, Banknote } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, logout, usuario } = useAuth();

  if (pathname === "/login" || !isAuthenticated) {
    return null;
  }

  const isAdmin = usuario?.areaNombre === "Admin";


const handleLogout = async () => {
  await logout();
  window.location.href = "/login";
};

  const linkClass = (active: boolean) =>
    cn(
      "px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5",
      active
        ? "bg-blue-500/20 text-blue-300"
        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
    );

  return (
    <header className="sticky top-0 z-40 bg-[#0f172a]/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-white shrink-0">
              <img src="/logo-bluren.png" alt="Bluren" className="w-8 h-8 rounded-lg object-contain" />
              <span className="hidden sm:inline tracking-tight">
                BPM <span className="text-blue-400">Bluren</span>
              </span>
            </Link>
            <nav className="flex gap-0.5 overflow-x-auto">
              <Link href="/" className={linkClass(pathname === "/")}>
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden md:inline">Resumen</span>
              </Link>
              {isAdmin && (
                <Link href="/metricas" className={linkClass(pathname === "/metricas")}>
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden md:inline">Métricas</span>
                </Link>
              )}
              {isAdmin && (
                <Link href="/pagos" className={linkClass(pathname === "/pagos")}>
                  <Banknote className="w-4 h-4" />
                  <span className="hidden md:inline">Pagos</span>
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/configuracion"
                  className={linkClass(pathname.startsWith("/configuracion"))}
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden md:inline">Config</span>
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-100">{usuario?.nombre}</p>
              <p className="text-xs text-slate-500">{usuario?.areaNombre}</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
