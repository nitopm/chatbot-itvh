/**
 * Generador de Documentos Oficiales en PDF para el Instituto Tecnológico de Villahermosa
 * Cumple con el estándar oficial del TecNM (Educación, TecNM, ITVH, Tabla, Pie Margarita Maza 2026 y repetición en cada hoja)
 */

export interface ParametrosDocumentoOficial {
  titulo: string;
  subtitulo?: string;
  categoria?: "evento" | "comunicado" | "tramite" | "documento";
  tipo?: string;
  folio?: string;
  fecha?: string;
  hora?: string;
  lugar?: string;
  ponente?: string;
  destinatarios?: string;
  enlace?: string;
  imagenUrl?: string | null;
  contenidoMarkdown?: string;
  tablaDatos?: Array<{
    folio?: string;
    periodo?: string;
    tipoActividad?: string;
    proyectoLugar?: string;
    detalle?: string;
    creditos?: string;
  }>;
}

/**
 * Convierte Markdown a texto HTML institucional formal.
 * Transforma preguntas informales, limpia artefactos y produce párrafos justificados y viñetas profesionales.
 */
function formatearContenidoInstitucionalHtml(raw: string): string {
  if (!raw || !raw.trim()) return "";

  // 1. Limpieza de artefactos de escaneo y encabezados repetidos
  let texto = raw
    .replace(/\[Pagina\s*\d+\]/gi, "")
    .replace(/\[Página\s*\d+\]/gi, "")
    .replace(/---/g, "")
    .trim();

  const lineas = texto.split("\n");
  let resultadoHtml = "";
  let enLista = false;

  for (let i = 0; i < lineas.length; i++) {
    let linea = lineas[i].trim();
    if (!linea) {
      if (enLista) {
        resultadoHtml += "</ul>";
        enLista = false;
      }
      continue;
    }

    // Detectar viñetas
    if (linea.startsWith("•") || linea.startsWith("- ") || linea.startsWith("* ")) {
      if (!enLista) {
        resultadoHtml += '<ul class="lista-oficial">';
        enLista = true;
      }
      const itemTxt = linea.replace(/^[•\-\*]\s*/, "");
      resultadoHtml += `<li>${limpiarTextoEnriquecido(itemTxt)}</li>`;
      continue;
    }

    if (enLista) {
      resultadoHtml += "</ul>";
      enLista = false;
    }

    // Detectar si la línea es un subtítulo (empieza con ##, ### o números romanos I., II., o palabras clave en mayúsculas)
    const esEncabezadoMarkdown = /^#+\s+/.test(linea);
    if (esEncabezadoMarkdown) {
      linea = linea.replace(/^#+\s+/, "");
    }

    const esSubtituloRomano = /^(?:[I|V|X]+\.|\d+\.|\bDISPOSICIONES\b|\bREQUISITOS\b|\bPROCEDIMIENTO\b|\bRESTRICCIONES\b|\bAUTORIDADES\b|\bCALENDARIO\b|\bOBJETO\b)/i.test(linea);
    const esSubtituloCorto = (linea.length < 80 && linea.endsWith(":") && !linea.toLowerCase().startsWith("nota"));

    if (esEncabezadoMarkdown || esSubtituloRomano || esSubtituloCorto) {
      // Si el subtítulo tiene formato de pregunta (ej. ¿Qué materias no se pueden dar de baja?), convertirlo en declarativo formal
      let subtituloLimpio = linea.replace(/^¿/, "").replace(/\?$/, "");
      if (subtituloLimpio.toLowerCase().startsWith("qué materias no se pueden") || subtituloLimpio.toLowerCase().startsWith("que materias no se pueden")) {
        subtituloLimpio = "Restricciones y Asignaturas No Autorizadas";
      } else if (subtituloLimpio.toLowerCase().startsWith("qué es") || subtituloLimpio.toLowerCase().startsWith("que es")) {
        subtituloLimpio = "Definición y Objeto del Trámite";
      } else if (subtituloLimpio.toLowerCase().startsWith("cómo solicitar") || subtituloLimpio.toLowerCase().startsWith("como solicitar") || subtituloLimpio.toLowerCase().startsWith("pasos para")) {
        subtituloLimpio = "Procedimiento Oficial de Solicitud";
      }

      resultadoHtml += `<div class="subtitulo-seccion">${limpiarTextoEnriquecido(subtituloLimpio)}</div>`;
    } else {
      resultadoHtml += `<p class="parrafo-oficial">${limpiarTextoEnriquecido(linea)}</p>`;
    }
  }

  if (enLista) {
    resultadoHtml += "</ul>";
  }

  return resultadoHtml;
}

function limpiarTextoEnriquecido(txt: string): string {
  return txt
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<strong>$1</strong>");
}

export function generarHtmlPlantillaOficial(params: ParametrosDocumentoOficial, origin: string = ""): string {
  const headerImgUrl = `${origin}/oficial_header_clean.png`;
  const footerImgUrl = `${origin}/oficial_footer_clean.png`;

  const fechaActual = new Date();
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  const diaStr = String(fechaActual.getDate()).padStart(2, "0");
  const mesStr = meses[fechaActual.getMonth()];
  const anioStr = String(fechaActual.getFullYear());

  const folioFinal = params.folio || `ITVH-${anioStr}-${Math.floor(10000 + Math.random() * 90000)}`;
  const fechaEventoFinal = params.fecha?.includes("T") ? params.fecha.split("T")[0] : params.fecha || `${diaStr}/${mesStr}/${anioStr}`;

  // Filas para la tabla formal estándar
  const filasTabla = params.tablaDatos && params.tablaDatos.length > 0 ? params.tablaDatos : [
    {
      folio: folioFinal.replace("ITVH-", ""),
      periodo: `${mesStr.substring(0, 3).toUpperCase()}-${anioStr}`,
      tipoActividad: params.tipo ? params.tipo.toUpperCase() : (params.categoria === "comunicado" ? "COMUNICADO OFICIAL" : "LINEAMIENTOS INSTITUCIONALES"),
      proyectoLugar: params.lugar || "CAMPUS ITVH",
      detalle: params.ponente || params.destinatarios || "Comunidad Tecnológica",
      creditos: params.hora || "Vigente",
    }
  ];

  const cuerpoDetallesHtml = formatearContenidoInstitucionalHtml(params.contenidoMarkdown || params.subtitulo || "");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${params.titulo} - ITVH Oficial</title>
  <style>
    @page {
      size: letter;
      margin: 10mm 15mm 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: Arial, 'Segoe UI', Helvetica, sans-serif;
      margin: 0;
      padding: 20px 25px;
      color: #000000;
      background: #ffffff;
      line-height: 1.5;
      font-size: 11.5px;
      max-width: 820px;
      margin: 0 auto;
    }

    /* BARRA FLOTANTE DE CONTROL (NO SE IMPRIME) */
    .no-print {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1b396a;
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 8px;
      margin-bottom: 25px;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .no-print button {
      background: #b2945b;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .no-print button:hover {
      background: #967a42;
    }

    /* TABLA MAESTRA DE PAGINACIÓN: HACE QUE ENCABEZADO Y PIE SE REPITAN EN CADA PÁGINA */
    table.tabla-layout-impresion {
      width: 100%;
      border-collapse: collapse;
      border: none;
      margin: 0;
      padding: 0;
    }
    table.tabla-layout-impresion > thead {
      display: table-header-group;
    }
    table.tabla-layout-impresion > tfoot {
      display: table-footer-group;
    }
    table.tabla-layout-impresion > thead > tr > th,
    table.tabla-layout-impresion > tfoot > tr > td,
    table.tabla-layout-impresion > tbody > tr > td {
      border: none;
      padding: 0;
      font-weight: normal;
      background: transparent;
    }

    /* ENCABEZADO MEMBRETE OFICIAL (EN TODAS LAS HOJAS) */
    .header-box {
      width: 100%;
      text-align: center;
      padding-bottom: 12px;
      margin-bottom: 15px;
    }
    .header-img {
      width: 100%;
      max-width: 760px;
      height: auto;
      display: block;
      margin: 0 auto;
    }

    /* TÍTULO PRINCIPAL */
    .doc-titulo {
      text-align: center;
      font-size: 15px;
      font-weight: bold;
      color: #000000;
      margin: 18px 0 22px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* DIRIGIDO A */
    .a-quien {
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 14px;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* PÁRRAFO DE DECLARACIÓN OFICIAL */
    .parrafo-consta {
      text-align: justify;
      font-size: 11.5px;
      line-height: 1.6;
      margin-bottom: 18px;
      color: #111111;
    }

    /* TABLA OFICIAL ESTÁNDAR */
    .tabla-oficial {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000000;
      margin: 16px 0 22px 0;
      font-size: 10.5px;
    }
    .tabla-oficial th {
      border: 1px solid #000000;
      padding: 6px 8px;
      background: #ffffff;
      font-weight: bold;
      text-align: center;
      color: #000000;
      vertical-align: middle;
    }
    .tabla-oficial td {
      border: 1px solid #000000;
      padding: 6px 8px;
      text-align: center;
      vertical-align: middle;
      color: #000000;
    }
    .tabla-oficial td.text-left {
      text-align: left;
    }

    /* IMAGEN O CARTEL DEL EVENTO (COLOCADA EN MEDIO) */
    .flyer-box {
      text-align: center;
      margin: 18px 0 24px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .flyer-img {
      max-width: 85%;
      max-height: 340px;
      object-fit: contain;
      border: 1px solid #dddddd;
      border-radius: 4px;
      display: block;
      margin: 0 auto;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }
    .flyer-caption {
      font-size: 9.5px;
      color: #555555;
      margin-top: 5px;
      font-style: italic;
    }

    /* SECCIÓN DE ESPECIFICACIONES Y LINEAMIENTOS (TOTALMENTE CONGRUENTE CON EL DOCUMENTO) */
    .seccion-detalles {
      margin-top: 15px;
    }
    .subtitulo-seccion {
      font-size: 12px;
      font-weight: bold;
      color: #1b396a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 18px 0 8px 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
      page-break-after: avoid;
      break-after: avoid;
    }
    .parrafo-oficial {
      font-size: 11.5px;
      line-height: 1.6;
      text-align: justify;
      margin: 0 0 10px 0;
      color: #111111;
    }
    .lista-oficial {
      margin: 0 0 14px 20px;
      padding: 0;
      font-size: 11.5px;
      line-height: 1.55;
      color: #111111;
    }
    .lista-oficial li {
      margin-bottom: 6px;
      text-align: justify;
    }

    /* BLOQUE DE CIERRE (SOLO EN LA ÚLTIMA PÁGINA) */
    .bloque-cierre {
      margin-top: 30px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .fecha-extension {
      text-align: justify;
      margin: 20px 0 30px 0;
      font-size: 11.5px;
      line-height: 1.5;
    }
    .atentamente-titulo {
      font-weight: bold;
      letter-spacing: 1px;
      font-size: 12px;
      margin-bottom: 2px;
    }
    .atentamente-lemas {
      font-style: italic;
      font-size: 11px;
      color: #111111;
      line-height: 1.4;
      margin-bottom: 45px;
    }
    .firma-linea {
      margin-bottom: 20px;
    }
    .firma-cargo {
      font-weight: bold;
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .firma-institucion {
      font-size: 11px;
      text-transform: uppercase;
      color: #333333;
    }
    .ccp-box {
      font-size: 10px;
      color: #333333;
      margin-top: 15px;
      line-height: 1.35;
    }

    /* PIE DE PÁGINA MEMBRETE OFICIAL (EN TODAS LAS HOJAS) */
    .footer-box {
      width: 100%;
      text-align: center;
      padding-top: 14px;
      margin-top: 15px;
    }
    .footer-img {
      width: 100%;
      max-width: 760px;
      height: auto;
      display: block;
      margin: 0 auto;
    }

    @media print {
      body {
        padding: 0;
        font-size: 11px;
      }
      .no-print {
        display: none !important;
      }
      .flyer-img {
        max-height: 280px;
      }
      .bloque-cierre {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <span>Documento Oficial ITVH preparado para imprimir o guardar como PDF.</span>
    <button onclick="window.print()">
      🖨️ Imprimir / Guardar como PDF
    </button>
  </div>

  <!-- TABLA DE MAQUETACIÓN MULTI-PÁGINA -->
  <table class="tabla-layout-impresion">
    <thead>
      <tr>
        <th>
          <div class="header-box">
            <img src="${headerImgUrl}" alt="Membrete Oficial ITVH - Educación - TecNM" class="header-img" />
          </div>
        </th>
      </tr>
    </thead>

    <tbody>
      <tr>
        <td>
          <div class="cuerpo-principal">
            <!-- TÍTULO DEL DOCUMENTO -->
            <div class="doc-titulo">${params.titulo}</div>

            <!-- DIRIGIDO A -->
            <div class="a-quien">A QUIEN CORRESPONDA</div>

            <!-- TEXTO DECLARATORIO OFICIAL -->
            <div class="parrafo-consta">
              El Instituto Tecnológico de Villahermosa, a través de sus áreas académicas y administrativas correspondientes, hace constar e informa a la comunidad estudiantil y a los interesados sobre los lineamientos, programación y especificaciones del presente comunicado oficial:
            </div>

            <!-- TABLA OFICIAL ESTÁNDAR -->
            <table class="tabla-oficial">
              <thead>
                <tr>
                  <th style="width: 12%;">Folio</th>
                  <th style="width: 18%;">Periodo / Fecha</th>
                  <th style="width: 32%;">Tipo de actividad / Trámite</th>
                  <th style="width: 22%;">Proyecto / Lugar</th>
                  <th style="width: 16%;">Estatus / Horario</th>
                </tr>
              </thead>
              <tbody>
                ${filasTabla.map(fila => `
                  <tr>
                    <td><strong>${fila.folio || folioFinal.replace("ITVH-", "")}</strong></td>
                    <td>${fila.periodo || fechaEventoFinal}</td>
                    <td class="text-left"><strong>${fila.tipoActividad || params.tipo || "ACTIVIDAD INSTITUCIONAL"}</strong></td>
                    <td>${fila.proyectoLugar || params.lugar || "CAMPUS ITVH"}</td>
                    <td>${fila.creditos || params.hora || "OFICIAL"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>

            <!-- FLYER / INFOGRAFÍA EN LA PARTE MEDIA (SI EXISTE) -->
            ${params.imagenUrl ? `
              <div class="flyer-box">
                <img src="${params.imagenUrl}" alt="Cartel / Infografía Oficial Adjunta" class="flyer-img" />
                <div class="flyer-caption">Cartel / Infografía Oficial Publicada</div>
              </div>
            ` : ""}

            <!-- ESPECIFICACIONES Y LINEAMIENTOS EN FORMATO CONGRUENTE Y FORMAL -->
            ${cuerpoDetallesHtml ? `
              <div class="seccion-detalles">
                ${cuerpoDetallesHtml}
              </div>
            ` : ""}

            <!-- BLOQUE DE CIERRE (ÚLTIMA PÁGINA) -->
            <div class="bloque-cierre">
              <div class="fecha-extension">
                Se extiende la presente en la ciudad de Villahermosa, Tabasco a los ${diaStr} días del mes de ${mesStr} de ${anioStr}.
              </div>

              <div class="atentamente-box">
                <div class="atentamente-titulo">A T E N T A M E N T E</div>
                <div class="atentamente-lemas">
                  <em>Excelencia en Educación Tecnológica®</em><br />
                  <em>Tierra, Tiempo, Trabajo y Tecnología®</em>
                </div>

                <div class="firma-linea">
                  <div class="firma-cargo">DIRECCIÓN / COMITÉ INSTITUCIONAL</div>
                  <div class="firma-institucion">INSTITUTO TECNOLÓGICO DE VILLAHERMOSA</div>
                </div>

                <div class="ccp-box">
                  C.c.p. Interesado(a).<br />
                  C.c.p. Archivo.
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </tbody>

    <tfoot>
      <tr>
        <td>
          <div class="footer-box">
            <img src="${footerImgUrl}" alt="Pie de Página Oficial ITVH 2026" class="footer-img" />
          </div>
        </td>
      </tr>
    </tfoot>
  </table>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;
}
