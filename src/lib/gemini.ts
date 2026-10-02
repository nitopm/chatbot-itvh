import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "dummy-key-for-build";

export const genAI = new GoogleGenerativeAI(apiKey);

// Modelo de embedding v1 oficial con 768 dimensiones
const embeddingModel = genAI.getGenerativeModel(
  { model: "gemini-embedding-2" },
  { apiVersion: "v1beta" }
);

/**
 * Genera el embedding de 768 dimensiones en milisegundos
 */
export async function generarEmbeddingPregunta(texto: string): Promise<number[]> {
  try {
    const res = await embeddingModel.embedContent({
      content: { role: "user", parts: [{ text: texto }] },
      // @ts-ignore
      outputDimensionality: 768,
    });

    if (res.embedding?.values) {
      return res.embedding.values;
    }
    return [];
  } catch (error) {
    console.error("Error al generar embedding:", error);
    return [];
  }
}
