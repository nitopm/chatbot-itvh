"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Send, Square, ChevronDown, ChevronUp, Lightbulb, Copy, Check, FileText, Trash2, Mic, Volume2, VolumeX, ThumbsUp, ThumbsDown, Shield } from "lucide-react";

type Mensaje = {
  id: string;
  texto: string;
  remitente: "usuario" | "balum";
  fuentes?: string[];
  feedback?: "up" | "down" | null;
};

// Componente UI Generativo para Tickets
const FormularioTicket = () => {
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
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col items-center text-center">
        <Check className="w-8 h-8 text-green-600 mb-2" />
        <h4 className="text-green-800 font-bold text-sm">¡Tu ticket fue enviado!</h4>
        <p className="text-green-600 text-xs mt-1">Control Escolar se comunicará contigo pronto.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-white border border-[#1b396a]/20 shadow-sm rounded-xl">
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
        className="w-full bg-[#1b396a] hover:bg-[#12264a] text-white py-2.5 rounded-lg text-xs font-bold tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {cargando ? "Enviando..." : <><Send className="w-3.5 h-3.5" /> Enviar Ticket</>}
      </button>
    </div>
  );
};

// Componente del bloque de pensamiento idéntico a la versión 1
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
          <Lightbulb className="w-4 h-4 text-gray-600" />
          <span className="text-gray-700 font-semibold">
            {isComplete ? "Pensó durante unos segundos" : "Pensando..."}
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
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: "bienvenida",
      remitente: "balum",
      texto:
        "¡Hola! Soy **Balum**, el asistente virtual del Instituto Tecnológico de Villahermosa (ITVH). Estoy para orientarte sobre trámites académicos, servicio social, residencias, reinscripción y más. ¿En qué te puedo ayudar hoy?",
    },
  ]);
  const [textoInput, setTextoInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarBotonScroll, setMostrarBotonScroll] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- ESTADOS Y REFS PARA VOZ ---
  const [escuchando, setEscuchando] = useState(false);
  const [vozActivada, setVozActivada] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
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
        recognition.onerror = (event: any) => {
          console.error("Error de micrófono", event);
          setEscuchando(false);
        };
        recognition.onend = () => setEscuchando(false);
        
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleMicrofono = () => {
    if (escuchando) {
      recognitionRef.current?.stop();
    } else {
      setTextoInput("");
      recognitionRef.current?.start();
    }
  };

  const hablarTexto = (texto: string, forzar: boolean = false) => {
    if ((!vozActivada && !forzar) || typeof window === "undefined") return;
    
    window.speechSynthesis.cancel();
    
    // Limpiar texto para lectura
    const textoLimpio = texto
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .replace(/\[TICKET_FORM\]/g, "")
      .replace(/[*#_]/g, "");

    if (!textoLimpio.trim()) return;

    const utterance = new SpeechSynthesisUtterance(textoLimpio);
    utterance.lang = "es-MX";
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  // --- CARGAR HISTORIAL AL INICIAR ---
  useEffect(() => {
    const historialGuardado = localStorage.getItem("balum_historial");
    if (historialGuardado) {
      try {
        setMensajes(JSON.parse(historialGuardado));
      } catch (e) {
        console.error("Error leyendo historial", e);
      }
    }
  }, []);

  // --- GUARDAR HISTORIAL CADA VEZ QUE CAMBIE ---
  useEffect(() => {
    // Solo guardamos si hay más del mensaje de bienvenida inicial
    if (mensajes.length > 1) {
      localStorage.setItem("balum_historial", JSON.stringify(mensajes));
    }
  }, [mensajes]);

  const borrarHistorial = () => {
    localStorage.removeItem("balum_historial");
    setMensajes([
      {
        id: "bienvenida",
        remitente: "balum",
        texto:
          "¡Hola! Soy **Balum**. He borrado nuestro historial de conversación. ¿En qué te puedo ayudar hoy?",
      },
    ]);
  };

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
    setMostrarBotonScroll(distanciaAlFondo > 120);
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
    setMensajes((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, feedback: rating } : msg))
    );
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, feedback: rating }),
      });
    } catch (e) {
      console.warn("No se pudo registrar el feedback:", e);
    }
  };

  const enviarMensaje = async (textoForzado?: string) => {
    const textoFinal = textoForzado !== undefined ? textoForzado : textoInput;
    if (cargando || !textoFinal.trim()) return;

    const pregunta = textoFinal.trim();
    const nuevoUsuario: Mensaje = {
      id: Date.now().toString(),
      texto: pregunta,
      remitente: "usuario",
    };

    const nuevosMensajes = [...mensajes, nuevoUsuario];
    setMensajes(nuevosMensajes);
    setTextoInput("");
    setCargando(true);

    const idBot = (Date.now() + 1).toString();
    setMensajes((prev) => [
      ...prev,
      { id: idBot, texto: "", remitente: "balum", fuentes: [] },
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: nuevosMensajes.map((m) => ({
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
                  if (parsed.sources) {
                    fuentesIdentificadas = parsed.sources;
                  }
                  if (parsed.text) {
                    acumulado += parsed.text;
                  }

                  setMensajes((prev) =>
                    prev.map((msg) =>
                      msg.id === idBot
                        ? { ...msg, texto: acumulado, fuentes: fuentesIdentificadas }
                        : msg
                    )
                  );
                } catch {
                  // chunk incompleto
                }
              }
            }
          }
        }
      }

      // 4. HABLAR EL TEXTO FINAL
      if (acumulado && !abortControllerRef.current?.signal.aborted) {
        hablarTexto(acumulado);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMensajes((prev) =>
          prev.map((msg) =>
            msg.id === idBot
              ? {
                  ...msg,
                  texto:
                    err.message || "Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.",
                }
              : msg
          )
        );
      }
    } finally {
      setCargando(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white overflow-hidden select-text">
      {/* CABECERA EXACTA DE LA VERSIÓN 1 */}
      <header className="bg-[#1b396a] pt-4 pb-4 px-6 shadow-md flex items-center justify-between z-10 select-none">
        {/* Avatar Circular de Balum */}
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-blue-300 shadow-sm shrink-0 relative">
          <Image
            src="/icon.png"
            alt="Balum Jaguar"
            width={48}
            height={48}
            className="w-full h-full object-cover"
            priority
          />
        </div>

        {/* Títulos Centrales */}
        <div className="flex-1 flex flex-col items-center px-3 text-center">
          <h1 className="text-white text-xl sm:text-2xl font-extrabold tracking-tight">
            Chatea con Balum
          </h1>
          <p className="text-blue-200 text-[10px] uppercase font-bold tracking-widest mt-0.5">
            Instituto Tecnológico de Villahermosa
          </p>
        </div>

        {/* Botón Admin y Logo ITVH a la derecha */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/10"
            title="Panel de Administración ITVH"
          >
            <Shield className="w-4 h-4 text-blue-200" />
          </Link>
          <a 
            href="https://sws.villahermosa.tecnm.mx" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-12 h-14 flex items-center justify-center overflow-hidden shrink-0 relative cursor-pointer"
          >
            <Image
              src="/logo-itvh.png"
              alt="Logo ITVH"
              width={48}
              height={56}
              className="w-full h-full object-contain"
              priority
            />
          </a>
        </div>
      </header>

      {/* ÁREA CENTRAL DE MENSAJES (FLATLIST EN REACT) */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 max-w-3xl mx-auto w-full relative"
      >
        <div className="flex justify-center gap-3 mb-4">
          <button
            onClick={() => {
              setVozActivada(!vozActivada);
              if (vozActivada) window.speechSynthesis.cancel();
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors shadow-sm ${
              vozActivada ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title={vozActivada ? "Desactivar voz de Balum" : "Activar voz de Balum"}
          >
            {vozActivada ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {vozActivada ? "Balum te habla" : "Voz desactivada"}
          </button>
          
          {mensajes.length > 1 && (
            <button
              onClick={borrarHistorial}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-xs font-medium transition-colors shadow-sm"
              title="Borrar conversación"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Borrar historial
            </button>
          )}
        </div>

        {mensajes.length === 1 && (
          <div className="flex flex-col items-center justify-center gap-3 mt-6 mb-8 w-full max-w-md mx-auto">
            <h3 className="text-gray-500 text-sm font-medium mb-1">Puedes preguntarme cosas como:</h3>
            <button
              onClick={() => enviarMensaje("¿Cuáles son los requisitos para liberar el Servicio Social?")}
              className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors shadow-sm text-sm text-gray-700 font-medium"
            >
              📋 Requisitos para Servicio Social
            </button>
            <button
              onClick={() => enviarMensaje("¿Cuándo son las fechas de reinscripción?")}
              className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors shadow-sm text-sm text-gray-700 font-medium"
            >
              📅 Fechas de Reinscripción
            </button>
            <button
              onClick={() => enviarMensaje("¿Qué opciones de titulación ofrece el ITVH?")}
              className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors shadow-sm text-sm text-gray-700 font-medium"
            >
              🎓 Opciones de Titulación
            </button>
          </div>
        )}

        {mensajes.map((item) => {
          const esUsuario = item.remitente === "usuario";
          // Separar posibles bloques <think>
          const partes = item.texto.split(/(<think>[\s\S]*?<\/think>|<think>[\s\S]*)/g);

          return (
            <div
              key={item.id}
              className={`flex flex-col ${esUsuario ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] p-4 rounded-3xl shadow-sm leading-relaxed ${
                  esUsuario
                    ? "bg-indigo-50 rounded-tr-sm border border-indigo-100 text-[#312e81]"
                    : "bg-white rounded-tl-sm border border-gray-100 text-gray-800"
                }`}
              >
                {!item.texto && !esUsuario && cargando ? (
                  <div className="flex items-center gap-3 p-1">
                    <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                    <span className="text-indigo-400 text-sm italic font-medium">
                      Balum está procesando tu pregunta...
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
                        className="text-[15px] sm:text-[16px] leading-[24px] space-y-2 prose prose-sm max-w-none text-inherit"
                      >
                        <ReactMarkdown>{finalTexto}</ReactMarkdown>
                        {hasTicket && <FormularioTicket />}
                        {sugerencias.length > 0 && !cargando && (
                          <div className="flex flex-col gap-2 mt-4 pt-2">
                            {sugerencias.map((sug, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => enviarMensaje(sug)}
                                className="text-left bg-indigo-50/50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 px-3 py-2 rounded-lg text-sm transition-colors shadow-sm w-fit"
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

                {/* Fuentes oficiales consultadas (14 PDFs) */}
                {item.fuentes && item.fuentes.length > 0 && (
                  <div className="pt-2.5 mt-2 border-t border-gray-100 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                    <FileText className="w-3.5 h-3.5 text-[#1b396a]" />
                    <span className="font-semibold text-gray-600">Fuente oficial:</span>
                    {item.fuentes.map((f, i) => (
                      <span
                        key={i}
                        className="bg-blue-50 text-[#1b396a] border border-blue-200 px-2 py-0.5 rounded-md font-mono text-[10px]"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                {/* Botones de acción */}
                {item.texto && (
                  <div className="flex justify-end items-center gap-2 mt-2 pt-1 border-t border-gray-100/60">
                    {!esUsuario && (
                      <div className="flex items-center gap-1 mr-auto">
                        <button
                          type="button"
                          onClick={() => calificarMensaje(item.id, "up")}
                          className={`p-1 rounded-md transition-colors ${item.feedback === "up" ? "bg-green-100 text-green-700" : "text-gray-400 hover:text-green-600 hover:bg-gray-100"}`}
                          title="Buena respuesta"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => calificarMensaje(item.id, "down")}
                          className={`p-1 rounded-md transition-colors ${item.feedback === "down" ? "bg-red-100 text-red-700" : "text-gray-400 hover:text-red-600 hover:bg-gray-100"}`}
                          title="Mala respuesta"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {!esUsuario && (
                      <button
                        type="button"
                        onClick={() => hablarTexto(item.texto, true)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100"
                        title="Escuchar mensaje"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Escuchar</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => copiarTexto(item.id, item.texto)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${
                        esUsuario
                          ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      title="Copiar mensaje"
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
            className="fixed bottom-24 right-6 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all z-20"
            title="Ir al final"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* BARRA INFERIOR DE ENTRADA IDÉNTICA A LA VERSIÓN 1 */}
      <div className="px-4 py-3 bg-white border-t border-gray-100 w-full max-w-3xl mx-auto flex items-end gap-2 shrink-0">
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
          placeholder={cargando ? "Espera o detén a Balum..." : "Escribe tu pregunta..."}
          disabled={cargando}
          className={`flex-1 min-h-[48px] max-h-[140px] py-3 px-5 rounded-2xl text-[15px] outline-none transition-all resize-none ${
            cargando
              ? "bg-gray-50 text-gray-400 placeholder:text-gray-400"
              : "bg-gray-100 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-300 border border-transparent focus:border-indigo-400"
          }`}
        />

        <button
          type="button"
          onClick={toggleMicrofono}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all shrink-0 ${
            escuchando ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
          title="Dictar por voz"
        >
          <Mic className="w-5 h-5" />
        </button>

        {cargando ? (
          <button
            type="button"
            onClick={detenerGeneracion}
            className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform shrink-0"
            title="Detener respuesta"
          >
            <Square className="w-5 h-5 text-white fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => enviarMensaje()}
            disabled={!textoInput.trim()}
            className="w-12 h-12 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0"
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4 text-white ml-0.5" />
          </button>
        )}
      </div>
    </div>
  );
}
