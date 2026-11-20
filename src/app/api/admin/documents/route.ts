import { NextRequest, NextResponse } from "next/server";
import { genAI } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

// Función para dividir texto en fragmentos (chunks)
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = start + chunkSize;
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const customTitle = (formData.get("title") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo PDF" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "El archivo debe tener formato .pdf" }, { status: 400 });
    }

    const nombreArchivo = customTitle.trim() ? `${customTitle.trim()}.pdf` : file.name;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Usar Gemini 3.5 Flash Lite para extraer el contenido en Markdown estructurado
    const model = genAI.getGenerativeModel(
      { model: "gemini-3.5-flash-lite" },
      { apiVersion: "v1beta" }
    );
    const prompt = `Eres un extractor de documentos oficial del Instituto Tecnológico de Villahermosa (ITVH).
Lee y extrae todo el contenido de este documento PDF de forma exhaustiva, preservando fechas, requisitos, pasos, tablas y listas en formato Markdown limpio y claro.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: "application/pdf",
        },
      },
    ]);

    const textoExtraido = result.response.text();

    if (!textoExtraido || textoExtraido.trim().length === 0) {
      return NextResponse.json(
        { error: "No se pudo extraer texto del documento proporcionado." },
        { status: 422 }
      );
    }

    // Dividir en fragmentos para indexación vectorial
    const chunks = chunkText(textoExtraido, 1000, 200);
    const embeddingModel = genAI.getGenerativeModel(
      { model: "gemini-embedding-2" },
      { apiVersion: "v1beta" }
    );

    const registros = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const res = await embeddingModel.embedContent({
          content: { role: "user", parts: [{ text: chunk }] },
          // @ts-ignore
          outputDimensionality: 768,
        });

        if (res.embedding?.values) {
          registros.push({
            contenido: chunk.trim(),
            fuente: nombreArchivo,
            embedding: res.embedding.values,
          });
        }
      } catch (embErr) {
        console.error("Error generando embedding de fragmento:", embErr);
      }
    }

    if (registros.length === 0) {
      return NextResponse.json(
        { error: "Error al generar los vectores de embedding para el documento." },
        { status: 500 }
      );
    }

    // Guardar fragmentos vectorizados en Supabase
    const { error: insertError } = await supabase.from("documentos_itvh").insert(registros);

    if (insertError) {
      console.error("Error al insertar en Supabase documentos_itvh:", insertError);
      return NextResponse.json(
        { error: `Error en base de datos: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mensaje: `Documento "${nombreArchivo}" indexado con éxito en la base de datos de Balum.`,
      chunksCount: registros.length,
      nombreArchivo,
    });
  } catch (error: any) {
    console.error("Error en upload PDF:", error);
    return NextResponse.json(
      { error: error.message || "Error procesando el archivo PDF." },
      { status: 500 }
    );
  }
}

// Obtener lista de documentos actualmente indexados
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("documentos_itvh")
      .select("fuente")
      .order("fuente");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Agrupar fuentes únicas y contar fragmentos
    const docMap: { [key: string]: number } = {};
    data?.forEach((row: { fuente: string }) => {
      docMap[row.fuente] = (docMap[row.fuente] || 0) + 1;
    });

    const docs = Object.keys(docMap).map((fuente) => ({
      fuente,
      chunks: docMap[fuente],
    }));

    return NextResponse.json({ docs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Eliminar un documento de la base de conocimiento
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fuente = searchParams.get("fuente");

    if (!fuente) {
      return NextResponse.json({ error: "Parámetro 'fuente' es requerido" }, { status: 400 });
    }

    const { error } = await supabase
      .from("documentos_itvh")
      .delete()
      .eq("fuente", fuente);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, mensaje: `Documento ${fuente} eliminado con éxito.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
