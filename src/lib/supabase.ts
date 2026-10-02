import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://dummy-url.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "dummy-key";

if (!supabaseUrl || !supabaseKey) {
  console.warn("Advertencia: Las credenciales de Supabase no están completas en las variables de entorno.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface DocumentoMatch {
  id: number;
  contenido: string;
  fuente: string;
  similarity: number;
}

/**
 * Busca los fragmentos más relevantes de los 14 PDFs en Supabase usando pgvector.
 */
export async function buscarContextoRelevante(
  embedding: number[],
  limite: number = 4,
  umbralSimilitud: number = 0.35
): Promise<DocumentoMatch[]> {
  try {
    const { data, error } = await supabase.rpc("buscar_documentos", {
      query_embedding: embedding,
      match_threshold: umbralSimilitud,
      match_count: limite,
    });

    if (error) {
      console.error("Error en RPC buscar_documentos:", error);
      return [];
    }

    return (data as DocumentoMatch[]) || [];
  } catch (err) {
    console.error("Error consultando Supabase:", err);
    return [];
  }
}
