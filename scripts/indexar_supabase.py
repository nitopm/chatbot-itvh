import os
import time
from pathlib import Path
from pypdf import PdfReader
from google import genai
from supabase import create_client, Client
from dotenv import load_dotenv

# Cargar .env desde la raíz del proyecto o desde la carpeta balum-web
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("NEXT_PUBLIC_GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not GEMINI_API_KEY or not SUPABASE_URL or not SUPABASE_KEY:
    print("\n[ERROR] Faltan variables de entorno.")
    exit(1)

# Inicializar clientes
client_gemini = genai.Client(api_key=GEMINI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def parse_pdf_con_vision(ruta_pdf: Path) -> str:
    """
    [FASE 2] Lectura Avanzada:
    En lugar de usar pypdf que destruye las tablas, esto sube el archivo a Gemini File API
    y utiliza Gemini 1.5 Pro (Visión) para leer perfectamente tablas, calendarios y diagramas 
    como Markdown estructurado.
    """
    print(f"Subiendo {ruta_pdf.name} a Gemini para OCR avanzado...")
    uploaded_file = client_gemini.files.upload(file=str(ruta_pdf))
    
    prompt = "Eres un experto procesando documentos. Transcribe este PDF a texto Markdown. Si encuentras tablas, mantenlas perfectamente estructuradas en Markdown. Si encuentras un diagrama, descríbelo."
    
    response = client_gemini.models.generate_content(
        model='gemini-1.5-pro',
        contents=[uploaded_file, prompt]
    )
    return response.text

# Buscar PDFs
DIR_ACTUAL = Path(__file__).resolve().parent.parent
DIR_DOCS = DIR_ACTUAL / "docs"
if not DIR_DOCS.exists() or not list(DIR_DOCS.glob("*.pdf")):
    DIR_DOCS = DIR_ACTUAL.parent / "balum_back-main" / "documentos_itvh"

print(f"Buscando PDFs en: {DIR_DOCS}")

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def procesar_e_indexar():
    archivos = list(DIR_DOCS.glob("*.pdf"))
    if not archivos:
        print(f"No se encontraron PDFs")
        return

    print(f"Limpiando registros previos en Supabase...")
    try:
        supabase.table("documentos_itvh").delete().neq("id", 0).execute()
        print("Tabla anterior reiniciada.")
    except Exception as e:
        print("Nota: ", e)

    total_chunks = 0
    for pdf_path in archivos:
        nombre_archivo = pdf_path.name
        print(f"\nProcesando: {nombre_archivo}...")
        try:
            reader = PdfReader(str(pdf_path))
            full_text = ""
            for i, page in enumerate(reader.pages):
                contenido_pagina = page.extract_text() or ""
                full_text += f"\n[Pagina {i+1}]\n" + contenido_pagina
            
            if not full_text.strip():
                continue

            chunks = chunk_text(full_text)
            print(f"  Dividido en {len(chunks)} fragmentos.")

            registros = []
            for idx, chunk in enumerate(chunks):
                # Rate limit protection (15 RPM free tier = 1 every 4 secs)
                time.sleep(4.5)
                
                res = client_gemini.models.embed_content(
                    model="gemini-embedding-2",
                    contents=chunk,
                    config={"output_dimensionality": 768}
                )

                embedding = None
                if hasattr(res, "embedding") and res.embedding:
                    embedding = res.embedding.values
                elif hasattr(res, "embeddings") and res.embeddings:
                    embedding = res.embeddings[0].values

                if embedding:
                    registros.append({
                        "contenido": chunk.strip(),
                        "fuente": nombre_archivo,
                        "embedding": embedding
                    })

            if registros:
                supabase.table("documentos_itvh").insert(registros).execute()
                total_chunks += len(registros)
                print(f"  > {len(registros)} fragmentos subidos.")

        except Exception as err:
            print(f"  Error procesando {nombre_archivo}: {err}")

    print(f"\nEXITO TOTAL! Se indexaron {total_chunks} fragmentos.")

if __name__ == "__main__":
    procesar_e_indexar()
