"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  UploadCloud,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Inbox,
  DollarSign,
  Calendar,
  LogOut,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Database,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

interface Metricas {
  totalConsultas: number;
  consultasSemana: number;
  consultasMes: number;
  likes: number;
  dislikes: number;
  totalTokens: number;
  costoEstimado: {
    usd: string;
    mxn: string;
  };
  totalDocumentos: number;
  totalTickets: number;
  ticketsPendientes: number;
}

interface PreguntaFrecuente {
  pregunta: string;
  veces: number;
  likes: number;
  dislikes: number;
}

interface Ticket {
  id: string;
  correo_institucional: string;
  num_control: string;
  descripcion: string;
  pregunta_origen?: string;
  estado: string;
  created_at: string;
}

interface Documento {
  fuente: string;
  chunks: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [autenticado, setAutenticado] = useState(false);
  const [tabActivo, setTabActivo] = useState<"metricas" | "documentos" | "tickets" | "calidad">("metricas");

  // Estados de datos
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [preguntasFrecuentes, setPreguntasFrecuentes] = useState<PreguntaFrecuente[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados para subida de PDF
  const [archivoPDF, setArchivoPDF] = useState<File | null>(null);
  const [tituloPDF, setTituloPDF] = useState("");
  const [subiendoPDF, setSubiendoPDF] = useState(false);
  const [notificacion, setNotificacion] = useState<{ tipo: "exito" | "error"; mensaje: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificación de autenticación de sesión
  useEffect(() => {
    const auth = sessionStorage.getItem("balum_admin_auth");
    if (!auth) {
      router.push("/admin/login");
    } else {
      setAutenticado(true);
      cargarDatos();
    }
  }, [router]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // 1. Cargar métricas
      const resStats = await fetch("/api/admin/stats");
      if (resStats.ok) {
        const data = await resStats.json();
        setMetricas(data.metricas);
        setPreguntasFrecuentes(data.preguntasFrecuentes || []);
        setTickets(data.tickets || []);
      }

      // 2. Cargar documentos indexados
      const resDocs = await fetch("/api/admin/documents");
      if (resDocs.ok) {
        const dataDocs = await resDocs.json();
        setDocumentos(dataDocs.docs || []);
      }
    } catch (e) {
      console.error("Error al cargar datos del panel:", e);
    } finally {
      setCargando(false);
    }
  };

  const handleCerrarSesion = () => {
    sessionStorage.removeItem("balum_admin_auth");
    router.push("/admin/login");
  };

  // Subir e indexar automáticamente nuevo PDF
  const handleSubirPDF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivoPDF) return;

    setSubiendoPDF(true);
    setNotificacion(null);

    const formData = new FormData();
    formData.append("file", archivoPDF);
    if (tituloPDF.trim()) {
      formData.append("title", tituloPDF.trim());
    }

    try {
      const res = await fetch("/api/admin/documents", {
        method: "POST",
        body: formData,
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || "Error al procesar el PDF");
      }

      setNotificacion({
        tipo: "exito",
        mensaje: `¡Excelente! El PDF fue analizado con IA e indexado en ${resData.chunksCount} fragmentos vectoriales.`,
      });

      setArchivoPDF(null);
      setTituloPDF("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Recargar lista de documentos y estadísticas
      cargarDatos();
    } catch (err: any) {
      setNotificacion({
        tipo: "error",
        mensaje: err.message || "Ocurrió un error al subir el archivo.",
      });
    } finally {
      setSubiendoPDF(false);
    }
  };

