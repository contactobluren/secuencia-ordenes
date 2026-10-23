"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import AuthGuard from "@/components/AuthGuard";
import { AuthProvider } from "@/components/AuthProvider";

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  return (
    <AuthProvider>
      <AuthGuard>
        {!isLogin && <Navbar />}
        {isLogin ? (
          children
        ) : (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </main>
        )}
      </AuthGuard>
    </AuthProvider>
  );
}
