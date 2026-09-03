const relationshipIndexesCache = new WeakMap();

function cleanText(value) {
  return String(value || '').trim();
}

export function normalizeCompanyText(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeProjectKey(value) {
  return cleanText(value).replace(/\s+/g, '').toUpperCase();
}

function getRelationshipIdentity(company = {}) {
  const name = cleanText(company.name);
  const rfc = cleanText(company.rfc);
  const clave = cleanText(company.clave);
  if (!name && !rfc && !clave) return null;

  // La clave de compañía llega directamente del WS y es la identidad más
  // estable; el RFC puede no existir en todos los registros.
  return {
    name: name || rfc || clave,
    rfc,
    clave,
    key: clave
      ? `clave:${normalizeCompanyText(clave)}`
      : rfc
        ? `rfc:${normalizeCompanyText(rfc)}`
        : `nombre:${normalizeCompanyText(name)}`,
  };
}

function companyLookupKeys(company = {}) {
  const key = cleanText(company.key);
  const clave = cleanText(company.clave);
  const rfc = cleanText(company.rfc);
  const name = cleanText(company.name);

  return [...new Set([
    key && `key:${key}`,
    clave && `clave:${normalizeCompanyText(clave)}`,
    rfc && `rfc:${normalizeCompanyText(rfc)}`,
    name && `name:${normalizeCompanyText(name)}`,
  ].filter(Boolean))];
}

function buildCompanyDetailsIndex(relationships = []) {
  const index = new Map();

  relationships.forEach((relationship, relationshipIndex) => {
    const identity = getRelationshipIdentity(relationship?.company);
    if (!identity) return;

    const entry = {
      id: `${normalizeProjectKey(relationship?.projectKey)}:${relationshipIndex}`,
      details: relationship.company || {},
    };

    companyLookupKeys(identity).forEach((lookupKey) => {
      const entries = index.get(lookupKey) || [];
      entries.push(entry);
      index.set(lookupKey, entries);
    });
  });

  return index;
}

function getRelationshipIndexes(relationships = []) {
  if (!Array.isArray(relationships)) {
    return {
      companyDetailsIndex: new Map(),
    };
  }

  const cached = relationshipIndexesCache.get(relationships);
  if (cached) return cached;

  // Las relaciones del WS no cambian cuando el usuario ajusta filtros. Al
  // conservar el índice por respuesta evitamos reconstruir contactos en cada
  // render del panel.
  const indexes = {
    companyDetailsIndex: buildCompanyDetailsIndex(relationships),
  };
  relationshipIndexesCache.set(relationships, indexes);
  return indexes;
}

function getCompanyDetails(company, detailsIndex) {
  const entries = new Map();
  companyLookupKeys(company).forEach((lookupKey) => {
    (detailsIndex.get(lookupKey) || []).forEach((entry) => entries.set(entry.id, entry.details));
  });
  return [...entries.values()];
}

function createCompany(identity) {
  return {
    ...identity,
    projectByKey: new Map(),
    states: new Set(),
    roles: new Set(),
    websites: new Set(),
    addresses: new Map(),
    phones: new Set(),
    emails: new Set(),
    datasetContacts: new Map(),
    linkedinContacts: new Map(),
  };
}

function appendCompanyDetails(company, details = {}) {
  if (cleanText(details.role)) company.roles.add(cleanText(details.role));
  if (cleanText(details.website)) company.websites.add(cleanText(details.website));

  const address = details.address;
  if (address?.formatted) company.addresses.set(address.formatted, address);
  (details.phones || []).map(cleanText).filter(Boolean).forEach((phone) => company.phones.add(phone));
  (details.emails || []).map(cleanText).filter(Boolean).forEach((email) => company.emails.add(email));

  (details.datasetContacts || []).forEach((contact) => {
    if (!contact) return;
    const key = contact.key || `${normalizeCompanyText(contact.name)}:${normalizeCompanyText(contact.email)}`;
    company.datasetContacts.set(key, { ...contact, key });
  });
  (details.linkedinContacts || []).forEach((contact) => {
    if (!contact) return;
    const key = contact.key || `${normalizeCompanyText(contact.name)}:${normalizeCompanyText(contact.url)}`;
    company.linkedinContacts.set(key, { ...contact, key });
  });
}

function appendProject(company, obra, projectKey) {
  if (!company.projectByKey.has(projectKey)) {
    company.projectByKey.set(projectKey, obra);
    if (cleanText(obra?.estado)) company.states.add(cleanText(obra.estado));
  }
}

export function getCompanyGenreColor(genero) {
  const normalized = normalizeCompanyText(genero);
  if (normalized.includes('industrial')) return '#29A496';
  if (normalized.includes('infraestructura')) return '#6D4AAF';
  if (normalized.includes('vivienda') || normalized.includes('habitacional')) return '#CC2E6E';
  return '#D95B27';
}

export function getCompanyProjects(relationships = []) {
  const projects = new Map();

  relationships.forEach((relationship, index) => {
    const identity = getRelationshipIdentity(relationship?.company);
    const project = relationship?.project;
    const projectKey = normalizeProjectKey(
      relationship?.projectKey || project?.clave || project?.id || `${index}`
    );
    if (!identity || !project || !projectKey || projects.has(projectKey)) return;
    projects.set(projectKey, project);
  });

  return [...projects.values()];
}

export function buildCompanyRows(relationships = []) {
  const companies = new Map();
  const { companyDetailsIndex } = getRelationshipIndexes(relationships);

  relationships.forEach((relationship, index) => {
    const identity = getRelationshipIdentity(relationship?.company);
    const project = relationship?.project;
    const projectKey = normalizeProjectKey(
      relationship?.projectKey || project?.clave || project?.id || `${index}`
    );
    if (!identity || !project || !projectKey) return;

    if (!companies.has(identity.key)) companies.set(identity.key, createCompany(identity));
    const company = companies.get(identity.key);
    appendProject(company, project, projectKey);
    appendCompanyDetails(company, relationship.company || {});
  });

  return [...companies.values()]
    .map((company) => {
      // Algunos proyectos de obras y del WS no comparten una clave idéntica.
      // Aun así, la ficha remota es de la misma compañía: la fusionamos por
      // clave, RFC o razón social para no perder sus teléfonos y contactos.
      getCompanyDetails(company, companyDetailsIndex).forEach((details) => {
        appendCompanyDetails(company, details);
      });
      const projects = [...company.projectByKey.values()];
      const totalInvestment = projects.reduce((total, obra) => total + (Number(obra?.inversion) || 0), 0);
      const totalSurface = projects.reduce((total, obra) => total + (Number(obra?.superficie) || 0), 0);
      return {
        ...company,
        projectCount: projects.length,
        totalInvestment,
        totalSurface,
        projects,
        stateCount: company.states.size,
        states: [...company.states].sort((first, second) => first.localeCompare(second, 'es-MX')),
        roles: [...company.roles].sort((first, second) => first.localeCompare(second, 'es-MX')),
        websites: [...company.websites],
        addresses: [...company.addresses.values()],
        phones: [...company.phones],
        emails: [...company.emails],
        datasetContacts: [...company.datasetContacts.values()],
        linkedinContacts: [...company.linkedinContacts.values()],
      };
    })
    .sort((first, second) => (
      second.projectCount - first.projectCount ||
      second.totalInvestment - first.totalInvestment ||
      first.name.localeCompare(second.name, 'es-MX')
    ));
}

export function getCompanyMetrics(rows = []) {
  const projects = rows.reduce((total, row) => total + row.projectCount, 0);
  const investment = rows.reduce((total, row) => total + row.totalInvestment, 0);
  const surface = rows.reduce((total, row) => total + row.totalSurface, 0);
  const states = new Set(rows.flatMap((row) => row.states));

  return {
    companies: rows.length,
    projects,
    investment,
    surface,
    states: states.size,
  };
}

export function formatCompactInvestment(value) {
  const millions = (Number(value) || 0) / 1000000;
  if (millions >= 1000) return `$${(millions / 1000).toFixed(2)}bn`;
  if (millions >= 1) return `$${millions.toFixed(millions >= 100 ? 0 : 1)}m`;
  return '$0m';
}

export function formatNumber(value) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

export function companiesToCsv(rows = []) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const header = ['RFC', 'CLAVE', 'COMPAÑÍA', 'PROYECTOS', 'INVERSIÓN TOTAL (MDP)', 'ESTADOS', 'SUPERFICIE (m²)'];
  const data = rows.map((row) => [
    row.rfc || '',
    row.clave || '',
    row.name,
    row.projectCount,
    (row.totalInvestment / 1000000).toFixed(2),
    row.stateCount,
    Math.round(row.totalSurface),
  ]);

  return [header, ...data].map((row) => row.map(escape).join(',')).join('\n');
}
