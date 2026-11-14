"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiLoadProyectos } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { Proyecto } from "@/lib/types";
import {
  formatMonto,
  totalPagado,
  montoObjetivo,
  saldoPendiente,
  cobroCompleto,
  estadoPagoLabel,
} from "@/lib/money";
import { Banknote, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";

export default function PagosPage() {
  const { usuario } = useAuth();
  const router = useRouter();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const isAdmin = usuario?.areaNombre === "Admin";
  const canSee = isAdmin;

  useEffect(() => {
    if (usuario && !canSee) router.replace("/");
  }, [usuario, canSee, router]);

  useEffect(() => {
    apiLoadProyectos().then(setProyectos).catch(console.error);
  }, []);

  const filas = useMemo(() => {
    return proyectos
      .filter((p) => p.estado_general !== "Cancelado")
      .map((p) => {
        const antObj = montoObjetivo(p, "ANTICIPO");
        const antPag = totalPagado(p.pagos, "ANTICIPO");
        const antPend = Math.max(0, saldoPendiente(p, "ANTICIPO"));
        const salObj = montoObjetivo(p, "SALDO");
        const salPag = totalPagado(p.pagos, "SALDO");
        const salPend = Math.max(0, saldoPendiente(p, "SALDO"));
        return {
          p,
          antObj,
          antPag,
          antPend,
          antOk: cobroCompleto(p, "ANTICIPO"),
          salObj,
          salPag,
          salPend,
          salOk: salObj > 0 ? cobroCompleto(p, "SALDO") : true,
        };
      })
      .sort((a, b) => b.antPend - a.antPend || b.salPend - a.salPend);
  }, [proyectos]);

  const totales = useMemo(() => {
    return filas.reduce(
      (acc, f) => {
        acc.antPend += f.antPend;
        acc.salPend += f.salPend;
        acc.antPag += f.antPag;
        acc.presup += Number(f.p.presupuesto_estimado) || 0;
        if (f.antPend > 0) acc.conAnticipoPendiente++;
        return acc;
      },
      { antPend: 0, salPend: 0, antPag: 0, presup: 0, conAnticipoPendiente: 0 }
    );
  }, [filas]);

  if (!canSee) {
    return (
      <div className="text-center py-20 text-slate-500">Sin permiso para ver cobros.</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Banknote className="w-7 h-7 text-emerald-400" />
          Estado de pagos
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Resumen de anticipos y saldos · Los montos se muestran en la moneda de cada proyecto
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-xs text-amber-300/80">Proyectos con anticipo pendiente</p>
          <p className="text-2xl font-bold text-white mt-1">{totales.conAnticipoPendiente}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-[#121a2b] p-4">
          <p className="text-xs text-slate-500">Anticipos cobrados (suma)</p>
          <p className="text-lg font-bold text-emerald-400 mt-1">
            {formatMonto(totales.antPag, "ARS")}*
          </p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-[#121a2b] p-4">
          <p className="text-xs text-slate-500">Anticipo pendiente (suma)</p>
          <p className="text-lg font-bold text-amber-300 mt-1">
            {formatMonto(totales.antPend, "ARS")}*
          </p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-[#121a2b] p-4">
          <p className="text-xs text-slate-500">Saldo pendiente (suma)</p>
          <p className="text-lg font-bold text-slate-200 mt-1">
            {formatMonto(totales.salPend, "ARS")}*
          </p>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        * Totales orientativos en ARS si hay varias monedas; revisá cada fila por moneda real.
      </p>

      <div className="bg-[#121a2b] rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0f172a] border-b border-slate-800 text-slate-400">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Proyecto</th>
                <th className="text-left px-4 py-3 font-semibold">Moneda</th>
                <th className="text-left px-4 py-3 font-semibold">Anticipo</th>
                <th className="text-left px-4 py-3 font-semibold">Saldo</th>
                <th className="text-left px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filas.map(({ p, antObj, antPag, antPend, antOk, salObj, salPag, salPend }) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{p.titulo || p.nombre_cliente}</div>
                    <div className="text-xs text-slate-500">
                      {p.nombre_cliente} · {p.codigo_proyecto}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{p.moneda || "ARS"}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-300 text-xs">
                      Obj. {formatMonto(antObj, p.moneda)}
                    </div>
                    <div className="text-emerald-400 text-xs">Pag. {formatMonto(antPag, p.moneda)}</div>
                    {antPend > 0 && (
                      <div className="text-amber-300 text-xs font-medium">
                        Pend. {formatMonto(antPend, p.moneda)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-300 text-xs">
                      Obj. {formatMonto(salObj, p.moneda)}
                    </div>
                    <div className="text-emerald-400 text-xs">Pag. {formatMonto(salPag, p.moneda)}</div>
                    {salPend > 0 && (
                      <div className="text-amber-300 text-xs font-medium">
                        Pend. {formatMonto(salPend, p.moneda)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {antOk ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Anticipo OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                        <AlertCircle className="w-3.5 h-3.5" />{" "}
                        {estadoPagoLabel(p, "ANTICIPO")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/proyectos/${p.id}`}
                      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-medium"
                    >
                      Abrir <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No hay proyectos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
