"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Square,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Copy,
  Check,
  FileText,
  Trash2,
  Mic,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Shield,
  MessageSquare,
  Plus,
  Menu,
  X,
  Sparkles,
  ExternalLink,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { obtenerEnlaceDrive, GOOGLE_DRIVE_CARPETA_OFICIAL } from "@/lib/driveLinks";

type Mensaje = {
  id: string;
  texto: string;
  remitente: "usuario" | "balum";
  fuentes?: string[];
  feedback?: "up" | "down" | null;
};

interface Conversacion {
  id: string;
  titulo: string;
  fecha: number;
  mensajes: Mensaje[];
}

const MENSAJE_BIENVENIDA_INICIAL: Mensaje = {
  id: "bienvenida",
  remitente: "balum",
  texto:
    "¡Hola! Soy **Balum**, el asistente virtual del Instituto Tecnológico de Villahermosa (ITVH). Estoy para orientarte sobre trámites académicos, servicio social, residencias, reinscripción y más. ¿En qué te puedo ayudar hoy?",
};

// Generador de títulos concisos con palabras clave para el historial
function generarTituloConversacion(texto: string): string {
  const t = texto.toLowerCase();
  if (t.includes("servicio social")) return "Servicio Social";
  if (t.includes("residencia")) return "Residencias Profesionales";
  if (t.includes("reinscripci")) return "Reinscripción";
  if (t.includes("baja")) return "Trámite de Bajas";
  if (t.includes("titulaci")) return "Opciones de Titulación";
  if (t.includes("credencial")) return "Credencial de Estudiante";
  if (t.includes("ingl")) return "Liberación de Inglés";
  if (t.includes("verano")) return "Cursos de Verano";
  if (t.includes("complementaria")) return "Créditos Complementarios";
  if (t.includes("dual")) return "Educación Dual";
  if (t.includes("justificante")) return "Justificante de Inasistencia";
  if (t.includes("cambio de carrera")) return "Cambio de Carrera";
  if (t.includes("directorio") || t.includes("contacto")) return "Directorio ITVH";

  // Si no coincide con palabras clave conocidas, tomar las primeras palabras limpias
  const limpio = texto.replace(/[¿?¡!]/g, "").trim();
  if (limpio.length <= 32) return limpio;
  return limpio.slice(0, 30) + "...";
}

// Componente UI Generativo para Tickets
const FormularioTicket = () => {
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [correo, setCorreo] = useState("");
  const [numControl, setNumControl] = useState("");
  const [duda, setDuda] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const enviarTicket = async () => {
    if (!correo.trim() || !duda.trim()) {
      setErrorMsg("Por favor ingresa tu correo y tu duda.");
      return;
    }
    setCargando(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo_institucional: correo,
          num_control: numControl,
          descripcion: duda,
        }),
      });
      if (res.ok) {
        setEnviado(true);
      } else {
        setErrorMsg("Error al enviar el ticket. Intenta más tarde.");
      }
    } catch (e) {
      setErrorMsg("Error de conexión al enviar el ticket.");
    } finally {
      setCargando(false);
    }
  };

  if (enviado) {
    return (
      <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col items-center text-center">
        <Check className="w-8 h-8 text-emerald-600 mb-2" />
        <h4 className="text-emerald-800 font-bold text-sm">¡Tu ticket fue enviado!</h4>
        <p className="text-emerald-600 text-xs mt-1">Control Escolar se comunicará contigo pronto.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-white border border-[#1b396a]/20 shadow-sm rounded-2xl">
      <h4 className="text-[#1b396a] font-bold text-sm mb-1">Abrir Ticket en Control Escolar</h4>
      <p className="text-gray-500 text-xs mb-3">Deja tus datos para que revisen tu caso personal.</p>

      {errorMsg && (
        <div className="mb-2 p-2 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
          {errorMsg}
        </div>
      )}

      <input
        type="email"
        required
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        placeholder="Correo institucional (@villahermosa.tecnm.mx)"
        className="w-full mb-2 p-2.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-[#1b396a]"
      />
      <input
        type="text"
        value={numControl}
        onChange={(e) => setNumControl(e.target.value)}
        placeholder="Número de Control (Ej. 19300000)"
        className="w-full mb-2 p-2.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-[#1b396a]"
      />
      <textarea
        required
        value={duda}
        onChange={(e) => setDuda(e.target.value)}
        placeholder="Describe tu duda detalladamente..."
        rows={3}
        className="w-full mb-3 p-2.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-[#1b396a] resize-none"
      ></textarea>

      <button
        onClick={enviarTicket}
        disabled={cargando}
        className="w-full bg-[#1b396a] hover:bg-[#12264a] text-white py-2.5 rounded-xl text-xs font-bold tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
      >
        {cargando ? "Enviando..." : <><Send className="w-3.5 h-3.5" /> Enviar Ticket</>}
      </button>
    </div>
  );
};

// Componente del bloque de pensamiento
const ThinkBlock = ({ content, isComplete }: { content: string; isComplete: boolean }) => {
  const [expanded, setExpanded] = useState(!isComplete);

  useEffect(() => {
    if (isComplete) {
      setExpanded(false);
    }
  }, [isComplete]);

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 my-2 overflow-hidden min-w-[240px] text-xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 bg-gray-100 hover:bg-gray-200/70 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span className="text-gray-700 font-semibold">
            {isComplete ? "Pensó durante unos segundos" : "Razonando respuesta..."}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="p-3 border-t border-gray-200 text-gray-600 italic leading-relaxed text-xs whitespace-pre-wrap">
          {content || "Procesando razonamiento..."}
        </div>
      )}
    </div>
  );
};

