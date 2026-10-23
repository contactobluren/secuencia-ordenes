
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUsuario } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let authUserId: string | null = null;

  try {
    // Verificar sesión y permisos de administrador.
    const auth = await getAuthenticatedUsuario();

    if (!auth.usuario) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    if (auth.usuario.areaNombre !== "Admin") {
      return NextResponse.json(
        { error: "Solo administradores pueden crear usuarios" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const nombre = String(body.nombre || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const areaId = String(body.areaId || "");
    const activo = body.activo !== false;

    if (!nombre || !email || !password || !areaId) {
      return NextResponse.json(
        { error: "Nombre, email, contraseña y área son obligatorios" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    // Confirmar que el área existe.
    const { data: area, error: areaError } = await supabaseAdmin
      .from("areas")
      .select("id, nombre, activo")
      .eq("id", areaId)
      .maybeSingle();

    if (areaError) throw areaError;

    if (
      !area ||
      !(area.activo === true || area.activo === 1 || area.activo === "1")
    ) {
      return NextResponse.json(
        { error: "El área seleccionada no existe o está inactiva" },
        { status: 400 }
      );
    }

    // Crear la cuenta de autenticación en Supabase.
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError || !created.user) {
      return NextResponse.json(
        {
          error:
            createError?.message ||
            "No se pudo crear la cuenta de autenticación",
        },
        { status: 400 }
      );
    }

    authUserId = created.user.id;

    // Crear el perfil vinculado a la cuenta de autenticación.
    const { data: perfil, error: profileError } = await supabaseAdmin
      .from("usuarios")
      .insert({
        id: crypto.randomUUID(),
        nombre,
        email,
        area_id: area.id,
        area_nombre: area.nombre,
        activo: activo ? 1 : 0,
        auth_user_id: authUserId,
      })
      .select("id, nombre, email, area_id, area_nombre, activo")
      .single();

    if (profileError || !perfil) {
      // Revertir la cuenta Auth para evitar una cuenta huérfana.
      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.deleteUser(authUserId);

      if (rollbackError) {
        console.error(
          "No se pudo revertir la cuenta Auth:",
          rollbackError.message
        );
      }

      authUserId = null;
      throw profileError || new Error("No se pudo crear el perfil");
    }

    return NextResponse.json(
      {
        id: perfil.id,
        nombre: perfil.nombre,
        email: perfil.email,
        areaId: perfil.area_id,
        areaNombre: perfil.area_nombre,
        activo:
          perfil.activo === true ||
          perfil.activo === 1 ||
          perfil.activo === "1",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear usuario:", error);

    return NextResponse.json(
      { error: "No se pudo crear el usuario. Verificá los datos e intentá nuevamente." },
      { status: 500 }
    );
  }
}

