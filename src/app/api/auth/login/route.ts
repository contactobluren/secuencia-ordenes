
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email y contraseña requeridos" },
        { status: 400 }
      );
    }

    // Autenticar con Supabase Auth y establecer la sesión en cookies.
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Email o contraseña incorrectos, o usuario inactivo.",
        },
        { status: 401 }
      );
    }

    // Buscar el usuario interno asociado a la cuenta autenticada.
    const { data: usuario, error: usuarioError } = await supabaseAdmin
      .from("usuarios")
      .select("id, nombre, email, area_id, area_nombre, activo, auth_user_id")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();

    const activo =
      usuario?.activo === true ||
      usuario?.activo === 1 ||
      usuario?.activo === "1";

    if (usuarioError || !usuario || !activo) {
      await supabase.auth.signOut();

      return NextResponse.json(
        {
          ok: false,
          error: "Email o contraseña incorrectos, o usuario inactivo.",
        },
        { status: 401 }
      );
    }

    // Mantener el formato que espera la aplicación.
    return NextResponse.json({
      ok: true,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        areaId: usuario.area_id,
        areaNombre: usuario.area_nombre,
        activo,
      },
    });
  } catch (error) {
    console.error("Error en el inicio de sesión:", error);

    return NextResponse.json(
      { ok: false, error: "Error de servidor" },
      { status: 500 }
    );
  }
}