export default function PantallaChat() {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [conversacionActivaId, setConversacionActivaId] = useState<string>("");
  const [textoInput, setTextoInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarBotonScroll, setMostrarBotonScroll] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [sidebarAbiertoMovil, setSidebarAbiertoMovil] = useState(false);
  const [sidebarColapsadoDesktop, setSidebarColapsadoDesktop] = useState(false);
  const [montado, setMontado] = useState(false);

  // --- AUDIO Y VOZ ---
  const [audioReproduciendoId, setAudioReproduciendoId] = useState<string | null>(null);
  const [vozActivada, setVozActivada] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const recognitionRef = useRef<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Obtener mensajes de la conversación activa
  const conversacionActiva = conversaciones.find((c) => c.id === conversacionActivaId) || conversaciones[0];
  const mensajes = conversacionActiva?.mensajes || [MENSAJE_BIENVENIDA_INICIAL];

  // Enlaces de Google Drive configurados por el administrador
  const [enlacesDriveDinamicos, setEnlacesDriveDinamicos] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/drive-links")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.links) {
          setEnlacesDriveDinamicos(data.links);
        }
      })
      .catch(() => {});
  }, []);

  // 1. CARGA INICIAL DE HISTORIAL MULTI-CHAT (LOCALSTORAGE)
  useEffect(() => {
    setMontado(true);
    try {
      if (typeof window !== "undefined") {
        const guardadas = localStorage.getItem("balum_conversaciones_v2");
        if (guardadas) {
          const parsed: Conversacion[] = JSON.parse(guardadas);
          if (parsed && parsed.length > 0) {
            setConversaciones(parsed);
            const ultimaActiva = localStorage.getItem("balum_conv_activa_id") || parsed[0].id;
            setConversacionActivaId(ultimaActiva);
            return;
          }
        }

        // Migración retrocompatible: Si existía balum_historial de la versión anterior
        const historialAntiguo = localStorage.getItem("balum_historial");
        if (historialAntiguo) {
          const msgsAntiguos: Mensaje[] = JSON.parse(historialAntiguo);
          if (msgsAntiguos.length > 1) {
            const primerUsuario = msgsAntiguos.find((m) => m.remitente === "usuario");
            const titulo = primerUsuario ? generarTituloConversacion(primerUsuario.texto) : "Consulta previa";
            const convMigrada: Conversacion = {
              id: "conv_" + Date.now(),
              titulo: titulo,
              fecha: Date.now(),
              mensajes: msgsAntiguos,
            };
            setConversaciones([convMigrada]);
            setConversacionActivaId(convMigrada.id);
            localStorage.setItem("balum_conversaciones_v2", JSON.stringify([convMigrada]));
            return;
          }
        }

        // Si no hay datos, inicializar con conversación limpia
        const nueva: Conversacion = {
          id: "conv_" + Date.now(),
          titulo: "Nueva Consulta",
          fecha: Date.now(),
          mensajes: [MENSAJE_BIENVENIDA_INICIAL],
        };
        setConversaciones([nueva]);
        setConversacionActivaId(nueva.id);
      }
    } catch (e) {
      console.warn("Storage no disponible o corrupto:", e);
    }
  }, []);

  // 2. GUARDAR CONVERSACIONES AL CAMBIAR
  useEffect(() => {
    if (!montado) return;
    try {
      if (typeof window !== "undefined" && conversaciones.length > 0) {
        localStorage.setItem("balum_conversaciones_v2", JSON.stringify(conversaciones));
        if (conversacionActivaId) {
          localStorage.setItem("balum_conv_activa_id", conversacionActivaId);
        }
      }
    } catch (e) {
      console.warn("Error guardando conversaciones:", e);
    }
  }, [conversaciones, conversacionActivaId, montado]);

  // 3. INICIALIZAR RECONOCIMIENTO DE VOZ (DICTADO)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = "es-MX";

          recognition.onstart = () => setEscuchando(true);
          recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
              .map((res: any) => res[0].transcript)
              .join("");
            setTextoInput(transcript);
          };
          recognition.onerror = () => setEscuchando(false);
          recognition.onend = () => setEscuchando(false);

          recognitionRef.current = recognition;
        }
      } catch (e) {}
    }
  }, []);

  const toggleMicrofono = () => {
    try {
      if (escuchando) {
        recognitionRef.current?.stop();
      } else {
        setTextoInput("");
        recognitionRef.current?.start();
      }
    } catch (e) {
      setEscuchando(false);
    }
  };

  // 4. CONTROL DE AUDIO DIRECTO (AZUL ⇄ ROJO)
  const toggleHablar = (idMensaje: string, texto: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    // Si ya se está reproduciendo este mismo mensaje, detener inmediatamente
    if (audioReproduciendoId === idMensaje) {
      window.speechSynthesis.cancel();
      setAudioReproduciendoId(null);
      return;
    }

    // Si había otro sonando, detenerlo primero
    window.speechSynthesis.cancel();

    // Limpiar texto para una dicción fluida
    const textoLimpio = texto
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .replace(/\[TICKET_FORM\]/g, "")
      .replace(/\[SUGERENCIA_\d+:.*?\]/g, "")
      .replace(/[*#_`]/g, "")
      .trim();

    if (!textoLimpio) return;

    const utterance = new SpeechSynthesisUtterance(textoLimpio);
    utterance.lang = "es-MX";
    utterance.rate = 1.05;

    utterance.onend = () => {
      setAudioReproduciendoId(null);
    };

    utterance.onerror = () => {
      setAudioReproduciendoId(null);
    };

    setAudioReproduciendoId(idMensaje);
    window.speechSynthesis.speak(utterance);
  };

  // 5. GESTIÓN DE SESIONES / CONVERSACIONES
  const crearNuevaConversacion = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setAudioReproduciendoId(null);

    // Evitar acumular consultas vacías: si ya existe una conversación sin preguntas del alumno, ir a ella
    const convVacia = conversaciones.find(
      (c) => !c.mensajes.some((m) => m.remitente === "usuario")
    );
    if (convVacia) {
      setConversacionActivaId(convVacia.id);
      setSidebarAbiertoMovil(false);
      return;
    }

    const nuevaConv: Conversacion = {
      id: "conv_" + Date.now(),
      titulo: "Nueva Consulta",
      fecha: Date.now(),
      mensajes: [MENSAJE_BIENVENIDA_INICIAL],
    };

    setConversaciones((prev) => [nuevaConv, ...prev]);
    setConversacionActivaId(nuevaConv.id);
    setSidebarAbiertoMovil(false);
  };

  const seleccionarConversacion = (id: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setAudioReproduciendoId(null);
    setConversacionActivaId(id);
    setSidebarAbiertoMovil(false);
  };

  const eliminarConversacion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setAudioReproduciendoId(null);

    const filtradas = conversaciones.filter((c) => c.id !== id);
    if (filtradas.length === 0) {
      const nueva: Conversacion = {
        id: "conv_" + Date.now(),
        titulo: "Nueva Consulta",
        fecha: Date.now(),
        mensajes: [MENSAJE_BIENVENIDA_INICIAL],
      };
      setConversaciones([nueva]);
      setConversacionActivaId(nueva.id);
    } else {
      setConversaciones(filtradas);
      if (conversacionActivaId === id) {
        setConversacionActivaId(filtradas[0].id);
      }
    }
  };

  const vaciarTodoElHistorial = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setAudioReproduciendoId(null);

    const nueva: Conversacion = {
      id: "conv_" + Date.now(),
      titulo: "Nueva Consulta",
      fecha: Date.now(),
      mensajes: [
        {
          id: "bienvenida",
          remitente: "balum",
          texto:
            "¡Hola! Soy **Balum**. He limpiado tu historial de conversaciones. ¿En qué trámite del ITVH te puedo orientar hoy?",
        },
      ],
    };
    setConversaciones([nueva]);
    setConversacionActivaId(nueva.id);
    localStorage.removeItem("balum_conversaciones_v2");
    localStorage.removeItem("balum_historial");
  };

  // 6. SCROLL Y COPIAR TEXTO
  const irAlFinal = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    irAlFinal();
  }, [mensajes, cargando]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanciaAlFondo = target.scrollHeight - target.clientHeight - target.scrollTop;
    setMostrarBotonScroll(distanciaAlFondo > 140);
  };

  const copiarTexto = async (id: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const detenerGeneracion = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setCargando(false);
  };

  const calificarMensaje = async (id: string, rating: "up" | "down") => {
    setConversaciones((prev) =>
      prev.map((c) => {
        if (c.id !== conversacionActivaId) return c;
        return {
          ...c,
          mensajes: c.mensajes.map((m) => (m.id === id ? { ...m, feedback: rating } : m)),
        };
      })
    );

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, feedback: rating }),
      });
    } catch (e) {
      console.warn("No se pudo registrar feedback:", e);
    }
  };

  // 7. ENVÍO DE MENSAJE Y STREAMING CON RAG
  const enviarMensaje = async (textoForzado?: string) => {
    const textoFinal = textoForzado !== undefined ? textoForzado : textoInput;
    if (cargando || !textoFinal.trim()) return;

    const pregunta = textoFinal.trim();
    const idUsuario = Date.now().toString();
    const nuevoUsuario: Mensaje = {
      id: idUsuario,
      texto: pregunta,
      remitente: "usuario",
    };

    const idBot = (Date.now() + 1).toString();
    const botPlaceholder: Mensaje = {
      id: idBot,
      texto: "",
      remitente: "balum",
      fuentes: [],
    };

    // Determinar si debemos actualizar el título de la conversación
    const esPrimerMensajeReal = mensajes.filter((m) => m.remitente === "usuario").length === 0;
    const nuevoTitulo = esPrimerMensajeReal ? generarTituloConversacion(pregunta) : conversacionActiva?.titulo;

    const mensajesActualizados = [...mensajes, nuevoUsuario, botPlaceholder];

    setConversaciones((prev) =>
      prev.map((c) => {
        if (c.id !== conversacionActivaId) return c;
        return {
          ...c,
          titulo: nuevoTitulo || c.titulo,
          mensajes: mensajesActualizados,
        };
      })
    );

    setTextoInput("");
    setCargando(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [...mensajes, nuevoUsuario].map((m) => ({
            role: m.remitente === "usuario" ? "user" : "assistant",
            content: m.texto,
          })),
        }),
      });

      if (!response.ok) {
        let errorMsg = "Error en el servidor";
        try {
          const errorData = await response.json();
          if (errorData.error) errorMsg = errorData.error;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let acumulado = "";
      let fuentesIdentificadas: string[] = [];
      let idMensajeFinal = idBot;

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;

            for (const line of trimmed.split("\n")) {
              if (line.startsWith("data: ")) {
                const payload = line.slice(6).trim();
                if (payload === "[DONE]") break;

                try {
                  const parsed = JSON.parse(payload);
                  if (parsed.id) {
                    idMensajeFinal = parsed.id;
                  }
                  if (parsed.sources) {
                    fuentesIdentificadas = parsed.sources;
                  }
                  if (parsed.text) {
                    acumulado += parsed.text;
                  }

                  setConversaciones((prev) =>
                    prev.map((c) => {
                      if (c.id !== conversacionActivaId) return c;
                      return {
                        ...c,
                        mensajes: c.mensajes.map((msg) =>
                          msg.id === idBot || msg.id === idMensajeFinal
                            ? {
                                ...msg,
                                id: idMensajeFinal,
                                texto: acumulado,
                                fuentes: fuentesIdentificadas,
                              }
                            : msg
                        ),
                      };
                    })
                  );
                } catch {
                  // chunk incompleto
                }
              }
            }
          }
        }
      }

      // Si el usuario tiene la voz general activada, hablar al terminar
      if (acumulado && vozActivada && !abortControllerRef.current?.signal.aborted) {
        toggleHablar(idMensajeFinal, acumulado);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setConversaciones((prev) =>
          prev.map((c) => {
            if (c.id !== conversacionActivaId) return c;
            return {
              ...c,
              mensajes: c.mensajes.map((msg) =>
                msg.id === idBot
                  ? {
                      ...msg,
                      texto:
                        err.message ||
                        "Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.",
                    }
                  : msg
              ),
            };
          })
        );
      }
    } finally {
      setCargando(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-gray-800 overflow-hidden select-text font-sans">
      {/* =========================================================================
          1. BARRA LATERAL IZQUIERDA (HISTORIAL TIPO CHATGPT)
      ========================================================================== */}
      {/* Overlay para móviles */}
      {sidebarAbiertoMovil && (
        <div
          onClick={() => setSidebarAbiertoMovil(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col bg-[#0f172a] text-slate-200 transition-all duration-300 ease-in-out border-r border-slate-800/80 shadow-2xl md:shadow-none ${
          sidebarColapsadoDesktop ? "md:w-0 md:overflow-hidden md:border-none" : "w-72 sm:w-80"
        } ${sidebarAbiertoMovil ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Encabezado del Sidebar */}
        <div className="p-4 border-b border-slate-800/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-blue-400/40 relative shrink-0">
              <Image
                src="/icon.png"
                alt="Balum"
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="font-extrabold text-sm tracking-tight text-white">
                Balum ITVH
              </h2>
              <p className="text-[11px] text-slate-400">Historial de Consultas</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Botón colapsar en desktop */}
            <button
              onClick={() => setSidebarColapsadoDesktop(true)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Ocultar barra lateral"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
            {/* Botón cerrar en móvil */}
            <button
              onClick={() => setSidebarAbiertoMovil(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Botón "+ Nueva Consulta" tipo ChatGPT */}
        <div className="p-3">
          <button
            onClick={crearNuevaConversacion}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-[#1b396a] to-[#254b8c] hover:from-[#20437d] hover:to-[#2e5ba8] text-white font-semibold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] border border-blue-400/20"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-200" />
              <span>Nueva Consulta</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-white/10 rounded text-blue-100">
              + Chat
            </span>
          </button>
        </div>

        {/* Lista Scrollable de Conversaciones */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tus Preguntas Anteriores
          </div>

          {conversaciones.map((conv) => {
            const estaActiva = conv.id === conversacionActivaId;
            return (
              <div
                key={conv.id}
                onClick={() => seleccionarConversacion(conv.id)}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                  estaActiva
                    ? "bg-[#1b396a]/70 text-white font-semibold shadow-sm border border-blue-400/30"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      estaActiva ? "text-blue-300" : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  />
                  <span className="truncate">{conv.titulo}</span>
                </div>

                {/* Botón eliminar al pasar el cursor */}
                <button
                  type="button"
                  onClick={(e) => eliminarConversacion(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700/60 rounded-md transition-all shrink-0"
                  title="Eliminar de historial"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Pie del Sidebar */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 flex flex-col gap-2">
          {conversaciones.length > 1 && (
            <button
              onClick={vaciarTodoElHistorial}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar todo el historial</span>
            </button>
          )}

          <a
            href="https://sws.villahermosa.tecnm.mx"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              Portal SWS ITVH
            </span>
            <span className="text-[10px] text-slate-500">Oficial</span>
          </a>
        </div>
      </aside>

      {/* =========================================================================
          2. ÁREA PRINCIPAL: ENCABEZADO + CHAT + ENTRADA
      ========================================================================== */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white relative">
        {/* ENCABEZADO INSTITUCIONAL EXPANDIDO PARA ESCRITORIO */}
        <header className="bg-gradient-to-r from-[#142d54] via-[#1b396a] to-[#12284b] text-white py-3.5 md:py-4 px-4 sm:px-6 shadow-md flex items-center justify-between z-10 select-none border-b border-blue-900/30">
          <div className="flex items-center gap-3">
            {/* Botón hamburguesa en móvil */}
            <button
              onClick={() => setSidebarAbiertoMovil(true)}
              className="md:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Abrir historial de conversaciones"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Botón para expandir sidebar en desktop si está colapsado */}
            {sidebarColapsadoDesktop && (
              <button
                onClick={() => setSidebarColapsadoDesktop(false)}
                className="hidden md:flex p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Mostrar historial"
              >
                <PanelLeft className="w-5 h-5 text-blue-200" />
              </button>
            )}

            {/* Avatar Circular de Balum (Agrandado para escritorio) */}
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-blue-300 shadow-md shrink-0 relative">
              <Image
                src="/icon.png"
                alt="Balum Jaguar ITVH"
                width={64}
                height={64}
                className="w-full h-full object-cover"
                priority
              />
            </div>

            {/* Títulos Centrales (Agrandados para escritorio) */}
            <div className="flex flex-col">
              <h1 className="text-white text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-xs">
                Chatea con Balum
              </h1>
              <p className="text-blue-200 text-[10px] sm:text-xs md:text-sm uppercase font-semibold tracking-wider mt-0.5">
                Instituto Tecnológico de Villahermosa
              </p>
            </div>
          </div>

          {/* Botón Admin y Logo ITVH a la derecha (Agrandados) */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 text-xs font-medium"
              title="Panel de Administración ITVH"
            >
              <Shield className="w-4 h-4 text-blue-200" />
              <span className="hidden sm:inline">Admin</span>
            </Link>

            <a
              href="https://sws.villahermosa.tecnm.mx"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-14 md:w-20 md:h-20 flex items-center justify-center overflow-hidden shrink-0 relative cursor-pointer hover:opacity-95 transition-opacity"
              title="Portal del Instituto Tecnológico de Villahermosa"
            >
              <Image
                src="/logo-itvh.png"
                alt="Logo ITVH"
                width={80}
                height={80}
                className="w-full h-full object-contain"
                priority
              />
            </a>
          </div>
        </header>

        {/* ÁREA CENTRAL DE MENSAJES (EXPANDIDA Y CON LETRAS MÁS GRANDES) */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 space-y-5 max-w-4xl mx-auto w-full relative"
        >
          {/* Controles superiores: Voz automática y título activo */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100 text-xs text-gray-500">
            <div className="flex items-center gap-1.5 text-slate-600 font-medium truncate max-w-xs sm:max-w-md">
              <MessageSquare className="w-3.5 h-3.5 text-[#1b396a]" />
              <span className="truncate">Tema: <strong className="text-gray-900">{conversacionActiva?.titulo}</strong></span>
            </div>

            <button
              onClick={() => {
                setVozActivada(!vozActivada);
                if (vozActivada) {
                  window.speechSynthesis?.cancel();
                  setAudioReproduciendoId(null);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shadow-xs ${
                vozActivada
                  ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              title={vozActivada ? "Desactivar lectura automática" : "Activar lectura automática"}
            >
              {vozActivada ? <Volume2 className="w-3.5 h-3.5 text-indigo-600" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{vozActivada ? "Lectura automática activa" : "Lectura automática apagada"}</span>
            </button>
          </div>

          {/* Tarjetas de bienvenida si la conversación es nueva */}
          {mensajes.length === 1 && (
            <div className="flex flex-col items-center justify-center gap-3 mt-4 mb-6 w-full max-w-xl mx-auto">
              <div className="text-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1b396a] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  Base Oficial de Conocimiento
                </span>
                <h3 className="text-gray-700 text-sm md:text-base font-semibold mt-2">
                  Puedes preguntar directamente o elegir un trámite:
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                <button
                  onClick={() => enviarMensaje("¿Cuáles son los requisitos y fechas para liberar el Servicio Social?")}
                  className="p-3.5 bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 rounded-2xl text-left transition-all shadow-xs group"
                >
                  <div className="font-bold text-xs md:text-sm text-gray-800 group-hover:text-indigo-700 flex items-center gap-1.5">
                    📋 Servicio Social
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Requisitos, horas y formatos oficiales</p>
                </button>

                <button
                  onClick={() => enviarMensaje("¿Cuáles son los requisitos para realizar las Residencias Profesionales?")}
                  className="p-3.5 bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 rounded-2xl text-left transition-all shadow-xs group"
                >
                  <div className="font-bold text-xs md:text-sm text-gray-800 group-hover:text-indigo-700 flex items-center gap-1.5">
                    🏢 Residencias Profesionales
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Créditos mínimos, empresas y registro</p>
                </button>

                <button
                  onClick={() => enviarMensaje("¿Cómo es el proceso y fechas para la Reinscripción?")}
                  className="p-3.5 bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 rounded-2xl text-left transition-all shadow-xs group"
                >
                  <div className="font-bold text-xs md:text-sm text-gray-800 group-hover:text-indigo-700 flex items-center gap-1.5">
                    📅 Reinscripción Escolar
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Cargas académicas, pagos y SWS</p>
                </button>

                <button
                  onClick={() => enviarMensaje("¿Qué opciones de titulación ofrece el ITVH?")}
                  className="p-3.5 bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 rounded-2xl text-left transition-all shadow-xs group"
                >
                  <div className="font-bold text-xs md:text-sm text-gray-800 group-hover:text-indigo-700 flex items-center gap-1.5">
                    🎓 Titulación y Egresados
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Tesis, EGEL, créditos y memorias</p>
                </button>
              </div>
            </div>
          )}

          {/* RENDERIZADO DE MENSAJES */}
          {mensajes.map((item) => {
            const esUsuario = item.remitente === "usuario";
            const partes = item.texto.split(/(<think>[\s\S]*?<\/think>|<think>[\s\S]*)/g);
            const estaReproduciendoEste = audioReproduciendoId === item.id;

            return (
              <div
                key={item.id}
                className={`flex flex-col ${esUsuario ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[85%] md:max-w-[82%] p-4 md:p-5 rounded-3xl shadow-xs transition-all leading-relaxed ${
                    esUsuario
                      ? "bg-gradient-to-r from-indigo-50 to-blue-50/80 rounded-tr-xs border border-indigo-100 text-[#1e1b4b]"
                      : "bg-white rounded-tl-xs border border-gray-200/90 text-gray-800 shadow-sm"
                  }`}
                >
                  {/* Animación de carga si Balum está respondiendo */}
                  {!item.texto && !esUsuario && cargando ? (
                    <div className="flex items-center gap-3 p-2">
                      <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                      <span className="text-indigo-600 text-sm md:text-base italic font-medium">
                        Balum está consultando los documentos oficiales...
                      </span>
                    </div>
                  ) : (
                    partes.map((parte, idx) => {
                      if (!parte) return null;
                      if (parte.startsWith("<think>")) {
                        const isComplete = parte.includes("</think>");
                        const thinkContent = parte
                          .replace("<think>", "")
                          .replace("</think>", "")
                          .trim();
                        return (
                          <ThinkBlock
                            key={idx}
                            content={thinkContent}
                            isComplete={isComplete}
                          />
                        );
                      }
                      const hasTicket = parte.includes("[TICKET_FORM]");
                      const cleanParte = parte.replace("[TICKET_FORM]", "");

                      // Extraer sugerencias
                      let finalTexto = cleanParte;
                      const sugerencias: string[] = [];
                      const regex = /\[SUGERENCIA_\d+:\s*(.*?)\]/g;
                      let match;
                      while ((match = regex.exec(cleanParte)) !== null) {
                        sugerencias.push(match[1].trim());
                        finalTexto = finalTexto.replace(match[0], "");
                      }

                      return (
                        <div
                          key={idx}
                          className="text-[15px] sm:text-[16px] md:text-[17px] md:leading-[28px] space-y-2.5 prose prose-slate max-w-none text-inherit"
                        >
                          <ReactMarkdown>{finalTexto}</ReactMarkdown>
                          {hasTicket && <FormularioTicket />}
                          {sugerencias.length > 0 && !cargando && (
                            <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-gray-100">
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Preguntas relacionadas:
                              </span>
                              {sugerencias.map((sug, sIdx) => (
                                <button
                                  key={sIdx}
                                  onClick={() => enviarMensaje(sug)}
                                  className="text-left bg-indigo-50/60 hover:bg-indigo-100/90 border border-indigo-100 text-indigo-700 px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-colors shadow-xs w-fit"
                                >
                                  {sug}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Fuentes oficiales consultadas con enlace directo a Google Drive */}
                  {item.fuentes && item.fuentes.length > 0 && (
                    <div className="pt-3 mt-3 border-t border-gray-100 flex flex-col gap-2 text-xs text-gray-500">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#1b396a]" />
                        <span className="font-semibold text-gray-700">Documento oficial citado:</span>
                        {item.fuentes.map((f, i) => (
                          <a
                            key={i}
                            href={obtenerEnlaceDrive(f, enlacesDriveDinamicos)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-[#1b396a] border border-blue-200 px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors shadow-2xs group cursor-pointer"
                            title="Ver documento oficial en Google Drive (balumitvh@gmail.com)"
                          >
                            <span>{f}</span>
                            <ExternalLink className="w-3 h-3 text-blue-500 group-hover:text-blue-700" />
                          </a>
                        ))}
                      </div>

                      <a
                        href={obtenerEnlaceDrive(item.fuentes[0], enlacesDriveDinamicos)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200/60 px-3 py-1.5 rounded-xl transition-all w-fit cursor-pointer shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Ver/Descargar PDF en Google Drive Oficial (balumitvh@gmail.com) ↗</span>
                      </a>
                    </div>
                  )}

                  {/* BOTONES DE ACCIÓN DEL MENSAJE (CON BOTÓN DE AUDIO TOGGLE AZUL ⇄ ROJO) */}
                  {item.texto && (
                    <div className="flex flex-wrap justify-end items-center gap-2 mt-3 pt-2 border-t border-gray-100/80">
                      {!esUsuario && (
                        <div className="flex items-center gap-1 mr-auto">
                          <button
                            type="button"
                            onClick={() => calificarMensaje(item.id, "up")}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.feedback === "up"
                                ? "bg-emerald-100 text-emerald-700"
                                : "text-gray-400 hover:text-emerald-600 hover:bg-gray-100"
                            }`}
                            title="Respuesta útil"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => calificarMensaje(item.id, "down")}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.feedback === "down"
                                ? "bg-red-100 text-red-700"
                                : "text-gray-400 hover:text-red-600 hover:bg-gray-100"
                            }`}
                            title="Respuesta incompleta"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Botón rápido "Resumir paso a paso" para alumnos */}
                      {!esUsuario && item.texto.length > 250 && !cargando && (
                        <button
                          type="button"
                          onClick={() =>
                            enviarMensaje(
                              "Por favor, hazme un resumen paso a paso de lo anterior de forma clara y bien dividida."
                            )
                          }
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80 shadow-xs"
                          title="Pedir resumen desglosado paso a paso"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Paso a paso</span>
                        </button>
                      )}

                      {/* BOTÓN DE AUDIO DIRECTO: AZUL CUANDO REPOSO, ROJO CUANDO ESTÁ HABLANDO */}
                      {!esUsuario && (
                        estaReproduciendoEste ? (
                          <button
                            type="button"
                            onClick={() => toggleHablar(item.id, item.texto)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all bg-red-50 text-red-600 border border-red-300 hover:bg-red-100 shadow-sm animate-pulse"
                            title="Detener voz inmediatamente"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>Detener voz</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleHablar(item.id, item.texto)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200/60 shadow-xs"
                            title="Escuchar respuesta"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Escuchar</span>
                          </button>
                        )
                      )}

                      {/* Botón Copiar */}
                      <button
                        type="button"
                        onClick={() => copiarTexto(item.id, item.texto)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                          esUsuario
                            ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                        title="Copiar texto"
                      >
                        {copiadoId === item.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Botón flotante para ir al final */}
          {mostrarBotonScroll && (
            <button
              type="button"
              onClick={irAlFinal}
              className="fixed bottom-24 right-6 sm:right-10 w-11 h-11 bg-white rounded-full shadow-xl flex items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all z-20"
              title="Ir al final de la conversación"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* =========================================================================
            3. BARRA INFERIOR DE ENTRADA TIPO CHATGPT
        ========================================================================== */}
        <div className="px-4 py-3.5 bg-white border-t border-gray-100 w-full max-w-4xl mx-auto flex items-end gap-2.5 shrink-0">
          <textarea
            rows={1}
            value={textoInput}
            onChange={(e) => setTextoInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviarMensaje();
              }
            }}
            placeholder={
              cargando
                ? "Balum está respondiendo..."
                : "Haz una pregunta sobre trámites, servicio social, residencias..."
            }
            disabled={cargando}
            className={`flex-1 min-h-[50px] max-h-[140px] py-3.5 px-5 rounded-2xl text-[15px] md:text-[16px] outline-none transition-all resize-none ${
              cargando
                ? "bg-gray-50 text-gray-400 placeholder:text-gray-400"
                : "bg-gray-100/90 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-300 border border-transparent focus:border-indigo-400 shadow-inner"
            }`}
          />

          {/* Botón Micrófono / Dictado */}
          <button
            type="button"
            onClick={toggleMicrofono}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs active:scale-95 transition-all shrink-0 ${
              escuchando
                ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            title="Dictar por voz"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Botón Detener / Enviar */}
          {cargando ? (
            <button
              type="button"
              onClick={detenerGeneracion}
              className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-2xl flex items-center justify-center shadow-md active:scale-95 transition-transform shrink-0"
              title="Detener respuesta"
            >
              <Square className="w-5 h-5 text-white fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => enviarMensaje()}
              disabled={!textoInput.trim()}
              className="w-12 h-12 bg-[#1b396a] hover:bg-[#152e54] disabled:opacity-30 rounded-2xl flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0 text-white"
              title="Enviar pregunta"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
