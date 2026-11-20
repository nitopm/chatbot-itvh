"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generarHtmlPlantillaOficial } from "@/lib/plantillaOficialPdf";
import { ENLACES_DOCUMENTOS_DRIVE } from "@/lib/driveLinks";
import { Save, Link2, Search, ExternalLink as ExtLink } from "lucide-react";

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
  Lock,
  ShieldCheck,
  Sparkles,
  MapPin,
  User,
  Tag,
  Check,
  Download,
  ExternalLink,
  BookOpen,
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

interface EventoITVH {
  id: string;
  titulo: string;
  categoria?: "evento" | "comunicado";
  descripcion: string;
  tipo: string;
  carrera_destino: string;
  fecha_evento: string;
  hora_evento?: string;
  lugar?: string;
  ponente?: string;
  enlace_registro?: string;
  contenido_markdown?: string;
  activo?: boolean;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [autenticado, setAutenticado] = useState(false);
  const [tabActivo, setTabActivo] = useState<"metricas" | "documentos" | "eventos" | "tickets" | "calidad">("metricas");

  // Estados de datos
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [preguntasFrecuentes, setPreguntasFrecuentes] = useState<PreguntaFrecuente[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [eventos, setEventos] = useState<EventoITVH[]>([]);
  const [cargando, setCargando] = useState(true);
  // Estados para gestión de enlaces de Google Drive (balumitvh@gmail.com)
  const [enlacesDrive, setEnlacesDrive] = useState<Record<string, string>>({});
  const [enlaceEditado, setEnlaceEditado] = useState<Record<string, string>>({});
  const [guardandoEnlaceId, setGuardandoEnlaceId] = useState<string | null>(null);
  const [filtroDocumentos, setFiltroDocumentos] = useState("");
  const [descargandoDocPdf, setDescargandoDocPdf] = useState<string | null>(null);


  // Estados para subida de PDF y Markdown
  const [archivoPDF, setArchivoPDF] = useState<File | null>(null);
  const [tituloPDF, setTituloPDF] = useState("");
  const [subiendoPDF, setSubiendoPDF] = useState(false);
  const [notificacion, setNotificacion] = useState<{ tipo: "exito" | "error"; mensaje: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para subida de Flyers / Imágenes con Gemini Vision
  const [archivoFlyer, setArchivoFlyer] = useState<File | null>(null);
  const [previewFlyerUrl, setPreviewFlyerUrl] = useState<string | null>(null);
  const [analizandoFlyer, setAnalizandoFlyer] = useState(false);
  const [tipoFlyerSeleccionado, setTipoFlyerSeleccionado] = useState<"auto" | "evento" | "comunicado">("auto");
  const [eventoExtraido, setEventoExtraido] = useState<Partial<EventoITVH> | null>(null);
  const [guardandoEvento, setGuardandoEvento] = useState(false);
  const [notifEvento, setNotifEvento] = useState<{ tipo: "exito" | "error"; mensaje: string } | null>(null);
  const flyerInputRef = useRef<HTMLInputElement>(null);

  const [montado, setMontado] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [iniciandoSesion, setIniciandoSesion] = useState(false);

  const handleLoginDirecto = (e: React.FormEvent) => {
    e.preventDefault();
    setIniciandoSesion(true);
    setLoginError("");
    setTimeout(() => {
      const p = passwordInput.trim().toLowerCase();
      if (p === "baluntec2026" || p === "itvh2026") {
        try {
          sessionStorage.setItem("balum_admin_auth", "true");
          localStorage.setItem("balum_admin_auth", "true");
          document.cookie = "balum_admin_auth=true; path=/; max-age=86400";
        } catch (e) {}
        setAutenticado(true);
      } else {
        setLoginError("Contraseña incorrecta");
      }
      setIniciandoSesion(false);
    }, 400);
  };

  useEffect(() => {
    setMontado(true);
    let tieneSesion = false;
    try {
      const s = sessionStorage.getItem("balum_admin_auth");
      const l = localStorage.getItem("balum_admin_auth");
      tieneSesion = s === "true" || l === "true";
    } catch (e) {}

    if (tieneSesion) {
      setAutenticado(true);
      cargarDatos();
      cargarEventos();
    } else {
      setCargando(false);
    }
  }, []);

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
      // 3. Cargar enlaces de Google Drive configurados
      try {
        const resLinks = await fetch("/api/admin/drive-links");
        if (resLinks.ok) {
          const dataLinks = await resLinks.json();
          if (dataLinks.links) {
            setEnlacesDrive(dataLinks.links);
          }
        }
      } catch (e) {}

    } catch (e) {
      console.error("Error al cargar datos del panel:", e);
    } finally {
      setCargando(false);
    }
  };

