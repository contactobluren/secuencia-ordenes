
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUsuario } from "@/lib/auth-server";
import type { Area } from "@/lib/types";

export const runtime = "nodejs";

async function checkAuth() {
  const auth = await getAuthenticatedUsuario();

  if (!auth.usuario) {
    return {
      usuario: null,
      response: NextResponse.json(
        { error: auth.error ?? "No autorizado" },
        { status: auth.status }
      ),
    };
  }

  return {
    usuario: auth.usuario,
    response: null,
  };
}

export async function GET() {
  try {
    const check = await checkAuth();
    if (check.response) return check.response;

    const { data, error } = await supabaseAdmin
      .from("areas")
      .select("id, nombre, descripcion, activo")
      .order("nombre");

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("Error al listar áreas:", error);
    return NextResponse.json(
      { error: "Error al listar áreas" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const check = await checkAuth();
    if (check.response) return check.response;

    if (check.usuario?.areaNombre !== "Admin") {
      return NextResponse.json(
        { error: "Solo el administrador puede modificar áreas" },
        { status: 403 }
      );
    }

    const area = (await req.json()) as Area;

    if (!area.id || !area.nombre?.trim()) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("areas")
      .upsert(
        {
          id: area.id,
          nombre: area.nombre.trim(),
          descripcion: area.descripcion ?? "",
          activo: area.activo ?? 1,
        },
        { onConflict: "id" }
      )
      .select("id, nombre, descripcion, activo")
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error al guardar área:", error);
    return NextResponse.json(
      { error: "Error al guardar área" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const check = await checkAuth();
    if (check.response) return check.response;

    if (check.usuario?.areaNombre !== "Admin") {
      return NextResponse.json(
        { error: "Solo el administrador puede eliminar áreas" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id requerido" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("areas")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: "Área no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar área:", error);
    return NextResponse.json(
      { error: "Error al eliminar área" },
      { status: 500 }
    );
  }
}

