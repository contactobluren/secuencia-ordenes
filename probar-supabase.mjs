import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = fs.readFileSync(".env.local", "utf8");
const get = (name) => {
  const line = env.match(new RegExp("^" + name + "=(.*)$", "m"));
  return line?.[1]?.trim().replace(/^["']|["']$/g, "");
};

const url = get("SUPABASE_URL");
const key = get("SUPABASE_SECRET_KEY");

if (!url || !key) {
  console.log("Faltan variables de Supabase en .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);
const { data, error } = await supabase
  .from("areas")
  .select("id, nombre")
  .limit(10);

if (error) {
  console.log("Error de Supabase:", error.message);
  process.exit(1);
}

console.log("¡Conexión con Supabase exitosa!");
console.table(data);
