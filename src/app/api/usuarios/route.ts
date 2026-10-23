
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUsuario } from "@/lib/auth-server";

export const runtime = "nodejs";

async function checkAuth() {
  const auth = await getAuthenticatedUsuario();

  if (!auth.usuario) {
    return {
      usuario: null,
      response: NextResponse.json(
        { error: auth.error || "No autorizado" },
        { status: auth.status || 401 }
      ),
    };
  }

  return { usuario: auth.usuario, response: null };
}

async function checkAdmin() {
  const auth = await checkAuth();

  if (auth.response) return auth;

  if (auth.usuario?.areaNombre !== "Admin") {
    return {
      usuario: null,
      response: NextResponse.json(
        { error: "No tenés permisos para administrar usuarios" },
        { status: 403 }
      ),
    };
  }

  return auth;
}

export async function GET() {
  try {
    const auth = await checkAuth();
    if (auth.response) return auth.response;

    const { data, error } = await supabaseAdmin
      .from("usuarios")
      .select("id, nombre, email, area_id, area_nombre, activo")
      .order("nombre");

    if (error) throw error;

    const users = (data ?? []).map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      areaId: u.area_id,
      areaNombre: u.area_nombre,
      activo: u.activo === true || u.activo === 1 || u.activo === "1",
    }));

    return NextResponse.json(users);
  } catch (e) {
    console.error("Error al listar usuarios:", e);
    return NextResponse.json(
      { error: "Error al listar usuarios" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await checkAdmin();
    if (auth.response) return auth.response;

    const body = await req.json();

    if (
      !body.id ||
      !body.email ||
      !body.nombre ||
      !body.areaId ||
      !body.areaNombre
    ) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios" },
        { status: 400 }
      );
    }

    const { data: area, error: areaError } = await supabaseAdmin
      .from("areas")
      .select("id, nombre, activo")
      .eq("id", body.areaId)
      .maybeSingle();

    if (areaError) throw areaError;

    if (
      !area ||
      !(area.activo === true || area.activo === 1 || area.activo === "1") ||
      area.nombre !== body.areaNombre
    ) {
      return NextResponse.json(
        { error: "El área seleccionada no existe o está inactiva" },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("id", body.id)
      .maybeSingle();

    if (findError) throw findError;

    if (!existing) {
      return NextResponse.json(
        { error: "El usuario no existe. Para crear cuentas, usá el proceso de creación." },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("usuarios")
      .update({
        nombre: String(body.nombre).trim(),
        email: String(body.email).trim().toLowerCase(),
        area_id: area.id,
        area_nombre: area.nombre,
        activo: body.activo ? 1 : 0,
      })
      .eq("id", body.id)
      .select("id, nombre, email, area_id, area_nombre, activo")
      .single();

    if (error) throw error;

    return NextResponse.json({
      id: data.id,
      nombre: data.nombre,
      email: data.email,
      areaId: data.area_id,
      areaNombre: data.area_nombre,
      activo: data.activo === true || data.activo === 1 || data.activo === "1",
    });
  } catch (e) {
    console.error("Error al guardar usuario:", e);
    return NextResponse.json(
      { error: "Error al guardar usuario" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await checkAdmin();
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Falta el id del usuario" },
        { status: 400 }
      );
    }

    if (id === auth.usuario?.id) {
      return NextResponse.json(
        { error: "No podés eliminar tu propio usuario" },
        { status: 400 }
      );
    }

    // Por seguridad, no borramos el perfil todavía:
    // también hay que eliminar la cuenta vinculada de Supabase Auth.
    return NextResponse.json(
      {
        error:
          "La eliminación de usuarios está temporalmente deshabilitada para proteger las cuentas vinculadas.",
      },
      { status: 501 }
    );
  } catch (e) {
    console.error("Error al eliminar usuario:", e);
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    );
  }
}
