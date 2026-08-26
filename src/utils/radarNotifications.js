export const RADAR_PREFERENCES_UPDATED_EVENT = 'construleads-radar-preferences-updated';

const STORAGE_PREFIX = 'construleads-profile-preferences';
const COMPANY_ALERTS_SUFFIX = '-company-alerts';
const EMPTY_CRITERIA = Object.freeze({
  regions: [],
  genres: [],
  sectors: [],
  stages: [],
  minimumInvestment: '',
});

export const RADAR_PREFERENCE_DEFAULTS = {
  newProjects: true,
  newTenders: true,
  weeklyBrief: true,
  relevantChanges: true,
  companyActivity: true,
  monthlyUsageSummary: false,
  regions: [],
  genres: [],
  sectors: [],
  stages: [],
  minimumInvestment: '',
  maxResults: '10',
  frequency: 'Semanal',
  naturalLanguageProfile: '',
  projectCriteria: { ...EMPTY_CRITERIA },
  tenderCriteria: { ...EMPTY_CRITERIA },
};

function getStorageKey() {
  try {
    const user = JSON.parse(localStorage.getItem('construleadsUser') || '{}');
    const profileId = user.idUsuario || user.email || 'local';
    return `${STORAGE_PREFIX}-${profileId}`;
  } catch {
    return `${STORAGE_PREFIX}-local`;
  }
}

function getCompanyAlertsStorageKey() {
  return `${getStorageKey()}${COMPANY_ALERTS_SUFFIX}`;
}

export function getCompanyActivityAlerts() {
  try {
    const alerts = JSON.parse(localStorage.getItem(getCompanyAlertsStorageKey()) || '[]');
    return Array.isArray(alerts) ? alerts.filter((alert) => alert?.key) : [];
  } catch {
    return [];
  }
}

export function toggleCompanyActivityAlert(company) {
  const key = String(company?.key || '').trim();
  if (!key) return { enabled: false, alerts: getCompanyActivityAlerts() };

  const alerts = getCompanyActivityAlerts();
  const currentIndex = alerts.findIndex((alert) => alert.key === key);
  const enabled = currentIndex < 0;
  const next = enabled
    ? [...alerts, {
        key,
        name: String(company?.name || 'Compañía').trim(),
        enabledAt: new Date().toISOString(),
      }]
    : alerts.filter((alert) => alert.key !== key);

  try {
    localStorage.setItem(getCompanyAlertsStorageKey(), JSON.stringify(next));
  } catch {
    // La UI conserva el cambio durante la sesión aunque el navegador no pueda persistirlo.
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(RADAR_PREFERENCES_UPDATED_EVENT));
  }

  return { enabled, alerts: next };
}

export function getRadarPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(getStorageKey()) || '{}');
    return {
      ...RADAR_PREFERENCE_DEFAULTS,
      ...(stored && typeof stored === 'object' ? stored : {}),
    };
  } catch {
    return { ...RADAR_PREFERENCE_DEFAULTS };
  }
}

export function persistRadarPreferences(preferences) {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(preferences));
  } catch {
    // Las preferencias siguen disponibles durante la sesión actual.
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(RADAR_PREFERENCES_UPDATED_EVENT));
  }
}

function formatChoices(values, fallback = 'Todas') {
  return Array.isArray(values) && values.length ? values.join(', ') : fallback;
}

function getCriteria(preferences, key) {
  const configured = preferences?.[key];
  const legacy = {
    regions: preferences?.regions,
    genres: preferences?.genres,
    sectors: preferences?.sectors,
    stages: preferences?.stages,
    minimumInvestment: preferences?.minimumInvestment,
  };
  const hasConfiguredValues = configured && Object.values(configured).some((value) => (
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  ));

  return {
    ...EMPTY_CRITERIA,
    ...(hasConfiguredValues ? configured : legacy),
  };
}

function criteriaDetail(criteria) {
  return `Zonas: ${formatChoices(criteria.regions)} · Géneros: ${formatChoices(criteria.genres)}`;
}

export function getActiveRadarNotifications({ monthlyDownloads = 0 } = {}) {
  const preferences = getRadarPreferences();
  const projectCriteria = getCriteria(preferences, 'projectCriteria');
  const tenderCriteria = getCriteria(preferences, 'tenderCriteria');

  return [
    preferences.newProjects && { id: 'projects', kind: 'projects', title: 'Nuevas obras', detail: criteriaDetail(projectCriteria) },
    preferences.newTenders && { id: 'tenders', kind: 'tenders', title: 'Nuevas licitaciones', detail: criteriaDetail(tenderCriteria) },
    preferences.weeklyBrief && {
      id: 'radar',
      kind: 'radar',
      title: 'Radar semanal de oportunidades',
      detail: `${preferences.maxResults || '10'} resultados · ${preferences.frequency || 'Semanal'}`,
    },
    preferences.relevantChanges && { id: 'changes', kind: 'changes', title: 'Cambios relevantes', detail: 'Inversión, etapa, fecha, ubicación o empresa.' },
    preferences.companyActivity && { id: 'companies', kind: 'companies', title: 'Actividad de empresas', detail: 'Empresas activas y contactos identificados.' },
    preferences.monthlyUsageSummary && {
      id: 'usage',
      kind: 'usage',
      title: 'Resumen de consumo mensual',
      detail: `${monthlyDownloads} descarga${monthlyDownloads === 1 ? '' : 's'} este mes`,
    },
  ].filter(Boolean);
}
