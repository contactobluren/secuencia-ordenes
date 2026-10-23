
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  throw new Error("Faltan variables de entorno de Supabase.");
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const { data: usuarios, error } = await supabase
    .from("usuarios")
    .select("id, nombre, email, password, activo, auth_user_id");

  if (error) throw error;

  if (!usuarios?.length) {
    throw new Error("No se encontraron usuarios en la tabla.");
  }

  // Consultar las cuentas de Auth existentes para evitar duplicados.
  const existentes = new Map();
  let page = 1;

  while (true) {
    const { data, error: listError } =
      await supabase.auth.admin.listUsers({ page, perPage: 100 });

    if (listError) throw listError;

    for (const user of data.users) {
      if (user.email) {
        existentes.set(user.email.toLowerCase(), user);
      }
    }

    if (data.users.length < 100) break;
    page++;
  }

  let creados = 0;
  let vinculados = 0;

  for (const usuario of usuarios) {
    if (!usuario.email || !usuario.password) {
      throw new Error("Hay un usuario sin correo o contraseña.");
    }

    let authUser = existentes.get(usuario.email.toLowerCase());

    if (!authUser) {
      if (usuario.password.length < 8) {
        throw new Error(
          "Se encontró una contraseña inferior a la longitud configurada."
        );
      }

      const { data, error: createError } =
        await supabase.auth.admin.createUser({
          email: usuario.email,
          password: usuario.password,
          email_confirm: true,
          user_metadata: {
            legacy_user_id: usuario.id,
            nombre: usuario.nombre,
          },
        });

      if (createError) {
        throw new Error(
          `No se pudo crear una cuenta. Detalle: ${createError.message}`
        );
      }

      authUser = data.user;
      existentes.set(usuario.email.toLowerCase(), authUser);
      creados++;
    }

    if (usuario.auth_user_id !== authUser.id) {
      const { error: updateError } = await supabase
        .from("usuarios")
        .update({ auth_user_id: authUser.id })
        .eq("id", usuario.id);

      if (updateError) throw updateError;
      vinculados++;
    }
  }

  console.log("Migración finalizada.");
  console.log(`Usuarios encontrados: ${usuarios.length}`);
  console.log(`Cuentas nuevas creadas: ${creados}`);
  console.log(`Vínculos actualizados: ${vinculados}`);
}

main().catch((error) => {
  console.error("La migración se detuvo:", error.message);
  process.exitCode = 1;
});
