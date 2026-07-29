import { CONSTRULEADS_TOKEN, CONSTRULEADS_WS_BASE_URL } from './obras.js';

export const REPORT_ENDPOINTS = {
  pdf_obras: 'ws_cl_pdf',
  excel_clasico: 'ws_cl_xclasico',
  excel_contactos: 'ws_cl_xcontactos',
  excel_mapa: 'ws_cl_xmapa',
  excel_prospeccion: 'ws_cl_xprospeccion',
};

export const DATE_TYPE_WS_MAP = {
  'Fecha de publicación': 'fecha de publicación',
  'Fecha de inicio probable': 'fecha de inicio',
  'Fecha de término probable': 'fecha de termino',
};

export const buildObrasKeys = (obras = []) =>
  [...new Set(
    obras
      .map((obra) => obra?.clave || obra?.Clave_Proyecto)
      .map((key) => String(key || '').trim())
      .filter(Boolean)
  )].join(',');

export function formatDateForWs(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function solicitarReporte({
  reportType,
  userId,
  sessionId,
  obrasKeys,
  dateType,
  dateMin,
  dateMax,
}) {
  const method = REPORT_ENDPOINTS[reportType];
  if (!method) throw new Error('El tipo de reporte seleccionado no es válido.');
  if (!userId || !sessionId) throw new Error('La sesión del usuario no está disponible.');
  if (!obrasKeys) throw new Error('No hay obras válidas para descargar.');

  const body = new URLSearchParams({
    sId_usuario: String(userId),
    sId_session: String(sessionId),
    sClave_obras: obrasKeys,
  });

  if (reportType !== 'pdf_obras') {
    if (!dateType) throw new Error('El criterio de fecha seleccionado no es válido.');
    if (!dateMin || !dateMax) {
      throw new Error('Selecciona una fecha Desde y una fecha Hasta válidas.');
    }
    body.set('sTipo_fecha', dateType);
    body.set('sFecha_min', dateMin);
    body.set('sFecha_max', dateMax);
  }
  body.set('sTk', CONSTRULEADS_TOKEN);

  const response = await fetch(`${CONSTRULEADS_WS_BASE_URL}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`No fue posible generar el reporte (HTTP ${response.status}).`);
  }

  const responseText = await response.text();
  const xml = new DOMParser().parseFromString(responseText, 'text/xml');
  const row = xml.getElementsByTagName('row')[0];

  if (!row) {
    throw new Error('El servicio devolvió una respuesta inválida.');
  }

  const status = row.getAttribute('Estatus') || row.getAttribute('estatus');
  const message =
    row.getAttribute('Mensaje') ||
    row.getAttribute('mensaje') ||
    '';
  const fileUrl =
    row.getAttribute('URL') ||
    row.getAttribute('Url') ||
    row.getAttribute('url') ||
    '';

  if (status !== '1' || !fileUrl) {
    throw new Error(message || 'No fue posible generar el reporte.');
  }

  return { fileUrl, message };
}

function getFilenameFromUrl(fileUrl, fallback = 'reporte') {
  try {
    const filename = decodeURIComponent(new URL(fileUrl).pathname.split('/').pop() || '');
    return filename || fallback;
  } catch {
    return fallback;
  }
}

function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function iniciarDescargaReporte(fileUrls, fallbackName = 'reporte') {
  const urls = Array.isArray(fileUrls) ? fileUrls : [fileUrls];
  const validUrls = urls.filter(Boolean);
  if (!validUrls.length) throw new Error('El reporte no tiene una URL de descarga válida.');

  let responses;
  try {
    responses = await Promise.all(validUrls.map(async (fileUrl) => {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`No fue posible descargar el archivo (HTTP ${response.status}).`);
      return response;
    }));
  } catch {
    if (validUrls.length === 1) {
      const popup = window.open(validUrls[0], '_blank', 'noopener,noreferrer');
      if (!popup) {
        throw new Error(
          'El navegador bloqueó la descarga. Habilita las ventanas emergentes para Construleads e inténtalo nuevamente.'
        );
      }
      return;
    }
    throw new Error(
      'El servidor debe habilitar CORS para unir y descargar directamente reportes de más de 1,000 obras.'
    );
  }

  if (responses.length === 1) {
    const blob = await responses[0].blob();
    const extension = blob.type.includes('pdf') ? '.pdf' : '';
    const filename = getFilenameFromUrl(validUrls[0], `${fallbackName}${extension}`);
    downloadBlob(blob, filename);
    return;
  }

  const { PDFDocument } = await import('pdf-lib');
  const mergedPdf = await PDFDocument.create();
  for (const response of responses) {
    const sourcePdf = await PDFDocument.load(await response.arrayBuffer());
    const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));
  }
  const pdfBytes = await mergedPdf.save();
  downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), `${fallbackName}.pdf`);
}

export async function solicitarFichaHtml({
  userId,
  sessionId,
  obraKey,
}) {
  if (!userId || !sessionId) throw new Error('La sesión del usuario no está disponible.');
  if (!obraKey) throw new Error('La obra seleccionada no tiene una clave válida.');

  const body = new URLSearchParams({
    sId_usuario: String(userId),
    sId_session: String(sessionId),
    sClave_obras: String(obraKey),
    sTk: CONSTRULEADS_TOKEN,
  });

  const response = await fetch(`${CONSTRULEADS_WS_BASE_URL}/ws_cl_html`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`No fue posible consultar la ficha (HTTP ${response.status}).`);
  }

  const responseText = await response.text();
  const xml = new DOMParser().parseFromString(responseText, 'text/xml');
  const row = xml.getElementsByTagName('row')[0];
  const status = row?.getAttribute('Estatus') || row?.getAttribute('estatus');
  const message = row?.getAttribute('Mensaje') || row?.getAttribute('mensaje') || '';
  const htmlUrl = row?.getAttribute('URL') || row?.getAttribute('Url') || row?.getAttribute('url') || '';

  if (status !== '1' || !htmlUrl) {
    throw new Error(message || 'El servicio no devolvió una ficha disponible.');
  }

  return { htmlUrl, message };
}
