import { CONSTRULEADS_TOKEN, CONSTRULEADS_WS_BASE_URL } from './obras';

async function obtenerIpPublica() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    if (!response.ok) return '';
    const data = await response.json();
    return String(data?.ip || '').trim();
  } catch {
    return '';
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function obtenerFilaRespuesta(xmlText) {
  const parser = new DOMParser();
  const document = parser.parseFromString(String(xmlText || ''), 'text/xml');
  let row = document.querySelector('row');

  // Algunos servicios ASMX envuelven el XML real dentro de un nodo <string>.
  if (!row) {
    const nestedXml = document.documentElement?.textContent?.trim();
    if (nestedXml?.startsWith('<')) {
      row = parser.parseFromString(nestedXml, 'text/xml').querySelector('row');
    }
  }

  return row;
}

export async function enviarContacto({ nombre, empresa, correo, telefono, interes, comentarios }) {
  const ip = await obtenerIpPublica();
  const body = new URLSearchParams({
    sNombre: nombre.trim(),
    sEmpresa: empresa.trim(),
    sCorreo: correo.trim(),
    sTelefono: telefono.trim(),
    sInteres: interes.trim(),
    sComentarios: comentarios.trim(),
    sIP: ip,
    sTk: CONSTRULEADS_TOKEN,
  });

  const response = await fetch(`${CONSTRULEADS_WS_BASE_URL}/ws_cl_contacto`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`El servicio de contacto respondió con HTTP ${response.status}.`);
  }

  const xmlText = await response.text();
  const row = obtenerFilaRespuesta(xmlText);
  const estatus = row?.getAttribute('estatus');
  const mensaje = row?.getAttribute('mensaje') || row?.getAttribute('msg') || '';

  if (estatus !== '1') {
    throw new Error(mensaje || 'El servicio no confirmó el envío de la solicitud.');
  }

  return { estatus, mensaje };
}
