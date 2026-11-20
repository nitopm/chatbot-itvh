import { NextRequest, NextResponse } from "next/server";
import { genAI, generarEmbeddingPregunta } from "@/lib/gemini";
import { buscarContextoRelevante, supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Eres Balum, el asistente virtual oficial y amigable del Instituto Tecnológico de Villahermosa (ITVH).

REGLAS ESTRICTAS:
1. Responde directamente a la pregunta usando la información oficial del ITVH. Si el usuario te saluda, salúdalo amablemente presentándote como Balum, asistente del ITVH.
2. NUNCA uses frases como "Según el texto", "El documento menciona" o "Aquí tienes la respuesta". Habla con naturalidad, empatía y autoridad institucional.
3. REGLA DE INFERENCIA: Si un estudiante pregunta por "requisitos", "cómo hacer" o "información" sobre un trámite (como Servicio Social, Residencias Profesionales, Reinscripción, Bajas, etc.) de forma general, DEBES ASUMIR que busca los requisitos para INICIAR o DAR DE ALTA el trámite. Solo habla de finalización o liberación si el estudiante usa explícitamente esas palabras.
4. Si la información contiene varios pasos o requisitos, organízalos claramente usando listas con viñetas y formato Markdown limpio (negritas para títulos).
5. IMPORTANTE: Siempre debes basar tu respuesta en los textos proporcionados.
6. Si el estudiante pregunta por fechas, correos, extensiones o códigos que estén en el texto, proporciónalos con precisión.
7. SI NO TIENES LA INFORMACIÓN EXACTA en los textos proporcionados (ej. estatus de becas, calificaciones personales, o algo no mencionado), discúlpate amablemente y agrega EXACTAMENTE esta etiqueta al final de tu respuesta: [TICKET_FORM]
   Esto activará automáticamente un formulario para enviarlo a Control Escolar. NUNCA inventes información.
8. SUGERENCIAS DE SEGUIMIENTO: Siempre, al final de tu respuesta, debes escribir 2 o 3 preguntas relacionadas que el estudiante podría querer hacer a continuación. Usa EXACTAMENTE este formato: 
   [SUGERENCIA_1: ¿Pregunta relacionada 1?] 
   [SUGERENCIA_2: ¿Pregunta relacionada 2?]
9. Si el estudiante pregunta por eventos, pláticas, conferencias, talleres o actividades culturales/académicas del tecnológico, utiliza la CARTELERA DE EVENTOS Y CONFERENCIAS PRÓXIMAS. Proporciona fecha, hora, lugar, ponente y carrera a la que va dirigida de forma clara y entusiasta.
10. Si el estudiante solicita el archivo oficial, PDF descargable o formato para imprimir (Servicio Social, Residencias, etc.), infórmale amablemente que puede consultarlo y descargarlo directamente en el botón de Google Drive oficial que aparece al pie de tu respuesta (gestionado por balumitvh@gmail.com).
`;

// Función para generar contenido con Gemini 3.5 Flash Lite y fallback
async function generarRespuestaConFallback(prompt: string) {
  const modelosCandidatos = ["gemini-3.5-flash-lite", "gemini-3.5-flash"];

  let ultimoError: any = null;

  for (const nombreModelo of modelosCandidatos) {
    for (let intento = 1; intento <= 2; intento++) {
      try {
        const model = genAI.getGenerativeModel(
          {
            model: nombreModelo,
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
            },
          },
          { apiVersion: "v1beta" }
        );

        const stream = await model.generateContentStream(prompt);
        return stream;
      } catch (err: any) {
        ultimoError = err;
        console.warn(`Intento ${intento} con ${nombreModelo} fallo:`, err.message || err);
        // Esperar brevemente antes de reintentar si el servidor de Google está saturado (503)
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }

  throw ultimoError || new Error("Los servidores de Gemini están experimentando alta demanda momentánea. Por favor intenta en unos segundos.");
}

// --- RATE LIMITING EN MEMORIA ---
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userData = rateLimitMap.get(ip);

  if (!userData) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }

  if (now - userData.lastReset > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }

  if (userData.count >= MAX_REQUESTS) {
    return false;
  }

  userData.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "IP_DESCONOCIDA";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Has alcanzado el límite de seguridad de 10 mensajes por minuto. Por favor, espera unos segundos antes de enviar otra consulta." },
        { status: 429 }
      );
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de mensajes" },
        { status: 400 }
      );
    }

    const ultimoMensaje = messages[messages.length - 1];
    const preguntaTexto = ultimoMensaje.content;

    // 1. Obtener embedding y buscar en Supabase
    let contextoEncontrado = "No se encontraron documentos oficiales específicos.";
    let fuentesEncontradas: string[] = [];

    const embeddingPregunta = await generarEmbeddingPregunta(preguntaTexto);

    if (embeddingPregunta.length > 0) {
      const fragmentos = await buscarContextoRelevante(embeddingPregunta, 3, 0.25);
      if (fragmentos.length > 0) {
        contextoEncontrado = fragmentos
          .map((f) => `[DOCUMENTO: ${f.fuente}]\n${f.contenido}`)
          .join("\n\n---\n\n");
        fuentesEncontradas = Array.from(new Set(fragmentos.map((f) => f.fuente)));
      }
    }

    // 2. Consultar eventos y conferencias vigentes en Supabase
    let contextoEventos = "";
    try {
      const hoyISO = new Date().toISOString().split("T")[0];
      const { data: eventosActivos } = await supabase
        .from("eventos_itvh")
        .select("titulo, tipo, carrera_destino, fecha_evento, hora_evento, lugar, ponente, descripcion, enlace_registro")
        .eq("activo", true)
        .gte("fecha_evento", hoyISO)
        .order("fecha_evento", { ascending: true })
        .limit(6);

      if (eventosActivos && eventosActivos.length > 0) {
        contextoEventos = eventosActivos
          .map(
            (ev) =>
              `- [${ev.tipo?.toUpperCase() || "EVENTO"}] "${ev.titulo}": Fecha: ${ev.fecha_evento?.split("T")[0]} ${ev.hora_evento ? `a las ${ev.hora_evento}` : ""}. Lugar: ${ev.lugar || "Campus ITVH"}. Ponente: ${ev.ponente || "Por confirmar"}. Dirigido a: ${ev.carrera_destino || "General"}. Descripción: ${ev.descripcion || ""}. ${ev.enlace_registro ? `Registro: ${ev.enlace_registro}` : ""}`
          )
          .join("\n");
      }
    } catch (e) {
      // Ignorar si la tabla aún no existe para no romper el chat
    }

    // 3. Historial compacto
    const historialCompacto = messages
      .slice(-3, -1)
      .map((m: { role: string; content: string }) => `${m.role === "user" ? "Estudiante" : "Balum"}: ${m.content}`)
      .join("\n");

    const fechaHoyFormato = new Date().toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const promptFinal = `FECHA ACTUAL: ${fechaHoyFormato}

INFORMACIÓN OFICIAL DEL ITVH:
---
${contextoEncontrado}
---
${contextoEventos ? `CARTELERA DE EVENTOS Y CONFERENCIAS PRÓXIMAS EN EL ITVH:\n---\n${contextoEventos}\n---\n` : ""}
${historialCompacto ? `HISTORIAL RECIENTE:\n${historialCompacto}\n` : ""}
PREGUNTA DEL ESTUDIANTE: ${preguntaTexto}

RESPUESTA DE BALUM:`;

    // 4. Streaming con Gemini resiliente (con auto-reintento y fallback)
    const result = await generarRespuestaConFallback(promptFinal);
    const mensajeId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    let textoCompletoAcumulado = "";

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        // Enviar metadatos iniciales (id del mensaje y fuentes)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ id: mensajeId, sources: fuentesEncontradas })}\n\n`
          )
        );

        try {
          for await (const chunk of result.stream) {
            const texto = chunk.text();
            if (texto) {
              textoCompletoAcumulado += texto;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: texto })}\n\n`)
              );
            }
          }

          // Guardar registro de la consulta en Supabase de forma asíncrona para métricas del Admin
          try {
            const tokensEstimados = Math.ceil((promptFinal.length + textoCompletoAcumulado.length) / 4);
            const tieneTicket = textoCompletoAcumulado.includes("[TICKET_FORM]");

            supabase.from("registro_consultas").insert([
              {
                id: mensajeId,
                pregunta: preguntaTexto,
                respuesta: textoCompletoAcumulado.slice(0, 2000), // Guardar resumen/respuesta
                tokens_estimados: tokensEstimados,
                fuentes_usadas: fuentesEncontradas.join(", "),
                tiene_ticket: tieneTicket,
                created_at: new Date().toISOString(),
              },
            ]).then(() => {}).catch((e: any) => console.warn("Aviso guardando consulta:", e.message));
          } catch (e) {
            // Ignorar errores en guardado secundario
          }

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (streamError) {
          console.error("Error en streaming:", streamError);
          controller.error(streamError);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Error en /api/chat:", error);
    const mensaje = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
