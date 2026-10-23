
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import { Usuario } from "@/lib/types";
import { apiLogin, apiLoadUsuarios } from "@/lib/api-client";

const AUTH_KEY = "secuencia_ordenes_session";

type SafeUser = Omit<Usuario, "password">;

interface AuthContextValue {
  usuario: SafeUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
 logout: () => Promise<void>;
  usuarios: SafeUser[];
  allUsuarios: SafeUser[];
  refreshUsuarios: () => Promise<SafeUser[]>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<SafeUser | null>(null);
  const [usuarios, setUsuarios] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUsuarios = useCallback(async () => {
    try {
      const list = (await apiLoadUsuarios()) as SafeUser[];
      setUsuarios(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          localStorage.removeItem(AUTH_KEY);
          if (!cancelled) setUsuario(null);
          return;
        }

        const result = (await response.json()) as {
          ok: boolean;
          usuario: SafeUser | null;
        };

        if (!result.ok || !result.usuario) {
          localStorage.removeItem(AUTH_KEY);
          if (!cancelled) setUsuario(null);
          return;
        }

        localStorage.setItem(AUTH_KEY, JSON.stringify(result.usuario));

        if (!cancelled) {
          setUsuario(result.usuario);
        }

        // Cargar la lista de usuarios aparte de la verificación de sesión.
        await refreshUsuarios();
      } catch {
        localStorage.removeItem(AUTH_KEY);
        if (!cancelled) setUsuario(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [refreshUsuarios]);

  const login = async (email: string, password: string) => {
    try {
      const result = await apiLogin(email, password);

      if (!result.ok || !result.usuario) {
        return {
          ok: false,
          error: result.error || "Error de acceso",
        };
      }

      localStorage.setItem(AUTH_KEY, JSON.stringify(result.usuario));
      setUsuario(result.usuario);

      // La lista puede fallar si aún falta proteger o migrar su API.
      await refreshUsuarios();

      return { ok: true };
    } catch {
      return {
        ok: false,
        error: "No se pudo conectar con el servidor",
      };
    }
  };


const logout = async () => {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      cache: "no-store",
    });
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  } finally {
    localStorage.removeItem(AUTH_KEY);
    setUsuario(null);
    setUsuarios([]);
  }
};


  return (
    <AuthContext.Provider
      value={{
        usuario,
        loading,
        isAuthenticated: !!usuario,
        login,
        logout,
        usuarios: usuarios.filter((u) => !!u.activo),
        allUsuarios: usuarios,
        refreshUsuarios,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return ctx;
}

