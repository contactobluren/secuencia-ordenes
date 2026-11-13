"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await login(email.trim(), password);
    if (result.ok) {
      window.location.href = "/";
    } else {
      setError(result.error || "Error de acceso");
      setSubmitting(false);
    }
  };

  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1220]">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1220] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/logo-bluren.png"
            alt="Bluren"
            className="mx-auto w-16 h-16 rounded-2xl object-contain mb-4 shadow-lg shadow-blue-500/20"
          />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            BPM <span className="text-blue-400">Bluren</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Business Process Management</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#121a2b] rounded-2xl shadow-xl border border-slate-800 p-6 space-y-5"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-[#0f172a] text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="usuario@empresa.com"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-[#0f172a] text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-500 disabled:opacity-50 transition shadow-lg shadow-blue-600/20"
          >
            <LogIn className="w-4 h-4" />
            {submitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-600 mt-6">
          © Bluren · <a href="https://www.bluren.com.ar/" className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">bluren.com.ar</a>
        </p>
      </div>
    </div>
  );
}
