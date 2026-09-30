import { CONSTRULEADS_TOKEN, CONSTRULEADS_WS_BASE_URL } from './obras';
import { startPerformanceSpan, traceWsRequest } from '../utils/performanceMonitor';

const companiesCache = new Map();
const companiesRequests = new Map();
const companiesSubscribers = new Map();
const companyProjectsCache = new Map();
const companyProjectsRequests = new Map();

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
      const normalizedExtension = extension || directTextFrom(contactNode, ['extension']);
      if (!name && !role && !email && !phone && !phone2 && !normalizedExtension) return null;

      return {
        name: name || 'Contacto registrado',
        role,
        email,
        phone,
        phone2,
        extension: normalizedExtension,
        key: email || `${normalizeTagName(name)}:${normalizeTagName(role)}:${phone}:${phone2}:${normalizedExtension}`,
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

function parseWsNumber(value = '') {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  // Las inversiones del WS pueden llegar en notación científica; por ejemplo
  // `6.269580000000000e+007`. Conservar el exponente evita volverlo cero.
  const normalized = cleanText(value)
    .replace(/,/g, '')
    .replace(/[^0-9.eE+-]/g, '');
  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function optionalWsNumber(node, tagNames) {
  const value = directTextFrom(node, tagNames);
  return value === '' ? null : parseWsNumber(value);
}

function buildCompanyDetails(companyNode) {
  const profile = {
    role: directTextFrom(companyNode, [
      'rol_perfil', 'roco_descripcion', 'rol_compania', 'compania_rol', 'rol_empresa',
    ]),
    activityScale: directTextFrom(companyNode, ['escala_actividad_perfil', 'escala_actividad']),
    genre: directTextFrom(companyNode, ['genero_perfil', 'genero_compania']),
    region: directTextFrom(companyNode, ['region_perfil', 'region_compania']),
    presence: directTextFrom(companyNode, ['presencia_perfil', 'presencia_compania']),
  };

  return {
    clave: directTextFrom(companyNode, ['clave_cia', 'clave_compania', 'compania_clave', 'clave_empresa']),
    name: directTextFrom(companyNode, [
      'comp_razon_social', 'compania', 'nombre_compania', 'compania_nombre', 'razon_social_compania',
    ]),
    rfc: directTextFrom(companyNode, ['RFC', 'rfc_compania', 'compania_rfc', 'rfc_empresa']),
    role: profile.role,
    profile,
    summary: {
      projectCount: optionalWsNumber(companyNode, ['Total_Proyectos', 'total_proyectos']),
      totalInvestment: optionalWsNumber(companyNode, ['Suma_Inversion', 'suma_inversion']),
      totalSurface: optionalWsNumber(companyNode, [
        'Suma_Superficie_Construida', 'suma_superficie_construida', 'suma_superficie',
      ]),
      stateCount: optionalWsNumber(companyNode, ['Total_Estados', 'total_estados']),
    },
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
  };
}

function parseWsDate(value = '') {
  const normalized = cleanText(value);
  if (!normalized) return null;

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const localMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (localMatch) {
    const [, day, month, year] = localMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildCompanyProject(projectNode, projectKey) {
  const value = (tagNames) => directTextFrom(projectNode, tagNames);
  const clave = value(['proy_clave', 'clave_proyecto', 'proyecto_clave', 'clave_obra']) || projectKey;
  const fechaPublicacion = value([
    'proy_fechapublicacion', 'fecha_publicacion', 'fecha_publicacion_proyecto', 'proy_fechacierre',
  ]);
  const fechaInicio = value(['proy_fechainicio', 'fecha_inicio', 'proy_fecha_inicio']);
  const fechaTermino = value([
    'proy_fechatermino', 'fecha_terminacion', 'fecha_termino', 'proy_fecha_fin', 'fecha_fin',
  ]);
  const fechaPublicacionDate = parseWsDate(fechaPublicacion);
  const fechaInicioDate = parseWsDate(fechaInicio);
  const fechaTerminoDate = parseWsDate(fechaTermino);
  const imageUrl = value(['impo_image_url', 'imagen_explorer', 'imagen_url', 'image_url']);
  const explicitOrigin = normalizeTagName(value(['origen', 'fuente', 'source']));
  const origin = explicitOrigin === 'explorer' || imageUrl ? 'explorer' : 'construleads';

  // ws_cl_companias ya entrega el proyecto que relaciona con cada compañía.
  // Lo normalizamos al mismo contrato que consume la interfaz sin consultar
  // ws_cl_obras ni mezclar registros de Explorer en este módulo.
  return {
    id: projectKey,
    clave,
    claveCompania: value(['clave_compania', 'clave_cia', 'compania_clave']),
    origen: origin,
    proyecto: value(['proy_descripcioncorta', 'proy_nombre', 'proyecto', 'nombre_proyecto', 'proy_descripcion']),
    localizacion: value(['localizacion', 'proy_localizacion', 'ubicacion', 'direccion_proyecto']),
    region: value(['regi_descripcion', 'region', 'proy_region']),
    estado: value(['esta_descripcion', 'proy_esta_descripcion', 'estado_proyecto', 'estado']),
    municipio: value(['muni_descripcion', 'proy_muni_descripcion', 'municipio_proyecto', 'municipio']),
    genero: value(['gene_descripcion', 'genero', 'proy_genero']),
    subgenero: value(['suge_descripcion', 'subgenero', 'proy_subgenero']),
    tipoObra: value(['tiob_descripcion', 'tipo_obra', 'tipoobra', 'proy_tipo_obra']),
    tipoDesarrollo: value(['desa_descripcion', 'tipo_desarrollo', 'tipodesarrollo', 'proy_tipo_desarrollo']),
    tipoProyecto: value(['proy_tipoproyectodescripcion', 'tipo_proyecto', 'tipoproyecto']),
    etapa: value(['etap_descripcion', 'proy_etapa', 'etapa']),
    sector: value(['proy_sectordescripcion', 'sector', 'proy_sector']),
    inversion: parseWsNumber(value(['proy_inversion', 'inversion', 'monto_inversion', 'inversion_total'])),
    superficie: parseWsNumber(value([
      'proy_superficie_construida', 'proy_superficie', 'sup_construida', 'superficie',
    ])),
    porcentajeAvance: value(['porcentaje_avance', 'porcentajeavance', 'avance_estimado', 'avance']),
    imagenExplorer: imageUrl,
    impo_image_url: imageUrl,
    fechaPublicacion,
    fechaInicio,
    fechaTermino,
    fechaTerminacion: fechaTermino,
    fechaFin: fechaTermino,
    fechaPublicacionDate,
    fechaInicioDate,
    fechaTerminoDate,
    fechaTerminacionDate: fechaTerminoDate,
    fechaFinDate: fechaTerminoDate,
    fechaPublicacionTime: fechaPublicacionDate?.getTime() || null,
    fechaInicioTime: fechaInicioDate?.getTime() || null,
    fechaTerminoTime: fechaTerminoDate?.getTime() || null,
    fechaTerminacionTime: fechaTerminoDate?.getTime() || null,
    fechaFinTime: fechaTerminoDate?.getTime() || null,
  };
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
  const records = exactProjectNodes.length
    ? [...new Set(exactProjectNodes)]
    : Array.from(document.getElementsByTagName('*'))
      .filter((node) => nodeTagName(node) === 'datos');
  const relationships = [];

  records.forEach((projectNode) => {
    const projectKey = normalizeCompanyProjectKey(directTextFrom(projectNode, [
      'proy_clave',
      'clave_proyecto',
      'proyecto_clave',
      'clave_obra',
    ]));
    const project = projectKey ? buildCompanyProject(projectNode, projectKey) : null;

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
      const company = buildCompanyDetails(companyNode);
      if (!company.clave && !company.name && !company.rfc) return;

      relationships.push({
        projectKey,
        project,
        company: {
          ...company,
          name: company.name || company.rfc || company.clave,
        },
      });
    });
  });

  return relationships;
}

export function parseCompanyProjectsXml(xmlText) {
  const payload = unwrapAsmxPayload(xmlText);
  const document = parseXmlDocument(payload);
  const responseRoot = document.documentElement;

  if (nodeTagName(responseRoot) === 'row' && responseRoot?.getAttribute('estatus') === '0') {
    throw new Error(
      cleanText(responseRoot.getAttribute('mensaje'))
      || 'El servicio no pudo entregar los proyectos de la compañía.'
    );
  }

  const candidateNames = new Set(['datos', 'obras', 'obra', 'proyecto']);
  const candidates = Array.from(document.getElementsByTagName('*')).filter((node) => {
    if (!candidateNames.has(nodeTagName(node))) return false;
    return Boolean(directTextFrom(node, [
      'proy_clave', 'clave_proyecto', 'proyecto_clave', 'clave_obra',
      'proy_descripcioncorta', 'proy_nombre', 'proyecto', 'nombre_proyecto',
    ]));
  });
  const projects = new Map();

  candidates.forEach((projectNode, index) => {
    const projectKey = normalizeCompanyProjectKey(directTextFrom(projectNode, [
      'proy_clave', 'clave_proyecto', 'proyecto_clave', 'clave_obra',
    ]) || `company-project-${index}`);
    const project = buildCompanyProject(projectNode, projectKey);
    if (!project.clave && !project.proyecto) return;
    projects.set(projectKey, project);
  });

  return [...projects.values()];
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

function publishCompanyBatch(cacheKey, batch) {
  companiesSubscribers.get(cacheKey)?.forEach((subscriber) => subscriber(batch));
}

async function readCompaniesProgressively(response, cacheKey) {
  const reader = response.body?.getReader?.();
  if (!reader) return null;

  const decoder = new TextDecoder();
  const all = [];
  let pending = [];
  let buffer = '';
  let hasPublished = false;
  const publish = () => {
    if (!pending.length) return;
    const batch = pending;
    pending = [];
    hasPublished = true;
    publishCompanyBatch(cacheKey, batch);
  };
  const extractProjects = () => {
    while (true) {
      const start = buffer.search(/<datos(?:\s[^>]*)?>/i);
      if (start < 0) {
        if (buffer.length > 4096) buffer = buffer.slice(-4096);
        return;
      }
      const end = buffer.toLowerCase().indexOf('</datos>', start);
      if (end < 0) {
        if (start > 0) buffer = buffer.slice(start);
        return;
      }
      const fragmentEnd = end + '</datos>'.length;
      const relationships = parseCompaniasXml(`<bobras>${buffer.slice(start, fragmentEnd)}</bobras>`);
      if (relationships.length) {
        all.push(...relationships);
        pending.push(...relationships);
      }
      buffer = buffer.slice(fragmentEnd);
      if (pending.length >= (hasPublished ? 120 : 8)) publish();
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    extractProjects();
  }
  buffer += decoder.decode();
  extractProjects();
  publish();
  return all;
}

export async function obtenerCompanias({ timeoutMs = 240000, caller = 'unknown', reason = 'load', onBatch } = {}) {
  const credentials = getSessionCredentials();
  const cacheKey = `${credentials.sId_usuario}:${credentials.sId_session}`;
  const cached = companiesCache.get(cacheKey);
  if (cached?.length) {
    traceWsRequest('ws_cl_companias', 'cache-hit', { caller, reason });
    return cached;
  }
  if (onBatch) {
    const subscribers = companiesSubscribers.get(cacheKey) || new Set();
    subscribers.add(onBatch);
    companiesSubscribers.set(cacheKey, subscribers);
  }
  const pending = companiesRequests.get(cacheKey);
  if (pending) {
    traceWsRequest('ws_cl_companias', 'in-flight-reused', { caller, reason });
    try {
      return await pending;
    } finally {
      companiesSubscribers.get(cacheKey)?.delete(onBatch);
    }
  }

  // La solicitud pertenece al repositorio, no a un componente individual.
  // Un unmount no debe abortar una precarga que otra vista puede reutilizar.
  const request = requestCompanias({ credentials, cacheKey, timeoutMs, caller, reason });
  companiesRequests.set(cacheKey, request);
  try {
    const relationships = await request;
    companiesCache.set(cacheKey, relationships);
    return relationships;
  } finally {
    companiesSubscribers.get(cacheKey)?.delete(onBatch);
    if (companiesRequests.get(cacheKey) === request) {
      companiesRequests.delete(cacheKey);
      companiesSubscribers.delete(cacheKey);
    }
  }
}

async function requestCompanias({ credentials, cacheKey, timeoutMs, caller, reason }) {
  const loadSpan = startPerformanceSpan('companies.request-and-parse');
  const requestController = new AbortController();
  // Este catálogo contiene los contactos y puede tardar bastante más que las
  // obras. En producción no debe abortarse antes de poder enriquecer la vista.
  const requestTimeout = window.setTimeout(() => requestController.abort(), timeoutMs);

  try {
    traceWsRequest('ws_cl_companias', 'request', { caller, reason, cacheState: 'MISS' });
    const response = await fetch(`${CONSTRULEADS_WS_BASE_URL}/ws_cl_companias`, {
      method: 'POST',
      body: new URLSearchParams(credentials),
      signal: requestController.signal,
    });

    if (!response.ok) {
      throw new Error(`No fue posible obtener las compañías (HTTP ${response.status}).`);
    }

    // Este XML supera los 20 MB. Publicarlo por proyecto evita dejar la vista
    // vacía hasta que termine la descarga y evita materializar un DOM gigante.
    const documentResponse = response.clone();
    let relationships = await readCompaniesProgressively(response, cacheKey);
    let source = 'stream';
    if (!relationships?.length) {
      relationships = parseCompaniasXml(await documentResponse.text());
      source = 'document';
    }
    if (!relationships.length) {
      throw new Error('El servicio respondió sin relaciones de compañías.');
    }
    loadSpan.end({ relationships: relationships.length, source });
    return relationships;
  } catch (error) {
    loadSpan.end({ error: true, aborted: requestController.signal.aborted });
    if (requestController.signal.aborted) {
      throw new Error('El servicio de compañías tardó demasiado en responder.', { cause: error });
    }
    throw error;
  } finally {
    window.clearTimeout(requestTimeout);
  }
}

export async function obtenerProyectosCompania(
  claveCompania,
  { timeoutMs = 90000, caller = 'companies-view', reason = 'company-selected' } = {}
) {
  const normalizedCompanyKey = cleanText(claveCompania);
  if (!normalizedCompanyKey) {
    throw new Error('La compañía seleccionada no tiene una clave válida.');
  }

  const credentials = getSessionCredentials();
  const cacheKey = `${credentials.sId_usuario}:${normalizedCompanyKey}`;
  if (companyProjectsCache.has(cacheKey)) {
    traceWsRequest('ws_cl_proyectos_companias', 'cache-hit', { caller, reason });
    return companyProjectsCache.get(cacheKey);
  }
  if (companyProjectsRequests.has(cacheKey)) {
    traceWsRequest('ws_cl_proyectos_companias', 'in-flight-reused', { caller, reason });
    return companyProjectsRequests.get(cacheKey);
  }

  const request = (async () => {
    const requestController = new AbortController();
    const requestTimeout = window.setTimeout(() => requestController.abort(), timeoutMs);
    const loadSpan = startPerformanceSpan('company-projects.request-and-parse');

    try {
      traceWsRequest('ws_cl_proyectos_companias', 'request', { caller, reason, cacheState: 'MISS' });
      const response = await fetch(`${CONSTRULEADS_WS_BASE_URL}/ws_cl_proyectos_companias`, {
        method: 'POST',
        body: new URLSearchParams({
          sId_usuario: credentials.sId_usuario,
          sClave_cia: normalizedCompanyKey,
          sTk: credentials.sTk,
        }),
        signal: requestController.signal,
      });

      if (!response.ok) {
        throw new Error(`No fue posible obtener los proyectos de la compañía (HTTP ${response.status}).`);
      }

      const projects = parseCompanyProjectsXml(await response.text());
      companyProjectsCache.set(cacheKey, projects);
      loadSpan.end({ projects: projects.length });
      return projects;
    } catch (error) {
      loadSpan.end({ error: true, aborted: requestController.signal.aborted });
      if (requestController.signal.aborted) {
        throw new Error('Los proyectos de la compañía tardaron demasiado en responder.', { cause: error });
      }
      throw error;
    } finally {
      window.clearTimeout(requestTimeout);
    }
  })().finally(() => companyProjectsRequests.delete(cacheKey));

  companyProjectsRequests.set(cacheKey, request);
  return request;
}

function getCompanyProjectsCacheKey(claveCompania) {
  const normalizedCompanyKey = cleanText(claveCompania);
  if (!normalizedCompanyKey) return '';
  try {
    const credentials = getSessionCredentials();
    return `${credentials.sId_usuario}:${normalizedCompanyKey}`;
  } catch {
    return '';
  }
}

export function getCachedCompanyProjects(claveCompania) {
  const cacheKey = getCompanyProjectsCacheKey(claveCompania);
  return cacheKey && companyProjectsCache.has(cacheKey)
    ? companyProjectsCache.get(cacheKey)
    : undefined;
}

export function precalentarProyectosCompanias(
  clavesCompania = [],
  { startDelayMs = 1800, intervalMs = 700 } = {}
) {
  const queue = [...new Set(clavesCompania.map(cleanText).filter(Boolean))];
  let cancelled = false;
  let running = false;
  let timerId = null;
  let idleId = null;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const dataRestricted = Boolean(
    connection?.saveData
    || String(connection?.effectiveType || '').toLowerCase().includes('2g')
  );

  const clearScheduledWork = () => {
    if (timerId !== null) window.clearTimeout(timerId);
    if (idleId !== null && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
    timerId = null;
    idleId = null;
  };

  const nextUncachedKey = () => {
    while (queue.length) {
      const key = queue.shift();
      if (getCachedCompanyProjects(key) === undefined) return key;
    }
    return '';
  };

  const canRun = () => (
    !cancelled
    && !dataRestricted
    && navigator.onLine !== false
    && document.visibilityState === 'visible'
  );

  const schedule = (delayMs = intervalMs) => {
    if (cancelled || dataRestricted || !queue.length) return;
    clearScheduledWork();
    timerId = window.setTimeout(() => {
      timerId = null;
      if (!canRun()) {
        return;
      }

      const execute = () => {
        idleId = null;
        if (!canRun() || running) {
          return;
        }
        const companyKey = nextUncachedKey();
        if (!companyKey) return;
        running = true;
        obtenerProyectosCompania(companyKey, {
          timeoutMs: 60000,
          caller: 'companies-background-prefetch',
          reason: 'idle-warmup',
        })
          .catch(() => undefined)
          .finally(() => {
            running = false;
            schedule(intervalMs);
          });
      };

      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(execute, { timeout: 2200 });
      } else {
        execute();
      }
    }, delayMs);
  };

  const wake = () => {
    if (!running && canRun()) schedule(120);
  };
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('online', wake);
  schedule(startDelayMs);

  return {
    prioritize(claveCompania) {
      const companyKey = cleanText(claveCompania);
      if (!companyKey || getCachedCompanyProjects(companyKey) !== undefined) return;
      const currentIndex = queue.indexOf(companyKey);
      if (currentIndex >= 0) queue.splice(currentIndex, 1);
      queue.unshift(companyKey);
      if (!running) schedule(100);
    },
    cancel() {
      cancelled = true;
      clearScheduledWork();
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
    },
  };
}
