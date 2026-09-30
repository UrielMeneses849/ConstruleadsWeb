import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import {
  Cell, Label, Pie, PieChart, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  FiArrowRight, FiBarChart2, FiBriefcase, FiExternalLink, FiFilter, FiHome,
  FiChevronRight, FiLinkedin, FiMail, FiMapPin, FiPhone, FiRefreshCw, FiSearch, FiShare2, FiX,
} from 'react-icons/fi';
import {
  buildCompanyRows, formatCompactInvestment, formatNumber, getCompanyGenreColor,
} from './companyData';
import {
  getCachedCompanyProjects, obtenerProyectosCompania, precalentarProyectosCompanias,
} from '../../api/companias';
import { measurePerformance } from '../../utils/performanceMonitor';

function normal(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function matchesSelectedValues(selected = [], candidates = []) {
  if (!selected.length) return true;
  const normalizedCandidates = new Set(candidates.map(normal).filter(Boolean));
  return selected.some((value) => normalizedCandidates.has(normal(value)));
}

function filterCompanyRows(companies = [], filters = {}) {
  return companies.filter((company) => matchesSelectedValues(filters.regiones, [
    company.profile?.region,
    ...company.projects.map((project) => project.region),
  ]) && matchesSelectedValues(filters.estados, [
    ...company.states,
    ...company.addresses.map((address) => address.state),
  ]) && matchesSelectedValues(filters.generos, [
    company.profile?.genre,
    ...company.projects.map((project) => project.genero),
  ]) && matchesSelectedValues(filters.sectores, company.projects.map((project) => project.sector)));
}

function initials(name = '') {
  return String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'CO';
}

function dateOf(project) {
  const value = project?.fechaPublicacionDate || project?.fechaInicioDate || project?.fechaPublicacion || project?.fechaInicio;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatProjectDate(value) {
  let date = value;
  if (!(date instanceof Date)) {
    const raw = String(value || '').trim();
    const localMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (localMatch) date = new Date(Number(localMatch[3]), Number(localMatch[2]) - 1, Number(localMatch[1]));
    else if (isoMatch) date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    else date = new Date(raw);
  }
  return date instanceof Date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '')
    : 'Sin fecha';
}

function projectLocation(project = {}) {
  return String(project.localizacion || '').trim()
    || [project.municipio, project.estado].filter(Boolean).join(', ')
    || 'Ubicación por confirmar';
}

function genreData(company) {
  const counts = new Map();
  company?.projects?.forEach((project) => {
    const name = String(project.genero || '').trim();
    if (!name) return;
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  const total = company?.projectCount || 0;
  if (!counts.size && company?.profile?.genre && total) {
    counts.set(company.profile.genre, total);
  }
  return [...counts.entries()].map(([name, value]) => ({
    name, value, percent: total ? Math.round((value / total) * 100) : 0, color: getCompanyGenreColor(name),
  })).sort((a, b) => b.value - a.value).slice(0, 5);
}

function stateData(company) {
  const counts = new Map();
  company?.projects?.forEach((project) => {
    const name = String(project.estado || 'Sin estado').trim() || 'Sin estado';
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts.entries()].map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value).slice(0, 5);
}

function recentActivity(company) {
  const entries = (company?.projects || []).map((project) => ({ project, date: dateOf(project) })).filter(({ date }) => date)
    .sort((a, b) => b.date - a.date);
  const end = entries[0]?.date || new Date();
  const currentStart = new Date(end); currentStart.setMonth(currentStart.getMonth() - 12);
  const previousStart = new Date(end); previousStart.setMonth(previousStart.getMonth() - 24);
  const current = entries.filter(({ date }) => date >= currentStart);
  const previous = entries.filter(({ date }) => date >= previousStart && date < currentStart);
  const sum = (items, field) => items.reduce((total, { project }) => total + (Number(project[field]) || 0), 0);
  const change = (now, before) => before ? `${Math.round(((now - before) / before) * 100) >= 0 ? '+' : ''}${Math.round(((now - before) / before) * 100)}%` : now ? 'Nuevo' : '—';
  return {
    projects: { value: current.length, change: change(current.length, previous.length) },
    investment: { value: sum(current, 'inversion'), change: change(sum(current, 'inversion'), sum(previous, 'inversion')) },
    surface: { value: sum(current, 'superficie'), change: change(sum(current, 'superficie'), sum(previous, 'superficie')) },
  };
}

function opportunitySignal(company, alertEnabled = false) {
  const activity = recentActivity(company);
  const contacts = (company?.linkedinContacts?.length || 0) + (company?.datasetContacts?.length || 0);
  let score = 0;
  if (activity.projects.value > 0) score += 34;
  if (activity.investment.value >= 100000000) score += 22;
  else if (activity.investment.value > 0) score += 12;
  if (contacts >= 3) score += 22;
  else if (contacts > 0) score += 11;
  if ((company?.stateCount || 0) >= 3) score += 12;
  if (alertEnabled) score += 10;
  const level = score >= 66 ? 'Alta' : score >= 38 ? 'Media' : 'En observación';
  const tone = score >= 66 ? 'high' : score >= 38 ? 'medium' : 'low';
  const reasons = [
    activity.projects.value ? 'actividad reciente' : '',
    contacts ? `${contacts} contacto${contacts === 1 ? '' : 's'}` : '',
    alertEnabled ? 'seguimiento activo' : '',
  ].filter(Boolean);
  return { score, level, tone, reasons };
}

function recentProjects(company) {
  return [...(company?.projects || [])]
    .sort((a, b) => (dateOf(b)?.getTime() || 0) - (dateOf(a)?.getTime() || 0) || (Number(b.inversion) || 0) - (Number(a.inversion) || 0))
    .slice(0, 5);
}

function normalizeProjectIdentity(value = '') {
  return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

function matchesFocusedProject(project, projectKey) {
  const requestedKey = normalizeProjectIdentity(projectKey);
  if (!requestedKey) return false;
  return [project?.id, project?.clave]
    .some((value) => normalizeProjectIdentity(value) === requestedKey);
}

function Metric({ label, value, detail }) {
  return <Box className="company-metric"><Text>{label}</Text><Text>{value}</Text><Text>{detail}</Text></Box>;
}

function CompanyProfileKpis({ company }) {
  const profile = company?.profile || {};
  const kpis = [
    { label: 'Rol principal', value: profile.role, icon: FiBriefcase },
    { label: 'Escala de actividad', value: profile.activityScale, icon: FiBarChart2 },
    { label: 'Género constructivo', value: profile.genre, icon: FiHome },
    { label: 'Cobertura geográfica', value: profile.region, detail: 'Región principal', icon: FiMapPin },
    { label: 'Presencia territorial', value: profile.presence, detail: `${formatNumber(company?.stateCount)} estados reportados`, icon: FiShare2 },
  ];
  return <Box className="company-profile-kpis" aria-label="Perfil de la compañía">
    <Text className="company-profile-kpis-title">Perfil</Text>
    <Box className="company-profile-kpis-grid">
      {kpis.map(({ label, value, detail, icon: Icon }) => <Flex key={label} className="company-profile-kpi" align="center" gap={2.5}>
        <Flex className="company-profile-kpi-icon" align="center" justify="center"><Icon size={18} /></Flex>
        <Box flex="1" minW={0}><Text>{label}</Text><Text>{value || 'Por confirmar'}</Text>{detail && <Text>{detail}</Text>}</Box>
        <FiChevronRight size={14} aria-hidden="true" />
      </Flex>)}
    </Box>
  </Box>;
}

const QUICK_FILTERS = [
  { key: 'generos', field: 'genero', label: 'Géneros' },
  { key: 'sectores', field: 'sector', label: 'Sectores' },
];

const COMPANY_LIST_ROW_HEIGHT = 76;
const COMPANY_LIST_OVERSCAN = 8;
const FEATURED_CONTACTS_LIMIT = 8;

const ESTADOS_POR_REGION_CATALOG = {
  Oeste: ['Jalisco', 'Colima', 'Michoacán', 'Nayarit', 'Aguascalientes'],
  Noroeste: ['Baja California', 'Baja California Sur', 'Sonora', 'Sinaloa', 'Chihuahua', 'Durango'],
  Centro: ['Ciudad de México', 'Estado de México', 'Hidalgo', 'Morelos', 'Puebla', 'Querétaro', 'Tlaxcala'],
  Sureste: ['Guerrero', 'Oaxaca', 'Veracruz', 'Tabasco', 'Chiapas', 'Campeche', 'Yucatán', 'Quintana Roo'],
  Noreste: ['Nuevo León', 'Coahuila', 'Tamaulipas', 'San Luis Potosí', 'Zacatecas'],
};

const ESTADO_A_REGION = new Map(
  Object.entries(ESTADOS_POR_REGION_CATALOG).flatMap(([region, states]) => (
    states.map((state) => [normal(state), region])
  )),
);

function statesByRegion(obras = []) {
  const grouped = new Map();
  obras.forEach((obra) => {
    const state = String(obra?.estado || '').trim();
    if (!state) return;
    const regionFromData = String(obra?.region || '').trim();
    const inferredRegion = ESTADO_A_REGION.get(normal(state));
    const region = regionFromData || inferredRegion || 'Sin región';
    const key = normal(region);
    if (!grouped.has(key)) grouped.set(key, { label: region, states: new Map() });
    grouped.get(key).states.set(normal(state), state);
  });
  return [...grouped.values()]
    .map(({ label, states }) => ({ label, states: [...states.values()].sort((first, second) => first.localeCompare(second, 'es-MX')) }))
    .sort((first, second) => first.label.localeCompare(second.label, 'es-MX'));
}

function CompanyFilters({ obras, filtros, onApplyFilters }) {
  const [open, setOpen] = useState(false);
  const [expandedRegion, setExpandedRegion] = useState('');
  const rootRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const dismiss = (event) => {
      if (event.type === 'keydown') {
        if (event.key === 'Escape') setOpen(false);
        return;
      }
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismiss);
    };
  }, [open]);
  const options = useMemo(() => QUICK_FILTERS.map((filter) => ({
    ...filter,
    values: [...new Set((obras || []).map((obra) => String(obra?.[filter.field] || '').trim()).filter(Boolean))]
      .sort((first, second) => first.localeCompare(second, 'es-MX'))
      .slice(0, 12),
  })), [obras]);
  const regionOptions = useMemo(() => statesByRegion(obras), [obras]);
  const selectedCount = ['regiones', 'estados', ...QUICK_FILTERS.map(({ key }) => key)]
    .reduce((total, key) => total + (filtros?.[key] || []).length, 0);
  const toggle = (key, value) => onApplyFilters?.((current) => {
    const selected = current?.[key] || [];
    return {
      ...current,
      [key]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
    };
  });
  const clear = () => onApplyFilters?.((current) => ({
    ...current,
    regiones: [],
    estados: [],
    ...Object.fromEntries(QUICK_FILTERS.map(({ key }) => [key, []])),
  }));
  const toggleRegion = (region, states) => onApplyFilters?.((current) => {
    const regions = current?.regiones || [];
    const selectedStates = current?.estados || [];
    const allSelected = regions.includes(region) && states.every((state) => selectedStates.includes(state));
    return {
      ...current,
      regiones: allSelected ? regions.filter((item) => item !== region) : [...new Set([...regions, region])],
      estados: allSelected ? selectedStates.filter((state) => !states.includes(state)) : [...new Set([...selectedStates, ...states])],
    };
  });
  const toggleState = (region, state, states) => onApplyFilters?.((current) => {
    const selectedStates = current?.estados || [];
    const nextStates = selectedStates.includes(state)
      ? selectedStates.filter((item) => item !== state)
      : [...selectedStates, state];
    const hasSelectedChild = states.some((item) => nextStates.includes(item));
    const regions = current?.regiones || [];
    return {
      ...current,
      estados: nextStates,
      regiones: hasSelectedChild ? [...new Set([...regions, region])] : regions.filter((item) => item !== region),
    };
  });

  return <Box ref={rootRef} className="company-filter-wrap">
    <button type="button" className={`company-filter-trigger${open || selectedCount ? ' active' : ''}`} onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="company-quick-filters">
      <FiFilter size={14} /> <span>Filtrar</span>{selectedCount > 0 && <b>{selectedCount}</b>}
    </button>
    {open && <Box id="company-quick-filters" className="company-filter-popover">
      <Flex className="company-filter-popover-head" align="center" justify="space-between"><Box><Text>Filtrar compañías</Text><Text>Aplica los mismos criterios al portafolio.</Text></Box>{selectedCount > 0 && <button type="button" onClick={clear}>Limpiar</button>}</Flex>
      <Box className="company-region-filter"><Text>Región y estados</Text>{regionOptions.map(({ label, states }) => {
        const selectedStates = filtros?.estados || [];
        const selectedRegions = filtros?.regiones || [];
        const childrenCount = states.filter((state) => selectedStates.includes(state)).length;
        const selected = selectedRegions.includes(label) && childrenCount === states.length;
        const partial = selectedRegions.includes(label) && childrenCount > 0 && !selected;
        const expanded = expandedRegion === label;
        return <Box key={label} className={`company-region-option${selected || partial ? ' selected' : ''}`}><Flex align="center"><button type="button" className="company-region-check" aria-label={`Seleccionar región ${label}`} aria-pressed={selected} onClick={() => { setExpandedRegion(label); toggleRegion(label, states); }}>{selected ? '✓' : partial ? '—' : ''}</button><button type="button" className="company-region-label" onClick={() => setExpandedRegion((current) => current === label ? '' : label)}>{label}<Text as="span">{childrenCount ? `${childrenCount}/${states.length}` : states.length}</Text><FiChevronRight className={expanded ? 'expanded' : ''} size={14} /></button></Flex>{expanded && <Box className="company-region-children">{states.map((state) => <button type="button" key={state} className={(filtros?.estados || []).includes(state) ? 'selected' : ''} onClick={() => toggleState(label, state, states)}>{state}</button>)}</Box>}</Box>;
      })}</Box>
      {options.map((filter) => filter.values.length ? <Box key={filter.key} className="company-filter-group"><Text>{filter.label}</Text><Flex wrap="wrap" gap={1.5}>{filter.values.map((value) => {
        const active = (filtros?.[filter.key] || []).includes(value);
        return <button type="button" key={value} className={active ? 'selected' : ''} onClick={() => toggle(filter.key, value)}>{value}</button>;
      })}</Flex></Box> : null)}
    </Box>}
  </Box>;
}

function CompanyList({ companies, selected, onSelect, onPrefetch, loading, error, onRetry, companyProjects, filtros, onApplyFilters }) {
  const [query, setQuery] = useState('');
  const listRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [listHeight, setListHeight] = useState(560);
  const directoryCompanies = companies;
  const visible = useMemo(() => {
    const search = normal(query);
    return !search ? directoryCompanies : directoryCompanies.filter((company) => [company.name, company.rfc, company.clave, ...company.states].some((value) => normal(value).includes(search)));
  }, [directoryCompanies, query]);
  const portfolio = useMemo(() => ({
    projects: companies.reduce((total, company) => total + company.projectCount, 0),
    reachable: companies.filter((company) => company.linkedinContacts?.length || company.datasetContacts?.length).length,
  }), [companies]);
  useEffect(() => {
    const element = listRef.current;
    if (!element) return undefined;
    const updateHeight = () => setListHeight(element.clientHeight || 560);
    updateHeight();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateHeight);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, []);
  const handleQueryChange = (event) => {
    setQuery(event.target.value);
    setScrollTop(0);
    if (listRef.current) listRef.current.scrollTop = 0;
  };
  const visibleStart = Math.max(0, Math.floor(scrollTop / COMPANY_LIST_ROW_HEIGHT) - COMPANY_LIST_OVERSCAN);
  const visibleEnd = Math.min(visible.length, visibleStart + Math.ceil(listHeight / COMPANY_LIST_ROW_HEIGHT) + (COMPANY_LIST_OVERSCAN * 2));
  const virtualCompanies = visible.slice(visibleStart, visibleEnd);
  return <Box className="company-directory">
    <Flex className="company-directory-title" align="center" justify="space-between"><Text>Compañías <Text as="span">({formatNumber(directoryCompanies.length)})</Text></Text><CompanyFilters obras={companyProjects} filtros={filtros} onApplyFilters={onApplyFilters} /></Flex>
    <Flex className="company-search" align="center" gap={2}><FiSearch size={14} /><input value={query} onChange={handleQueryChange} placeholder="Buscar compañía…" aria-label="Buscar compañía" /></Flex>
    <Flex className="company-directory-summary" align="center" gap={2}><Box><Text>{formatNumber(portfolio.projects)}</Text><Text>obras activas</Text></Box><Box><Text>{formatNumber(portfolio.reachable)}</Text><Text>con contacto</Text></Box></Flex>
    <Box ref={listRef} className="company-list" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
      {loading && !companies.length && <Flex className="company-empty" direction="column" align="center" gap={2}><Spinner size="sm" color="#D95B27" /><Text>Preparando compañías…</Text></Flex>}
      {!loading && error && !companies.length && <Flex className="company-empty company-load-error" direction="column" align="center" gap={2}><FiBriefcase size={20} /><Text>{error}</Text><button type="button" onClick={onRetry}><FiRefreshCw size={13} /> Reintentar</button></Flex>}
      {!loading && !error && !visible.length && <Flex className="company-empty" direction="column" align="center" gap={2}><FiBriefcase size={20} /><Text>No encontramos compañías.</Text></Flex>}
      {!!visible.length && <Box className="company-list-virtual" style={{ height: `${visible.length * COMPANY_LIST_ROW_HEIGHT}px` }}><Box style={{ transform: `translateY(${visibleStart * COMPANY_LIST_ROW_HEIGHT}px)` }}>{virtualCompanies.map((company) => <button type="button" key={company.key} className={`company-list-item${selected === company.key ? ' selected' : ''}`} onMouseEnter={() => onPrefetch?.(company.clave)} onFocus={() => onPrefetch?.(company.clave)} onClick={() => onSelect(company.key)} aria-pressed={selected === company.key}>
        <span className="company-list-avatar">{initials(company.name)}</span><span><strong>{company.name}</strong><small>{formatNumber(company.projectCount)} obras · {formatCompactInvestment(company.totalInvestment)}</small><small>{formatNumber(company.stateCount)} {company.stateCount === 1 ? 'estado' : 'estados'}</small></span>
      </button>)}</Box></Box>}
    </Box>
  </Box>;
}

function Genres({ company }) {
  const data = genreData(company);
  return <Box className="company-card company-genre"><Text className="company-card-title">Actividad por género</Text>{data.length ? <Flex align="center" gap={3} className="company-genre-body">
    <Box className="company-pie"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="92%" paddingAngle={data.length > 1 ? 2 : 0} stroke="none">{data.map((item) => <Cell key={item.name} fill={item.color} />)}<Label value={formatNumber(company.projectCount)} position="center" fill="var(--cl-text-strong)" style={{ fontSize: 22, fontWeight: 800 }} /><Label value="obras" position="center" dy={20} fill="var(--cl-text-muted)" style={{ fontSize: 10, fontWeight: 700 }} /></Pie><Tooltip formatter={(value, name) => [`${value} obras`, name]} /></PieChart></ResponsiveContainer></Box>
    <Box className="company-legend">{data.map((item) => <Flex key={item.name} align="center" gap={2}><span style={{ background: item.color }} /><Text lineClamp={1}>{item.name}</Text><Text>{item.percent}%</Text></Flex>)}</Box>
  </Flex> : <Text className="company-card-empty">Aún no hay géneros para mostrar.</Text>}</Box>;
}

function States({ company }) {
  const data = stateData(company);
  const max = Math.max(...data.map((item) => item.value), 1);
  if (data.length === 1) {
    const state = data[0];
    const concentration = company.projectCount ? Math.round((state.value / company.projectCount) * 100) : 0;
    return <Box className="company-card company-states-single"><Text className="company-card-title">Presencia principal</Text><Box><Text>{state.name}</Text><Flex align="end" gap={2}><Text>{formatNumber(state.value)}</Text><Text>obras</Text></Flex><Text>{concentration}% de la actividad de esta compañía se concentra aquí.</Text></Box></Box>;
  }
  if (data.length === 2) {
    return <Box className="company-card company-states-pair"><Text className="company-card-title">Presencia en estados</Text><Flex className="company-state-pair-body" gap={3}>{data.map((item) => <Box key={item.name}><Text>{item.name}</Text><Text>{formatNumber(item.value)}</Text><Text>{company.projectCount ? Math.round((item.value / company.projectCount) * 100) : 0}% de obras</Text><progress value={item.value} max={max} aria-label={`${item.name}: ${item.value} obras`} /></Box>)}</Flex></Box>;
  }
  return <Box className="company-card company-states-multiple"><Text className="company-card-title">Principales estados</Text>{data.length ? <Box className="company-states-list">{data.map((item) => { const percentage = company.projectCount ? Math.round((item.value / company.projectCount) * 100) : 0; return <Flex key={item.name} className="company-state-row" align="center" gap={2}><Text title={item.name} lineClamp={1}>{item.name}</Text><progress value={item.value} max={max} aria-label={`${item.name}: ${item.value} obras`} /><Text>{formatNumber(item.value)} <Text as="span">{percentage}%</Text></Text></Flex>; })}</Box> : <Text className="company-card-empty">Aún no hay estados para mostrar.</Text>}</Box>;
}

function Activity({ company, alertEnabled }) {
  const activity = recentActivity(company);
  const opportunity = opportunitySignal(company, alertEnabled);
  const rows = [['Nuevas obras', formatNumber(activity.projects.value), activity.projects.change], ['Inversión reciente', formatCompactInvestment(activity.investment.value), activity.investment.change]];
  return <Box className="company-card company-activity-card"><Text className="company-card-title">Actividad reciente <Text as="span">(12 meses)</Text></Text><Box className="company-activity">{rows.map(([label, value, change]) => <Flex key={label} align="center"><Text>{label}</Text><Text>{value}</Text><Text className={change.startsWith('-') ? 'negative' : ''}>{change}</Text></Flex>)}</Box><Flex className={`company-opportunity ${opportunity.tone}`} align="center" gap={2}><span aria-hidden="true" /><Box flex="1" minW={0}><Text>Semáforo de oportunidad</Text><Text>{opportunity.reasons.join(' · ') || 'Sin señales suficientes aún'}</Text></Box><Box textAlign="right"><Text>{opportunity.level}</Text><Text>{opportunity.score}/100</Text></Box></Flex></Box>;
}

function Projects({ company, onViewFicha, onShowAll, projectFocus, loadState, loadError, onRetry }) {
  const projects = recentProjects(company);
  const focusRef = useRef(null);
  useEffect(() => {
    if (!projectFocus?.id || !focusRef.current) return undefined;
    const revealTimer = window.setTimeout(() => {
      const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      focusRef.current?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }, 80);
    return () => window.clearTimeout(revealTimer);
  }, [projectFocus?.id]);

  return <Box className="company-bottom-card company-project-card"><Flex className="company-bottom-title" align="center" justify="space-between"><Text>Proyectos recientes</Text><Flex align="center" gap={3} flexShrink={0}><Text className="company-project-count">{formatNumber(company.projectCount)} obras</Text>{projects.length > 0 && <button type="button" className="company-bottom-link company-bottom-header-link" onClick={onShowAll}>Ver todos <FiArrowRight size={14} /></button>}</Flex></Flex><Box className="company-project-head"><Text>Proyecto</Text><Text>Ubicación</Text><Text>Inversión</Text><Text>Publicación</Text><Text>Inicio</Text><Text aria-hidden="true" /></Box><Box className="company-project-list">{projects.map((project, index) => {
    const isFocused = matchesFocusedProject(project, projectFocus?.projectKey);
    const projectId = project.id || project.clave || `${project.proyecto}-${index}`;
    const location = projectLocation(project);
    return <button type="button" key={`${projectId}:${isFocused ? projectFocus.id : 'default'}`} ref={isFocused ? focusRef : undefined} className={`company-project-row${isFocused ? ' is-arrival-focus' : ''}`} onClick={() => onViewFicha?.(project)} title={`Abrir ficha técnica de ${project.proyecto || project.clave}`}><span className="company-project-main"><strong>{project.proyecto || 'Proyecto sin nombre'}</strong><small>Proyecto <b>{project.clave || 'por confirmar'}</b></small></span><span className="company-project-address" title={location}><span>{location}</span>{project.estado && <small>{project.estado}</small>}</span><span className="company-project-investment">{formatCompactInvestment(project.inversion)}</span><span className="company-project-date">{formatProjectDate(project.fechaPublicacionDate || project.fechaPublicacion)}</span><span className="company-project-date">{formatProjectDate(project.fechaInicioDate || project.fechaInicio)}</span><FiArrowRight className="company-project-open" size={15} aria-hidden="true" /></button>;
  })}{loadState === 'loading' && <Flex className="company-card-empty" align="center" justify="center" gap={2}><Spinner size="xs" color="#D95B27" /><Text>Cargando proyectos…</Text></Flex>}{loadState === 'error' && <Flex className="company-project-error" direction="column" align="center" justify="center" gap={2}><Text>{loadError}</Text><button type="button" onClick={onRetry}><FiRefreshCw size={13} /> Reintentar</button></Flex>}{loadState === 'success' && !projects.length && <Text className="company-card-empty">No hay proyectos registrados para esta compañía.</Text>}</Box></Box>;
}

function contactPhones(contact = {}) {
  return [...new Set([contact.phone, contact.phone2].map((value) => String(value || '').trim()).filter(Boolean))];
}

function datasetContactDetail(contact = {}) {
  const phones = contactPhones(contact);
  const extension = String(contact.extension || '').trim();
  return [
    contact.email && `Correo: ${contact.email}`,
    ...phones.map((phone) => `Tel.: ${extension ? `${phone} ext. ${extension}` : phone}`),
    contact.role,
  ]
    .filter(Boolean)
    .join(' · ');
}

function hasDatasetContactMethod(contact = {}) {
  return Boolean(String(contact.email || '').trim() || contactPhones(contact).length);
}

function prioritizedCompanyContacts(company = {}, limit = Number.POSITIVE_INFINITY) {
  const contacts = [];
  const append = (items, source, shouldInclude = () => true) => {
    for (const contact of items || []) {
      if (!shouldInclude(contact)) continue;
      contacts.push({ ...contact, source });
      if (contacts.length >= limit) return true;
    }
    return false;
  };

  const datasetContacts = company.datasetContacts || [];
  if (append(datasetContacts, 'contacto', hasDatasetContactMethod)) return contacts;
  if (append(datasetContacts, 'contacto', (contact) => !hasDatasetContactMethod(contact))) return contacts;
  append(company.linkedinContacts || [], 'linkedin');
  return contacts;
}

function Contacts({ company, onShowAll, isLoading = false }) {
  // La tarjeta resume el perfil. La lista completa se monta sólo al abrir
  // "Ver todos", evitando pintar cientos de filas al cambiar de compañía.
  const contacts = useMemo(
    () => prioritizedCompanyContacts(company, FEATURED_CONTACTS_LIMIT),
    [company],
  );
  const totalContacts = (company.datasetContacts?.length || 0) + (company.linkedinContacts?.length || 0);
  return <Box className="company-bottom-card company-contacts-card"><Flex className="company-bottom-title" align="center" justify="space-between"><Text>Contactos destacados</Text><Flex align="center" gap={3} flexShrink={0}><Text>{isLoading ? '…' : formatNumber(totalContacts)}</Text>{totalContacts > 0 && <button type="button" className="company-bottom-link company-bottom-header-link" onClick={onShowAll}>Ver todos <FiArrowRight size={14} /></button>}</Flex></Flex><Box className="company-contacts">{contacts.map((contact, index) => {
    const phones = contactPhones(contact);
    const href = contact.source === 'linkedin' ? contact.url : contact.email ? `mailto:${contact.email}` : '';
    return <Flex key={contact.key || `${contact.name}-${index}`} align="center" gap={2.5}><Flex className={`company-contact-avatar${contact.source === 'linkedin' ? ' is-linkedin' : ''}`} align="center" justify="center">{contact.source === 'linkedin' ? <FiLinkedin size={15} /> : initials(contact.name)}</Flex><Box flex="1" minW={0}><Text lineClamp={1}>{contact.name}</Text><Text lineClamp={contact.source === 'linkedin' ? 1 : 2}>{contact.source === 'linkedin' ? `LinkedIn · ${contact.role || 'Perfil profesional'}` : datasetContactDetail(contact) || 'Contacto de compañía'}</Text></Box>{contact.source === 'linkedin' ? (href ? <a href={href} target="_blank" rel="noreferrer" aria-label={`Abrir contacto de ${contact.name}`}><FiExternalLink size={16} /></a> : <FiLinkedin size={17} className="company-link-muted" />) : <Flex className="company-contact-actions" gap={1}>{contact.email && <a href={`mailto:${contact.email}`} aria-label={`Enviar correo a ${contact.name}`}><FiMail size={15} /></a>}{phones[0] && <a href={`tel:${phones[0].replace(/\s+/g, '')}`} aria-label={`Llamar a ${contact.name}`}><FiPhone size={14} /></a>}</Flex>}</Flex>;
  })}{!contacts.length && (isLoading ? <Flex className="company-card-empty" align="center" justify="center" gap={2}><Spinner size="xs" color="#D95B27" /><Text>Cargando perfiles y contactos…</Text></Flex> : <Text className="company-card-empty">No hay contactos disponibles aún.</Text>)}</Box></Box>;
}

function CompanyDirectoryDialog({ mode, company, onClose, onViewFicha }) {
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (!mode) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [mode, onClose]);
  if (!mode || !company) return null;

  const search = normal(query);
  const projects = [...(company.projects || [])]
    .sort((a, b) => (dateOf(b)?.getTime() || 0) - (dateOf(a)?.getTime() || 0))
    .filter((project) => !search || [project.proyecto, project.clave, project.localizacion, project.estado, project.municipio, project.genero]
      .some((value) => normal(value).includes(search)));
  const contacts = prioritizedCompanyContacts(company)
    .filter((contact) => !search || [contact.name, contact.role, contact.email, contact.url, contact.phone, contact.phone2]
    .some((value) => normal(value).includes(search)));
  const isProjects = mode === 'projects';

  return <Box className="company-dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <Box className="company-dialog" role="dialog" aria-modal="true" aria-label={isProjects ? `Proyectos de ${company.name}` : `Contactos de ${company.name}`} onMouseDown={(event) => event.stopPropagation()}>
      <Flex className="company-dialog-header" align="center" gap={3}>
        <Flex className="company-dialog-mark" align="center" justify="center">{initials(company.name)}</Flex>
        <Box flex="1" minW={0}><Text>{isProjects ? 'Todos los proyectos' : 'Todos los contactos'}</Text><Text lineClamp={1}>{company.name} · {formatNumber(isProjects ? company.projectCount : contacts.length)} registros</Text></Box>
        <button type="button" onClick={onClose} aria-label="Cerrar"><FiX size={19} /></button>
      </Flex>
      <Flex className="company-dialog-search" align="center" gap={2}><FiSearch size={15} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isProjects ? 'Buscar proyecto, clave o ubicación…' : 'Buscar contacto, puesto o LinkedIn…'} /><Text>{formatNumber(isProjects ? projects.length : contacts.length)}</Text></Flex>
      {isProjects ? <Box className="company-dialog-projects-wrap"><Box className="company-dialog-project-head"><span>Proyecto</span><span>Ubicación</span><span>Inversión</span><span>Publicación</span><span>Inicio</span><span /></Box><Box className="company-dialog-list company-dialog-projects">{projects.map((project, index) => <button type="button" key={project.id || project.clave || `${project.proyecto}-${index}`} onClick={() => onViewFicha?.(project)}><span><strong>{project.proyecto || 'Proyecto sin nombre'}</strong><small>Proyecto {project.clave || 'por confirmar'}</small></span><span title={projectLocation(project)}>{projectLocation(project)}{project.estado && <small>{project.estado}</small>}</span><span>{formatCompactInvestment(project.inversion)}</span><span>{formatProjectDate(project.fechaPublicacionDate || project.fechaPublicacion)}</span><span>{formatProjectDate(project.fechaInicioDate || project.fechaInicio)}</span><FiArrowRight size={16} /></button>)}{!projects.length && <Text className="company-dialog-empty">No hay proyectos que coincidan con la búsqueda.</Text>}</Box></Box> : <Box className="company-dialog-list company-dialog-contacts">{contacts.map((contact, index) => {
        const phones = contactPhones(contact);
        return <Flex key={contact.key || `${contact.name}-${index}`} align="center" gap={3}><Flex className={`company-dialog-contact-avatar${contact.source === 'linkedin' ? ' is-linkedin' : ''}`} align="center" justify="center">{contact.source === 'linkedin' ? <FiLinkedin size={18} /> : initials(contact.name)}</Flex><Box flex="1" minW={0}><Text>{contact.name}</Text><Text>{contact.source === 'linkedin' ? `LinkedIn · ${contact.role || 'Perfil profesional'}` : contact.role || 'Contacto de compañía'}</Text>{contact.source !== 'linkedin' && <Text>{[contact.email, ...phones].filter(Boolean).join(' · ') || 'Sin correo ni teléfono registrado'}</Text>}</Box>{contact.source === 'linkedin' ? (contact.url && <a href={contact.url} target="_blank" rel="noreferrer">Abrir LinkedIn <FiExternalLink size={14} /></a>) : <Flex className="company-dialog-contact-actions" gap={2}>{contact.email && <a href={`mailto:${contact.email}`}>Correo <FiMail size={14} /></a>}{phones[0] && <a href={`tel:${phones[0].replace(/\s+/g, '')}`}>Llamar <FiPhone size={14} /></a>}</Flex>}</Flex>;
      })}{!contacts.length && <Text className="company-dialog-empty">No hay contactos que coincidan con la búsqueda.</Text>}</Box>}
    </Box>
  </Box>;
}

