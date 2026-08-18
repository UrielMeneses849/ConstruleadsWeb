import { CONSTRULEADS_TOKEN, CONSTRULEADS_WS_BASE_URL } from './obras';

function cleanText(value = '') {
  return String(value).trim();
}

function normalizeTagName(value = '') {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function nodeTagName(node) {
  return normalizeTagName(node?.localName || node?.nodeName);
}

function directChildrenByName(node, tagName) {
  const expectedName = normalizeTagName(tagName);
  return Array.from(node?.children || []).filter((child) => nodeTagName(child) === expectedName);
}

function firstDirectChild(node, tagName) {
  return directChildrenByName(node, tagName)[0] || null;
}

function directText(node, tagName) {
  return cleanText(firstDirectChild(node, tagName)?.textContent);
}

function parseXmlDocument(xmlText) {
  const parser = new DOMParser();
  const document = parser.parseFromString(String(xmlText || ''), 'text/xml');
  if (document.querySelector('parsererror')) {
    throw new Error('El servicio de compañías respondió con XML inválido.');
  }
  return document;
}

function unwrapAsmxPayload(xmlText) {
  const document = parseXmlDocument(xmlText);
  const rootName = nodeTagName(document.documentElement);
  const payload = cleanText(document.documentElement?.textContent);

  // Las respuestas de ASMX pueden devolver el XML directamente o dentro de un
  // nodo <string>. Normalizamos ambas variantes antes de recorrer el catálogo.
  if ((rootName === 'string' || rootName.endsWith('result')) && payload.startsWith('<')) {
    return payload;
  }

  return String(xmlText || '');
}

function buildAddress(companyNode) {
  const street = directText(companyNode, 'sucu_calle');
  const neighborhood = directText(companyNode, 'sucu_colonia');
  const postalCode = directText(companyNode, 'sucu_codigopostal');
  const state = directText(companyNode, 'sucu_esta_descripcion');
  const municipality = directText(companyNode, 'sucu_muni_descripcion');
  const formatted = [street, neighborhood, municipality, state, postalCode && `C.P. ${postalCode}`]
    .filter(Boolean)
    .join(' · ');

  return {
    street,
    neighborhood,
    postalCode,
    state,
    municipality,
    formatted,
  };
}

function buildContacts(companyNode) {
  const contactsNode = firstDirectChild(companyNode, 'CONTACTOS');
  return directChildrenByName(contactsNode, 'CONTACTO')
    .map((contactNode) => {
      const name = directText(contactNode, 'contacto');
      const role = directText(contactNode, 'cont_puesto');
      const email = directText(contactNode, 'cont_email');
      const extension = directText(contactNode, 'cont_extension');
      if (!name && !role && !email && !extension) return null;

      return {
        name: name || 'Contacto registrado',
        role,
        email,
        extension,
        key: email || `${normalizeTagName(name)}:${normalizeTagName(role)}:${extension}`,
      };
    })
    .filter(Boolean);
}

function buildLinkedInContacts(companyNode) {
  const linkedInNode = firstDirectChild(companyNode, 'LINKEDIN');
  return directChildrenByName(linkedInNode, 'LINKEDIN')
    .map((profileNode) => {
      const name = directText(profileNode, 'nombre');
      const role = directText(profileNode, 'puesto');
      const url = directText(profileNode, 'link');
      if (!name && !role && !url) return null;

      return {
        name: name || 'Perfil profesional',
        role,
        url,
        key: url || `${normalizeTagName(name)}:${normalizeTagName(role)}`,
      };
    })
    .filter(Boolean);
}

export function normalizeCompanyProjectKey(value) {
  return cleanText(value).replace(/\s+/g, '').toUpperCase();
}

export function parseCompaniasXml(xmlText) {
  const payload = unwrapAsmxPayload(xmlText);
  const document = parseXmlDocument(payload);
  const projects = Array.from(document.getElementsByTagName('*'))
    .filter((node) => nodeTagName(node) === 'datos');
  const relationships = [];

  projects.forEach((projectNode) => {
    const projectKey = normalizeCompanyProjectKey(directText(projectNode, 'proy_clave'));
    if (!projectKey) return;

    const companiesNode = firstDirectChild(projectNode, 'CIAS');
    directChildrenByName(companiesNode, 'CIA').forEach((companyNode) => {
      const clave = directText(companyNode, 'clave_cia');
      const name = directText(companyNode, 'comp_razon_social');
      const rfc = directText(companyNode, 'RFC');
      if (!clave && !name && !rfc) return;

      relationships.push({
        projectKey,
        company: {
          clave,
          name: name || rfc || clave,
          rfc,
          role: directText(companyNode, 'roco_descripcion'),
          address: buildAddress(companyNode),
          phones: ['sucu_telefono1', 'sucu_telefono2', 'sucu_telefono3']
            .map((tagName) => directText(companyNode, tagName))
            .filter(Boolean),
          datasetContacts: buildContacts(companyNode),
          linkedinContacts: buildLinkedInContacts(companyNode),
        },
      });
    });
  });

  return relationships;
}

function getSessionCredentials() {
  let user;
  try {
    user = JSON.parse(localStorage.getItem('construleadsUser') || '{}');
  } catch {
    throw new Error('No fue posible leer las credenciales de tu sesión.');
  }

  if (!user.idUsuario || !user.idSession) {
    throw new Error('Tu sesión no tiene las credenciales necesarias para consultar compañías.');
  }

  return {
    sId_usuario: user.idUsuario,
    sId_session: user.idSession,
    sTk: CONSTRULEADS_TOKEN,
  };
}

export async function obtenerCompanias({ signal } = {}) {
  const requestController = new AbortController();
  const abortFromCaller = () => requestController.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });
  const requestTimeout = window.setTimeout(() => requestController.abort(), 60000);

  try {
    const response = await fetch(`${CONSTRULEADS_WS_BASE_URL}/ws_cl_companias`, {
      method: 'POST',
      body: new URLSearchParams(getSessionCredentials()),
      signal: requestController.signal,
    });

    if (!response.ok) {
      throw new Error(`No fue posible obtener las compañías (HTTP ${response.status}).`);
    }

    return parseCompaniasXml(await response.text());
  } catch (error) {
    if (requestController.signal.aborted && !signal?.aborted) {
      throw new Error('El servicio de compañías tardó demasiado en responder.', { cause: error });
    }
    throw error;
  } finally {
    window.clearTimeout(requestTimeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}
