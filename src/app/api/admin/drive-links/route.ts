import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const DATA_FILE = path.join(process.cwd(), "src", "data", "drive_links.json");
const TMP_FILE = path.join("/tmp", "drive_links.json");

function leerEnlaces(): Record<string, string> {
  const enlaces: Record<string, string> = {};
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      Object.assign(enlaces, JSON.parse(data));
    }
  } catch (err) {}
  try {
    if (fs.existsSync(TMP_FILE)) {
      const data = fs.readFileSync(TMP_FILE, "utf-8");
      Object.assign(enlaces, JSON.parse(data));
    }
  } catch (err) {}
  return enlaces;
}

function guardarEnlaces(links: Record<string, string>): boolean {
  let guardado = false;
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(links, null, 2), "utf-8");
    guardado = true;
  } catch (err) {
    // Read-only filesystem in Vercel serverless
  }
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(links, null, 2), "utf-8");
    guardado = true;
  } catch (err) {}
  return guardado;
}

// GET: Obtener todos los enlaces de Drive configurados
export async function GET() {
  const links = leerEnlaces();
  return NextResponse.json({ success: true, links });
}

// POST: Actualizar o agregar enlace de Drive para un documento específico
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fuente, enlace } = body;

    if (!fuente || !enlace) {
      return NextResponse.json(
        { error: "Se requiere el nombre del documento ('fuente') y el 'enlace' de Drive." },
        { status: 400 }
      );
    }

    const links = leerEnlaces();
    
    // Normalizar clave (con o sin .pdf)
    const clave = fuente.trim();
    links[clave] = enlace.trim();
    if (clave.endsWith(".pdf")) {
      links[clave.replace(".pdf", "")] = enlace.trim();
    } else {
      links[`${clave}.pdf`] = enlace.trim();
    }

    const guardado = guardarEnlaces(links);
    if (!guardado) {
      return NextResponse.json({ error: "Error escribiendo en el archivo de enlaces." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mensaje: `Enlace de Drive para "${fuente}" guardado exitosamente.`,
      links,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error procesando petición." }, { status: 500 });
  }
}
