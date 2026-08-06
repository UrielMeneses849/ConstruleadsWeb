import { CONSTRULEADS_TOKEN, CONSTRULEADS_WS_BASE_URL } from './obras.js';

function getSessionCredentials() {
  let user;
  try {
    user = JSON.parse(localStorage.getItem('construleadsUser') || '{}');
  } catch {
    user = {};
  }

  if (!user.idUsuario || !user.idSession) {
    throw new Error('La sesión del usuario no está disponible.');
  }

  return {
    sId_usuario: String(user.idUsuario),
    sId_session: String(user.idSession),
    sTk: CONSTRULEADS_TOKEN,
  };
}

async function requestProfileService(method, signal) {
  const response = await fetch(`${CONSTRULEADS_WS_BASE_URL}/${method}`, {
    method: 'POST',
    body: new URLSearchParams(getSessionCredentials()),
    signal,
  });

  if (!response.ok) {
    throw new Error(`No fue posible consultar el perfil (HTTP ${response.status}).`);
  }

  const responseText = await response.text();
  const parser = new DOMParser();
  let xml = parser.parseFromString(responseText, 'text/xml');

  if (xml.querySelector('parsererror')) {
    throw new Error('El servicio devolvió una respuesta inválida.');
  }

  // ASMX puede devolver el XML directamente o serializado dentro de <string>.
  if (!xml.querySelector('row, datos')) {
    const embeddedXml = xml.documentElement?.textContent?.trim();
    if (embeddedXml?.startsWith('<')) {
      xml = parser.parseFromString(embeddedXml, 'text/xml');
    }
  }

  if (xml.querySelector('parsererror')) {
    throw new Error('El servicio devolvió una respuesta inválida.');
  }

  return xml;
}

const nodeText = (node, tagName) =>
  node?.getElementsByTagName(tagName)[0]?.textContent?.trim() || '';

export async function validarUsuarioAdministrador({ signal } = {}) {
  const xml = await requestProfileService('ws_cl_nusuario', signal);
  const row = xml.getElementsByTagName('row')[0];

  if (!row) throw new Error('No fue posible validar los permisos de administrador.');

  const status = row.getAttribute('estatus') || row.getAttribute('Estatus') || '0';
  return {
    isAdmin: status === '1',
    status,
    message: row.getAttribute('mensaje') || row.getAttribute('Mensaje') || '',
  };
}

export async function obtenerUsuariosAdministrador({ signal } = {}) {
  const xml = await requestProfileService('ws_cl_usuarios', signal);
  return Array.from(xml.getElementsByTagName('datos')).map((node) => {
    const firstName = nodeText(node, 'nombre');
    const paternalName = nodeText(node, 'paterno');
    const maternalName = nodeText(node, 'materno');
    const status = nodeText(node, 'estatus');

    return {
      id: nodeText(node, 'id_usuario'),
      userId: nodeText(node, 'id_usuario'),
      name: [firstName, paternalName, maternalName].filter(Boolean).join(' '),
      email: nodeText(node, 'correo'),
      phone: nodeText(node, 'telefono'),
      company: nodeText(node, 'empresa'),
      status: status === '1' ? 'Activo' : 'Inactivo',
      statusCode: status,
      role: 'Usuario',
      access: {},
    };
  });
}