  const cargarEventos = async () => {
    try {
      const res = await fetch("/api/admin/events");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setEventos(json.eventos || []);
        }
      }
    } catch (e) {
      console.warn("Aviso cargando eventos:", e);
    }
  };

  const handleCerrarSesion = () => {
    try {
      sessionStorage.removeItem("balum_admin_auth");
      localStorage.removeItem("balum_admin_auth");
      document.cookie = "balum_admin_auth=; path=/; max-age=0";
    } catch (e) {}
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
        mensaje: `¡Excelente! El PDF fue analizado con IA e indexado en ${resData.chunksCount} fragmentos vectoriales en formato Markdown.`,
      });

      setArchivoPDF(null);
      setTituloPDF("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      cargarDatos();
    } catch (err: any) {
      setNotificacion({
        tipo: "error",
        mensaje: err.message || "Error al subir e indexar el PDF.",
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

  // --- GESTIÓN DE EVENTOS CON GEMINI VISION ---
  const handleSeleccionarFlyer = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivoFlyer(file);
      setPreviewFlyerUrl(URL.createObjectURL(file));
      setEventoExtraido(null);
      setNotifEvento(null);
    }
  };

  const handleAnalizarFlyerConIA = async () => {
    if (!archivoFlyer) return;
    setAnalizandoFlyer(true);
    setNotifEvento(null);

    const formData = new FormData();
    formData.append("file", archivoFlyer);
    formData.append("categoria", tipoFlyerSeleccionado);

    try {
      const res = await fetch("/api/admin/events/extract", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "No se pudo extraer la información del flyer.");
      }

      setEventoExtraido(json.data);
      setNotifEvento({
        tipo: "exito",
        mensaje: `¡Información extraída exitosamente con Gemini 3.5 Flash Lite! Revisa el Markdown y confirma la publicación.`,
      });
    } catch (err: any) {
      setNotifEvento({
        tipo: "error",
        mensaje: err.message || "Error al analizar la imagen del flyer.",
      });
    } finally {
      setAnalizandoFlyer(false);
    }
  };

  const handleConfirmarYPublicarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoExtraido || !eventoExtraido.titulo || !eventoExtraido.fecha_evento) {
      alert("Por favor asegúrate de que el título y la fecha estén completos.");
      return;
    }

    setGuardandoEvento(true);
    setNotifEvento(null);

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventoExtraido),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al registrar el evento en Supabase.");
      }

      setNotifEvento({
        tipo: "exito",
        mensaje: "¡Información registrada y publicada! Balum ya la tiene aprendida en su memoria oficial.",
      });

      setArchivoFlyer(null);
      setPreviewFlyerUrl(null);
      setEventoExtraido(null);
      if (flyerInputRef.current) flyerInputRef.current.value = "";
      cargarEventos();
      cargarDatos();
    } catch (err: any) {
      setNotifEvento({
        tipo: "error",
        mensaje: err.message || "Error guardando el evento.",
      });
    } finally {
      setGuardandoEvento(false);
    }
  };

  // Exportar PDF con Plantilla Oficial Autorizada del TecNM / ITVH (Margarita Maza 2026)
  const handleExportarPDFParaDrive = (
    eventoParam?: any,
    imagenUrlParam?: string | null
  ) => {
    // Si el primer parámetro es un ClickEvent de React, ignorarlo para no confundirlo con datos
    const esEventoDatos = eventoParam && typeof eventoParam === "object" && ("titulo" in eventoParam || "fecha_evento" in eventoParam);
    const evento = esEventoDatos ? (eventoParam as Partial<EventoITVH>) : eventoExtraido;

    const imagenFinal = (typeof imagenUrlParam === "string" ? imagenUrlParam : null) 
      || evento?.imagen_url 
      || (evento === eventoExtraido ? previewFlyerUrl : null)
      || previewFlyerUrl;

    if (!evento && !imagenFinal) {
      alert("Por favor selecciona una imagen de cartel o flyer para generar el PDF.");
      return;
    }

    // Título predeterminado si aún no se ha analizado con IA
    const nombreArchivoLimpio = archivoFlyer?.name
      ? archivoFlyer.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").toUpperCase()
      : "COMUNICADO INSTITUCIONAL";

    const tituloFinal = evento?.titulo || nombreArchivoLimpio || "COMUNICADO OFICIAL ITVH";
    const fechaFinal = evento?.fecha_evento || new Date().toISOString().split("T")[0];
    const descripcionFinal = evento?.contenido_markdown || evento?.descripcion || "Comunicado e infografía oficial publicada para la comunidad estudiantil del Instituto Tecnológico de Villahermosa.";

    const ventana = window.open("", "_blank");
    if (!ventana) {
      alert("Por favor permite las ventanas emergentes en tu navegador para ver y descargar el PDF.");
      return;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const esComunicado = evento?.categoria === "comunicado" || evento?.tipo?.toLowerCase().includes("comunicado") || evento?.tipo?.toLowerCase().includes("aviso");

    const html = generarHtmlPlantillaOficial({
      titulo: tituloFinal,
      subtitulo: descripcionFinal,
      categoria: esComunicado ? "comunicado" : "evento",
      tipo: evento?.tipo || (esComunicado ? "COMUNICADO OFICIAL" : "EVENTO ACADÉMICO"),
      fecha: fechaFinal,
      hora: evento?.hora_evento || "Horario Oficial",
      lugar: evento?.lugar || "Campus ITVH",
      ponente: evento?.ponente || "Dirección / Comité Organizador",
      destinatarios: evento?.carrera_destino || "Comunidad Tecnológica",
      enlace: evento?.enlace_registro || "",
      imagenUrl: imagenFinal,
      contenidoMarkdown: descripcionFinal,
    }, origin);

    ventana.document.write(html);
    ventana.document.close();
  };

  // Descargar PDF Oficial de cualquier documento indexado (Servicio Social, Baja de Materias, etc.)
  const handleDescargarDocumentoPDF = async (fuente: string) => {
    setDescargandoDocPdf(fuente);
    try {
      const res = await fetch(`/api/admin/documents/content?fuente=${encodeURIComponent(fuente)}`);
      const json = await res.json();
      
      const contenido = json.contenido || "Lineamientos y especificaciones en proceso de digitalización oficial.";
      const tituloLimpio = fuente.replace(".pdf", "").replace(/_/g, " ").toUpperCase();

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const html = generarHtmlPlantillaOficial({
        titulo: `LINEAMIENTOS OFICIALES: ${tituloLimpio}`,
        categoria: "documento",
        tipo: "Trámite Institucional",
        lugar: "Campus ITVH / Servicios Escolares",
        destinatarios: "Comunidad Estudiantil",
        contenidoMarkdown: contenido,
      }, origin);

      const ventana = window.open("", "_blank");
      if (!ventana) {
        alert("Por favor permite las ventanas emergentes para ver el PDF.");
        return;
      }
      ventana.document.write(html);
      ventana.document.close();
    } catch (err: any) {
      alert("Error al obtener el contenido del documento para PDF: " + err.message);
    } finally {
      setDescargandoDocPdf(null);
    }
  };

  // Guardar enlace de Google Drive para un documento o trámite (balumitvh@gmail.com)
  const handleGuardarEnlaceDrive = async (fuente: string, nuevoEnlace: string) => {
    if (!nuevoEnlace.trim()) {
      alert("Por favor ingresa o pega el enlace de Google Drive.");
      return;
    }

    setGuardandoEnlaceId(fuente);
    try {
      const res = await fetch("/api/admin/drive-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fuente, enlace: nuevoEnlace.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setEnlacesDrive(json.links || { ...enlacesDrive, [fuente]: nuevoEnlace.trim() });
        setNotificacion({
          tipo: "exito",
          mensaje: `¡Enlace de Google Drive actualizado para "${fuente}"! Balum lo entregará a los alumnos.`,
        });
      } else {
        throw new Error(json.error || "No se pudo guardar el enlace.");
      }
    } catch (err: any) {
      setNotificacion({
        tipo: "error",
        mensaje: err.message || "Error al guardar el enlace de Drive.",
      });
    } finally {
      setGuardandoEnlaceId(null);
    }
  };
  const handleEliminarEvento = async (id: string, titulo: string) => {
    if (!confirm(`¿Deseas eliminar "${titulo}"?`)) return;

    try {
      const res = await fetch(`/api/admin/events?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        cargarEventos();
      } else {
        alert("No se pudo eliminar el evento.");
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

  if (!montado) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-[#1b396a] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-500">Cargando Asistente ITVH...</p>
      </div>
    );
  }

  // Si no está autenticado, mostrar formulario de acceso
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1b396a] to-[#0a1128] flex items-center justify-center p-4 select-none">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center border-2 border-blue-200 shadow-sm mb-3">
              <ShieldCheck className="w-8 h-8 text-[#1b396a]" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Panel Administrador ITVH</h2>
            <p className="text-xs text-slate-500 mt-0.5">Gestión de Balum, Documentos y Eventos</p>
          </div>

          <form onSubmit={handleLoginDirecto} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Clave Institucional de Acceso
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Introduce la contraseña..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#1b396a] focus:bg-white transition-all pl-10"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={iniciandoSesion}
              className="w-full py-3 bg-[#1b396a] hover:bg-[#12264a] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {iniciandoSesion ? "Verificando..." : "Entrar al Panel"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs font-semibold text-[#1b396a] hover:underline">
              ← Regresar al Chat de Alumnos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalCalificaciones = (metricas?.likes || 0) + (metricas?.dislikes || 0);
  const porcentajeSatisfaccion = totalCalificaciones > 0
    ? Math.round(((metricas?.likes || 0) / totalCalificaciones) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-text">
      {/* BARRA SUPERIOR */}
      <header className="bg-[#1b396a] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-blue-300 relative shrink-0 bg-white">
            <Image src="/icon.png" alt="Balum" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight flex items-center gap-2">
              Panel Administrativo Balum
            </h1>
            <p className="text-[11px] text-blue-200">
              Instituto Tecnológico de Villahermosa · balumitvh@gmail.com
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-medium transition-colors border border-white/10"
          >
            Ver Chat Público
          </Link>
          <button
            onClick={handleCerrarSesion}
            className="flex items-center gap-1.5 text-xs text-rose-200 hover:text-white bg-rose-500/20 hover:bg-rose-600/40 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </div>
      </header>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="bg-white border-b border-slate-200 px-6 sticky top-0 z-10 shadow-xs">
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
            <BookOpen className="w-4 h-4" />
            Documentos Markdown & Drive
            {documentos.length > 0 && (
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {documentos.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTabActivo("eventos")}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              tabActivo === "eventos"
                ? "border-[#1b396a] text-[#1b396a]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            Eventos y Comunicados (IA Vision)
            {eventos.length > 0 && (
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                {eventos.length}
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
            Buzón de Tickets
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
            Calidad ({porcentajeSatisfaccion}%)
          </button>
        </div>
      </div>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* PESTAÑA 1: MÉTRICAS Y COSTOS */}
        {tabActivo === "metricas" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Consultas</span>
                <div className="text-3xl font-black text-slate-900 mt-1">{metricas?.totalConsultas || 0}</div>
                <p className="text-xs text-slate-500 mt-1">Preguntas respondidas por Balum</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tokens Consumidos</span>
                <div className="text-3xl font-black text-[#1b396a] mt-1">
                  {(metricas?.totalTokens || 0).toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 mt-1">Con Gemini 3.5 Flash Lite</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Costo Estimado</span>
                <div className="text-3xl font-black text-emerald-600 mt-1">
                  ${metricas?.costoEstimado?.mxn || "0.00"} <span className="text-xs font-bold text-slate-400">MXN</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">~${metricas?.costoEstimado?.usd || "0.00"} USD en Gemini</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Satisfacción Alumnos</span>
                <div className="text-3xl font-black text-indigo-600 mt-1">
                  {porcentajeSatisfaccion}%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {metricas?.likes || 0} 👍 útiles vs {metricas?.dislikes || 0} 👎
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: GESTIÓN DE DOCUMENTOS MARKDOWN Y ENLACES DRIVE */}
        {tabActivo === "documentos" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 p-5 rounded-2xl border border-blue-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-[#1b396a] flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-indigo-600" />
                  Repositorio Oficial en Google Drive (balumitvh@gmail.com)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Los PDFs oficiales que diseñes se suben a tu cuenta de Drive. La IA almacena el conocimiento en formato Markdown (100% amigable para RAG) y conecta a los alumnos con los links de descarga.
                </p>
              </div>
              <a
                href="https://drive.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#1b396a] hover:bg-[#12264a] text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1.5"
              >
                Abrir Google Drive ↗
              </a>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-[#1b396a] mb-1 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#1b396a]" />
                Alimentar Base de Datos Oficial (Conversor PDF a Markdown para IA)
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Sube el PDF institucional. Gemini lo transcribirá a **Markdown estructurado** preservando tablas y listas, y lo indexará en Supabase para que Balum lo aprenda de forma óptima.
              </p>

              {notificacion && (
                <div
                  className={`p-4 rounded-xl text-xs font-semibold mb-4 flex items-center gap-3 ${
                    notificacion.tipo === "exito"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {notificacion.tipo === "exito" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                  {notificacion.mensaje}
                </div>
              )}

              <form onSubmit={handleSubirPDF} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nombre o Identificador del Trámite
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. servicio_social_2026"
                      value={tituloPDF}
                      onChange={(e) => setTituloPDF(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#1b396a] focus:bg-white"
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
                    {subiendoPDF ? "Procesando e Indexando en Markdown..." : "Convertir e Indexar a Markdown"}
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de documentos con Gestor de Enlaces de Google Drive y Descarga Oficial PDF */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Trámites Oficiales y Enlaces de Google Drive (balumitvh@gmail.com)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Descarga cualquier documento en formato oficial ITVH o pega el enlace de Drive para que Balum se lo entregue al alumno.
                  </p>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar trámite o PDF..."
                    value={filtroDocumentos}
                    onChange={(e) => setFiltroDocumentos(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#1b396a] focus:bg-white w-48 sm:w-64"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {(() => {
                  // Combinar documentos de Supabase con los trámites institucionales oficiales
                  const todosNombres = Array.from(
                    new Set([
                      ...documentos.map((d) => d.fuente),
                      ...Object.keys(ENLACES_DOCUMENTOS_DRIVE),
                    ])
                  ).filter((nombre) =>
                    !filtroDocumentos.trim() ||
                    nombre.toLowerCase().includes(filtroDocumentos.toLowerCase())
                  );

                  if (todosNombres.length === 0) {
                    return (
                      <div className="p-8 text-center text-xs text-slate-400">
                        No se encontraron trámites o documentos con ese nombre.
                      </div>
                    );
                  }

                  return todosNombres.map((fuenteNombre, idx) => {
                    const docObj = documentos.find((d) => d.fuente === fuenteNombre);
                    const enlaceActual =
                      enlaceEditado[fuenteNombre] !== undefined
                        ? enlaceEditado[fuenteNombre]
                        : (enlacesDrive[fuenteNombre] || enlacesDrive[fuenteNombre.replace(".pdf", "")] || ENLACES_DOCUMENTOS_DRIVE[fuenteNombre] || "");

                    return (
                      <div key={idx} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1b396a] flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">{fuenteNombre}</span>
                                {docObj ? (
                                  <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                                    Memoria Activa ({docObj.chunks} chunks)
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                                    Trámite Institucional
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* BOTÓN DESCARGAR PDF OFICIAL CON PLANTILLA ITVH */}
                            <button
                              type="button"
                              onClick={() => handleDescargarDocumentoPDF(fuenteNombre)}
                              disabled={descargandoDocPdf === fuenteNombre}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1b396a] border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                              title="Genera y descarga este trámite en la plantilla oficial autorizada del ITVH"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{descargandoDocPdf === fuenteNombre ? "Generando..." : "Descargar PDF Oficial"}</span>
                            </button>

                            {/* BOTÓN ELIMINAR DE SUPABASE SI EXISTE */}
                            {docObj && (
                              <button
                                onClick={() => handleEliminarDocumento(fuenteNombre)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar de la memoria vectorial"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* BARRA INFERIOR: CONFIGURACIÓN DEL ENLACE DE GOOGLE DRIVE */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:px-3.5 flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 shrink-0">
                            <span className="text-amber-600 font-extrabold">📁 Drive:</span>
                            <span className="hidden md:inline font-normal text-slate-400">Enlace que Balum dará al alumno:</span>
                          </div>

                          <input
                            type="text"
                            placeholder="Pega aquí el enlace de Google Drive (https://drive.google.com/...)..."
                            value={enlaceActual}
                            onChange={(e) => setEnlaceEditado({ ...enlaceEditado, [fuenteNombre]: e.target.value })}
                            className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#1b396a] font-mono text-slate-700 placeholder:text-slate-300"
                          />

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleGuardarEnlaceDrive(fuenteNombre, enlaceActual)}
                              disabled={guardandoEnlaceId === fuenteNombre || !enlaceActual}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 disabled:opacity-40"
                              title="Guardar este enlace de Drive para que Balum lo entregue"
                            >
                              <Save className="w-3 h-3" />
                              <span>{guardandoEnlaceId === fuenteNombre ? "Guardando..." : "Guardar"}</span>
                            </button>

                            {enlaceActual && enlaceActual.startsWith("http") && (
                              <a
                                href={enlaceActual}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 text-slate-500 hover:text-[#1b396a] bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                title="Abrir y verificar enlace de Drive"
                              >
                                <ExtLink className="w-3 h-3" />
                                <span>Probar</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 3: EVENTOS Y COMUNICADOS CON GEMINI VISION Y EXPORTADOR PDF
        ========================================================================== */}
        {tabActivo === "eventos" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h3 className="text-base font-bold text-[#1b396a] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  Alimentar Eventos o Comunicados desde Imagen / Flyer
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Tipo:</span>
                  <select
                    value={tipoFlyerSeleccionado}
                    onChange={(e: any) => setTipoFlyerSeleccionado(e.target.value)}
                    className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 outline-none"
                  >
                    <option value="auto">Auto-detectar con IA</option>
                    <option value="evento">Evento / Conferencia (Foro, plática)</option>
                    <option value="comunicado">Comunicado Oficial (Vacunación, Aviso)</option>
                  </select>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-5">
                Sube la imagen del cartel o post. Gemini Vision extraerá automáticamente fechas, lugares y requisitos en **Markdown estructurado**, y te permitirá exportar un PDF oficial listo para archivar en Google Drive.
              </p>

              {notifEvento && (
                <div
                  className={`p-4 rounded-xl text-xs font-semibold mb-4 flex items-center gap-3 ${
                    notifEvento.tipo === "exito"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {notifEvento.tipo === "exito" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                  {notifEvento.mensaje}
                </div>
              )}

              {/* Selector de imagen / flyer */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 border-2 border-dashed border-indigo-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors">
                  {previewFlyerUrl ? (
                    <div className="w-full flex flex-col items-center">
                      <div className="w-full max-h-56 relative rounded-xl overflow-hidden shadow-sm border border-indigo-100 mb-3 bg-white">
                        <img src={previewFlyerUrl} alt="Preview Flyer" className="w-full h-full object-contain" />
                      </div>
                      <button
                        type="button"
                        onClick={() => flyerInputRef.current?.click()}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Cambiar imagen
                      </button>
                    </div>
                  ) : (
                    <>
                      <Calendar className="w-10 h-10 text-indigo-400 mb-2" />
                      <p className="text-xs font-bold text-slate-700 mb-1">Selecciona el Cartel o Flyer</p>
                      <p className="text-[11px] text-slate-400 mb-3">Formatos: PNG, JPG, WEBP</p>
                      <button
                        type="button"
                        onClick={() => flyerInputRef.current?.click()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Examinar Archivo
                      </button>
                    </>
                  )}
                  <input
                    ref={flyerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSeleccionarFlyer}
                    className="hidden"
                  />
                </div>

                {/* Acción de análisis o Formulario de confirmación */}
                <div className="md:col-span-2 flex flex-col justify-center">
                  {!eventoExtraido ? (
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
                      <Sparkles className="w-8 h-8 text-amber-500 mb-2" />
                      <h4 className="text-sm font-bold text-slate-800">Extraer datos automáticamente con IA</h4>
                      <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
                        Gemini Vision leerá los textos, fechas, auditorios, módulos de vacunación o ponentes del cartel para estructurarlos en Markdown sin transcripciones manuales.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={handleAnalizarFlyerConIA}
                          disabled={!archivoFlyer || analizandoFlyer}
                          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-40"
                        >
                          {analizandoFlyer ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              Gemini Vision analizando la imagen...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-amber-300" />
                              Analizar Imagen con Gemini 3.5 Flash
                            </>
                          )}
                        </button>

                        {archivoFlyer && (
                          <button
                            type="button"
                            onClick={() => handleExportarPDFParaDrive()}
                            className="px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#1b396a] border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                            title="Generar y descargar el PDF oficial con esta imagen directamente"
                          >
                            <Download className="w-4 h-4" />
                            Descargar PDF con esta Imagen
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* FORMULARIO EDITABLE DE CONFIRMACIÓN HUMANA CON EXPORTADOR PDF */
                    <form onSubmit={handleConfirmarYPublicarEvento} className="space-y-3.5 bg-white p-5 rounded-2xl border border-indigo-200 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                        <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wide">
                          Revisión Humana y Aprobación
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleExportarPDFParaDrive()}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#1b396a] border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Genera un PDF oficial con encabezado para subir a Google Drive"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Descargar PDF para Drive</span>
                          </button>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Listo para publicar
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Título del Evento o Comunicado</label>
                          <input
                            type="text"
                            required
                            value={eventoExtraido.titulo || ""}
                            onChange={(e) => setEventoExtraido({ ...eventoExtraido, titulo: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-600 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Fecha Principal / Vigencia</label>
                          <input
                            type="date"
                            required
                            value={eventoExtraido.fecha_evento || ""}
                            onChange={(e) => setEventoExtraido({ ...eventoExtraido, fecha_evento: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-600 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Horario de Atención</label>
                          <input
                            type="text"
                            value={eventoExtraido.hora_evento || ""}
                            onChange={(e) => setEventoExtraido({ ...eventoExtraido, hora_evento: e.target.value })}
                            placeholder="Ej. 10:00 AM o 09:00 a 14:00"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-600 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Responsable / Ponente</label>
                          <input
                            type="text"
                            value={eventoExtraido.ponente || ""}
                            onChange={(e) => setEventoExtraido({ ...eventoExtraido, ponente: e.target.value })}
                            placeholder="Ej. Secretaría de Salud / Ponente"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-600 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Lugar / Sede / Módulo</label>
                          <input
                            type="text"
                            value={eventoExtraido.lugar || ""}
                            onChange={(e) => setEventoExtraido({ ...eventoExtraido, lugar: e.target.value })}
                            placeholder="Ej. Auditorio o Plaza Cívica"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-600 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Dirigido a</label>
                          <input
                            type="text"
                            value={eventoExtraido.carrera_destino || "General"}
                            onChange={(e) => setEventoExtraido({ ...eventoExtraido, carrera_destino: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-600 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Categoría</label>
                          <select
                            value={eventoExtraido.categoria || "evento"}
                            onChange={(e: any) => setEventoExtraido({ ...eventoExtraido, categoria: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-600 focus:bg-white"
                          >
                            <option value="evento">Evento / Conferencia</option>
                            <option value="comunicado">Comunicado Oficial / Jornada</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Contenido Estructurado en Markdown (Formato Nativo para la IA)
                          </label>
                          <textarea
                            rows={4}
                            value={eventoExtraido.contenido_markdown || eventoExtraido.descripcion || ""}
                            onChange={(e) => setEventoExtraido({ ...eventoExtraido, contenido_markdown: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-indigo-600 focus:bg-white resize-none"
                            placeholder="Escribe o revisa el contenido en Markdown..."
                          ></textarea>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Este texto estructurado en Markdown es exactamente el que Balum memorizará en Supabase.
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setEventoExtraido(null)}
                          className="px-3.5 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={guardandoEvento}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {guardandoEvento ? "Guardando en Supabase..." : <><Check className="w-4 h-4" /> Aprobar y Publicar en Balum</>}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* TABLA DE EVENTOS REGISTRADOS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Cartelera de Eventos y Comunicados Activos ({eventos.length})
                  </h3>
                  <p className="text-xs text-slate-400">Información activa en la memoria de Balum</p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {eventos.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Aún no hay eventos registrados. Sube una imagen arriba para publicar el primero.
                  </div>
                ) : (
                  eventos.map((ev) => (
                    <div key={ev.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md">
                            {ev.tipo || "Conferencia"}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">{ev.titulo}</h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {ev.fecha_evento?.split("T")[0]} {ev.hora_evento ? `• ${ev.hora_evento}` : ""}
                          </span>
                          {ev.lugar && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {ev.lugar}
                            </span>
                          )}
                          {ev.ponente && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {ev.ponente}
                            </span>
                          )}
                          {ev.carrera_destino && (
                            <span className="flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5 text-slate-400" />
                              {ev.carrera_destino}
                            </span>
                          )}
                        </div>
                        {ev.descripcion && (
                          <p className="text-xs text-slate-600 line-clamp-2 pt-1">{ev.descripcion}</p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleExportarPDFParaDrive(ev)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1b396a] border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                          title="Descargar PDF institucional oficial para archivar en Google Drive"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarEvento(ev.id, ev.titulo)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar evento"
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

        {/* PESTAÑA 4: BUZÓN DE TICKETS */}
        {tabActivo === "tickets" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Tickets de Soporte de Alumnos</h3>
                  <p className="text-xs text-slate-400">Dudas enviadas a Control Escolar</p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {tickets.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No hay tickets pendientes registrados.
                  </div>
                ) : (
                  tickets.map((ticket) => (
                    <div key={ticket.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#1b396a]">{ticket.num_control}</span>
                          <span className="text-xs text-slate-400">({ticket.correo_institucional})</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            ticket.estado === "resuelto"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {ticket.estado}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mb-3">{ticket.descripcion}</p>
                      {ticket.estado !== "resuelto" && (
                        <button
                          onClick={() => handleCambiarEstadoTicket(ticket.id, "resuelto")}
                          className="text-xs font-bold text-emerald-600 hover:underline"
                        >
                          Marcar como atendido
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 5: CALIDAD */}
        {tabActivo === "calidad" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Porcentaje de Satisfacción
                  </span>
                  <div className="text-3xl font-black text-indigo-600 mt-1">
                    {porcentajeSatisfaccion}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {totalCalificaciones > 0 ? `Basado en ${totalCalificaciones} votos` : "Esperando primeros votos"}
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Respuestas con Like
                  </span>
                  <div className="text-3xl font-black text-emerald-600 mt-1 flex items-center gap-2">
                    <ThumbsUp className="w-6 h-6" /> {metricas?.likes || 0}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Calificadas como útiles por alumnos</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Respuestas con Dislike
                  </span>
                  <div className="text-3xl font-black text-rose-600 mt-1 flex items-center gap-2">
                    <ThumbsDown className="w-6 h-6" /> {metricas?.dislikes || 0}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Para detectar vacíos de información</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Preguntas Más Repetitivas y Auditoría</h3>
                <p className="text-xs text-slate-400">Temas y preguntas frecuentes detectadas en Supabase</p>
              </div>

              <div className="divide-y divide-slate-100">
                {preguntasFrecuentes.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Aún no hay suficientes preguntas registradas para armar la lista.
                  </div>
                ) : (
                  preguntasFrecuentes.map((item, idx) => (
                    <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                        <span className="text-xs font-bold text-slate-800">&ldquo;{item.pregunta}&rdquo;</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-blue-50 text-[#1b396a] rounded-lg text-xs font-semibold">
                          {item.veces} veces consultada
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <ThumbsUp className="w-3 h-3" /> {item.likes}
                          </span>
                          <span className="text-rose-600 flex items-center gap-0.5">
                            <ThumbsDown className="w-3 h-3" /> {item.dislikes}
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
