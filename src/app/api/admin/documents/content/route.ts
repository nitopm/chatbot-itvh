import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { genAI } from "@/lib/gemini";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const CACHE_FILE = path.join(process.cwd(), "src", "data", "cache_formatted_docs.json");
const TMP_CACHE_FILE = path.join("/tmp", "cache_formatted_docs.json");

function leerCache(): Record<string, string> {
  const cache: Record<string, string> = {};
  try {
    if (fs.existsSync(CACHE_FILE)) {
      Object.assign(cache, JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")));
    }
  } catch (e) {}
  try {
    if (fs.existsSync(TMP_CACHE_FILE)) {
      Object.assign(cache, JSON.parse(fs.readFileSync(TMP_CACHE_FILE, "utf-8")));
    }
  } catch (e) {}
  return cache;
}

function guardarCache(cache: Record<string, string>) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
  } catch (e) {}
  try {
    fs.writeFileSync(TMP_CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
  } catch (e) {}
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fuente = searchParams.get("fuente");

    if (!fuente) {
      return NextResponse.json({ error: "Se requiere el parámetro 'fuente'" }, { status: 400 });
    }

    // 1. Revisar si ya está en caché formateado
    const cache = leerCache();
    if (cache[fuente] && cache[fuente].trim().length > 50) {
      return NextResponse.json({
        success: true,
        fuente,
        contenido: cache[fuente],
        cached: true,
      });
    }

    // 2. Obtener fragmentos desde Supabase
    const { data, error } = await supabase
      .from("documentos_itvh")
      .select("contenido")
      .eq("fuente", fuente);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: `No se encontró contenido para ${fuente}` }, { status: 404 });
    }

    // Deduplicar fragmentos y limpiar
    const fragmentosUnicos: string[] = [];
    const vistos = new Set<string>();
    for (const d of data) {
      const limpio = d.contenido.trim();
      const clave = limpio.slice(0, 80);
      if (!vistos.has(clave)) {
        vistos.add(clave);
        fragmentosUnicos.push(limpio);
      }
    }

    const textoBruto = fragmentosUnicos.join("\n\n");

    // 3. Formatear profesionalmente con Gemini 3.5 Flash Lite para que sea texto normativo formal
    let textoFormateado = textoBruto;
    try {
      const model = genAI.getGenerativeModel(
        { model: "gemini-3.5-flash-lite" },
        { apiVersion: "v1beta" }
      );
      const prompt = `Eres el redactor oficial de documentos normativos del Instituto Tecnológico de Villahermosa (ITVH).
Transforma este texto extraído de un archivo de trámite en un documento institucional oficial impecable, formal y conciso.

REGLAS ESTRICTAS:
1. Elimina preguntas informales (como ¿Qué es?, ¿Cuáles son los pasos?, ¿Qué pasa si...?). Redáctalo en tono normativo y declarativo formal en tercera persona.
2. Corrige palabras pegadas, caracteres rotos o artefactos de escaneo.
3. Estructura el contenido en secciones claras numeradas en mayúsculas (ej. I. DISPOSICIONES GENERALES, II. PERIODO Y PLAZOS OFICIALES, III. REQUISITOS Y CARGA ACADÉMICA MÍNIMA, IV. PROCEDIMIENTO DE SOLICITUD, V. RESTRICCIONES Y CASOS NO AUTORIZADOS, VI. AUTORIDADES RESPONSABLES).
4. No inventes ni elimines ningún dato crítico (fechas, semestres, números de créditos mínimos, departamentos o sistemas).
5. Usa párrafos justificados bien redactados y viñetas formales. No agregues saludos ni despedidas, solo el cuerpo normativo.

Texto a formalizar:
${textoBruto.slice(0, 15000)}`;

      const result = await model.generateContent(prompt);
      const outText = result.response.text();
      if (outText && outText.trim().length > 100) {
        textoFormateado = outText.trim();
        cache[fuente] = textoFormateado;
        guardarCache(cache);
      }
    } catch (aiErr: any) {
      console.warn("Aviso: no se pudo formatear con IA, usando fallback estructurado:", aiErr.message);
    }

    return NextResponse.json({
      success: true,
      fuente,
      contenido: textoFormateado,
      chunks: data.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al obtener contenido." }, { status: 500 });
  }
}
