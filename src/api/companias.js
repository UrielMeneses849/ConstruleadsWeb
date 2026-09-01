import { CONSTRULEADS_TOKEN, CONSTRULEADS_WS_BASE_URL } from './obras';

function cleanText(value = '') {
  return String(value).trim();
}

function normalizeTagName(value = '') {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
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

function directTextFrom(node, tagNames) {
  for (const tagName of tagNames) {
    const value = directText(node, tagName);
    if (value) return value;
  }

  const expectedNames = new Set(tagNames.map(normalizeTagName));
  const attribute = Array.from(node?.attributes || []).find((item) => expectedNames.has(normalizeTagName(item.name)));
  if (attribute?.value) return cleanText(attribute.value);

  return '';
}

function directTextMatching(node, matchesTagName) {
  const child = Array.from(node?.children || []).find((item) => matchesTagName(nodeTagName(item)) && cleanText(item.textContent));
  if (child) return cleanText(child.textContent);
  const attribute = Array.from(node?.attributes || []).find((item) => matchesTagName(normalizeTagName(item.name)) && cleanText(item.value));
  return cleanText(attribute?.value);
}

function directChildrenFrom(node, tagNames) {
  const expectedNames = new Set(tagNames.map(normalizeTagName));
  return Array.from(node?.children || []).filter((child) => expectedNames.has(nodeTagName(child)));
}

function firstDirectChildFrom(node, tagNames) {
  return directChildrenFrom(node, tagNames)[0] || null;
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
  const street = directTextFrom(companyNode, ['sucu_calle', 'calle_compania', 'compania_calle']);
  const neighborhood = directTextFrom(companyNode, ['sucu_colonia', 'colonia_compania', 'compania_colonia']);
  const postalCode = directTextFrom(companyNode, ['sucu_codigopostal', 'codigo_postal_compania', 'compania_codigo_postal']);
  const state = directTextFrom(companyNode, ['sucu_esta_descripcion', 'estado_compania', 'compania_estado']);
  const municipality = directTextFrom(companyNode, ['sucu_muni_descripcion', 'municipio_compania', 'compania_municipio']);
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
  const contactsNode = firstDirectChildFrom(companyNode, ['CONTACTOS', 'CONTACTOS_COMPANIA']);
  const contactNodes = contactsNode
    ? directChildrenFrom(contactsNode, ['CONTACTO', 'CONTACTO_COMPANIA'])
    : directChildrenFrom(companyNode, ['CONTACTO', 'CONTACTO_COMPANIA']);

  const nodesToParse = contactNodes.length ? contactNodes : [companyNode];

  return nodesToParse
    .map((contactNode) => {
      const completeName = [
        directTextFrom(contactNode, ['cont_nombre', 'nombre_contacto']),
        directTextFrom(contactNode, ['cont_paterno', 'apellido_paterno_contacto']),
        directTextFrom(contactNode, ['cont_materno', 'apellido_materno_contacto']),
      ].filter(Boolean).join(' ');
      const name = directTextFrom(contactNode, ['contacto', 'nombre_contacto', 'contacto_nombre']) || completeName;
      const role = directTextFrom(contactNode, [
        'cont_puesto', 'puesto', 'cargo_contacto', 'puesto_contacto', 'contacto_cargo',
      ]);
      const email = directTextFrom(contactNode, [
        'cont_email', 'cont_correo', 'cont_correo_electronico',
        'email_contacto', 'correo_contacto', 'contacto_email', 'contacto_correo',
        'correo_electronico', 'email', 'correo', 'e_mail', 'email1', 'correo1', 'e_mail1',
      ]) || directTextMatching(contactNode, (tagName) => (
        tagName.includes('email') || tagName.includes('correo') || tagName === 'mail'
      ));
      const phone = directTextFrom(contactNode, [
        'cont_telefono', 'telefono_contacto', 'contacto_telefono', 'cont_telefono1',
      ]);
      const phone2 = directTextFrom(contactNode, [
        'cont_telefono2', 'telefono2_contacto', 'contacto_telefono2', 'cont_telefono_2',
      ]);
      const extension = directTextFrom(contactNode, ['cont_extension', 'extension_contacto', 'contacto_extension']);
      if (!name && !role && !email && !phone && !phone2 && !extension) return null;

      return {
        name: name || 'Contacto registrado',
        role,
        email,
        phone,
        phone2,
        extension,
        key: email || `${normalizeTagName(name)}:${normalizeTagName(role)}:${phone}:${phone2}:${extension}`,
      };
    })
    .filter(Boolean);
}

function buildLinkedInContacts(companyNode) {
  const linkedInNode = firstDirectChildFrom(companyNode, ['LINKEDIN', 'LINKEDIN_CONTACTOS', 'LINKEDIN_COMPANIA']);
  const profileNodes = linkedInNode
    ? directChildrenFrom(linkedInNode, ['LINKEDIN', 'PERFIL_LINKEDIN', 'CONTACTO_LINKEDIN'])
    : directChildrenFrom(companyNode, ['PERFIL_LINKEDIN', 'CONTACTO_LINKEDIN']);

  // El WS puede regresar varios perfiles dentro de <LINKEDIN> o un único
  // perfil directamente en ese nodo. Soportamos ambos formatos.
  const nodesToParse = profileNodes.length
    ? profileNodes
    : linkedInNode ? [linkedInNode] : [companyNode];

  return nodesToParse
    .map((profileNode) => {
      const name = directTextFrom(profileNode, ['nombre', 'nombre_linkedin', 'linkedin_nombre']);
      const role = directTextFrom(profileNode, ['puesto', 'cargo_linkedin', 'linkedin_cargo']);
      const url = directTextFrom(profileNode, ['link', 'linkedin_url', 'url_linkedin', 'linkedin']);
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
  const responseRoot = document.documentElement;

  // El ASMX conserva HTTP 200 incluso cuando rechaza la sesión o no puede
  // generar el catálogo. Sin esta validación, la UI interpreta esa respuesta
  // como un catálogo vacío y termina mostrando cero contactos.
  if (nodeTagName(responseRoot) === 'row' && responseRoot?.getAttribute('estatus') === '0') {
    throw new Error(
      cleanText(responseRoot.getAttribute('mensaje'))
      || 'El servicio de compañías no pudo entregar los perfiles.'
    );
  }

  // El WS normalmente usa <DATOS>. Consultarlo por nombre evita materializar
  // y recorrer todos los nodos del XML — un costo notable cuando vienen miles
  // de contactos. El recorrido genérico se conserva como respaldo para un
  // proveedor que cambie la capitalización o use un namespace inusual.
  const exactProjectNodes = ['DATOS', 'Datos', 'datos']
    .flatMap((tagName) => Array.from(document.getElementsByTagName(tagName)));
  const projects = exactProjectNodes.length
    ? [...new Set(exactProjectNodes)]
    : Array.from(document.getElementsByTagName('*'))
      .filter((node) => nodeTagName(node) === 'datos');
  const relationships = [];

  projects.forEach((projectNode) => {
    const projectKey = normalizeCompanyProjectKey(directTextFrom(projectNode, [
      'proy_clave',
      'clave_proyecto',
      'proyecto_clave',
      'clave_obra',
    ]));
    if (!projectKey) return;

    const companiesNode = firstDirectChildFrom(projectNode, ['CIAS', 'COMPANIAS', 'COMPAÑIAS']);
    const nestedCompanyNodes = companiesNode
      ? directChildrenFrom(companiesNode, ['CIA', 'COMPANIA', 'COMPAÑIA'])
      : directChildrenFrom(projectNode, ['CIA', 'COMPANIA', 'COMPAÑIA']);
    const hasFlatCompany = Boolean(directTextFrom(projectNode, [
      'clave_cia', 'clave_compania', 'compania_clave', 'clave_empresa',
      'comp_razon_social', 'compania', 'nombre_compania', 'compania_nombre',
      'RFC', 'rfc_compania', 'compania_rfc',
    ]));
    const companyNodes = nestedCompanyNodes.length
      ? nestedCompanyNodes
      : hasFlatCompany ? [projectNode] : [];

    companyNodes.forEach((companyNode) => {
      const clave = directTextFrom(companyNode, ['clave_cia', 'clave_compania', 'compania_clave', 'clave_empresa']);
      const name = directTextFrom(companyNode, ['comp_razon_social', 'compania', 'nombre_compania', 'compania_nombre', 'razon_social_compania']);
      const rfc = directTextFrom(companyNode, ['RFC', 'rfc_compania', 'compania_rfc', 'rfc_empresa']);
      if (!clave && !name && !rfc) return;

      relationships.push({
        projectKey,
        company: {
          clave,
          name: name || rfc || clave,
          rfc,
          role: directTextFrom(companyNode, ['roco_descripcion', 'rol_compania', 'compania_rol', 'rol_empresa']),
          website: directTextFrom(companyNode, ['pagina_web', 'sitio_web', 'web_compania', 'compania_web']),
          address: buildAddress(companyNode),
          phones: [
            'sucu_telefono1', 'sucu_telefono2', 'sucu_telefono3',
            'telefono_compania', 'telefono_1_compania', 'telefono_2_compania', 'telefono_3_compania',
            'telefono1', 'telefono2', 'telefono3', 'telefono',
          ]
            .map((tagName) => directText(companyNode, tagName))
            .filter(Boolean),
          emails: [
            'sucu_email', 'sucu_correo', 'email_compania', 'correo_compania',
            'compania_email', 'compania_correo', 'correo_electronico_compania',
            'email', 'correo', 'email1', 'correo1',
          ]
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

export async function obtenerCompanias({ signal, timeoutMs = 90000 } = {}) {
  const requestController = new AbortController();
  const abortFromCaller = () => requestController.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });
  // Este catálogo contiene los contactos y puede tardar bastante más que las
  // obras. En producción no debe abortarse antes de poder enriquecer la vista.
  const requestTimeout = window.setTimeout(() => requestController.abort(), timeoutMs);

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
