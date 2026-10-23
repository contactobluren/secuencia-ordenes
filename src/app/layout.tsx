import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientShell from "@/components/ClientShell";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "BPM Bluren | Business Process Management",
  description:
    "BPM Bluren — Gestión de procesos de negocio y seguimiento de órdenes de trabajo",
  applicationName: "BPM Bluren",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "BPM Bluren",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/logo-bluren.png",
    apple: "/logo-bluren.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#0b1220] text-slate-100 antialiased">
        <PwaRegister />
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
