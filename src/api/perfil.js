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

function parseServiceXml(responseText) {
  const parser = new DOMParser();
  let xml = parser.parseFromString(responseText, 'text/xml');

  if (xml.querySelector('parsererror')) {
    throw new Error('El servicio devolvió una respuesta inválida.');
  }

  // ASMX puede devolver el XML directamente o serializado dentro de <string>.
  if (!xml.querySelector('row, datos, estatus, status')) {
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

async function requestProfileService(method, { params = {}, signal, includeSession = true } = {}) {
  const credentials = getSessionCredentials();
  const requestParams = includeSession
    ? { ...credentials, ...params }
    : { ...params, sTk: credentials.sTk };

  const response = await fetch(`${CONSTRULEADS_WS_BASE_URL}/${method}`, {
    method: 'POST',
    body: new URLSearchParams(requestParams),
    signal,
  });

  if (!response.ok) {
    throw new Error(`No fue posible consultar el perfil (HTTP ${response.status}).`);
  }

  return parseServiceXml(await response.text());
}

const nodeText = (node, tagName) =>
  node?.getElementsByTagName(tagName)[0]?.textContent?.trim() || '';

function readValue(node, names) {
  if (!node) return '';

  for (const name of names) {
    const attribute = Array.from(node.attributes || [])
      .find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (attribute?.value?.trim()) return attribute.value.trim();

    const element = Array.from(node.getElementsByTagName('*'))
      .find((item) => item.localName?.toLowerCase() === name.toLowerCase());
    if (element?.textContent?.trim()) return element.textContent.trim();
  }

  return '';
}

function readServiceResult(xml) {
  const node = xml.getElementsByTagName('row')[0]
    || xml.getElementsByTagName('datos')[0]
    || xml.documentElement;

  return {
    status: readValue(node, ['estatus', 'status']),
    message: readValue(node, ['mensaje', 'message', 'msg_accesos']),
    userId: readValue(node, ['id_usuario', 'id_usua']),
  };
}

function ensureSuccessfulResult(result, fallbackMessage) {
  if (result.status && result.status !== '1') {
    throw new Error(result.message || fallbackMessage);
  }
  return result;
}

const splitKeys = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

export async function obtenerDisponibilidadLicencias({ signal } = {}) {
  const xml = await requestProfileService('ws_cl_nusuario', { signal });
  const result = readServiceResult(xml);

  if (!result.status) {
    throw new Error('No fue posible validar las licencias disponibles.');
  }

  return {
    canCreate: result.status === '1',
    status: result.status,
    message: result.message,
  };
}

export async function obtenerUsuariosAdministrador({ signal } = {}) {
  const xml = await requestProfileService('ws_cl_usuarios', { signal });
  return Array.from(xml.getElementsByTagName('datos')).map((node) => {
    const firstName = nodeText(node, 'nombre');
    const paternalName = nodeText(node, 'paterno');
    const maternalName = nodeText(node, 'materno');
    const status = nodeText(node, 'estatus');

    return {
      id: nodeText(node, 'id_usuario'),
      userId: nodeText(node, 'id_usuario'),
      firstName,
      paternalName,
      maternalName,
      name: [firstName, paternalName, maternalName].filter(Boolean).join(' '),
      email: nodeText(node, 'correo'),
      phone: nodeText(node, 'telefono'),
      group: nodeText(node, 'grupo'),
      status: status === '1' ? 'Activo' : 'Suspendido',
      statusCode: status,
    };
  });
}

export async function guardarUsuarioAdministrador({
  userId = '', operation, firstName, paternalName, maternalName, phone, email, group,
} = {}) {
  const xml = await requestProfileService('ws_cl_gusuario', {
    params: {
      sId_usua: String(userId || ''),
      sOperacion: String(operation),
      sNombre: String(firstName || '').trim(),
      sPaterno: String(paternalName || '').trim(),
      sMaterno: String(maternalName || '').trim(),
      sTelefono: String(phone || '').trim(),
      sCorreo: String(email || '').trim(),
      sGrupo: String(group || '').trim(),
    },
  });

  return ensureSuccessfulResult(readServiceResult(xml), 'No fue posible guardar el usuario.');
}

export async function cambiarEstadoUsuario({ userId } = {}) {
  const xml = await requestProfileService('ws_cl_suspender', {
    params: { sId_usua: String(userId || '') },
  });

  return ensureSuccessfulResult(readServiceResult(xml), 'No fue posible cambiar el estado del usuario.');
}

export async function obtenerPerfilUsuario({ userId, signal } = {}) {
  const xml = await requestProfileService('ws_cl_datos_perfil_usuario', {
    includeSession: false,
    params: { sId_usuario: String(userId || '') },
    signal,
  });
  const node = xml.getElementsByTagName('datos')[0];

  return {
    zonas: splitKeys(nodeText(node, 'ubicacion')),
    tiposObra: splitKeys(nodeText(node, 'tipo_obra')),
    etapas: splitKeys(nodeText(node, 'etapa')),
    sectores: splitKeys(nodeText(node, 'sector')),
    desarrollos: splitKeys(nodeText(node, 'desarrollo')),
  };
}

export async function guardarPerfilUsuario({ userId, access } = {}) {
  const xml = await requestProfileService('ws_cl_perfilar_usuario', {
    params: {
      sId_usuario: String(userId || ''),
      sUbicacion: (access?.zonas || []).join(','),
      sTipo_obra: (access?.tiposObra || []).join(','),
      sEtapa: (access?.etapas || []).join(','),
      sSector: (access?.sectores || []).join(','),
      sDesarrollo: (access?.desarrollos || []).join(','),
    },
  });

  return ensureSuccessfulResult(readServiceResult(xml), 'No fue posible guardar el perfil del usuario.');
}
