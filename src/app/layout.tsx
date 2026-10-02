import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Balum ITVH — Asistente Virtual Oficial",
  description: "Asistente inteligente para la comunidad estudiantil del Instituto Tecnológico de Villahermosa.",
  icons: {
    icon: "/balum-avatar.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full antialiased flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
