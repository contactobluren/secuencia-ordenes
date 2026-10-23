import type { Area, Plantilla, Proyecto, Usuario } from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `Error HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// --- Auth ---
export async function apiLogin(email: string, password: string) {
  return json<{ ok: boolean; usuario?: Omit<Usuario, "password">; error?: string }>(
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  );
}

// --- Proyectos ---
export async function apiLoadProyectos(): Promise<Proyecto[]> {
  return json(await fetch("/api/proyectos"));
}

export async function apiGetProyecto(id: string): Promise<Proyecto> {
  return json(await fetch(`/api/proyectos?id=${encodeURIComponent(id)}`));
}

export async function apiUpsertProyecto(proyecto: Proyecto): Promise<Proyecto> {
  return json(
    await fetch("/api/proyectos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proyecto),
    })
  );
}

export async function apiDeleteProyecto(id: string): Promise<void> {
  await json(
    await fetch(`/api/proyectos?id=${encodeURIComponent(id)}`, { method: "DELETE" })
  );
}

// --- Usuarios ---
export async function apiLoadUsuarios(): Promise<Omit<Usuario, "password">[]> {
  return json(await fetch("/api/usuarios"));
}

export async function apiUpsertUsuario(usuario: Usuario): Promise<Omit<Usuario, "password">> {
  return json(
    await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(usuario),
    })
  );
}
export async function apiCrearUsuario(usuario: Usuario): Promise<Omit<Usuario, "password">> {
  return json(
    await fetch("/api/usuarios/crear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(usuario),
    })
  );
}
export async function apiDeleteUsuario(id: string): Promise<void> {
  await json(await fetch(`/api/usuarios?id=${encodeURIComponent(id)}`, { method: "DELETE" }));
}

// --- Áreas ---
export async function apiLoadAreas(): Promise<Area[]> {
  return json(await fetch("/api/areas"));
}

export async function apiUpsertArea(area: Area): Promise<Area> {
  return json(
    await fetch("/api/areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(area),
    })
  );
}

export async function apiDeleteArea(id: string): Promise<void> {
  await json(await fetch(`/api/areas?id=${encodeURIComponent(id)}`, { method: "DELETE" }));
}

// --- Plantillas ---
export async function apiLoadPlantillas(): Promise<Plantilla[]> {
  return json(await fetch("/api/plantillas"));
}

export async function apiUpsertPlantilla(plantilla: Plantilla): Promise<Plantilla> {
  return json(
    await fetch("/api/plantillas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plantilla),
    })
  );
}

export async function apiDeletePlantilla(id: string): Promise<void> {
  await json(await fetch(`/api/plantillas?id=${encodeURIComponent(id)}`, { method: "DELETE" }));
}
