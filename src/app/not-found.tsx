import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-blue-400" />
      </div>
      <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">404</h1>
      <h2 className="mt-2 text-xl font-semibold text-slate-200">Página no encontrada</h2>
      <p className="mt-2 text-sm text-slate-400 max-w-md">
        La página o recurso que estás buscando no existe o fue movida.
      </p>
      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-600/20"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>
      </div>
    </div>
  );
}