  // Eliminar un documento de la base de conocimiento
  const handleEliminarDocumento = async (fuente: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${fuente}" de la base de conocimiento de Balum?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/documents?fuente=${encodeURIComponent(fuente)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        cargarDatos();
      } else {
        alert("No se pudo eliminar el documento.");
      }
    } catch (e) {
      alert("Error de conexión al eliminar.");
    }
  };

  // Marcar ticket como resuelto
  const handleCambiarEstadoTicket = async (id: string, nuevoEstado: string) => {
    try {
      const res = await fetch("/api/ticket", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado: nuevoEstado }),
      });

      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, estado: nuevoEstado } : t))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!autenticado) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* BARRA SUPERIOR INSTITUCIONAL (Idéntica a la identidad TecNM / ITVH) */}
      <header className="bg-[#1b396a] text-white px-6 py-3.5 shadow-md flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1 overflow-hidden border border-blue-200">
            <Image
              src="/icon.png"
              alt="Balum"
              width={36}
              height={36}
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight flex items-center gap-2">
              Panel Administrador Balum
              <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                ITVH Cloud
              </span>
            </h1>
            <p className="text-blue-200 text-xs">Instituto Tecnológico de Villahermosa</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors border border-white/10"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Ir al Chat Público
          </Link>
          <button
            onClick={handleCerrarSesion}
            className="flex items-center gap-1.5 text-xs bg-red-500/80 hover:bg-red-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="bg-white border-b border-slate-200 px-6 sticky top-0 z-10">
        <div className="flex gap-2 sm:gap-6 overflow-x-auto text-sm font-semibold">
          <button
            onClick={() => setTabActivo("metricas")}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              tabActivo === "metricas"
                ? "border-[#1b396a] text-[#1b396a]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Métricas y Costos
          </button>

          <button
            onClick={() => setTabActivo("documentos")}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              tabActivo === "documentos"
                ? "border-[#1b396a] text-[#1b396a]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Database className="w-4 h-4" />
            Alimentar Base de Datos (PDFs)
            {documentos.length > 0 && (
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {documentos.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTabActivo("tickets")}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              tabActivo === "tickets"
                ? "border-[#1b396a] text-[#1b396a]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Inbox className="w-4 h-4" />
            Buzón de Tickets de Alumnos
            {metricas && metricas.ticketsPendientes > 0 && (
              <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
                {metricas.ticketsPendientes}
              </span>
            )}
          </button>

          <button
            onClick={() => setTabActivo("calidad")}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              tabActivo === "calidad"
                ? "border-[#1b396a] text-[#1b396a]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Calidad (Likes / Dislikes y Repeticiones)
          </button>
        </div>
      </div>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* PESTAÑA 1: MÉTRICAS Y COSTOS */}
        {tabActivo === "metricas" && (
          <div className="space-y-6">
            {/* Tarjetas Principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Preguntas */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Preguntas Totales</span>
                  <div className="p-2 bg-blue-50 text-[#1b396a] rounded-xl">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{metricas?.totalConsultas || 0}</div>
                <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">+{metricas?.consultasSemana || 0}</span>
                  en los últimos 7 días
                </div>
              </div>

              {/* Consultas al Mes */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Actividad Mensual</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{metricas?.consultasMes || 0}</div>
                <div className="mt-3 text-xs text-slate-500">
                  Consultas durante los últimos 30 días
                </div>
              </div>

              {/* Consumo y Costo Estimado */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Costo Estimado IA</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  ${metricas?.costoEstimado.mxn || "0.00"}{" "}
                  <span className="text-sm font-semibold text-slate-500">MXN</span>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Tokens usados: <span className="font-mono font-bold">{metricas?.totalTokens.toLocaleString() || 0}</span> (~${metricas?.costoEstimado.usd || 0} USD)
                </div>
              </div>

              {/* Documentos en Supabase */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Documentos Activos</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Database className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{metricas?.totalDocumentos || 0}</div>
                <div className="mt-3 text-xs text-slate-500">
                  PDFs oficiales indexados en pgvector
                </div>
              </div>
            </div>

            {/* Resumen Semanal y Mensual Detallado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#1b396a]" />
                  Frecuencia de Uso del Asistente
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                    <span className="text-xs font-medium text-slate-600">Preguntas hoy (estimado)</span>
                    <span className="text-sm font-bold text-slate-900">
                      {Math.ceil((metricas?.consultasSemana || 0) / 7)} consultas
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                    <span className="text-xs font-medium text-slate-600">Preguntas esta semana</span>
                    <span className="text-sm font-bold text-[#1b396a]">
                      {metricas?.consultasSemana || 0} consultas
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                    <span className="text-xs font-medium text-slate-600">Preguntas acumuladas del mes</span>
                    <span className="text-sm font-bold text-indigo-600">
                      {metricas?.consultasMes || 0} consultas
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                    <span className="text-xs font-medium text-slate-600">Tickets generados por falta de datos</span>
                    <span className="text-sm font-bold text-amber-600">
                      {metricas?.totalTickets || 0} tickets
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Detalle del Costo de API (Google Gemini 2.0 Flash)
                </h3>
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl mb-4">
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    <strong>Muy económico:</strong> Gemini 2.0 Flash tiene un costo de solo{" "}
                    <strong>$0.10 USD por 1,000,000 de tokens</strong>. Un alumno promedio consume
                    alrededor de 1,200 tokens por consulta.
                  </p>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Costo por cada 1,000 consultas aprox:</span>
                    <span className="font-bold text-slate-900">$2.50 MXN (~$0.12 USD)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Presupuesto mensual recomendado:</span>
                    <span className="font-bold text-slate-900">$50.00 MXN (~$2.50 USD)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Estado del consumo actual:</span>
                    <span className="font-bold text-emerald-600">Excelente y dentro de margen</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: GESTIÓN Y ALIMENTACIÓN DE PDFS */}
        {tabActivo === "documentos" && (
          <div className="space-y-6">
            {/* Formulario de Subida */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-[#1b396a] mb-1 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#1b396a]" />
                Subir nuevo PDF para alimentar la Base de Datos
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Al subir un nuevo PDF institucional (ej. calendario, convocatorias, nuevo reglamento), el
                sistema extraerá todo el contenido con IA, generará los vectores de embedding y Balum lo
                aprenderá al instante.
              </p>

              {notificacion && (
                <div
                  className={`p-4 rounded-xl text-xs font-semibold mb-4 flex items-center gap-3 ${
                    notificacion.tipo === "exito"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {notificacion.tipo === "exito" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  )}
                  {notificacion.mensaje}
                </div>
              )}

              <form onSubmit={handleSubirPDF} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nombre o Identificador del Trámite (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. convocatoria_movilidad_2026"
                      value={tituloPDF}
                      onChange={(e) => setTituloPDF(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#1b396a] focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Archivo PDF Oficial
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      required
                      onChange={(e) => setArchivoPDF(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#1b396a] hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={subiendoPDF || !archivoPDF}
                    className="px-5 py-2.5 bg-[#1b396a] hover:bg-[#12264a] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-40"
                  >
                    {subiendoPDF ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Analizando e Indexando con IA...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        Indexar y Guardar en Balum
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de Documentos Indexados */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Documentos Oficiales Indexados ({documentos.length})
                  </h4>
                  <p className="text-xs text-slate-400">
                    Fuentes que Balum consulta antes de responder a un alumno
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {documentos.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No hay documentos indexados aún. Sube el primer PDF arriba.
                  </div>
                ) : (
                  documentos.map((doc, idx) => (
                    <div
                      key={idx}
                      className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-[#1b396a] rounded-lg">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{doc.fuente}</p>
                          <p className="text-[11px] text-slate-400">
                            {doc.chunks} fragmentos vectoriales almacenados
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full font-bold">
                          Activo en RAG
                        </span>
                        <button
                          onClick={() => handleEliminarDocumento(doc.fuente)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar de la base de conocimiento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: BUZÓN DE TICKETS DE ALUMNOS */}
        {tabActivo === "tickets" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Cuestionarios y Tickets de Alumnos ({tickets.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Generados automáticamente cuando Balum no cuenta con la información y activa el formulario
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {tickets.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No hay tickets pendientes de alumnos en este momento.
                  </div>
                ) : (
                  tickets.map((t) => (
                    <div key={t.id} className="p-5 hover:bg-slate-50/70 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                              t.estado === "pendiente"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {t.estado}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {t.correo_institucional}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            ({t.num_control})
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(t.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 mb-3 border border-slate-100">
                        {t.descripcion}
                      </div>

                      <div className="flex justify-end gap-2">
                        {t.estado === "pendiente" ? (
                          <button
                            onClick={() => handleCambiarEstadoTicket(t.id, "atendido")}
                            className="text-xs font-semibold px-3 py-1 bg-[#1b396a] text-white rounded-lg hover:bg-[#12264a] transition-colors"
                          >
                            Marcar como Atendido
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCambiarEstadoTicket(t.id, "pendiente")}
                            className="text-xs font-semibold px-3 py-1 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                          >
                            Reabrir Ticket
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: CALIDAD, LIKES/DISLIKES Y PREGUNTAS REPETITIVAS */}
        {tabActivo === "calidad" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Retroalimentación Positiva
                  </span>
                  <div className="text-3xl font-black text-emerald-600 mt-1 flex items-center gap-2">
                    <ThumbsUp className="w-6 h-6" /> {metricas?.likes || 0}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Respuestas calificadas como útiles</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Respuestas con Dislike (A Mejorar)
                  </span>
                  <div className="text-3xl font-black text-rose-600 mt-1 flex items-center gap-2">
                    <ThumbsDown className="w-6 h-6" /> {metricas?.dislikes || 0}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Respuestas que requieren nuevo PDF o ajuste</p>
                </div>
              </div>
            </div>

            {/* Tabla de preguntas frecuentes y repetitivas */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">
                  Preguntas Más Repetitivas y Detección de Problemas
                </h3>
                <p className="text-xs text-slate-400">
                  Identifica fácilmente qué temas tienen dudas frecuentes o calificaciones negativas
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {preguntasFrecuentes.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Aún no hay suficientes preguntas registradas para armar la lista.
                  </div>
                ) : (
                  preguntasFrecuentes.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            &ldquo;{item.pregunta}&rdquo;
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="px-2.5 py-1 bg-blue-50 text-[#1b396a] rounded-lg">
                          {item.veces} veces consultada
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-emerald-600">
                            <ThumbsUp className="w-3.5 h-3.5" /> {item.likes}
                          </span>
                          <span className="flex items-center gap-1 text-rose-600">
                            <ThumbsDown className="w-3.5 h-3.5" /> {item.dislikes}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
