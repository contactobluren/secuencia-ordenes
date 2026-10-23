"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Usuario, Area } from "@/lib/types";
import {
  apiLoadUsuarios,
apiCrearUsuario,
  apiUpsertUsuario,
  apiDeleteUsuario,
  apiLoadAreas,
  apiUpsertArea,
  apiDeleteArea,
} from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import SecuenciasConfig from "@/components/SecuenciasConfig";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Users,
  Building2,
  Briefcase,
  Calculator,
  Wrench,
  Shield,
  Layers,
  GitBranch,
} from "lucide-react";

type Tab = "usuarios" | "areas" | "secuencias";

const AREA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Comercial: Briefcase,
  Administracion: Calculator,
  Produccion: Wrench,
  Admin: Shield,
};

function AreaIcon({ nombre, className }: { nombre: string; className?: string }) {
  const Icon = AREA_ICONS[nombre] || Layers;
  return <Icon className={className} />;
}

export default function ConfigPage() {
  const router = useRouter();
  const { refreshUsuarios, usuario: currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>("usuarios");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  const [editUser, setEditUser] = useState<Usuario | null>(null);
  const [nuevoUser, setNuevoUser] = useState(false);
  const [userForm, setUserForm] = useState({
    nombre: "",
    email: "",
    password: "",
    areaId: "",
    activo: true,
  });

  const [editArea, setEditArea] = useState<Area | null>(null);
  const [nuevoArea, setNuevoArea] = useState(false);
  const [areaForm, setAreaForm] = useState({ nombre: "", descripcion: "", activo: true });

  const isAdmin = currentUser?.areaNombre === "Admin";

  useEffect(() => {
    if (currentUser && !isAdmin) {
      router.replace("/");
    }
  }, [currentUser, isAdmin, router]);

  useEffect(() => {
    apiLoadUsuarios().then((u) => setUsuarios(u as Usuario[])).catch(console.error);
    apiLoadAreas().then(setAreas).catch(console.error);
  }, []);

  if (!isAdmin) {
    return (
      <div className="text-center py-20 text-slate-500">
        Solo administradores pueden acceder a la configuración.
      </div>
    );
  }

  const areasActivas = areas.filter((a) => a.activo);

  const abrirNuevoUser = () => {
    setNuevoUser(true);
    setEditUser(null);
    setUserForm({
      nombre: "",
      email: "",
      password: "",
      areaId: areasActivas[0]?.id || "",
      activo: true,
    });
  };

  const abrirEditarUser = (u: Usuario) => {
    setEditUser(u);
    setNuevoUser(false);
    setUserForm({
      nombre: u.nombre,
      email: u.email,
      password: "",
      areaId: u.areaId,
      activo: u.activo,
    });
  };

  const reloadUsers = async () => {
    const u = await apiLoadUsuarios();
    setUsuarios(u as Usuario[]);
    await refreshUsuarios();
  };

 
const guardarUser = async () => {
  if (!userForm.nombre.trim() || !userForm.email.trim()) {
    alert("Nombre y email son obligatorios");
    return;
  }

  if (nuevoUser && !userForm.password) {
    alert("La contraseña es obligatoria para usuarios nuevos");
    return;
  }

  const area = areas.find((a) => a.id === userForm.areaId);
  if (!area) {
    alert("Seleccioná un área");
    return;
  }

  try {
    if (nuevoUser) {
      await apiCrearUsuario({
        id: crypto.randomUUID(),
        nombre: userForm.nombre.trim(),
        email: userForm.email.trim().toLowerCase(),
        password: userForm.password,
        areaId: area.id,
        areaNombre: area.nombre,
        activo: userForm.activo,
      } as Usuario);
    } else if (editUser) {
      await apiUpsertUsuario({
        ...editUser,
        nombre: userForm.nombre.trim(),
        email: userForm.email.trim().toLowerCase(),
        password: "",
        areaId: area.id,
        areaNombre: area.nombre,
        activo: userForm.activo,
      } as Usuario);
    }

    await reloadUsers();
    setNuevoUser(false);
    setEditUser(null);
    alert(nuevoUser ? "Usuario creado correctamente" : "Usuario actualizado correctamente");
  } catch (error) {
    console.error("Error al guardar usuario:", error);
    alert(error instanceof Error ? error.message : "No se pudo guardar el usuario");
  }
};


  const eliminarUser = async (id: string) => {
    if (currentUser?.id === id) {
      alert("No podés eliminar el usuario con el que estás logueado.");
      return;
    }
    if (!confirm("¿Eliminar este usuario?")) return;
    await apiDeleteUsuario(id);
    await reloadUsers();
  };

  const abrirNuevaArea = () => {
    setNuevoArea(true);
    setEditArea(null);
    setAreaForm({ nombre: "", descripcion: "", activo: true });
  };

  const abrirEditarArea = (a: Area) => {
    setEditArea(a);
    setNuevoArea(false);
    setAreaForm({ nombre: a.nombre, descripcion: a.descripcion || "", activo: a.activo });
  };

  const guardarArea = async () => {
    if (!areaForm.nombre.trim()) {
      alert("El nombre del área es obligatorio");
      return;
    }
    if (nuevoArea) {
      await apiUpsertArea({
        id: crypto.randomUUID(),
        nombre: areaForm.nombre.trim(),
        descripcion: areaForm.descripcion.trim(),
        activo: areaForm.activo,
      });
    } else if (editArea) {
      await apiUpsertArea({
        ...editArea,
        nombre: areaForm.nombre.trim(),
        descripcion: areaForm.descripcion.trim(),
        activo: areaForm.activo,
      });
    }
    const a = await apiLoadAreas();
    setAreas(a);
    await reloadUsers();
    setNuevoArea(false);
    setEditArea(null);
  };

  const eliminarArea = async (id: string) => {
    const used = usuarios.some((u) => u.areaId === id);
    if (used) {
      alert("No se puede eliminar: hay usuarios asignados a esta área.");
      return;
    }
    if (!confirm("¿Eliminar esta área?")) return;
    await apiDeleteArea(id);
    setAreas(await apiLoadAreas());
  };

  const inputClass =
    "w-full px-3 py-2 border border-slate-700 rounded-xl text-sm bg-[#0f172a] text-slate-100 outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-slate-500 mt-1">
          Solo administradores · Usuarios, roles y secuencias de trabajo
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-800 overflow-x-auto">
        {(
          [
            { id: "usuarios" as Tab, label: "Usuarios", Icon: Users },
            { id: "areas" as Tab, label: "Roles / Áreas", Icon: Building2 },
            { id: "secuencias" as Tab, label: "Secuencias", Icon: GitBranch },
          ]
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              tab === id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Icon className="w-4 h-4" /> {label}
            </span>
          </button>
        ))}
      </div>

      {tab === "usuarios" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={abrirNuevoUser}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500"
            >
              <Plus className="w-4 h-4" /> Nuevo usuario
            </button>
          </div>

          {(nuevoUser || editUser) && (
            <div className="bg-[#121a2b] rounded-2xl border border-blue-500/30 p-5 space-y-4">
              <h2 className="font-semibold text-white">
                {nuevoUser ? "Nuevo usuario" : `Editar: ${editUser?.nombre}`}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
                  <input value={userForm.nombre} onChange={(e) => setUserForm((f) => ({ ...f, nombre: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email *</label>
                  <input type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Contraseña {nuevoUser ? "*" : "(vacío = no cambiar)"}
                  </label>
                  <input type="password" value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Rol / Área *</label>
                  <select value={userForm.areaId} onChange={(e) => setUserForm((f) => ({ ...f, areaId: e.target.value }))} className={inputClass}>
                    {areasActivas.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                  <input type="checkbox" checked={userForm.activo} onChange={(e) => setUserForm((f) => ({ ...f, activo: e.target.checked }))} className="rounded" />
                  Usuario activo
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={guardarUser} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 inline-flex items-center gap-1">
                  <Save className="w-4 h-4" /> Guardar
                </button>
                <button onClick={() => { setNuevoUser(false); setEditUser(null); }} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700 inline-flex items-center gap-1">
                  <X className="w-4 h-4" /> Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="bg-[#121a2b] rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#0f172a] border-b border-slate-800">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400">Usuario</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400">Rol / Área</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {usuarios.map((u) => (
                  <tr key={u.id} className={!u.activo ? "opacity-50" : ""}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{u.nombre}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-slate-300">
                        <AreaIcon nombre={u.areaNombre} className="w-3.5 h-3.5 text-blue-400" />
                        {u.areaNombre}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.activo ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
                        {u.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => abrirEditarUser(u)} className="p-2 text-slate-500 hover:text-blue-400 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => eliminarUser(u.id)} className="p-2 text-slate-500 hover:text-red-400 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "areas" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={abrirNuevaArea} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500">
              <Plus className="w-4 h-4" /> Nuevo rol / área
            </button>
          </div>

          {(nuevoArea || editArea) && (
            <div className="bg-[#121a2b] rounded-2xl border border-blue-500/30 p-5 space-y-4">
              <h2 className="font-semibold text-white">{nuevoArea ? "Nuevo rol / área" : `Editar: ${editArea?.nombre}`}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
                  <input value={areaForm.nombre} onChange={(e) => setAreaForm((f) => ({ ...f, nombre: e.target.value }))} className={inputClass} placeholder="Ej: Logística" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Descripción</label>
                  <input value={areaForm.descripcion} onChange={(e) => setAreaForm((f) => ({ ...f, descripcion: e.target.value }))} className={inputClass} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                  <input type="checkbox" checked={areaForm.activo} onChange={(e) => setAreaForm((f) => ({ ...f, activo: e.target.checked }))} className="rounded" />
                  Área activa
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={guardarArea} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 inline-flex items-center gap-1">
                  <Save className="w-4 h-4" /> Guardar
                </button>
                <button onClick={() => { setNuevoArea(false); setEditArea(null); }} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((a) => (
              <div
                key={a.id}
                className={`bg-[#121a2b] rounded-2xl border p-4 ${!a.activo ? "opacity-50 border-slate-800" : "border-slate-800"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400 shrink-0">
                      <AreaIcon nombre={a.nombre} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{a.nombre}</h3>
                      {a.descripcion && <p className="text-xs text-slate-500 mt-1">{a.descripcion}</p>}
                      <p className="text-xs text-slate-600 mt-2">
                        {usuarios.filter((u) => u.areaId === a.id).length} usuario(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => abrirEditarArea(a)} className="p-1.5 text-slate-500 hover:text-blue-400 rounded">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => eliminarArea(a.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "secuencias" && <SecuenciasConfig />}

    </div>
  );
}
