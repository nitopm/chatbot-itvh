"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, ArrowLeft, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Clave de acceso institucional predeterminada
    const validKeys = ["baluntec2026", "itvh2026"];

    setTimeout(() => {
      if (validKeys.includes(password.trim())) {
        try {
          sessionStorage.setItem("balum_admin_auth", "true");
          localStorage.setItem("balum_admin_auth", "true");
          document.cookie = "balum_admin_auth=true; path=/; max-age=86400; SameSite=Lax";
        } catch (e) {}
        window.location.href = "/admin";
      } else {
        setError("Contraseña de administrador incorrecta");
        setLoading(false);
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between items-center p-4">
      {/* Header superior */}
      <div className="w-full max-w-md pt-6 flex justify-between items-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#1b396a] hover:text-[#12264a] font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Asistente Balum
        </Link>
        <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-[#1b396a] rounded-full">
          TecNM · ITVH
        </span>
      </div>

      {/* Tarjeta de autenticación */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-[#1b396a] rounded-2xl flex items-center justify-center p-3 mb-4 shadow-md">
            <Image
              src="/icon.png"
              alt="Balum"
              width={56}
              height={56}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-black text-[#1b396a] tracking-tight">
            Panel de Control Balum
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Gestión de Base de Conocimiento, Métricas y Tickets de Soporte
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Clave de Acceso Administrador
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa la clave de administración"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#1b396a] focus:bg-white transition-all font-mono"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1b396a] hover:bg-[#12264a] text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Ingresar al Panel
              </>
            )}
          </button>
        </form>
      </div>

      {/* Pie de página institucional */}
      <div className="text-center pb-6 text-xs text-slate-400">
        Instituto Tecnológico de Villahermosa · Plataforma de Inteligencia Artificial
      </div>
    </div>
  );
}
