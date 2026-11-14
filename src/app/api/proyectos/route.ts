
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUsuario } from "@/lib/auth-server";
import type { Proyecto } from "@/lib/types";

export const runtime = "nodejs";

function parseArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function mapProyecto(row: Record<string, unknown>): Proyecto {
  return {
    id: String(row.id ?? ""),
    codigo_proyecto: String(row.codigo_proyecto ?? ""),
    titulo: String(row.titulo ?? ""),
    nombre_cliente: String(row.nombre_cliente ?? ""),
    canal_venta: String(row.canal_venta ?? ""),
    vendedor_id: row.vendedor_id == null ? undefined : String(row.vendedor_id),
    vendedor_nombre:
      row.vendedor_nombre == null ? undefined : String(row.vendedor_nombre),
    moneda: String(row.moneda || "ARS"),
    presupuesto_estimado: Number(row.presupuesto_estimado ?? 0),
    monto_anticipo: Number(row.monto_anticipo ?? 0),
    monto_saldo:
      row.monto_saldo == null ? undefined : Number(row.monto_saldo),
    email_contacto: String(row.email_contacto ?? ""),
    telefono: String(row.telefono ?? ""),
    direccion_obra: String(row.direccion_obra ?? ""),
    notas: String(row.notas ?? ""),
    plantilla_id: String(row.plantilla_id ?? ""),
    plantilla_nombre: String(row.plantilla_nombre ?? ""),
    pasos: parseArray(row.pasos_json),
    pagos: parseArray(row.pagos_json),
    // Algunos proyectos importados tienen el estado vacío: se tratan como "En curso".
    estado_general: String(
      row.estado_general || "En curso"
    ) as Proyecto["estado_general"],
    created_at: String(row.created_at ?? ""),
    creado_por:
      row.creado_por == null ? undefined : String(row.creado_por),
  };
}

function errorAuth(auth: { error: string | null; status: number }) {
  return NextResponse.json(
    { error: auth.error ?? "No autorizado" },
    { status: auth.status }
  );
}

async function comprobarAdmin() {
  const auth = await getAuthenticatedUsuario();

  if (!auth.usuario) {
    return { auth, response: errorAuth(auth) };
  }

  if (auth.usuario.areaNombre !== "Admin") {
    return {
      auth,
      response: NextResponse.json(
        { error: "Solo el administrador puede eliminar proyectos" },
        { status: 403 }
      ),
    };
  }

  return { auth, response: null };
}

export async function GET(request: Request) {
  const auth = await getAuthenticatedUsuario();
  if (!auth.usuario) return errorAuth(auth);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    let query = supabaseAdmin.from("proyectos").select("*");

    if (id) {
      query = query.eq("id", id);
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = id
      ? await query.maybeSingle()
      : await query;

    if (error) {
      console.error("Error al consultar proyectos:", error);
      return NextResponse.json(
        { error: "No se pudieron consultar los proyectos" },
        { status: 500 }
      );
    }

    if (id && !data) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      id ? mapProyecto(data as Record<string, unknown>) :
        (data ?? []).map((row: Record<string, unknown>) => mapProyecto(row))
    );
  } catch (error) {
    console.error("Error en GET proyectos:", error);
    return NextResponse.json(
      { error: "No se pudieron consultar los proyectos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUsuario();
  if (!auth.usuario) return errorAuth(auth);

  try {
    const body = (await request.json()) as Partial<Proyecto>;

    if (
      !body.id ||
      !body.codigo_proyecto ||
      !body.titulo ||
      !body.nombre_cliente ||
      !body.plantilla_id ||
      !body.plantilla_nombre
    ) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios del proyecto" },
        { status: 400 }
      );
    }

    const { data: existente, error: errorExistente } = await supabaseAdmin
      .from("proyectos")
      .select("id, creado_por, created_at")
      .eq("id", body.id)
      .maybeSingle();

    if (errorExistente) {
      console.error("Error al verificar proyecto:", errorExistente);
      return NextResponse.json(
        { error: "No se pudo verificar el proyecto" },
        { status: 500 }
      );
    }

    const proyecto = {
      id: body.id,
      codigo_proyecto: body.codigo_proyecto,
      titulo: body.titulo,
      nombre_cliente: body.nombre_cliente,
      canal_venta: body.canal_venta ?? "",
      vendedor_id: body.vendedor_id || null,
      vendedor_nombre: body.vendedor_id ? body.vendedor_nombre ?? "" : null,
      moneda: body.moneda ?? "ARS",
      presupuesto_estimado: Number(body.presupuesto_estimado ?? 0),
      monto_anticipo: Number(body.monto_anticipo ?? 0),
      monto_saldo: body.monto_saldo ?? null,
      email_contacto: body.email_contacto ?? "",
      telefono: body.telefono ?? "",
      direccion_obra: body.direccion_obra ?? "",
      notas: body.notas ?? "",
      plantilla_id: body.plantilla_id,
      plantilla_nombre: body.plantilla_nombre,
      pasos_json: JSON.stringify(body.pasos ?? []),
      pagos_json: JSON.stringify(body.pagos ?? []),
      estado_general: body.estado_general ?? "En curso",
      created_at: existente?.created_at ?? new Date().toISOString(),
      creado_por: existente?.creado_por ?? auth.usuario.id,
    };

    const { data, error } = await supabaseAdmin
      .from("proyectos")
      .upsert(proyecto, { onConflict: "id" })
      .select("*")
      .single();

    if (error) {
      console.error("Error al guardar proyecto:", error);
      return NextResponse.json(
        { error: "No se pudo guardar el proyecto" },
        { status: 500 }
      );
    }

    return NextResponse.json(mapProyecto(data));
  } catch (error) {
    console.error("Error al procesar proyecto:", error);
    return NextResponse.json(
      { error: "No se pudo procesar el proyecto enviado" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const { auth, response } = await comprobarAdmin();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Falta el id del proyecto" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("proyectos")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Error al eliminar proyecto:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el proyecto" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Proyecto no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
