"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const isPublic = pathname === "/login";

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
    setReady(true);
  }, [loading, isAuthenticated, isPublic, router, pathname]);

  if (loading || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1220]">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
