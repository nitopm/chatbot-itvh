import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { id, feedback } = await req.json();

    if (!id || !feedback || !["up", "down"].includes(feedback)) {
      return NextResponse.json({ error: "Datos de feedback inválidos" }, { status: 400 });
    }

    // Actualizar registro en la tabla registro_consultas si existe
    const { error } = await supabase
      .from("registro_consultas")
      .update({ feedback })
      .eq("id", id);

    if (error) {
      console.warn("Aviso feedback:", error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
