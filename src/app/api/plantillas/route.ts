
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUsuario } from "@/lib/auth-server";
import type { Plantilla } from "@/lib/types";

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
      .from("plantillas")
      .select("id, nombre, pasos_json")
      .order("nombre");

    if (error) throw error;

    const plantillas = (data ?? []).map((p) => {
      let pasos: Plantilla["pasos"] = [];

      try {
        pasos = p.pasos_json ? JSON.parse(p.pasos_json) : [];
        if (!Array.isArray(pasos)) pasos = [];
      } catch {
        pasos = [];
      }

      return {
        id: p.id,
        nombre: p.nombre,
        pasos,
      };
    });

    return NextResponse.json(plantillas);
  } catch (error) {
    console.error("Error al listar plantillas:", error);
    return NextResponse.json(
      { error: "Error al listar plantillas" },
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
        { error: "Solo el administrador puede modificar plantillas" },
        { status: 403 }
      );
    }

    const plantilla = (await req.json()) as Plantilla;

    if (
      !plantilla.id ||
      !plantilla.nombre?.trim() ||
      !Array.isArray(plantilla.pasos)
    ) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      );
    }

    const pasos = plantilla.pasos
      .map((s, i) => ({
        orden: s.orden || i + 1,
        nombre_hito: s.nombre_hito,
        area_responsable: s.area_responsable,
        descripcion: s.descripcion,
      }))
      .sort((a, b) => a.orden - b.orden);

    const { data, error } = await supabaseAdmin
      .from("plantillas")
      .upsert(
        {
          id: plantilla.id,
          nombre: plantilla.nombre.trim(),
          pasos_json: JSON.stringify(pasos),
        },
        { onConflict: "id" }
      )
      .select("id, nombre, pasos_json")
      .single();

    if (error) throw error;

    return NextResponse.json({
      id: data.id,
      nombre: data.nombre,
      pasos,
    });
  } catch (error) {
    console.error("Error al guardar plantilla:", error);
    return NextResponse.json(
      { error: "Error al guardar secuencia" },
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
        { error: "Solo el administrador puede eliminar plantillas" },
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
      .from("plantillas")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: "Plantilla no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar plantilla:", error);
    return NextResponse.json(
      { error: "Error al eliminar secuencia" },
      { status: 500 }
    );
  }
}
