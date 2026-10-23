import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getAuthenticatedUsuario() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      usuario: null,
      error: "No autenticado",
      status: 401,
    };
  }

  const { data: usuario, error } = await supabaseAdmin
    .from("usuarios")
    .select("id, nombre, email, area_id, area_nombre, activo, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const activo =
    usuario?.activo === true ||
    usuario?.activo === 1 ||
    usuario?.activo === "1";

  if (error || !usuario || !activo) {
    return {
      usuario: null,
      error: "Usuario inactivo o sin autorización",
      status: 403,
    };
  }

  return {
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      areaId: usuario.area_id,
      areaNombre: usuario.area_nombre,
      activo: true,
    },
    error: null,
    status: 200,
  };
}