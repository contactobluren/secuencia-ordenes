
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

try {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, auth_user_id");

  if (error) throw error;

  console.log({
    total: data.length,
    vinculados: data.filter((u) => u.auth_user_id).length,
  });
} catch (error) {
  console.error("Error:", error.message);
  process.exitCode = 1;
}
