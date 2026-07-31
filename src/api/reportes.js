import { CONSTRULEADS_TOKEN, CONSTRULEADS_WS_BASE_URL } from './obras.js';

export const REPORT_ENDPOINTS = {
  pdf_obras: 'ws_cl_pdf',
  pdf_companias: 'ws_cl_pdf_cias',
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
  signal,
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

  const isPdfService = reportType === 'pdf_obras' || reportType === 'pdf_companias';
  if (!isPdfService) {
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
    signal,
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

function downloadWithHiddenFrame(fileUrl) {
  const iframe = document.createElement('iframe');
  iframe.src = fileUrl;
  iframe.title = 'Descarga de reporte';
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), 60000);
}

async function readResponseBlob(response, onProgress) {
  const contentLength = Number(response.headers.get('content-length')) || 0;
  const reader = response.body?.getReader?.();

  if (!reader || !contentLength) {
    const blob = await response.blob();
    onProgress?.(100);
    return blob;
  }

  const chunks = [];
  let receivedLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedLength += value.length;
    onProgress?.(Math.min(100, Math.round((receivedLength / contentLength) * 100)));
  }

  return new Blob(chunks, {
    type: response.headers.get('content-type') || 'application/octet-stream',
  });
}

export async function iniciarDescargaReporte(
  fileUrls,
  fallbackName = 'reporte',
  onProgress,
  signal
) {
  const urls = Array.isArray(fileUrls) ? fileUrls : [fileUrls];
  const validUrls = urls.filter(Boolean);
  if (!validUrls.length) throw new Error('El reporte no tiene una URL de descarga válida.');

  let responses;
  try {
    responses = await Promise.all(validUrls.map(async (fileUrl) => {
      const response = await fetch(fileUrl, { signal });
      if (!response.ok) throw new Error(`No fue posible descargar el archivo (HTTP ${response.status}).`);
      return response;
    }));
  } catch {
    if (signal?.aborted) {
      throw new DOMException('La descarga fue cancelada.', 'AbortError');
    }
    if (validUrls.length === 1) {
      downloadWithHiddenFrame(validUrls[0]);
      onProgress?.(100);
      return { usedHiddenFrame: true };
    }
    throw new Error(
      'El servidor debe habilitar CORS o proporcionar un proxy de descarga para unir varios PDF.'
    );
  }

  if (responses.length === 1) {
    const blob = await readResponseBlob(responses[0], onProgress);
    const extension = blob.type.includes('pdf') ? '.pdf' : '';
    const filename = getFilenameFromUrl(validUrls[0], `${fallbackName}${extension}`);
    downloadBlob(blob, filename);
    return;
  }

  const { PDFDocument } = await import('pdf-lib');
  const mergedPdf = await PDFDocument.create();
  for (let index = 0; index < responses.length; index += 1) {
    if (signal?.aborted) {
      throw new DOMException('La descarga fue cancelada.', 'AbortError');
    }
    const response = responses[index];
    const blob = await readResponseBlob(response, (responseProgress) => {
      const aggregateProgress = ((index + responseProgress / 100) / responses.length) * 100;
      onProgress?.(Math.round(aggregateProgress));
    });
    const sourcePdf = await PDFDocument.load(await blob.arrayBuffer());
    const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));
  }
  const pdfBytes = await mergedPdf.save();
  downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), `${fallbackName}.pdf`);
}

export async function solicitarFichaDatos({ userId, sessionId, obraKey, signal }) {
  if (!userId || !sessionId) throw new Error('La sesión del usuario no está disponible.');
  if (!obraKey) throw new Error('La obra seleccionada no tiene una clave válida.');

  const body = new URLSearchParams({
    sId_usuario: String(userId),
    sId_session: String(sessionId),
    sClave_obras: String(obraKey),
    sTk: CONSTRULEADS_TOKEN,
  });
  const response = await fetch(`${CONSTRULEADS_WS_BASE_URL}/ws_cl_sobrasficha`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    signal,
  });

  if (!response.ok) {
    throw new Error(`No fue posible consultar la ficha (HTTP ${response.status}).`);
  }

  const responseText = await response.text();
  const xml = new DOMParser().parseFromString(responseText, 'text/xml');
  if (xml.querySelector('parsererror')) {
    throw new Error('El servicio devolvió una ficha con formato inválido.');
  }

  const serviceRow = xml.getElementsByTagName('row')[0];
  const serviceMessage = serviceRow?.getAttribute('Mensaje') || serviceRow?.getAttribute('mensaje') || '';
  const obraNode = xml.getElementsByTagName('OBRAS')[0];
  if (!obraNode) throw new Error(serviceMessage || 'No se encontró la ficha solicitada.');

  const text = (node, tag) => node?.getElementsByTagName(tag)[0]?.textContent?.trim() || '';
  const fields = {
    proy_clave: 'proy_clave', proy_nombre: 'proy_descripcioncorta',
    proy_fechacierre: 'proy_fechacierre',
    proy_tipoproyectodescripcion: 'proy_tipoproyectodescripcion',
    proy_fecha_inicio: 'proy_fechainicio', proy_fecha_fin: 'proy_fechatermino',
    proy_localizacion: 'proy_localizacion', proy_inversion: 'proy_inversion',
    proy_etapa: 'proy_etapa', esta_descripcion: 'esta_descripcion',
    muni_descripcion: 'muni_descripcion', sector: 'proy_sectordescripcion',
    tipo_obra: 'tiob_descripcion', subgenero: 'suge_descripcion',
    genero: 'gene_descripcion', desa_descripcion: 'desa_descripcion',
    descripcion: 'proy_descripcionlarga', acabados: 'acabados',
    observaciones: 'observaciones', descripcionextra: 'descripcionextra',
    superficie: 'proy_superficie_construida', caracteristicas: 'caracteristicas',
    actualizacion: 'actualizacion', concurso: 'concurso',
  };
  const obra = Object.fromEntries(
    Object.entries(fields).map(([key, tag]) => [key, text(obraNode, tag)])
  );
  obra.cias_normalizadas = Array.from(obraNode.getElementsByTagName('CIA')).map((company) => ({
    nombre: text(company, 'comp_razon_social'),
    rol: text(company, 'roco_descripcion'),
    direccion: text(company, 'sucu_calle'),
    telefono1: text(company, 'sucu_telefono1'),
    telefono2: text(company, 'sucu_telefono2'),
    telefono3: text(company, 'sucu_telefono3'),
    contactos: Array.from(company.getElementsByTagName('CONTACTO')).map((contact) => ({
      puesto: text(contact, 'cont_puesto'),
      nombre: [text(contact, 'cont_nombre'), text(contact, 'cont_paterno'), text(contact, 'cont_materno')]
        .filter(Boolean).join(' '),
      email: text(contact, 'cont_email'),
    })),
  }));

  return obra;
}
