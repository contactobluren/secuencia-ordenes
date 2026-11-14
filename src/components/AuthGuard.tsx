"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/** Secciones que solo puede abrir el área Admin. */
const SOLO_ADMIN = ["/configuracion", "/pagos", "/metricas"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, usuario } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const isPublic = pathname === "/login";
  const esSoloAdmin = SOLO_ADMIN.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const bloqueado = esSoloAdmin && usuario?.areaNombre !== "Admin";

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated && !isPublic) {
      router.replace("/login");
      return;
    }
    if (isAuthenticated && isPublic) {
      router.replace("/");
      return;
    }
    if (isAuthenticated && bloqueado) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [loading, isAuthenticated, isPublic, bloqueado, router, pathname]);

  if (loading || !ready || (isAuthenticated && bloqueado)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1220]">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
