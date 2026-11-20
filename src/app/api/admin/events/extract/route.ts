import { NextRequest, NextResponse } from "next/server";
import { genAI } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const categoriaSugerida = (formData.get("categoria") as string) || "auto";

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ninguna imagen o flyer" },
        { status: 400 }
      );
    }

    const mimeType = file.type || "image/jpeg";
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json(
        { error: "El archivo debe ser una imagen válida (.png, .jpg, .webp)" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const hoyISO = new Date().toISOString().split("T")[0];
    const anioActual = new Date().getFullYear();

    const prompt = `Eres un asistente analista de documentos del Instituto Tecnológico de Villahermosa (ITVH).
Fecha actual de referencia: ${hoyISO} (Año: ${anioActual}).
Categoría sugerida: ${categoriaSugerida}.

Examina minuciosamente la imagen proporcionada (puede ser un cartel de un foro/conferencia, o un comunicado oficial como una jornada de vacunación, aviso de salud, convocatoria o campaña).

Debes extraer TODA la información y generar ÚNICAMENTE un objeto JSON válido con esta estructura:

{
  "titulo": "Título claro del evento o comunicado (ej. 'Foro de Emprendedores 2026' o 'Jornada Nacional de Vacunación')",
  "categoria": "evento", // "evento" (si es conferencia/plática/taller) o "comunicado" (si es jornada de salud, aviso, suspensión, etc.)
  "tipo": "conferencia", // Opciones: "conferencia", "taller", "curso", "jornada_salud", "aviso", "convocatoria", "otro"
  "carrera_destino": "General", // "Ingeniería en Sistemas Computacionales", "Ingeniería en Gestión", "General", etc.
  "fecha_evento": "YYYY-MM-DD", // Fecha principal o inicio de vigencia (formato AAAA-MM-DD). Si solo hay día y mes, usa ${anioActual}.
  "hora_evento": "10:00 AM", // Horario o rango de atención (ej. '09:00 AM a 02:00 PM')
  "lugar": "Lugar específico (ej. Auditorio Principal, Plaza Cívica, Módulo de Enfermería, etc.)",
  "ponente": "Expositor, facilitador o dependencia responsable (ej. 'Secretaría de Salud / ITVH')",
  "enlace_registro": "", // Enlace de registro, QR o correo si aparece (o cadena vacía)
  "descripcion": "Resumen conciso y claro de lo que trata el evento o campaña.",
  "contenido_markdown": "# TITULO DEL COMUNICADO U OFICIO\\n\\n**Objetivo / Descripción:** ...\\n\\n### Requisitos y Qué Llevar:\\n- Requisito 1...\\n\\n### Fechas y Horarios de Atención:\\n- ...\\n\\n### Ubicación / Módulo:\\n- ...\\n\\n### Dirigido a:\\n- ..." // Texto completo estructurado en Markdown limpio y profesional, ideal para la IA y para generar un PDF oficial.
}

REGLAS ESTRICTAS:
1. Responde SOLAMENTE con el objeto JSON válido. NO uses bloques de texto fuera del JSON.
2. Extrae todos los detalles visibles (requisitos, cartillas de salud si es vacunación, dosis, sedes, etc.) en el campo 'contenido_markdown'.
3. En 'contenido_markdown', redacta en tono institucional formal, declarativo y conciso. NO uses preguntas informales (ej. en vez de '¿Qué llevar?', pon 'Requisitos y Documentación Solicitada'). NO incluyas etiquetas de imágenes ni enlaces de imagen locales.`;

    // Modelos modernos compatibles (gemini-3.5-flash-lite como prioritario por alta disponibilidad)
    const modelos = ["gemini-3.5-flash-lite", "gemini-3.5-flash"];
    let respuestaTexto = "";
    let errorCapturado: any = null;

    for (const modelName of modelos) {
      for (let intento = 1; intento <= 2; intento++) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          });

          const result = await model.generateContent([
            prompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
          ]);

          respuestaTexto = result.response.text();
          if (respuestaTexto) break;
        } catch (err: any) {
          errorCapturado = err;
          console.warn(`Intento ${intento} con ${modelName} falló:`, err.message || err);
          await new Promise((r) => setTimeout(r, 600));
        }
      }
      if (respuestaTexto) break;
    }

    if (!respuestaTexto) {
      throw errorCapturado || new Error("No se pudo obtener respuesta del modelo de visión de Gemini.");
    }

    let jsonLimpio = respuestaTexto.trim();
    if (jsonLimpio.startsWith("```")) {
      jsonLimpio = jsonLimpio.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const datosExtraidos = JSON.parse(jsonLimpio);

    return NextResponse.json({
      success: true,
      data: datosExtraidos,
    });
  } catch (error: any) {
    console.error("Error en /api/admin/events/extract:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar la imagen con Gemini Vision." },
      { status: 500 }
    );
  }
}
