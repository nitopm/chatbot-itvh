import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    // 1. Obtener todas las consultas registradas
    const { data: consultas, error: errConsultas } = await supabase
      .from("registro_consultas")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    // 2. Obtener todos los tickets
    const { data: tickets, error: errTickets } = await supabase
      .from("tickets_soporte")
      .select("*")
      .order("created_at", { ascending: false });

    // 3. Obtener documentos
    const { data: docRows } = await supabase
      .from("documentos_itvh")
      .select("fuente");

    const docMap: { [key: string]: number } = {};
    docRows?.forEach((r: { fuente: string }) => {
      docMap[r.fuente] = (docMap[r.fuente] || 0) + 1;
    });

    const totalDocs = Object.keys(docMap).length;

    const listaConsultas = consultas || [];
    const listaTickets = tickets || [];

    const ahora = new Date();
    const unaSemanaAtras = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const unMesAtras = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);

    let consultasSemana = 0;
    let consultasMes = 0;
    let likes = 0;
    let dislikes = 0;
    let totalTokens = 0;

    listaConsultas.forEach((c) => {
      const fecha = new Date(c.created_at);
      if (fecha >= unaSemanaAtras) consultasSemana++;
      if (fecha >= unMesAtras) consultasMes++;
      if (c.feedback === "up") likes++;
      if (c.feedback === "down") dislikes++;
      totalTokens += c.tokens_estimados || 0;
    });

    // Costo estimado Gemini 2.0 Flash (aprox $0.10 USD por 1M tokens)
    // Tasa de cambio aproximada: $1 USD = $20 MXN
    const costoUsd = (totalTokens / 1_000_000) * 0.15;
    const costoMxn = costoUsd * 20.0;

    // Conteo de preguntas repetitivas o frecuentes
    const freqMap: { [key: string]: { count: number; dislikes: number; likes: number } } = {};
    listaConsultas.forEach((c) => {
      const textoSimplificado = c.pregunta.trim().toLowerCase();
      if (!freqMap[textoSimplificado]) {
        freqMap[textoSimplificado] = { count: 0, dislikes: 0, likes: 0 };
      }
      freqMap[textoSimplificado].count++;
      if (c.feedback === "down") freqMap[textoSimplificado].dislikes++;
      if (c.feedback === "up") freqMap[textoSimplificado].likes++;
    });

    const preguntasFrecuentes = Object.entries(freqMap)
      .map(([pregunta, stats]) => ({
        pregunta,
        veces: stats.count,
        likes: stats.likes,
        dislikes: stats.dislikes,
      }))
      .sort((a, b) => b.veces - a.veces)
      .slice(0, 10);

    return NextResponse.json({
      metricas: {
        totalConsultas: listaConsultas.length,
        consultasSemana,
        consultasMes,
        likes,
        dislikes,
        totalTokens,
        costoEstimado: {
          usd: costoUsd.toFixed(4),
          mxn: costoMxn.toFixed(2),
        },
        totalDocumentos: totalDocs,
        totalTickets: listaTickets.length,
        ticketsPendientes: listaTickets.filter((t) => t.estado === "pendiente").length,
      },
      preguntasFrecuentes,
      ultimasConsultas: listaConsultas.slice(0, 30),
      tickets: listaTickets,
    });
  } catch (error: any) {
    console.error("Error obteniendo estadísticas:", error);
    return NextResponse.json(
      { error: error.message || "Error al recopilar estadísticas" },
      { status: 500 }
    );
  }
}
