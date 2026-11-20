/**
 * Enlaces Oficiales de Google Drive para los Documentos de Balum ITVH
 * Cuenta institucional gestora: balumitvh@gmail.com
 */

// Carpeta principal de Google Drive de Balum ITVH
export const GOOGLE_DRIVE_CARPETA_OFICIAL = "https://drive.google.com/drive/folders/1BalumITVH_Oficial";

// Mapa predeterminado de documentos oficiales a sus enlaces de Drive
export const ENLACES_DOCUMENTOS_DRIVE: Record<string, string> = {
  "servicio_social.pdf": "https://drive.google.com/drive/search?q=servicio_social",
  "residencia.pdf": "https://drive.google.com/drive/search?q=residencia",
  "reinscripcion.pdf": "https://drive.google.com/drive/search?q=reinscripcion",
  "baja_materias.pdf": "https://drive.google.com/drive/search?q=baja_materias",
  "baja_temporal.pdf": "https://drive.google.com/drive/search?q=baja_temporal",
  "cambio_carrera.pdf": "https://drive.google.com/drive/search?q=cambio_carrera",
  "complementarias.pdf": "https://drive.google.com/drive/search?q=complementarias",
  "credencial.pdf": "https://drive.google.com/drive/search?q=credencial",
  "cursos_verano.pdf": "https://drive.google.com/drive/search?q=cursos_verano",
  "directorio.pdf": "https://drive.google.com/drive/search?q=directorio",
  "educacion_dual.pdf": "https://drive.google.com/drive/search?q=educacion_dual",
  "inovacode.pdf": "https://drive.google.com/drive/search?q=inovacode",
  "justificante_inasistencia.pdf": "https://drive.google.com/drive/search?q=justificante",
  "liberacion_ingles.pdf": "https://drive.google.com/drive/search?q=liberacion_ingles",
};

/**
 * Obtiene el enlace de Google Drive correspondiente a una fuente citada.
 * Permite pasar un mapa de enlaces personalizados configurados desde el panel admin.
 */
export function obtenerEnlaceDrive(
  fuente: string,
  enlacesDinamicos?: Record<string, string>
): string {
  const nombreLimpio = fuente.toLowerCase().trim();

  // 1. Revisar enlaces dinámicos pasados como parámetro
  if (enlacesDinamicos) {
    for (const [doc, enlace] of Object.entries(enlacesDinamicos)) {
      const docClean = doc.toLowerCase().replace(".pdf", "").trim();
      if (nombreLimpio.includes(docClean) || nombreLimpio === doc.toLowerCase()) {
        if (enlace && enlace.trim().length > 0) return enlace.trim();
      }
    }
  }

  // 2. Revisar enlaces predeterminados
  for (const [doc, enlace] of Object.entries(ENLACES_DOCUMENTOS_DRIVE)) {
    const docClean = doc.toLowerCase().replace(".pdf", "").trim();
    if (nombreLimpio.includes(docClean) || nombreLimpio === doc.toLowerCase()) {
      return enlace;
    }
  }

  return GOOGLE_DRIVE_CARPETA_OFICIAL;
}
