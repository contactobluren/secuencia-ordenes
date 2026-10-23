"use client";

import { useEffect } from "react";

/** Registra el service worker para poder instalar BPM como PWA */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silencioso: en dev a veces falla y no es crítico
    });
  }, []);
  return null;
}
