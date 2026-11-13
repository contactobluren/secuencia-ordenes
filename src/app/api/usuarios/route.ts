import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUsuario } from "@/lib/auth-server";

export const runtime = "nodejs";

function esUUID(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor
  );
}

function estaActivo(valor: unknown) {
  return valor === true || valor === 1 || valor === "1";
}

async function buscarAuthPorEmail(email: string) {
  const buscado = email.trim().toLowerCase();

  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw error;

    const encontrado = data.users.find(
      (u) => String(u.email || "").toLowerCase() === buscado
    );
    if (encontrado) return encontrado;

    if (data.users.length < 100) return null;
  }
}

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

    return NextResponse.json(
      (data ?? []).map((u) => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        areaId: u.area_id,
        areaNombre: u.area_nombre,
        activo: estaActivo(u.activo),
      }))
    );
  } catch (error) {
    console.error("Error al listar usuarios:", error);

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

    const id = String(body.id || "").trim();
    const nombre = String(body.nombre || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const areaId = String(body.areaId || "").trim();
    const areaNombre = String(body.areaNombre || "").trim();
    const activo = body.activo ? 1 : 0;

    if (!id || !nombre || !email || !areaId || !areaNombre) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios" },
        { status: 400 }
      );
    }

if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
  return NextResponse.json(
    { error: "El email ingresado no es válido" },
    { status: 400 }
  );
}

    if (password && password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    const { data: area, error: areaError } = await supabaseAdmin
      .from("areas")
      .select("id, nombre, activo")
      .eq("id", areaId)
      .maybeSingle();

    if (areaError) throw areaError;

    if (!area || !estaActivo(area.activo) || area.nombre !== areaNombre) {
      return NextResponse.json(
        { error: "El área seleccionada no existe o está inactiva" },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("usuarios")
      .select(
        "id, nombre, email, area_id, area_nombre, activo, auth_user_id"
      )
      .eq("id", id)
      .maybeSingle();

    if (findError) throw findError;

    if (!existing) {
      return NextResponse.json(
        { error: "El usuario no existe. Actualizá la lista e intentá nuevamente." },
        { status: 404 }
      );
    }

    // Evitar que dos perfiles tengan el mismo email.
    const { data: duplicate, error: duplicateError } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("email", email)
      .neq("id", id)
      .maybeSingle();

    if (duplicateError) throw duplicateError;

    if (duplicate) {
      return NextResponse.json(
        { error: "Ese email ya está asignado a otro usuario de la aplicación." },
        { status: 409 }
      );
    }

    const authUserId = String(existing.auth_user_id || "").trim();

    /*
     * CASO 1:
     * El perfil tiene un hash antiguo en auth_user_id.
     * Se crea una cuenta nueva de Supabase Auth y se vincula
     * al perfil existente. Para esto es obligatorio ingresar
     * una contraseña nueva en el formulario.
     */
    if (!esUUID(authUserId)) {
      if (!password) {
        return NextResponse.json(
          {
            error:
              "Este usuario todavía no tiene una cuenta de acceso vinculada. Ingresá una contraseña nueva de al menos 8 caracteres para repararlo.",
          },
          { status: 409 }
        );
      }

      // Si ya existe una cuenta Auth con ese email (por ejemplo, de un
      // intento anterior que quedó a medias), la reutilizamos en vez de
      // intentar crear otra, que Supabase rechazaría.
      const cuentaExistente = await buscarAuthPorEmail(email);
      let newAuthUserId: string;
      let cuentaCreadaAhora = false;

      if (cuentaExistente) {
        const { data: otroPerfil, error: otroPerfilError } = await supabaseAdmin
          .from("usuarios")
          .select("id")
          .eq("auth_user_id", cuentaExistente.id)
          .neq("id", id)
          .maybeSingle();

        if (otroPerfilError) throw otroPerfilError;

        if (otroPerfil) {
          return NextResponse.json(
            { error: "Ya existe una cuenta de acceso con ese email vinculada a otro usuario." },
            { status: 409 }
          );
        }

        const { error: pwError } =
          await supabaseAdmin.auth.admin.updateUserById(cuentaExistente.id, {
            password,
            email_confirm: true,
          });

        if (pwError) {
          console.error("Error al actualizar cuenta Auth existente:", pwError);
          return NextResponse.json(
            { error: "No se pudo actualizar la contraseña. Detalle: " + pwError.message },
            { status: 400 }
          );
        }

        newAuthUserId = cuentaExistente.id;
      } else {
        const { data: created, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });

        if (createError || !created.user) {
          console.error("Error al crear cuenta Auth:", createError);

          return NextResponse.json(
            {
              error:
                createError?.message ||
                "No se pudo crear la cuenta de acceso en Supabase.",
            },
            { status: 400 }
          );
        }

        newAuthUserId = created.user.id;
        cuentaCreadaAhora = true;
      }

      const { data: updatedProfile, error: profileError } =
        await supabaseAdmin
          .from("usuarios")
          .update({
            nombre,
            email,
            area_id: area.id,
            area_nombre: area.nombre,
            activo,
            auth_user_id: newAuthUserId,
          })
          .eq("id", id)
          .select("id, nombre, email, area_id, area_nombre, activo")
          .single();

      if (profileError || !updatedProfile) {
        console.error("Error al vincular perfil:", profileError);

        if (cuentaCreadaAhora) {
          const { error: deleteAuthError } =
            await supabaseAdmin.auth.admin.deleteUser(newAuthUserId);

          if (deleteAuthError) {
            console.error(
              "No se pudo eliminar la cuenta Auth creada:",
              deleteAuthError
            );
          }
        }

        return NextResponse.json(
          {
            error:
              "Se creó la cuenta de acceso, pero no se pudo vincular al perfil. Se intentó revertir la creación. Contactá al administrador antes de volver a intentarlo.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        id: updatedProfile.id,
        nombre: updatedProfile.nombre,
        email: updatedProfile.email,
        areaId: updatedProfile.area_id,
        areaNombre: updatedProfile.area_nombre,
        activo: estaActivo(updatedProfile.activo),
      });
    }

    /*
     * CASO 2:
     * El perfil ya tiene un identificador UUID.
     * Verificamos que la cuenta de Supabase Auth exista.
     */
    const { data: authAccount, error: getAuthError } =
      await supabaseAdmin.auth.admin.getUserById(authUserId);

    if (getAuthError || !authAccount.user) {
      console.error("No se encontró la cuenta Auth vinculada:", getAuthError);

      return NextResponse.json(
        {
          error:
            "El perfil tiene un identificador de autenticación, pero la cuenta vinculada no existe en Supabase Auth. No se modificó el usuario.",
        },
        { status: 409 }
      );
    }

    // Comparamos contra el email REAL de Supabase Auth,
    // no solamente contra el email guardado en el perfil.
    const authEmailAnterior = String(
      authAccount.user.email || ""
    ).trim().toLowerCase();

    const emailCambio = email !== authEmailAnterior;
    const passwordCambio = password.length > 0;

    // Guardamos primero los datos anteriores para poder restaurarlos.
    const { data: updatedProfile, error: updateError } =
      await supabaseAdmin
        .from("usuarios")
        .update({
          nombre,
          email,
          area_id: area.id,
          area_nombre: area.nombre,
          activo,
        })
        .eq("id", id)
        .select("id, nombre, email, area_id, area_nombre, activo")
        .single();

    if (updateError || !updatedProfile) {
      throw updateError || new Error("No se pudo actualizar el perfil");
    }

    // Sincronizar email y/o contraseña en Supabase Auth.
    if (emailCambio || passwordCambio) {
      const authChanges: {
        email?: string;
        password?: string;
        email_confirm?: boolean;
      } = {};

      if (emailCambio) {
        authChanges.email = email;
        authChanges.email_confirm = true;
      }

      if (passwordCambio) {
        authChanges.password = password;
      }

      try {
        const { error: authUpdateError } =
          await supabaseAdmin.auth.admin.updateUserById(
            authUserId,
            authChanges
          );

        if (authUpdateError) {
          throw authUpdateError;
        }
      } catch (authError) {
        console.error("Error al actualizar Supabase Auth:", authError);

        // Restaurar los datos anteriores del perfil.
        const { error: rollbackError } = await supabaseAdmin
          .from("usuarios")
          .update({
            nombre: existing.nombre,
            email: existing.email,
            area_id: existing.area_id,
            area_nombre: existing.area_nombre,
            activo: existing.activo,
          })
          .eq("id", id);

        if (rollbackError) {
          console.error("Error al restaurar el perfil:", rollbackError);

          return NextResponse.json(
            {
              error:
                "Falló la actualización de acceso y también la restauración del perfil. Se requiere revisión del administrador.",
            },
            { status: 500 }
          );
        }

        const detail =
          authError instanceof Error
            ? authError.message
            : "Error desconocido de autenticación";

        return NextResponse.json(
          {
            error:
              "Supabase no permitió actualizar el email o la contraseña. El perfil fue restaurado. Detalle: " +
              detail,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      id: updatedProfile.id,
      nombre: updatedProfile.nombre,
      email: updatedProfile.email,
      areaId: updatedProfile.area_id,
      areaNombre: updatedProfile.area_nombre,
      activo: estaActivo(updatedProfile.activo),
    });
  } catch (error) {
    console.error("Error al guardar usuario:", error);

    return NextResponse.json(
      { error: "Error al guardar usuario. Revisá los datos e intentá nuevamente." },
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

    const { data: perfil, error: findError } = await supabaseAdmin
      .from("usuarios")
      .select("id, auth_user_id")
      .eq("id", id)
      .maybeSingle();

    if (findError) throw findError;

    if (!perfil) {
      return NextResponse.json(
        { error: "El usuario no existe. Actualizá la lista." },
        { status: 404 }
      );
    }

    // 1) Borrar el perfil de la aplicación.
    const { error: deleteError } = await supabaseAdmin
      .from("usuarios")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error al eliminar perfil:", deleteError);

      // 23503 = el usuario está referenciado en otros registros.
      if (deleteError.code === "23503") {
        return NextResponse.json(
          {
            error:
              "No se puede eliminar porque el usuario tiene registros asociados. Desactivalo en su lugar.",
          },
          { status: 409 }
        );
      }
      throw deleteError;
    }

    // 2) Borrar la cuenta de acceso vinculada, si existe.
    const authUserId = String(perfil.auth_user_id || "").trim();
    if (esUUID(authUserId)) {
      const { error: authDeleteError } =
        await supabaseAdmin.auth.admin.deleteUser(authUserId);

      if (authDeleteError) {
        // El perfil ya no existe, así que la cuenta no puede entrar a la app
        // (el login exige un perfil vinculado). Solo lo registramos.
        console.error("Perfil eliminado, pero no la cuenta Auth:", authDeleteError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);

    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    );
  }
}