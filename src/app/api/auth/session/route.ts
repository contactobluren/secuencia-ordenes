
import { NextResponse } from "next/server";
import { getAuthenticatedUsuario } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await getAuthenticatedUsuario();

    if (!result.usuario) {
      return NextResponse.json(
        { ok: false, usuario: null },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      usuario: result.usuario,
    });
  } catch (error) {
    console.error("Error al verificar la sesión:", error);

    return NextResponse.json(
      { ok: false, usuario: null, error: "Error de servidor" },
      { status: 500 }
    );
  }
}
