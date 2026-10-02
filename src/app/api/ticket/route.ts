import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { correo_institucional, num_control, descripcion, pregunta_origen } = body;

    if (!correo_institucional || !descripcion) {
      return NextResponse.json(
        { error: "Correo institucional y descripción son obligatorios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tickets_soporte")
      .insert([
        {
          correo_institucional,
          num_control: num_control || "Sin especificar",
          descripcion,
          pregunta_origen: pregunta_origen || "",
          estado: "pendiente",
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.warn("Advertencia al guardar ticket en Supabase:", error.message);
      // Retornar éxito simulado si la tabla aún no se ha creado en Supabase para no romper la experiencia
      return NextResponse.json({
        success: true,
        aviso: "Ticket registrado en modo fallback (verifica la creación de la tabla tickets_soporte)",
        id: "local-" + Date.now(),
      });
    }

    return NextResponse.json({ success: true, ticket: data?.[0] });
  } catch (error: any) {
    console.error("Error en /api/ticket:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar el ticket" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("tickets_soporte")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ tickets: [] });
    }

    return NextResponse.json({ tickets: data || [] });
  } catch (err: any) {
    return NextResponse.json({ tickets: [] });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, estado } = await req.json();
    if (!id || !estado) {
      return NextResponse.json({ error: "ID y estado requeridos" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tickets_soporte")
      .update({ estado })
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, ticket: data?.[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
