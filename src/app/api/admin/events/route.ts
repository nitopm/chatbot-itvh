import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { genAI, generarEmbeddingPregunta } from "@/lib/gemini";

export const runtime = "nodejs";

// GET: Listar eventos registrados
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("eventos_itvh")
      .select("*")
      .order("fecha_evento", { ascending: false });

    if (error) {
      console.warn("Aviso al consultar eventos_itvh:", error.message);
      return NextResponse.json({
        success: true,
        eventos: [],
        aviso: "La tabla eventos_itvh aún no ha sido creada en Supabase.",
      });
    }

    return NextResponse.json({
      success: true,
      eventos: data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Registrar y publicar evento confirmado por el administrador
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      titulo,
      descripcion,
      tipo,
      carrera_destino,
      fecha_evento,
      hora_evento,
      lugar,
      ponente,
      enlace_registro,
      imagen_url,
      contenido_markdown,
    } = body;

    if (!titulo || !fecha_evento) {
      return NextResponse.json(
        { error: "Título y fecha del evento son requeridos" },
        { status: 400 }
      );
    }

    const textoDescripcionFinal = (contenido_markdown && contenido_markdown.trim().length > 0)
      ? contenido_markdown.trim()
      : (descripcion || "");

    // 1. Guardar en tabla relacional eventos_itvh
    const { data: eventoGuardado, error: errorBD } = await supabase
      .from("eventos_itvh")
      .insert([
        {
          titulo,
          descripcion: textoDescripcionFinal,
          tipo: tipo || "conferencia",
          carrera_destino: carrera_destino || "General",
          fecha_evento: new Date(fecha_evento).toISOString(),
          hora_evento: hora_evento || "",
          lugar: lugar || "Campus ITVH",
          ponente: ponente || "Por confirmar",
          enlace_registro: enlace_registro || "",
          imagen_url: imagen_url || "",
          activo: true,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (errorBD) {
      console.error("Error guardando en eventos_itvh:", errorBD);
      return NextResponse.json(
        {
          error:
            "No se pudo guardar en Supabase. Verifica que hayas ejecutado el script setup_eventos_table.sql en el SQL Editor.",
          detalle: errorBD.message,
        },
        { status: 500 }
      );
    }

    // 2. Indexar semánticamente en documentos_itvh (pgvector) con Markdown estructurado para que Balum lo aprenda al instante
    try {
      const { categoria, contenido_markdown } = body;
      const prefijoFuente = categoria === "comunicado" ? "COMUNICADO: " : "EVENTO: ";
      
      const textoFinalRAG = contenido_markdown && contenido_markdown.trim().length > 30
        ? contenido_markdown.trim()
        : `[${categoria === "comunicado" ? "COMUNICADO OFICIAL ITVH" : "EVENTO / CONFERENCIA ITVH"}: ${titulo.toUpperCase()}]
Tipo: ${tipo || "General"}
Fecha: ${fecha_evento} ${hora_evento ? `a las ${hora_evento}` : ""}
Lugar o Módulo: ${lugar || "Campus ITVH"}
Responsable o Ponente: ${ponente || "Por confirmar"}
Dirigido a: ${carrera_destino || "Toda la comunidad estudiantil"}
Detalles y Resumen: ${descripcion || "Sin descripción adicional"}
${enlace_registro ? `Enlace / Registro: ${enlace_registro}` : ""}`;

      const embedding = await generarEmbeddingPregunta(textoFinalRAG);

      if (embedding && embedding.length > 0) {
        await supabase.from("documentos_itvh").insert([
          {
            contenido: textoFinalRAG,
            fuente: `${prefijoFuente}${titulo}`,
            embedding: embedding,
          },
        ]);
      }
    } catch (ragErr: any) {
      console.warn("Aviso indexando evento en base vectorial:", ragErr.message);
    }

    return NextResponse.json({
      success: true,
      evento: eventoGuardado?.[0],
      mensaje: "¡Evento registrado y publicado exitosamente en la memoria de Balum!",
    });
  } catch (error: any) {
    console.error("Error en POST /api/admin/events:", error);
    return NextResponse.json(
      { error: error.message || "Error al registrar el evento" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar o dar de baja un evento
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Se requiere el ID del evento" }, { status: 400 });
    }

    const { error } = await supabase.from("eventos_itvh").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