function Dashboard({ company, isLoadingCompanies, onViewFicha, onShowProjects, onShowContacts, projectFocus, projectLoadState, projectLoadError, onRetryProjects }) {
  if (!company) return <Flex className="company-dashboard-empty" direction="column" align="center" justify="center"><FiBriefcase size={28} /><Text>Selecciona una compañía para ver su actividad.</Text></Flex>;
  const location = company.addresses?.[0]?.formatted || company.states.join(' · ') || 'Ubicación por confirmar';
  const companyPhone = company.phones?.[0] || '';
  const companyEmail = company.emails?.[0] || '';
  return <Box className="company-dashboard">
    <Flex className="company-profile" align="center" gap={3.5}>
      <Flex className="company-mark" align="center" justify="center">{initials(company.name)}</Flex>
      <Box flex="1" minW={0}>
        <Text className="company-name" lineClamp={1}>{company.name}</Text>
        <Flex className="company-identity-row" align="center" gap={2}>
          <Text className="company-role" lineClamp={1}>{company.roles[0] || 'Compañía constructora'}</Text>
          {company.clave && <Text className="company-key">Clave de compañía: <Text as="span">{company.clave}</Text></Text>}
        </Flex>
        <Flex className="company-context-row" align="center" gap={3}>
          <Flex className="company-location" align="center" gap={1.5} minW={0}>
            <FiMapPin size={13} />
            <Text>{location}</Text>
          </Flex>
          {companyPhone && <a className="company-context-phone" href={`tel:${companyPhone.replace(/\s+/g, '')}`}><FiPhone size={12} /><Text>{companyPhone}</Text></a>}
        </Flex>
        {companyEmail && <Flex className="company-contact-info" align="center"><a href={`mailto:${companyEmail}`}><FiMail size={12} /><Text lineClamp={1}>{companyEmail}</Text></a></Flex>}
      </Box>
    </Flex>
    <Box className="company-metrics"><Metric label="Obras" value={formatNumber(company.projectCount)} detail="Proyectos publicados" /><Metric label="Inversión total" value={formatCompactInvestment(company.totalInvestment)} detail="Monto identificado" /><Metric label="Estados" value={formatNumber(company.stateCount)} detail="Donde tiene presencia" /><Metric label="Superficie total" value={`${formatNumber(company.totalSurface)} m²`} detail="Construidos" /></Box>
    <CompanyProfileKpis company={company} />
    <Box className="company-insights"><Genres company={company} /><States company={company} /><Activity company={company} alertEnabled={false} /></Box><Box className="company-bottom"><Projects company={company} onViewFicha={onViewFicha} onShowAll={onShowProjects} projectFocus={projectFocus} loadState={projectLoadState} loadError={projectLoadError} onRetry={onRetryProjects} /><Contacts company={company} onShowAll={onShowContacts} isLoading={isLoadingCompanies} /></Box>
  </Box>;
}

