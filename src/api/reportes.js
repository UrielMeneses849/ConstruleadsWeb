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
    if (import.meta.env.DEV) {
      console.debug('[reportes] Respuesta XML sin nodo row:', responseText);
    }
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

export function iniciarDescargaReporte(fileUrl) {
  // TODO: mover esta descarga a un proxy backend para ocultar la URL final.
  const anchor = document.createElement('a');
  anchor.href = fileUrl;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