export default function CompaniasView({ companyRelationships = [], isLoadingCompanies = false, companiesError = '', onRetryCompanies, isDarkMode = false, onViewFicha, companyDetailRequest = null }) {
  const [selectedId, setSelectedId] = useState();
  const [projectFocus, setProjectFocus] = useState(null);
  const [openDirectory, setOpenDirectory] = useState(null);
  const [projectsByCompany, setProjectsByCompany] = useState({});
  const [projectsRetryToken, setProjectsRetryToken] = useState(0);
  const projectsPrefetchRef = useRef(null);
  // Este explorador no hereda los filtros de Proyectos. Sus filtros viven
  // sólo aquí y trabajan sobre el catálogo completo disponible.
  const [companyFilters, setCompanyFilters] = useState({
    regiones: [],
    estados: [],
    generos: [],
    sectores: [],
  });
  // El catálogo consolidado de ws_cl_companias ya no incluye el detalle de
  // proyectos. Construimos primero las compañías y usamos su perfil para los
  // filtros mientras llega el método de detalle por clave de compañía.
  const allCompanies = useMemo(
    () => measurePerformance(
      'companies.build-rows',
      { relationships: companyRelationships.length },
      () => buildCompanyRows(companyRelationships)
    ),
    [companyRelationships]
  );
  const companies = useMemo(
    () => measurePerformance(
      'companies.apply-filters',
      { records: allCompanies.length },
      () => filterCompanyRows(allCompanies, companyFilters)
    ),
    [allCompanies, companyFilters]
  );
  const companyProjects = useMemo(() => allCompanies.flatMap((company) => [
    ...company.projects,
    {
      id: `company-profile:${company.key}`,
      region: company.profile?.region,
      estado: company.addresses?.[0]?.state,
      genero: company.profile?.genre,
    },
  ]), [allCompanies]);
  useEffect(() => {
    if (isLoadingCompanies || !allCompanies.length) return undefined;
    const controller = precalentarProyectosCompanias(
      allCompanies.filter((item) => item.projectCount > 0).map((item) => item.clave)
    );
    projectsPrefetchRef.current = controller;
    return () => {
      controller.cancel();
      if (projectsPrefetchRef.current === controller) projectsPrefetchRef.current = null;
    };
  }, [allCompanies, isLoadingCompanies]);
  const handledCompanyRequest = useRef('');
  useEffect(() => {
    if (!companyDetailRequest?.id || handledCompanyRequest.current === companyDetailRequest.id) return;
    const requestedName = normal(companyDetailRequest.name);
    const requestedClave = normal(companyDetailRequest.clave);
    const requestedRfc = normal(companyDetailRequest.rfc);
    const requestedProjectKey = String(companyDetailRequest.projectKey || '').trim();
    const requestedCompany = companies.find((item) => (
      (requestedClave && normal(item.clave) === requestedClave)
      || (requestedRfc && normal(item.rfc) === requestedRfc)
      || (requestedName && normal(item.name) === requestedName)
    ));
    if (!requestedCompany) return;

    handledCompanyRequest.current = companyDetailRequest.id;
    let clearProjectFocusTimer = null;
    const selectionTimer = window.setTimeout(() => {
      setSelectedId(requestedCompany.key);
      setOpenDirectory(null);
      if (requestedProjectKey) {
        setProjectFocus({ id: companyDetailRequest.id, projectKey: requestedProjectKey });
        clearProjectFocusTimer = window.setTimeout(() => {
          setProjectFocus((current) => current?.id === companyDetailRequest.id ? null : current);
        }, 4200);
      } else {
        setProjectFocus(null);
      }
    }, 0);
    return () => {
      window.clearTimeout(selectionTimer);
      if (clearProjectFocusTimer) window.clearTimeout(clearProjectFocusTimer);
    };
  }, [companies, companyDetailRequest]);
  const activeId = companies.some((item) => item.key === selectedId) ? selectedId : companies[0]?.key;
  const baseCompany = companies.find((item) => item.key === activeId) || null;
  const companyKey = baseCompany?.clave || '';
  const cachedProjects = companyKey ? getCachedCompanyProjects(companyKey) : undefined;
  const projectEntry = companyKey
    ? projectsByCompany[companyKey]
      || (cachedProjects !== undefined ? { status: 'success', projects: cachedProjects, error: '' } : null)
    : null;
  const company = baseCompany
    ? {
      ...baseCompany,
      projects: projectEntry?.status === 'success' ? projectEntry.projects : baseCompany.projects,
    }
    : null;
  useEffect(() => {
    if (!companyKey || cachedProjects !== undefined) return undefined;
    let active = true;
    obtenerProyectosCompania(companyKey)
      .then((projects) => {
        if (!active) return;
        setProjectsByCompany((current) => ({
          ...current,
          [companyKey]: { status: 'success', projects, error: '' },
        }));
      })
      .catch((error) => {
        if (!active) return;
        setProjectsByCompany((current) => ({
          ...current,
          [companyKey]: {
            status: 'error',
            projects: current[companyKey]?.projects || [],
            error: error instanceof Error ? error.message : 'No fue posible cargar los proyectos.',
          },
        }));
      });
    return () => { active = false; };
  }, [cachedProjects, companyKey, projectsRetryToken]);
  return <Box h="100%" minH="0" overflow="auto" className={`companias-view${isDarkMode ? ' company-dark' : ''}`}>
    <style>{`
      .companias-view{color:#293548;scrollbar-color:#cbd1dc transparent}.company-workspace{display:grid;grid-template-columns:minmax(230px,270px) minmax(0,1fr);gap:10px;min-height:100%}.company-directory,.company-dashboard{background:var(--cl-surface,#fff);border:1px solid var(--cl-border,#e8ebef);border-radius:11px}.company-directory{display:flex;flex-direction:column;min-height:620px;overflow:hidden}.company-directory-title{color:#354054;font-size:13px;font-weight:800;padding:13px 13px 10px}.company-directory-title span{color:#758095;font-size:11px}.company-search{background:#fff;border:1px solid #e4e8ee;border-radius:8px;color:#6f7b8f;height:34px;margin:0 11px 9px;padding:0 9px}.company-search input{background:transparent;border:0;color:#354054;font-family:inherit;font-size:10px;min-width:0;outline:0;width:100%}.company-list{flex:1;min-height:0;overflow-y:auto;padding:0 4px 4px;scrollbar-width:thin}.company-list-item{align-items:center;background:transparent;border:0;border-left:3px solid transparent;color:#334054;cursor:pointer;display:flex;gap:9px;min-height:59px;padding:8px 10px;text-align:left;transition:.16s;width:100%}.company-list-item:hover{background:#FEF6F3}.company-list-item.selected{background:#FCEDE8;border-left-color:#D95B27}.company-list-avatar{align-items:center;background:#f4f6f8;border-radius:8px;color:#4b596c;display:inline-flex;flex:0 0 auto;font-size:10px;font-weight:800;height:31px;justify-content:center;width:31px}.selected .company-list-avatar{background:#D95B27;color:#fff}.company-list-item>span:last-child{display:flex;flex:1;flex-direction:column;min-width:0}.company-list-item strong{color:#344054;display:-webkit-box;font-size:10px;font-weight:800;line-height:1.22;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2}.company-list-item small{color:#748095;font-size:9px;line-height:1.25;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.company-more{align-items:center;background:#fff;border:1px solid #dce2e9;border-radius:7px;color:#475568;cursor:pointer;display:flex;font-family:inherit;font-size:10px;font-weight:700;gap:6px;justify-content:center;margin:9px 11px 11px;min-height:32px}.company-empty{color:#7b8695;font-size:11px;min-height:180px;padding:20px;text-align:center}.company-service-notice{align-items:center;background:#FDF4F0;border:1px solid #F5CCBD;border-radius:8px;color:#A43F1B;display:flex;font-size:11px;gap:8px;line-height:1.35;margin-bottom:8px;padding:8px 10px}.company-dashboard{min-width:0;overflow:hidden;padding:15px}.company-profile{min-height:60px}.company-mark{background:#D95B27;border-radius:10px;box-shadow:0 7px 15px rgba(217, 91, 39,.18);color:#fff;flex:0 0 auto;font-size:14px;font-weight:800;height:52px;width:52px}.company-name{color:#2f3b4e;font-size:15px;font-weight:800;letter-spacing:-.018em}.company-role{color:#5d6879;font-size:10px;font-weight:600;margin-top:1px}.company-location{color:#748094;font-size:9px;margin-top:3px}.company-location svg{color:#D95B27;flex:0 0 auto}.company-metrics,.company-generic-kpis{display:grid;gap:9px;margin-top:15px}.company-metrics{grid-template-columns:repeat(4,minmax(0,1fr))}.company-generic-kpis{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:11px}.company-metric{background:#fff;border:1px solid #e6eaf0;border-radius:9px;min-height:72px;padding:11px 13px}.company-metric p:first-child{color:#8490a1;font-size:9px;font-weight:600}.company-metric p:nth-child(2){color:#2f3b4e;font-size:16px;font-weight:800;line-height:1.2;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.company-metric p:last-child{color:#5d6a7c;font-size:9px;font-weight:600;margin-top:3px}.company-insights{display:grid;gap:9px;grid-template-columns:minmax(0,.96fr) minmax(0,1.08fr) minmax(0,.96fr);margin-top:11px}.company-card,.company-bottom-card{background:#fff;border:1px solid #e5e9ef;border-radius:9px;min-width:0}.company-card{min-height:164px;padding:12px}.company-card-title{color:#344054;font-size:10px;font-weight:800}.company-card-title span{color:#7d8899;font-size:8px}.company-card-empty{color:#7d8796;font-size:10px;padding:31px 0;text-align:center}.company-genre-body{height:123px}.company-pie{flex:0 0 96px;height:96px}.company-legend{flex:1;min-width:0}.company-legend>div{padding:2px 0}.company-legend span{border-radius:99px;flex:0 0 auto;height:7px;width:7px}.company-legend p:nth-child(2){color:#596579;flex:1;font-size:8px}.company-legend p:last-child{color:#4c586b;font-size:8px;font-weight:800}.company-activity{margin-top:10px}.company-activity>div{border-top:1px solid #eef0f4;min-height:35px}.company-activity>div:first-child{border-top:0}.company-activity p:first-child{color:#657185;flex:1;font-size:9px}.company-activity p:nth-child(2){color:#374356;font-size:9px;font-weight:800;text-align:right;white-space:nowrap}.company-activity p:last-child{color:#209369;font-size:8px;font-weight:800;margin-left:7px;min-width:30px;text-align:right}.company-activity p.negative{color:#d94c35}.company-bottom{display:grid;gap:9px;grid-template-columns:minmax(0,1.32fr) minmax(260px,.92fr);margin-top:11px}.company-bottom-card{min-height:188px;overflow:hidden;padding:12px 13px}.company-bottom-title{min-height:18px}.company-bottom-title p:first-child{color:#344054;font-size:10px;font-weight:800}.company-bottom-title p:last-child{color:#7b8798;font-size:9px;font-weight:600}.company-project-head,.company-project-row{display:grid;gap:10px;grid-template-columns:minmax(150px,1.7fr) minmax(96px,1fr) 74px 55px}.company-project-head{border-bottom:1px solid #e8ebef;color:#8b95a4;font-size:7px;font-weight:800;letter-spacing:.03em;padding:11px 0 6px;text-transform:uppercase}.company-project-head>:nth-child(n+3){text-align:right}.company-project-row{align-items:center;background:transparent;border:0;border-bottom:1px solid #edf0f3;color:#596579;cursor:pointer;font-family:inherit;font-size:8px;min-height:35px;padding:5px 0;text-align:left;width:100%}.company-project-row:hover{background:#FEF7F4;box-shadow:0 0 0 5px #FEF7F4}.company-project-row>span:first-child{display:flex;flex-direction:column;min-width:0}.company-project-row strong{color:#3f4a5b;font-size:8px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.company-project-row small{color:#929baa;font-size:7px;margin-top:1px}.company-project-row>span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.company-project-row>span:nth-child(3),.company-project-row>span:last-child{color:#465166;font-weight:800;text-align:right;white-space:nowrap}.company-bottom-link{align-items:center;color:#D95B27;display:flex;font-size:9px;font-weight:800;gap:6px;margin-top:11px}.company-contacts{margin-top:8px}.company-contacts>div{border-bottom:1px solid #eef0f3;min-height:35px;padding:4px 0}.company-contact-avatar{background:#eef0f3;border-radius:50%;color:#4e596a;flex:0 0 auto;font-size:8px;font-weight:800;height:25px;width:25px}.company-contacts>div>div:nth-child(2)>p:first-child{color:#414c5d;font-size:9px;font-weight:800}.company-contacts>div>div:nth-child(2)>p:last-child{color:#7c8797;font-size:8px;margin-top:1px}.company-contacts a{color:#0a66c2;display:flex;flex:0 0 auto}.company-link-muted{color:#b3bac4;flex:0 0 auto}.company-dashboard-empty{background:#fff;border:1px dashed #dbe1e8;border-radius:11px;color:#748094;font-size:12px;gap:10px;min-height:500px}.company-dark .company-directory,.company-dark .company-dashboard,.company-dark .company-metric,.company-dark .company-card,.company-dark .company-bottom-card,.company-dark .company-more{background:var(--cl-surface);border-color:var(--cl-border)}.company-dark .company-directory-title,.company-dark .company-list-item strong,.company-dark .company-name,.company-dark .company-metric p:nth-child(2),.company-dark .company-card-title,.company-dark .company-bottom-title p:first-child,.company-dark .company-contacts>div>div:nth-child(2)>p:first-child,.company-dark .company-project-row strong{color:var(--cl-text-strong)}.company-dark .company-search{background:var(--cl-surface-muted);border-color:var(--cl-border)}.company-dark .company-search input{color:var(--cl-text)}.company-dark .company-list-item:hover,.company-dark .company-project-row:hover{background:rgba(217, 91, 39,.1);box-shadow:none}.company-dark .company-list-item.selected{background:rgba(217, 91, 39,.16)}.company-dark .company-list-avatar,.company-dark .company-contact-avatar{background:var(--cl-surface-muted);color:var(--cl-text)}.company-dark .company-role,.company-dark .company-location,.company-dark .company-metric p:first-child,.company-dark .company-metric p:last-child,.company-dark .company-card-empty,.company-dark .company-activity p:first-child,.company-dark .company-contacts>div>div:nth-child(2)>p:last-child,.company-dark .company-list-item small{color:var(--cl-text-muted)}.company-dark .company-project-head,.company-dark .company-project-row,.company-dark .company-contacts>div,.company-dark .company-activity>div{border-color:var(--cl-border)}@media(max-width:1080px){.company-workspace{grid-template-columns:230px minmax(0,1fr)}.company-insights{grid-template-columns:1fr 1fr}.company-insights>.company-card:last-child{grid-column:span 2}}@media(max-width:840px){.company-workspace{grid-template-columns:1fr}.company-directory{max-height:330px;min-height:0}.company-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.company-bottom{grid-template-columns:1fr}}@media(max-width:620px){.company-dashboard{padding:11px}.company-profile{align-items:flex-start;flex-wrap:wrap}.company-metrics,.company-generic-kpis,.company-insights{grid-template-columns:1fr 1fr}.company-generic-kpis>.company-metric:last-child,.company-insights>.company-card:last-child{grid-column:span 2}.company-project-head,.company-project-row{grid-template-columns:minmax(120px,1.6fr) minmax(88px,1fr) 65px}.company-project-head>:last-child,.company-project-row>:last-child{display:none}.company-list{grid-template-columns:1fr}}
    `}</style>
    <style>{`
      .companias-view .company-alert { align-items: center; background: #FDF5F2; border: 1px solid #F2C5B4; border-radius: 7px; color: #B9471E; cursor: pointer; display: inline-flex; font-family: inherit; font-size: 12px; font-weight: 700; gap: 5px; height: 38px; padding: 0 13px; white-space: nowrap; }
      .companias-view .company-alert.active { background: #B9471E; border-color: #B9471E; box-shadow: 0 5px 12px rgba(185, 71, 30, .18); color: #FFF; }
      .companias-view .company-states-list { display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }
      .companias-view .company-state-row > p:first-child { color: #536074; flex: 0 0 110px; font-size: 12px; font-weight: 700; }
      .companias-view .company-state-row progress { accent-color: #D95B27; appearance: none; border: 0; flex: 1; height: 12px; min-width: 0; overflow: hidden; }
      .companias-view .company-state-row progress::-webkit-progress-bar { background: #EEF1F4; border-radius: 99px; }
      .companias-view .company-state-row progress::-webkit-progress-value { background: #D95B27; border-radius: 99px; }
      .companias-view .company-state-row progress::-moz-progress-bar { background: #D95B27; border-radius: 99px; }
      .companias-view .company-state-row > p:last-child { color: #3F4B5F; flex: 0 0 24px; font-size: 11px; font-weight: 800; text-align: right; }
      .companias-view .company-bottom-link { background: transparent; border: 0; cursor: pointer; font-family: inherit; padding: 0; text-align: left; }
      .companias-view .company-bottom-header-link { align-items: center; display: inline-flex; flex-shrink: 0; margin: 0; white-space: nowrap; }
      .companias-view .company-contact-avatar.is-linkedin, .companias-view .company-dialog-contact-avatar.is-linkedin { background: #E8F1FC; color: #0A66C2; }
      .companias-view .company-dialog-backdrop { align-items: center; background: rgba(27, 36, 51, .45); display: flex; inset: 0; justify-content: center; padding: 24px; position: fixed; z-index: 1000; }
      .companias-view .company-dialog { background: var(--cl-surface, #FFF); border-radius: 16px; box-shadow: 0 24px 64px rgba(20, 30, 46, .3); display: flex; flex-direction: column; height: min(720px, calc(100dvh - 80px)); max-width: 1080px; overflow: hidden; width: min(96vw, 1080px); }
      .companias-view .company-dialog-header { border-bottom: 1px solid var(--cl-border, #E5E9EF); min-height: 76px; padding: 12px 18px; }
      .companias-view .company-dialog-mark { background: #D95B27; border-radius: 10px; color: #FFF; flex: 0 0 auto; font-size: 14px; font-weight: 800; height: 44px; width: 44px; }
      .companias-view .company-dialog-header > div:nth-child(2) > p:first-child { color: var(--cl-text-strong, #2F3B4E); font-size: 16px; font-weight: 800; }
      .companias-view .company-dialog-header > div:nth-child(2) > p:last-child { color: var(--cl-text-muted, #788497); font-size: 12px; margin-top: 2px; }
      .companias-view .company-dialog-header > button { align-items: center; background: transparent; border: 1px solid var(--cl-border, #E1E6ED); border-radius: 8px; color: #596579; cursor: pointer; display: flex; height: 34px; justify-content: center; width: 34px; }
      .companias-view .company-dialog-search { border-bottom: 1px solid var(--cl-border, #E5E9EF); color: #758194; padding: 12px 18px; }
      .companias-view .company-dialog-search input { background: #F8F9FB; border: 1px solid #E1E6ED; border-radius: 8px; color: #374356; font-family: inherit; font-size: 13px; height: 38px; outline: 0; padding: 0 11px; width: 100%; }
      .companias-view .company-dialog-search > p { background: #FCEDE8; border-radius: 99px; color: #B9471E; font-size: 11px; font-weight: 800; padding: 6px 9px; }
      .companias-view .company-dialog-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 18px 16px; scrollbar-color: #CBD1DC transparent; scrollbar-width: thin; }
      .companias-view .company-dialog-projects > button { align-items: center; background: transparent; border: 0; border-bottom: 1px solid #EDF0F3; color: #657185; cursor: pointer; display: grid; font-family: inherit; font-size: 12px; gap: 14px; grid-template-columns: minmax(250px, 1.7fr) minmax(150px, 1fr) 88px 76px 20px; min-height: 64px; padding: 9px 0; text-align: left; width: 100%; }
      .companias-view .company-dialog-projects > button:hover { background: #FEF7F4; box-shadow: 0 0 0 8px #FEF7F4; }
      .companias-view .company-dialog-projects strong { color: #374356; display: block; font-size: 13px; line-height: 1.25; }
      .companias-view .company-dialog-projects small { color: #8A94A3; display: block; font-size: 11px; margin-top: 3px; }
      .companias-view .company-dialog-projects > button > span:nth-child(n+3) { color: #465166; font-size: 12px; font-weight: 800; text-align: right; }
      .companias-view .company-dialog-projects > button > svg { color: #D95B27; }
      .companias-view .company-dialog-contacts > div { border-bottom: 1px solid #EDF0F3; min-height: 68px; padding: 10px 0; }
      .companias-view .company-dialog-contact-avatar { background: #EEF1F4; border-radius: 50%; color: #4D596A; flex: 0 0 auto; font-size: 11px; font-weight: 800; height: 38px; width: 38px; }
      .companias-view .company-dialog-contacts > div > div:nth-child(2) > p:first-child { color: #374356; font-size: 13px; font-weight: 800; }
      .companias-view .company-dialog-contacts > div > div:nth-child(2) > p:nth-child(2), .companias-view .company-dialog-contacts > div > div:nth-child(2) > p:last-child { color: #778396; font-size: 11px; margin-top: 2px; }
      .companias-view .company-dialog-contacts > div > a { align-items: center; color: #0A66C2; display: inline-flex; font-size: 12px; font-weight: 700; gap: 5px; text-decoration: none; }
      .companias-view .company-dialog-empty { color: #788497; font-size: 13px; padding: 42px 0; text-align: center; }
      @media (min-width: 841px) {
        .companias-view { overflow: hidden !important; }
        .companias-view .company-workspace { height: 100%; min-height: 0; }
        .companias-view .company-directory, .companias-view .company-dashboard { height: 100%; min-height: 0; }
        .companias-view .company-directory { overflow: hidden; }
        .companias-view .company-dashboard { display: grid; gap: 10px; grid-template-rows: 82px 82px 66px minmax(168px, .85fr) minmax(216px, 1.15fr); padding: 14px; }
        .companias-view .company-profile, .companias-view .company-metrics, .companias-view .company-generic-kpis, .companias-view .company-insights, .companias-view .company-bottom { height: 100%; margin: 0; min-height: 0; }
        .companias-view .company-metrics { gap: 10px; }
        .companias-view .company-metric { min-height: 0; padding: 11px 14px; }
        .companias-view .company-generic-kpis .company-metric { min-height: 0; }
        .companias-view .company-metric p:nth-child(2) { font-size: 18px; }
        .companias-view .company-signal { min-height: 0; padding: 9px 14px; }
        .companias-view .company-signal > div:nth-child(2) > p:last-child { font-size: 11px; }
        .companias-view .company-insights, .companias-view .company-bottom { align-items: stretch; }
        .companias-view .company-card, .companias-view .company-bottom-card { height: 100%; min-height: 0; overflow: hidden; padding: 13px; }
        .companias-view .company-card-title { font-size: 12px; }
        .companias-view .company-genre-body { height: calc(100% - 20px); }
        .companias-view .company-pie { flex-basis: 104px; height: 104px; }
        .companias-view .company-legend > div { padding: 2px 0; }
        .companias-view .company-legend p:nth-child(2), .companias-view .company-legend p:last-child { font-size: 10px; }
        .companias-view .company-states-list { gap: 8px; margin-top: 12px; }
        .companias-view .company-state-row > p:first-child { flex-basis: 96px; font-size: 11px; }
        .companias-view .company-state-row progress { height: 11px; }
        .companias-view .company-activity { margin-top: 7px; }
        .companias-view .company-activity > div { min-height: 36px; }
        .companias-view .company-activity p:first-child, .companias-view .company-activity p:nth-child(2) { font-size: 10px; }
        .companias-view .company-bottom-card { padding: 13px; }
        .companias-view .company-bottom-title p:first-child { font-size: 12px; }
        .companias-view .company-project-head { font-size: 9px; padding: 7px 0; }
        .companias-view .company-project-row { font-size: 10px; min-height: 38px; padding: 4px 0; }
        .companias-view .company-project-row strong { font-size: 10px; }
        .companias-view .company-project-row small { font-size: 9px; }
        .companias-view .company-bottom-link { font-size: 10px; margin-top: 7px; }
        .companias-view .company-contacts { margin-top: 5px; }
        .companias-view .company-contacts > div { min-height: 37px; padding: 3px 0; }
        .companias-view .company-contact-avatar { height: 27px; width: 27px; }
        .companias-view .company-contacts > div > div:nth-child(2) > p:first-child { font-size: 10px; }
        .companias-view .company-contacts > div > div:nth-child(2) > p:last-child { font-size: 9px; }
      }
      @media (max-width: 1080px) { .companias-view .company-alert { font-size: 0; padding: 0 10px; } .companias-view .company-alert svg { margin: 0; } }
      @media (max-width: 720px) { .companias-view .company-dialog-backdrop { padding: 12px; } .companias-view .company-dialog { height: calc(100dvh - 24px); width: 100%; } .companias-view .company-dialog-projects > button { grid-template-columns: minmax(0, 1fr) 76px 20px; } .companias-view .company-dialog-projects > button > span:nth-child(2), .companias-view .company-dialog-projects > button > span:last-of-type { display: none; } }
    `}</style>
    <style>{`
      /* Escala de lectura del módulo: ningún dato operativo queda por debajo de 11px. */
      .companias-view .company-workspace { gap: 14px; grid-template-columns: minmax(290px, 332px) minmax(0, 1fr); }
      .companias-view .company-directory { min-height: 720px; }
      .companias-view .company-directory-title { font-size: 16px; padding: 18px 17px 13px; }
      .companias-view .company-directory-title span { font-size: 13px; }
      .companias-view .company-search { height: 42px; margin: 0 14px 13px; padding: 0 12px; }
      .companias-view .company-search input { font-size: 13px; }
      .companias-view .company-list { padding: 0 6px 6px; }
      .companias-view .company-list-item { gap: 12px; min-height: 76px; padding: 10px 13px; }
      .companias-view .company-list-avatar { border-radius: 10px; font-size: 12px; height: 40px; width: 40px; }
      .companias-view .company-list-item strong { font-size: 13px; line-height: 1.3; }
      .companias-view .company-list-item small { font-size: 11.5px; line-height: 1.35; margin-top: 3px; }
      .companias-view .company-more { font-size: 12px; margin: 12px 14px 14px; min-height: 40px; }
      .companias-view .company-empty { font-size: 13px; }
      .companias-view .company-load-error button { align-items: center; background: #D95B27; border: 0; border-radius: 7px; color: #FFF; cursor: pointer; display: inline-flex; font-family: inherit; font-size: 11px; font-weight: 800; gap: 6px; margin-top: 4px; padding: 8px 12px; }
      .companias-view .company-dashboard { padding: 20px; }
      .companias-view .company-profile { min-height: 68px; }
      .companias-view .company-mark { border-radius: 12px; font-size: 16px; height: 58px; width: 58px; }
      .companias-view .company-name { font-size: 20px; line-height: 1.2; }
      .companias-view .company-role { font-size: 13px; margin-top: 3px; }
      .companias-view .company-location { font-size: 11.5px; margin-top: 5px; }
      .companias-view .company-linkedin, .companias-view .company-save, .companias-view .company-download { font-size: 12px; height: 38px; padding: 0 13px; }
      .companias-view .company-download { width: 38px; }
      .companias-view .company-metrics { gap: 12px; margin-top: 20px; }
      .companias-view .company-metric { border-radius: 11px; min-height: 88px; padding: 14px 16px; }
      .companias-view .company-metric p:first-child { font-size: 11px; }
      .companias-view .company-metric p:nth-child(2) { font-size: 20px; margin-top: 5px; }
      .companias-view .company-metric p:last-child { font-size: 11px; margin-top: 5px; }
      .companias-view .company-signal { border-radius: 11px; margin-top: 14px; min-height: 76px; padding: 12px 16px; }
      .companias-view .company-signal > div:nth-child(2) > p:first-child { font-size: 12px; }
      .companias-view .company-signal > div:nth-child(2) > p:last-child { font-size: 11.5px; line-height: 1.45; margin-top: 4px; }
      .companias-view .company-trend { flex-basis: 170px; height: 50px; }
      .companias-view .company-insights { gap: 12px; margin-top: 14px; }
      .companias-view .company-card { border-radius: 11px; min-height: 202px; padding: 16px; }
      .companias-view .company-card-title { font-size: 13px; }
      .companias-view .company-card-title span { font-size: 11px; }
      .companias-view .company-card-empty { font-size: 12px; }
      .companias-view .company-genre-body { height: 154px; }
      .companias-view .company-pie { flex-basis: 122px; height: 122px; }
      .companias-view .company-legend > div { padding: 4px 0; }
      .companias-view .company-legend span { height: 8px; width: 8px; }
      .companias-view .company-legend p:nth-child(2), .companias-view .company-legend p:last-child { font-size: 11px; }
      .companias-view .company-activity { margin-top: 13px; }
      .companias-view .company-activity > div { min-height: 45px; }
      .companias-view .company-activity p:first-child, .companias-view .company-activity p:nth-child(2) { font-size: 11px; }
      .companias-view .company-activity p:last-child { font-size: 10px; min-width: 38px; }
      .companias-view .company-bottom { gap: 12px; margin-top: 14px; }
      .companias-view .company-bottom-card { border-radius: 11px; min-height: 264px; padding: 16px; }
      .companias-view .company-bottom-title { min-height: 24px; }
      .companias-view .company-bottom-title p:first-child { font-size: 13px; }
      .companias-view .company-bottom-title p:last-child { font-size: 11px; }
      .companias-view .company-project-head { font-size: 10px; padding: 14px 0 8px; }
      .companias-view .company-project-row { font-size: 11px; min-height: 52px; padding: 8px 0; }
      .companias-view .company-project-row strong { font-size: 11.5px; }
      .companias-view .company-project-row small { font-size: 10px; }
      .companias-view .company-bottom-link { font-size: 11px; margin-top: 13px; }
      .companias-view .company-contacts { margin-top: 10px; }
      .companias-view .company-contacts > div { min-height: 46px; padding: 6px 0; }
      .companias-view .company-contact-avatar { font-size: 10px; height: 32px; width: 32px; }
      .companias-view .company-contacts > div > div:nth-child(2) > p:first-child { font-size: 11.5px; }
      .companias-view .company-contacts > div > div:nth-child(2) > p:last-child { font-size: 10.5px; }
      @media (max-width: 1080px) { .companias-view .company-workspace { grid-template-columns: minmax(270px, 300px) minmax(0, 1fr); } }
      @media (max-width: 840px) { .companias-view .company-workspace { grid-template-columns: 1fr; } .companias-view .company-directory { min-height: 0; } }
      @media (max-width: 620px) { .companias-view .company-dashboard { padding: 14px; } .companias-view .company-metrics { grid-template-columns: 1fr 1fr; } .companias-view .company-insights { grid-template-columns: 1fr; } .companias-view .company-card { min-height: 190px; } .companias-view .company-insights > .company-card:last-child { grid-column: auto; } }
    `}</style>
    <style>{`
      /* La pantalla principal de Compañías usa el alto disponible; las listas completas viven en sus paneles. */
      @media (min-width: 841px) {
        .companias-view { overflow: hidden !important; }
        .companias-view .company-workspace { height: 100%; min-height: 0; }
        .companias-view .company-directory, .companias-view .company-dashboard { height: 100%; min-height: 0; }
        .companias-view .company-directory { overflow: hidden; }
        .companias-view .company-dashboard { display: grid; gap: 10px; grid-template-rows: 82px 82px 66px minmax(168px, .85fr) minmax(216px, 1.15fr); padding: 14px; }
        .companias-view .company-profile, .companias-view .company-metrics, .companias-view .company-signal, .companias-view .company-insights, .companias-view .company-bottom { height: 100%; margin: 0; min-height: 0; }
        .companias-view .company-metrics { gap: 10px; }
        .companias-view .company-metric { min-height: 0; padding: 11px 14px; }
        .companias-view .company-metric p:nth-child(2) { font-size: 18px; }
        .companias-view .company-signal { min-height: 0; padding: 9px 14px; }
        .companias-view .company-signal > div:nth-child(2) > p:last-child { font-size: 11px; }
        .companias-view .company-insights, .companias-view .company-bottom { align-items: stretch; }
        .companias-view .company-card, .companias-view .company-bottom-card { height: 100%; min-height: 0; overflow: hidden; padding: 13px; }
        .companias-view .company-card-title { font-size: 12px; }
        .companias-view .company-genre-body { height: calc(100% - 20px); }
        .companias-view .company-pie { flex-basis: 104px; height: 104px; }
        .companias-view .company-legend > div { padding: 2px 0; }
        .companias-view .company-legend p:nth-child(2), .companias-view .company-legend p:last-child { font-size: 10px; }
        .companias-view .company-states-list { gap: 8px; margin-top: 12px; }
        .companias-view .company-state-row > p:first-child { flex-basis: 96px; font-size: 11px; }
        .companias-view .company-state-row progress { height: 11px; }
        .companias-view .company-activity { margin-top: 7px; }
        .companias-view .company-activity > div { min-height: 36px; }
        .companias-view .company-activity p:first-child, .companias-view .company-activity p:nth-child(2) { font-size: 10px; }
        .companias-view .company-bottom-card { padding: 13px; }
        .companias-view .company-bottom-title p:first-child { font-size: 12px; }
        .companias-view .company-project-head { font-size: 9px; padding: 7px 0; }
        .companias-view .company-project-row { font-size: 10px; min-height: 38px; padding: 4px 0; }
        .companias-view .company-project-row strong { font-size: 10px; }
        .companias-view .company-project-row small { font-size: 9px; }
        .companias-view .company-bottom-link { font-size: 10px; margin-top: 7px; }
        .companias-view .company-contacts { margin-top: 5px; }
        .companias-view .company-contacts > div { min-height: 37px; padding: 3px 0; }
        .companias-view .company-contact-avatar { height: 27px; width: 27px; }
        .companias-view .company-contacts > div > div:nth-child(2) > p:first-child { font-size: 10px; }
        .companias-view .company-contacts > div > div:nth-child(2) > p:last-child { font-size: 9px; }
      }
    `}</style>
    <style>{`
      /* Tercera vuelta: una densidad Bento que responde al volumen real de datos. */
      .companias-view .company-directory-title { align-items: center; gap: 10px; }
      .companias-view .company-directory-title > p { min-width: 0; }
      .companias-view .company-filter-wrap { flex: 0 0 auto; position: relative; }
      .companias-view .company-filter-trigger { align-items: center; background: #FFF; border: 1px solid #DCE3EB; border-radius: 8px; color: #526074; cursor: pointer; display: inline-flex; font-family: inherit; font-size: 11px; font-weight: 750; gap: 5px; height: 31px; padding: 0 9px; }
      .companias-view .company-filter-trigger:hover, .companias-view .company-filter-trigger.active { background: #FDF3EF; border-color: #EDB29E; color: #B9471E; }
      .companias-view .company-filter-trigger b { align-items: center; background: #D95B27; border-radius: 99px; color: #FFF; display: inline-flex; font-size: 9px; height: 16px; justify-content: center; min-width: 16px; padding: 0 4px; }
      .companias-view .company-filter-popover { background: var(--cl-surface, #FFF); border: 1px solid #DEE5EC; border-radius: 12px; box-shadow: 0 16px 36px rgba(36, 48, 67, .18); max-height: min(600px, calc(100dvh - 190px)); overflow-y: auto; padding: 12px; position: absolute; right: 0; scrollbar-color: #CBD1DC transparent; scrollbar-width: thin; top: 38px; width: min(360px, calc(100vw - 44px)); z-index: 40; }
      .companias-view .company-filter-popover-head { border-bottom: 1px solid #EDF0F4; padding: 0 0 10px; }
      .companias-view .company-filter-popover-head p:first-child { color: #344054; font-size: 12px; font-weight: 800; }
      .companias-view .company-filter-popover-head p:last-child { color: #7B8798; font-size: 10px; margin-top: 2px; }
      .companias-view .company-filter-popover-head button { background: transparent; border: 0; color: #B9471E; cursor: pointer; font-family: inherit; font-size: 10px; font-weight: 800; padding: 4px; }
      .companias-view .company-filter-group { padding-top: 10px; }
      .companias-view .company-filter-group > p { color: #566378; font-size: 10px; font-weight: 800; margin-bottom: 6px; }
      .companias-view .company-filter-group button { background: #F6F8FA; border: 1px solid #E3E8EE; border-radius: 999px; color: #657185; cursor: pointer; font-family: inherit; font-size: 10px; line-height: 1.2; padding: 5px 8px; text-align: left; }
      .companias-view .company-filter-group button:hover { border-color: #EFBFAC; color: #B9471E; }
      .companias-view .company-filter-group button.selected { background: #FCEDE8; border-color: #E89878; color: #A43F1B; font-weight: 800; }
      .companias-view .company-list { padding-bottom: 8px; }
      .companias-view .company-list-item { min-height: 72px; }
      .companias-view .company-bottom-card { display: flex; flex-direction: column; }
      .companias-view .company-project-card > :nth-child(3), .companias-view .company-bottom-card .company-contacts { flex: 1; min-height: 0; }
      .companias-view .company-project-list, .companias-view .company-contacts { overflow-y: auto; overscroll-behavior: contain; scrollbar-color: #56657A transparent; scrollbar-width: thin; }
      .companias-view .company-project-row { min-height: 42px; }
      .companias-view .company-contacts > div { min-height: 40px; }
      .companias-view .company-states-single { background: #FEF8F6; border-color: #F9DED4; display: flex; flex-direction: column; justify-content: space-between; }
      .companias-view .company-states-single > div { padding: 4px 0 2px; }
      .companias-view .company-states-single > div > p:first-child { color: #A43F1B; font-size: 14px; font-weight: 800; line-height: 1.2; }
      .companias-view .company-states-single > div > div { margin-top: 4px; }
      .companias-view .company-states-single > div > div > p:first-child { color: #D95B27; font-size: 36px; font-weight: 800; letter-spacing: -.04em; line-height: .95; }
      .companias-view .company-states-single > div > div > p:last-child { color: #805F54; font-size: 11px; font-weight: 700; padding-bottom: 2px; }
      .companias-view .company-states-single > div > p:last-child { color: #756D70; font-size: 10px; line-height: 1.35; margin-top: 10px; max-width: 240px; }
      @media (min-width: 841px) {
        .companias-view .company-dashboard { grid-template-rows: 82px 82px 66px minmax(192px, .95fr) minmax(250px, 1.15fr); }
        .companias-view .company-insights { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.25fr) minmax(0, .95fr); }
        .companias-view .company-bottom { grid-template-columns: minmax(0, 1.28fr) minmax(300px, .88fr); }
        .companias-view .company-genre-body { align-items: center; }
        .companias-view .company-pie { flex-basis: 142px; height: 142px; }
        .companias-view .company-legend > div { padding: 4px 0; }
        .companias-view .company-legend p:nth-child(2), .companias-view .company-legend p:last-child { font-size: 11px; }
        .companias-view .company-project-head { padding-top: 8px; }
        .companias-view .company-project-row { min-height: 42px; }
        .companias-view .company-contacts > div { min-height: 40px; }
      }
      @media (max-width: 1080px) {
        .companias-view .company-filter-trigger span { display: none; }
        .companias-view .company-filter-trigger { padding: 0 8px; }
      }
    `}</style>
    <style>{`
      /* Interacciones y señales de seguimiento: no se esconden ni se confunden con chrome. */
      .companias-view .company-workspace { grid-template-columns: minmax(350px, 398px) minmax(0, 1fr); }
      .companias-view .company-directory { overflow: visible; }
      .companias-view .company-directory-summary { background: #F8FAFC; border-bottom: 1px solid #EDF0F4; border-top: 1px solid #EDF0F4; margin: 0 14px 8px; padding: 8px 0; }
      .companias-view .company-directory-summary > div { border-right: 1px solid #E5EAF0; flex: 1; padding: 0 9px; }
      .companias-view .company-directory-summary > div:last-child { border-right: 0; }
      .companias-view .company-directory-summary p:first-child { color: #344054; font-size: 13px; font-weight: 800; line-height: 1.1; }
      .companias-view .company-directory-summary p:last-child { color: #7A8798; font-size: 9px; font-weight: 700; margin-top: 2px; }
      .companias-view .company-filter-popover { max-height: min(640px, calc(100dvh - 168px)); }
      .companias-view .company-watch-status { align-items: center; background: #EAF8F2; border-radius: 999px; color: #16845C; display: inline-flex; font-size: 9px; font-weight: 800; gap: 3px; padding: 3px 6px; white-space: nowrap; }
      .companias-view .company-genre-body { justify-content: center; }
      .companias-view .company-pie { flex-basis: 178px; height: 178px; }
      .companias-view .company-legend > div { padding: 5px 0; }
      .companias-view .company-legend p:nth-child(2), .companias-view .company-legend p:last-child { font-size: 11px; }
      .companias-view .company-activity-card { display: flex; flex-direction: column; }
      .companias-view .company-opportunity { background: #F7FAFC; border: 1px solid #E5EAF0; border-radius: 9px; margin-top: auto; min-height: 54px; padding: 7px 8px; }
      .companias-view .company-opportunity > span { background: #9CA7B7; border-radius: 99px; flex: 0 0 auto; height: 9px; width: 9px; }
      .companias-view .company-opportunity.high > span { background: #1E9B70; box-shadow: 0 0 0 4px #E5F7EF; }
      .companias-view .company-opportunity.medium > span { background: #E89D2F; box-shadow: 0 0 0 4px #FFF4DE; }
      .companias-view .company-opportunity.low > span { background: #9CA7B7; }
      .companias-view .company-opportunity > div:nth-child(2) p:first-child { color: #3D4A5E; font-size: 9px; font-weight: 800; }
      .companias-view .company-opportunity > div:nth-child(2) p:last-child { color: #7B8798; font-size: 8px; line-height: 1.25; margin-top: 2px; }
      .companias-view .company-opportunity > div:last-child p:first-child { color: #344054; font-size: 11px; font-weight: 800; }
      .companias-view .company-opportunity > div:last-child p:last-child { color: #798596; font-size: 8px; font-weight: 700; margin-top: 1px; }
      .companias-view .company-alert-dialog { background: var(--cl-surface, #FFF); border-radius: 16px; box-shadow: 0 24px 64px rgba(20, 30, 46, .3); max-width: 480px; padding: 26px; text-align: center; width: min(92vw, 480px); }
      .companias-view .company-alert-dialog-icon { background: #FCEDE8; border-radius: 50%; color: #B9471E; height: 48px; margin: 0 auto 14px; width: 48px; }
      .companias-view .company-alert-dialog > p:nth-of-type(1) { color: #2F3B4E; font-size: 17px; font-weight: 800; }
      .companias-view .company-alert-dialog > p:nth-of-type(2) { color: #667388; font-size: 12px; line-height: 1.55; margin: 8px auto 0; max-width: 390px; }
      .companias-view .company-alert-dialog-explainer { background: #F8FAFC; border: 1px solid #E7ECF1; border-radius: 10px; margin-top: 18px; padding: 11px 13px; text-align: left; }
      .companias-view .company-alert-dialog-explainer p:first-child { color: #435065; font-size: 11px; font-weight: 800; }
      .companias-view .company-alert-dialog-explainer p:last-child { color: #748094; font-size: 10px; line-height: 1.45; margin-top: 4px; }
      .companias-view .company-alert-dialog-actions { margin-top: 20px; }
      .companias-view .company-alert-dialog-actions button { background: #FFF; border: 1px solid #DCE3EB; border-radius: 8px; color: #526074; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 800; height: 36px; padding: 0 13px; }
      .companias-view .company-alert-dialog-actions button:last-child { background: #D95B27; border-color: #D95B27; color: #FFF; }
      .companias-view .company-alert-dialog-actions button:last-child.is-disable { background: #FCEDE8; border-color: #F1C2B0; color: #B9471E; }
      @media (min-width: 841px) {
        .companias-view .company-dashboard { grid-template-rows: 82px 82px 66px minmax(224px, 1fr) minmax(250px, 1.15fr); }
        .companias-view .company-insights { grid-template-columns: minmax(0, 1.12fr) minmax(0, 1.25fr) minmax(0, .96fr); }
        .companias-view .company-pie { flex-basis: 178px; height: 178px; }
      }
      @media (max-width: 1180px) {
        .companias-view .company-workspace { grid-template-columns: minmax(300px, 340px) minmax(0, 1fr); }
        .companias-view .company-directory-summary { display: none; }
        .companias-view .company-pie { flex-basis: 148px; height: 148px; }
      }
      @media (max-width: 840px) {
        .companias-view .company-directory { overflow: hidden; }
      }
    `}</style>
    <style>{`
      /* Jerarquía de filtros y tarjetas que abrazan su contenido. */
      .companias-view .company-region-filter { border-bottom: 1px solid #EDF0F4; padding: 10px 0 11px; }
      .companias-view .company-region-filter > p { color: #566378; font-size: 10px; font-weight: 800; margin-bottom: 6px; }
      .companias-view .company-region-option { border-radius: 8px; margin-top: 3px; }
      .companias-view .company-region-option.selected { background: #FEF8F6; }
      .companias-view .company-region-option > div { min-height: 29px; padding: 2px 4px; }
      .companias-view .company-region-check { align-items: center; background: #FFF; border: 1px solid #D7DEE7; border-radius: 4px; color: #B9471E; cursor: pointer; display: inline-flex; flex: 0 0 auto; font-family: inherit; font-size: 10px; font-weight: 900; height: 15px; justify-content: center; margin-right: 7px; padding: 0; width: 15px; }
      .companias-view .company-region-option.selected .company-region-check { background: #FCEDE8; border-color: #E89878; }
      .companias-view .company-region-label { align-items: center; background: transparent; border: 0; color: #556276; cursor: pointer; display: flex; flex: 1; font-family: inherit; font-size: 10px; font-weight: 750; justify-content: flex-start; min-width: 0; padding: 3px 0; text-align: left; }
      .companias-view .company-region-label > span { color: #8A95A5; font-size: 9px; font-weight: 700; margin-left: auto; padding-left: 8px; }
      .companias-view .company-region-label svg { color: #8E98A7; flex: 0 0 auto; margin-left: 5px; transition: transform 160ms ease; }
      .companias-view .company-region-label svg.expanded { transform: rotate(90deg); }
      .companias-view .company-region-children { display: flex; flex-wrap: wrap; gap: 4px; padding: 1px 4px 7px 26px; }
      .companias-view .company-region-children button { background: #F5F7F9; border: 1px solid #E0E6ED; border-radius: 999px; color: #637084; cursor: pointer; font-family: inherit; font-size: 9px; font-weight: 700; padding: 4px 7px; }
      .companias-view .company-region-children button.selected { background: #FCEDE8; border-color: #EBA282; color: #B9471E; }
      .companias-view .company-states-single { align-items: center; justify-content: center; text-align: center; }
      .companias-view .company-states-single .company-card-title { align-self: center; }
      .companias-view .company-states-single > div { align-items: center; display: flex; flex-direction: column; padding: 0; }
      .companias-view .company-states-single > div > p:first-child { font-size: 16px; }
      .companias-view .company-states-single > div > div { align-items: baseline; justify-content: center; margin-top: 7px; }
      .companias-view .company-states-single > div > div > p:first-child { font-size: 44px; }
      .companias-view .company-states-single > div > div > p:last-child { font-size: 12px; }
      .companias-view .company-states-single > div > p:last-child { font-size: 11px; margin-top: 9px; max-width: 270px; }
      .companias-view .company-states-pair { display: flex; flex-direction: column; }
      .companias-view .company-state-pair-body { flex: 1; margin-top: 12px; min-height: 0; }
      .companias-view .company-state-pair-body > div { background: #F8FAFC; border: 1px solid #E7ECF1; border-radius: 10px; display: flex; flex: 1; flex-direction: column; justify-content: center; min-width: 0; padding: 12px; }
      .companias-view .company-state-pair-body > div > p:first-child { color: #59667A; font-size: 11px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .companias-view .company-state-pair-body > div > p:nth-child(2) { color: #D95B27; font-size: 28px; font-weight: 800; letter-spacing: -.04em; line-height: 1; margin-top: 7px; }
      .companias-view .company-state-pair-body > div > p:nth-child(3) { color: #788497; font-size: 9px; font-weight: 700; margin-top: 3px; }
      .companias-view .company-state-pair-body progress { accent-color: #D95B27; appearance: none; border: 0; height: 10px; margin-top: 11px; overflow: hidden; width: 100%; }
      .companias-view .company-state-pair-body progress::-webkit-progress-bar { background: #E8EDF2; border-radius: 99px; }
      .companias-view .company-state-pair-body progress::-webkit-progress-value { background: #D95B27; border-radius: 99px; }
      .companias-view .company-state-pair-body progress::-moz-progress-bar { background: #D95B27; border-radius: 99px; }
      .companias-view .company-states-multiple { display: flex; flex-direction: column; }
      .companias-view .company-states-multiple .company-states-list { flex: 1; justify-content: space-evenly; margin-top: 1px; }
      .companias-view .company-states-multiple .company-state-row { min-height: 30px; }
      .companias-view .company-contact-actions { align-items: center; flex: 0 0 auto; }
      .companias-view .company-contact-actions a { align-items: center; background: #F4F8FC; border-radius: 6px; color: #0A66C2; display: inline-flex; height: 25px; justify-content: center; width: 25px; }
      .companias-view .company-contacts > div > div:nth-child(2) > p:last-child { font-size: 9.5px; line-height: 1.25; }
      .companias-view .company-dialog-contact-actions { align-items: center; flex: 0 0 auto; }
      .companias-view .company-dialog-contact-actions a { align-items: center; color: #0A66C2; display: inline-flex; font-size: 12px; font-weight: 700; gap: 4px; text-decoration: none; }
      .companias-view .company-alert-dialog { max-width: 540px; padding: 30px; width: min(92vw, 540px); }
      .companias-view .company-alert-dialog > p:nth-of-type(2) { font-size: 13px; max-width: 445px; }
      .companias-view .company-alert-dialog-explainer { padding: 14px 16px; }
      .companias-view .company-alert-dialog-explainer p:first-child { font-size: 12px; }
      .companias-view .company-alert-dialog-explainer p:last-child { font-size: 12px; line-height: 1.5; margin-top: 5px; }
      @media (min-width: 841px) {
        .companias-view .company-dashboard { grid-template-rows: 82px 82px 66px 242px minmax(0, 1fr); }
        .companias-view .company-genre-body { height: calc(100% - 18px); }
      }
      @media (max-width: 1080px) {
        .companias-view .company-state-pair-body > div { padding: 9px; }
        .companias-view .company-state-pair-body > div > p:nth-child(2) { font-size: 24px; }
      }
    `}</style>
    <style>{`
      /* La lista virtual conserva scroll libre sin montar ~900 tarjetas. */
      .companias-view .company-list-virtual { position: relative; }
      .companias-view .company-list-item { height: ${COMPANY_LIST_ROW_HEIGHT}px; min-height: ${COMPANY_LIST_ROW_HEIGHT}px; overflow: hidden; }
    `}</style>
    <style>{`
      @keyframes company-project-arrival-focus {
        0%, 18% { background: rgba(217, 91, 39, .16); box-shadow: 0 0 0 5px rgba(217, 91, 39, .12); }
        72% { background: rgba(217, 91, 39, .06); box-shadow: 0 0 0 3px rgba(217, 91, 39, .04); }
        100% { background: transparent; box-shadow: none; }
      }
      .companias-view .company-project-row.is-arrival-focus { animation: company-project-arrival-focus 3.8s ease-out both; }
      @media (prefers-reduced-motion: reduce) {
        .companias-view .company-project-row.is-arrival-focus { animation: none; background: rgba(217, 91, 39, .12); box-shadow: 0 0 0 4px rgba(217, 91, 39, .08); }
      }
    `}</style>
    <style>{`
      /* Densidad y contraste: las visualizaciones ocupan su tarjeta y siguen siendo legibles en oscuro. */
      .companias-view .company-saved-filter { align-items: center; background: #FFF; border: 1px solid #DCE3EB; border-radius: 8px; color: #526074; cursor: pointer; display: inline-flex; font-family: inherit; font-size: 11px; font-weight: 750; gap: 5px; height: 31px; padding: 0 9px; white-space: nowrap; }
      .companias-view .company-saved-filter:hover, .companias-view .company-saved-filter.active { background: #F1F5FF; border-color: #91A4C8; color: #344A73; }
      .companias-view .company-saved-filter b { align-items: center; background: #445C88; border-radius: 99px; color: #FFF; display: inline-flex; font-size: 9px; height: 16px; justify-content: center; min-width: 16px; padding: 0 4px; }
      .companias-view .company-genre { display: flex; flex-direction: column; }
      .companias-view .company-genre-body { flex: 1; justify-content: space-evenly; min-height: 0; width: 100%; }
      .companias-view .company-pie { flex: 0 0 clamp(168px, 16vw, 208px); height: clamp(168px, 16vw, 208px); }
      .companias-view .company-legend { flex: 0 1 156px; }
      .companias-view .company-legend > div { padding: 6px 0; }
      .companias-view .company-legend p:nth-child(2) { color: #445268; font-size: 12px; font-weight: 700; }
      .companias-view .company-legend p:last-child { color: #263348; font-size: 12px; font-weight: 800; }
      .companias-view .company-bottom-header-link { align-items: center; display: inline-flex; flex-shrink: 0; margin: 0; white-space: nowrap; }
      .companias-view .company-context-row { flex-wrap: wrap; margin-top: 5px; min-width: 0; }
      .companias-view .company-identity-row { flex-wrap: wrap; min-width: 0; }
      .companias-view .company-key { background: #F4F6F8; border-radius: 999px; color: #6C788A; flex: 0 0 auto; font-size: 10px; font-weight: 650; line-height: 1.3; padding: 3px 8px; }
      .companias-view .company-key span { color: #344054; font-variant-numeric: tabular-nums; font-weight: 800; }
      .companias-view .company-context-row { align-items: flex-start; }
      .companias-view .company-context-row .company-location { align-items: flex-start; flex: 1 1 440px; margin-top: 0; max-width: 100%; min-width: min(100%, 280px); }
      .companias-view .company-context-row .company-location p { line-height: 1.4; overflow-wrap: anywhere; white-space: normal; }
      .companias-view .company-project-error { color: #A43F1B; font-size: 11px; min-height: 94px; padding: 14px; text-align: center; }
      .companias-view .company-project-error button { align-items: center; background: #D95B27; border: 0; border-radius: 7px; color: #FFF; cursor: pointer; display: inline-flex; font-family: inherit; font-size: 10px; font-weight: 800; gap: 5px; padding: 7px 10px; }
      .companias-view .company-context-phone { align-items: center; color: #536176; display: inline-flex; flex: 0 0 auto; font-size: 11px; font-weight: 650; gap: 5px; text-decoration: none; white-space: nowrap; }
      .companias-view .company-context-phone:hover { color: #B9471E; text-decoration: underline; }
      .companias-view .company-context-phone svg { color: #D95B27; flex: 0 0 auto; }
      .companias-view .company-contact-info { flex-wrap: wrap; margin-top: 5px; min-width: 0; }
      .companias-view .company-contact-info a { align-items: center; color: #536176; display: inline-flex; font-size: 11px; font-weight: 650; gap: 5px; max-width: min(100%, 290px); min-width: 0; text-decoration: none; }
      .companias-view .company-contact-info a:hover { color: #B9471E; text-decoration: underline; }
      .companias-view .company-contact-info a svg { color: #D95B27; flex: 0 0 auto; }
      .companias-view .company-state-row > p:last-child { color: #263348; flex: 0 0 66px; font-size: 11px; font-variant-numeric: tabular-nums; font-weight: 800; }
      .companias-view .company-state-row > p:last-child span { color: #6C788A; font-size: 10px; font-weight: 700; margin-left: 2px; }
      .companias-view.company-dark { color: #E7ECF3; scrollbar-color: #546174 transparent; }
      .companias-view.company-dark .company-directory-summary { background: #202731; border-color: #36404E; }
      .companias-view.company-dark .company-directory-summary > div { border-color: #36404E; }
      .companias-view.company-dark .company-directory-summary p:first-child, .companias-view.company-dark .company-directory-title, .companias-view.company-dark .company-name, .companias-view.company-dark .company-metric p:nth-child(2), .companias-view.company-dark .company-card-title, .companias-view.company-dark .company-bottom-title p:first-child, .companias-view.company-dark .company-list-item strong, .companias-view.company-dark .company-project-row strong, .companias-view.company-dark .company-contacts > div > div:nth-child(2) > p:first-child { color: #F8FAFC; }
      .companias-view.company-dark .company-directory-title span, .companias-view.company-dark .company-directory-summary p:last-child, .companias-view.company-dark .company-role, .companias-view.company-dark .company-location, .companias-view.company-dark .company-metric p:first-child, .companias-view.company-dark .company-metric p:last-child, .companias-view.company-dark .company-list-item small, .companias-view.company-dark .company-project-head, .companias-view.company-dark .company-project-row, .companias-view.company-dark .company-project-row small, .companias-view.company-dark .company-contacts > div > div:nth-child(2) > p:last-child, .companias-view.company-dark .company-card-title span, .companias-view.company-dark .company-card-empty { color: #B9C3D0; }
      .companias-view.company-dark .company-contact-info a { color: #C8D2DE; }
      .companias-view.company-dark .company-contact-info a:hover { color: #EFBFAC; }
      .companias-view.company-dark .company-context-phone { color: #C8D2DE; }
      .companias-view.company-dark .company-context-phone:hover { color: #EFBFAC; }
      .companias-view.company-dark .company-key { background: #252D38; color: #B9C3D0; }
      .companias-view.company-dark .company-key span { color: #F8FAFC; }
      .companias-view.company-dark .company-search, .companias-view.company-dark .company-filter-trigger, .companias-view.company-dark .company-saved-filter, .companias-view.company-dark .company-linkedin, .companias-view.company-dark .company-download { background: #202731; border-color: #3B4655; color: #DDE5EF; }
      .companias-view.company-dark .company-search input { color: #F8FAFC; }
      .companias-view.company-dark .company-search input::placeholder { color: #9CA9BA; }
      .companias-view.company-dark .company-filter-trigger.active, .companias-view.company-dark .company-filter-trigger:hover { background: #35231F; border-color: #A44D2C; color: #F6D1C5; }
      .companias-view.company-dark .company-saved-filter.active, .companias-view.company-dark .company-saved-filter:hover { background: #243049; border-color: #7187B2; color: #E6EEFF; }
      .companias-view.company-dark .company-list-item.selected { background: #331A10; border-left-color: #D95B27; }
      .companias-view.company-dark .company-list-avatar, .companias-view.company-dark .company-contact-avatar { background: #252D38; color: #E7ECF3; }
      .companias-view.company-dark .company-signal { background: #26170F; border-color: #552D1D; }
      .companias-view.company-dark .company-signal > div:nth-child(2) > p:first-child { color: #E89878; }
      .companias-view.company-dark .company-signal > div:nth-child(2) > p:last-child { color: #D4DCE6; }
      .companias-view.company-dark .company-legend p:nth-child(2), .companias-view.company-dark .company-state-row > p:first-child, .companias-view.company-dark .company-activity p:first-child { color: #D5DEE9; }
      .companias-view.company-dark .company-legend p:last-child, .companias-view.company-dark .company-state-row > p:last-child, .companias-view.company-dark .company-activity p:nth-child(2) { color: #F8FAFC; }
      .companias-view.company-dark .company-state-row > p:last-child span { color: #B6C3D4; }
      .companias-view.company-dark .company-state-row progress::-webkit-progress-bar, .companias-view.company-dark .company-state-pair-body progress::-webkit-progress-bar { background: #303A47; }
      .companias-view.company-dark .company-states-single { background: #26170F; border-color: #552D1D; }
      .companias-view.company-dark .company-states-single > div > p:first-child { color: #F5CEC1; }
      .companias-view.company-dark .company-states-single > div > div > p:first-child { color: #E89878; }
      .companias-view.company-dark .company-states-single > div > div > p:last-child, .companias-view.company-dark .company-states-single > div > p:last-child { color: #D4DCE6; }
      .companias-view.company-dark .company-state-pair-body > div { background: #202731; border-color: #3B4655; }
      .companias-view.company-dark .company-state-pair-body > div > p:first-child { color: #E2E8F0; }
      .companias-view.company-dark .company-state-pair-body > div > p:nth-child(3) { color: #B9C3D0; }
      .companias-view.company-dark .company-opportunity { background: #202A35; border-color: #3B4A5D; }
      .companias-view.company-dark .company-opportunity > div:nth-child(2) p:first-child, .companias-view.company-dark .company-opportunity > div:last-child p:first-child { color: #EDF3FA; }
      .companias-view.company-dark .company-opportunity > div:nth-child(2) p:last-child, .companias-view.company-dark .company-opportunity > div:last-child p:last-child { color: #B8C6D6; }
      .companias-view.company-dark .company-dialog, .companias-view.company-dark .company-alert-dialog { background: #181D24; border: 1px solid #34404E; color: #E7ECF3; }
      .companias-view.company-dark .company-dialog-header, .companias-view.company-dark .company-dialog-search, .companias-view.company-dark .company-dialog-projects > button, .companias-view.company-dark .company-dialog-contacts > div { border-color: #354151; }
      .companias-view.company-dark .company-dialog-header > div:nth-child(2) > p:first-child, .companias-view.company-dark .company-dialog-projects strong, .companias-view.company-dark .company-dialog-contacts > div > div:nth-child(2) > p:first-child, .companias-view.company-dark .company-alert-dialog > p:nth-of-type(1) { color: #F8FAFC; }
      .companias-view.company-dark .company-dialog-header > div:nth-child(2) > p:last-child, .companias-view.company-dark .company-dialog-projects, .companias-view.company-dark .company-dialog-projects small, .companias-view.company-dark .company-dialog-projects > button > span:nth-child(n+3), .companias-view.company-dark .company-dialog-contacts > div > div:nth-child(2) > p:nth-child(2), .companias-view.company-dark .company-dialog-contacts > div > div:nth-child(2) > p:last-child, .companias-view.company-dark .company-alert-dialog > p:nth-of-type(2) { color: #C4CEDA; }
      .companias-view.company-dark .company-dialog-header > button, .companias-view.company-dark .company-alert-dialog-actions button { background: #202731; border-color: #3B4655; color: #E3EAF3; }
      .companias-view.company-dark .company-dialog-search input { background: #10151B; border-color: #3B4655; color: #F8FAFC; }
      .companias-view.company-dark .company-dialog-search > p { background: #331A10; color: #F0BFAE; }
      .companias-view.company-dark .company-dialog-projects > button:hover { background: #252C36; box-shadow: 0 0 0 8px #252C36; }
      .companias-view.company-dark .company-alert-dialog-explainer { background: #202731; border-color: #3B4655; }
      .companias-view.company-dark .company-alert-dialog-explainer p:first-child { color: #F3F6FA; }
      .companias-view.company-dark .company-alert-dialog-explainer p:last-child { color: #C4CEDA; }
      @media (max-width: 1180px) { .companias-view .company-pie { flex-basis: 154px; height: 154px; } .companias-view .company-legend { flex-basis: 126px; } }
    `}</style>
    <style>{`
      .companias-view .company-profile-kpis { min-width: 0; }
      .companias-view .company-profile-kpis-title { color: var(--cl-text-strong, #344054); font-size: 12px; font-weight: 800; line-height: 1; margin-bottom: 7px; }
      .companias-view .company-profile-kpis-grid { display: grid; gap: 8px; grid-template-columns: repeat(5, minmax(0, 1fr)); }
      .companias-view .company-profile-kpi { background: var(--cl-surface-muted, #F8FAFC); border: 1px solid var(--cl-border, #E7ECF1); border-radius: 9px; min-height: 72px; padding: 8px 9px; }
      .companias-view .company-profile-kpi-icon { background: #FFF1EA; border-radius: 8px; color: #D95B27; flex: 0 0 auto; height: 34px; width: 34px; }
      .companias-view .company-profile-kpi > div:nth-child(2) > p:first-child { color: var(--cl-text-muted, #7B8798); font-size: 8.5px; line-height: 1.15; }
      .companias-view .company-profile-kpi > div:nth-child(2) > p:nth-child(2) { color: var(--cl-text-strong, #344054); font-size: 10px; font-weight: 800; line-height: 1.2; margin-top: 3px; text-transform: uppercase; }
      .companias-view .company-profile-kpi > div:nth-child(2) > p:nth-child(3) { color: var(--cl-text-muted, #7B8798); font-size: 7.5px; line-height: 1.15; margin-top: 2px; }
      .companias-view .company-profile-kpi > svg { color: #A4ADBA; flex: 0 0 auto; }
      .companias-view.company-dark .company-profile-kpi-icon { background: rgba(217, 91, 39, .17); }
      @media (min-width: 841px) {
        .companias-view .company-dashboard { grid-template-rows: 82px 82px 96px 242px minmax(0, 1fr); }
        .companias-view .company-profile-kpis { height: 100%; margin: 0; min-height: 0; }
      }
      @media (max-width: 1260px) {
        .companias-view .company-profile-kpis-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .companias-view .company-profile-kpis { overflow-y: auto; }
      }
      @media (max-width: 620px) {
        .companias-view .company-profile-kpis-grid { grid-template-columns: 1fr; }
      }
    `}</style>
    <style>{`
      /* Tabla de proyectos: conserva todos los campos del WS sin perder legibilidad. */
      .companias-view .company-project-card { display: flex; flex-direction: column; }
      .companias-view .company-project-count { background: #F3F5F8; border-radius: 999px; color: #5F6C7F !important; font-size: 9px !important; font-weight: 800 !important; padding: 4px 8px; white-space: nowrap; }
      .companias-view .company-project-head, .companias-view .company-project-row { display: grid; gap: 8px; grid-template-columns: minmax(180px, 1.75fr) minmax(145px, 1.25fr) 74px 82px 82px 18px; }
      .companias-view .company-project-head { border: 0; color: #8A95A5; flex: 0 0 auto; font-size: 9px; letter-spacing: .045em; margin-top: 7px; padding: 5px 9px; text-transform: uppercase; }
      .companias-view .company-project-head > :nth-child(n+3):not(:last-child) { text-align: right; }
      .companias-view .company-project-head > :nth-child(3) { text-align: center; }
      .companias-view .company-project-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 3px 3px; scrollbar-color: #CBD1DC transparent; scrollbar-width: thin; }
      .companias-view .company-project-row { align-items: center; background: #FAFBFC; border: 1px solid #E8ECF1; border-radius: 9px; color: #596579; min-height: 53px; margin-bottom: 6px; padding: 7px 9px; transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; }
      .companias-view .company-project-row:hover { background: #FFF; border-color: #E7A88C; box-shadow: 0 5px 13px rgba(51, 65, 85, .08); transform: translateY(-1px); }
      .companias-view .company-project-main, .companias-view .company-project-address { display: flex; flex-direction: column; min-width: 0; }
      .companias-view .company-project-main strong { display: -webkit-box; font-size: 10.5px; line-height: 1.28; overflow: hidden; white-space: normal; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
      .companias-view .company-project-main small { color: #8B96A6; font-size: 9px; line-height: 1.2; margin-top: 3px; }
      .companias-view .company-project-main small b { color: #B9471E; font-variant-numeric: tabular-nums; font-weight: 800; }
      .companias-view .company-project-address > span { display: -webkit-box; font-size: 9.5px; line-height: 1.3; overflow: hidden; white-space: normal; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
      .companias-view .company-project-address small { align-self: flex-start; background: #EEF2F6; border-radius: 999px; color: #617086; font-size: 8px; font-weight: 750; line-height: 1.2; margin-top: 3px; max-width: 100%; overflow: hidden; padding: 2px 6px; text-overflow: ellipsis; white-space: nowrap; }
      .companias-view .company-project-investment { align-items: center; background: #FFF0E9; border-radius: 7px; color: #B9471E !important; display: flex; font-size: 10px; font-weight: 850 !important; justify-content: center; justify-self: stretch; padding: 5px 6px; text-align: center; white-space: nowrap; }
      .companias-view .company-project-date { color: #4F5C70 !important; font-size: 9.5px; font-variant-numeric: tabular-nums; font-weight: 750 !important; line-height: 1.25; text-align: right; white-space: nowrap; }
      .companias-view .company-project-open { color: #D95B27; opacity: .65; transition: opacity 150ms ease, transform 150ms ease; }
      .companias-view .company-project-row:hover .company-project-open { opacity: 1; transform: translateX(2px); }
      .companias-view .company-dialog-projects-wrap { display: flex; flex: 1; flex-direction: column; min-height: 0; overflow: hidden; padding: 0 18px 16px; }
      .companias-view .company-dialog-project-head, .companias-view .company-dialog-projects > button { display: grid; gap: 12px; grid-template-columns: minmax(230px, 1.6fr) minmax(210px, 1.3fr) 88px 102px 102px 20px; }
      .companias-view .company-dialog-project-head { color: #8A95A5; flex: 0 0 auto; font-size: 9px; font-weight: 800; letter-spacing: .05em; padding: 12px 7px 7px; text-transform: uppercase; }
      .companias-view .company-dialog-project-head > :nth-child(n+3):not(:last-child) { text-align: right; }
      .companias-view .company-dialog-projects { padding: 0 7px 8px; }
      .companias-view .company-dialog-projects > button { border: 1px solid #E7ECF1; border-radius: 10px; margin-bottom: 8px; min-height: 72px; padding: 10px 11px; }
      .companias-view .company-dialog-projects > button:hover { background: #FFF; border-color: #E7A88C; box-shadow: 0 5px 14px rgba(51, 65, 85, .08); }
      .companias-view .company-dialog-projects > button > span:nth-child(2) { display: flex; flex-direction: column; line-height: 1.35; min-width: 0; overflow: hidden; }
      .companias-view .company-dialog-projects > button > span:nth-child(2) > small { align-self: flex-start; background: #EEF2F6; border-radius: 999px; color: #617086; max-width: 100%; overflow: hidden; padding: 2px 7px; text-overflow: ellipsis; white-space: nowrap; }
      .companias-view.company-dark .company-project-count, .companias-view.company-dark .company-project-address small, .companias-view.company-dark .company-dialog-projects > button > span:nth-child(2) > small { background: #28313D; color: #C3CEDA !important; }
      .companias-view.company-dark .company-project-row, .companias-view.company-dark .company-dialog-projects > button { background: #202731; border-color: #374251; }
      .companias-view.company-dark .company-project-row:hover, .companias-view.company-dark .company-dialog-projects > button:hover { background: #252D38; border-color: #A95C3B; box-shadow: none; }
      .companias-view.company-dark .company-project-investment { background: #3A2118; color: #F1B59D !important; }
      .companias-view.company-dark .company-project-date { color: #D3DCE7 !important; }
      @media (max-width: 1180px) {
        .companias-view .company-project-head, .companias-view .company-project-row { grid-template-columns: minmax(155px, 1.6fr) minmax(120px, 1fr) 68px 72px 72px 16px; gap: 6px; }
        .companias-view .company-project-date { font-size: 8.8px; }
      }
      @media (max-width: 720px) {
        .companias-view .company-project-head, .companias-view .company-dialog-project-head { display: none; }
        .companias-view .company-project-row, .companias-view .company-dialog-projects > button { grid-template-columns: repeat(3, minmax(0, 1fr)) 18px; padding: 10px; }
        .companias-view .company-dialog-projects > button > span:nth-child(2) { display: flex; }
        .companias-view .company-dialog-projects > button > span:last-of-type { display: block; }
        .companias-view .company-project-row > :first-child, .companias-view .company-project-row > :nth-child(2), .companias-view .company-dialog-projects > button > :first-child, .companias-view .company-dialog-projects > button > :nth-child(2) { grid-column: 1 / -1; }
        .companias-view .company-project-row > :nth-child(3), .companias-view .company-project-row > :nth-child(4), .companias-view .company-project-row > :nth-child(5), .companias-view .company-dialog-projects > button > :nth-child(3), .companias-view .company-dialog-projects > button > :nth-child(4), .companias-view .company-dialog-projects > button > :nth-child(5) { text-align: left; }
        .companias-view .company-project-open, .companias-view .company-dialog-projects > button > svg { display: block; grid-column: 4; grid-row: 3; }
      }
    `}</style>
    <Box className="company-workspace"><CompanyList companies={companies} selected={activeId} onSelect={(id) => { setSelectedId(id); setProjectFocus(null); setOpenDirectory(null); }} onPrefetch={(clave) => projectsPrefetchRef.current?.prioritize(clave)} loading={isLoadingCompanies} error={companiesError} onRetry={onRetryCompanies} companyProjects={companyProjects} filtros={companyFilters} onApplyFilters={setCompanyFilters} /><Dashboard company={company} isLoadingCompanies={isLoadingCompanies} onViewFicha={onViewFicha} onShowProjects={() => setOpenDirectory('projects')} onShowContacts={() => setOpenDirectory('contacts')} projectFocus={projectFocus} projectLoadState={projectEntry?.status || (companyKey ? 'loading' : 'idle')} projectLoadError={projectEntry?.error || ''} onRetryProjects={() => { setProjectsByCompany((current) => { const next = { ...current }; delete next[companyKey]; return next; }); setProjectsRetryToken((value) => value + 1); }} /></Box>
    <CompanyDirectoryDialog mode={openDirectory} company={company} onClose={() => setOpenDirectory(null)} onViewFicha={onViewFicha} />
  </Box>;
}
