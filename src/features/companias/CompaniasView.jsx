import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import {
  Cell, Label, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  FiArrowRight, FiBell, FiBookmark, FiBriefcase, FiDownload, FiExternalLink, FiFilter,
  FiChevronRight, FiLinkedin, FiMail, FiMapPin, FiPhone, FiSearch, FiTrendingUp, FiX,
} from 'react-icons/fi';
import {
  buildCompanyRows, companiesToCsv, formatCompactInvestment, formatNumber, getCompanyGenreColor,
} from './companyData';
import { getCompanyActivityAlerts, toggleCompanyActivityAlert } from '../../utils/radarNotifications';

function normal(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
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

function monthOf(project) {
  const date = dateOf(project);
  return date ? new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric' }).format(date).replace('.', '') : 'Sin fecha';
}

function genreData(company) {
  const counts = new Map();
  company?.projects?.forEach((project) => {
    const name = String(project.genero || 'Sin género').trim() || 'Sin género';
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  const total = company?.projectCount || 0;
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

function trendData(company) {
  const buckets = new Map();
  company?.projects?.forEach((project, index) => {
    const date = dateOf(project);
    const key = date ? `${date.getFullYear()}-${date.getMonth()}` : `index-${index}`;
    const current = buckets.get(key) || { label: date ? monthOf(project) : `${index + 1}`, value: 0 };
    current.value += 1;
    buckets.set(key, current);
  });
  const trend = [...buckets.values()].slice(-8);
  return trend.length > 1 ? trend : [{ label: 'Inicio', value: 0 }, ...(trend.length ? trend : [{ label: 'Actual', value: 0 }])];
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
  return [...(company?.projects || [])].sort((a, b) => (dateOf(b)?.getTime() || 0) - (dateOf(a)?.getTime() || 0) || (Number(b.inversion) || 0) - (Number(a.inversion) || 0));
}

function Metric({ label, value, detail }) {
  return <Box className="company-metric"><Text>{label}</Text><Text>{value}</Text><Text>{detail}</Text></Box>;
}

const QUICK_FILTERS = [
  { key: 'generos', field: 'genero', label: 'Géneros' },
  { key: 'sectores', field: 'sector', label: 'Sectores' },
];

const COMPANY_LIST_ROW_HEIGHT = 76;
const COMPANY_LIST_OVERSCAN = 8;

const ESTADOS_POR_REGION_CATALOG = {
  Oeste: ['Jalisco', 'Colima', 'Michoacán', 'Nayarit', 'Aguascalientes'],
  Noroeste: ['Baja California', 'Baja California Sur', 'Sonora', 'Sinaloa', 'Chihuahua', 'Durango'],
  Centro: ['Ciudad de México', 'Estado de México', 'Hidalgo', 'Morelos', 'Puebla', 'Querétaro', 'Tlaxcala'],
  Sureste: ['Guerrero', 'Oaxaca', 'Veracruz', 'Tabasco', 'Chiapas', 'Campeche', 'Yucatán', 'Quintana Roo'],
  Noreste: ['Nuevo León', 'Coahuila', 'Tamaulipas', 'San Luis Potosí', 'Zacatecas'],
};

function statesByRegion(obras = []) {
  const grouped = new Map();
  obras.forEach((obra) => {
    const state = String(obra?.estado || '').trim();
    if (!state) return;
    const regionFromData = String(obra?.region || '').trim();
    const inferredRegion = Object.entries(ESTADOS_POR_REGION_CATALOG).find(([, states]) => (
      states.some((item) => normal(item) === normal(state))
    ))?.[0];
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

function CompanyList({ companies, selected, onSelect, loading, sourceObras, filtros, onApplyFilters, savedKeys, savedOnly, onToggleSavedOnly }) {
  const [query, setQuery] = useState('');
  const listRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [listHeight, setListHeight] = useState(560);
  const savedCompanies = useMemo(
    () => companies.filter((company) => savedKeys.has(company.key)),
    [companies, savedKeys]
  );
  const directoryCompanies = savedOnly ? savedCompanies : companies;
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
    <Flex className="company-directory-title" align="center" justify="space-between"><Text>{savedOnly ? 'Guardadas' : 'Compañías'} <Text as="span">({formatNumber(directoryCompanies.length)})</Text></Text><Flex align="center" gap={1.5}><button type="button" className={`company-saved-filter${savedOnly ? ' active' : ''}`} onClick={onToggleSavedOnly} aria-pressed={savedOnly}><FiBookmark size={13} /><span>Guardadas</span>{savedKeys.size > 0 && <b>{formatNumber(savedKeys.size)}</b>}</button><CompanyFilters obras={sourceObras} filtros={filtros} onApplyFilters={onApplyFilters} /></Flex></Flex>
    <Flex className="company-search" align="center" gap={2}><FiSearch size={14} /><input value={query} onChange={handleQueryChange} placeholder="Buscar compañía…" aria-label="Buscar compañía" /></Flex>
    <Flex className="company-directory-summary" align="center" gap={2}><Box><Text>{formatNumber(portfolio.projects)}</Text><Text>obras activas</Text></Box><Box><Text>{formatNumber(portfolio.reachable)}</Text><Text>con contacto</Text></Box></Flex>
    <Box ref={listRef} className="company-list" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
      {loading && !companies.length && <Flex className="company-empty" direction="column" align="center" gap={2}><Spinner size="sm" color="#FF653F" /><Text>Preparando compañías…</Text></Flex>}
      {!loading && !visible.length && <Flex className="company-empty" direction="column" align="center" gap={2}><FiBriefcase size={20} /><Text>No encontramos compañías.</Text></Flex>}
      {!!visible.length && <Box className="company-list-virtual" style={{ height: `${visible.length * COMPANY_LIST_ROW_HEIGHT}px` }}><Box style={{ transform: `translateY(${visibleStart * COMPANY_LIST_ROW_HEIGHT}px)` }}>{virtualCompanies.map((company) => <button type="button" key={company.key} className={`company-list-item${selected === company.key ? ' selected' : ''}`} onClick={() => onSelect(company.key)} aria-pressed={selected === company.key}>
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
  const rows = [['Nuevas obras', formatNumber(activity.projects.value), activity.projects.change], ['Inversión reciente', formatCompactInvestment(activity.investment.value), activity.investment.change], ['m² recientes', `${formatNumber(activity.surface.value)} m²`, activity.surface.change]];
  return <Box className="company-card company-activity-card"><Text className="company-card-title">Actividad reciente <Text as="span">(12 meses)</Text></Text><Box className="company-activity">{rows.map(([label, value, change]) => <Flex key={label} align="center"><Text>{label}</Text><Text>{value}</Text><Text className={change.startsWith('-') ? 'negative' : ''}>{change}</Text></Flex>)}</Box><Flex className={`company-opportunity ${opportunity.tone}`} align="center" gap={2}><span aria-hidden="true" /><Box flex="1" minW={0}><Text>Semáforo de oportunidad</Text><Text>{opportunity.reasons.join(' · ') || 'Sin señales suficientes aún'}</Text></Box><Box textAlign="right"><Text>{opportunity.level}</Text><Text>{opportunity.score}/100</Text></Box></Flex></Box>;
}

function Projects({ company, onViewFicha, onShowAll }) {
  const projects = recentProjects(company);
  return <Box className="company-bottom-card company-project-card"><Flex className="company-bottom-title" align="center" justify="space-between"><Text>Proyectos recientes</Text><Flex align="center" gap={3} flexShrink={0}><Text>{formatNumber(company.projectCount)} obras</Text>{projects.length > 0 && <button type="button" className="company-bottom-link company-bottom-header-link" onClick={onShowAll}>Ver todos <FiArrowRight size={14} /></button>}</Flex></Flex><Box className="company-project-head"><Text>Proyecto</Text><Text>Ubicación</Text><Text>Inversión</Text><Text>Inicio</Text></Box><Box className="company-project-list">{projects.map((project, index) => <button type="button" key={project.id || project.clave || `${project.proyecto}-${index}`} className="company-project-row" onClick={() => onViewFicha?.(project)} title="Ver ficha técnica"><span><strong>{project.proyecto || 'Proyecto sin nombre'}</strong><small>{project.clave || 'Clave por confirmar'}</small></span><span>{project.estado || 'Estado por confirmar'} · {project.genero || 'Sin género'}</span><span>{formatCompactInvestment(project.inversion)}</span><span>{monthOf(project)}</span></button>)}{!projects.length && <Text className="company-card-empty">Esta compañía aún no tiene obras para mostrar.</Text>}</Box></Box>;
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

function prioritizedCompanyContacts(company = {}) {
  const datasetContacts = (company.datasetContacts || []).map((contact) => ({ ...contact, source: 'contacto' }));
  const linkedinContacts = (company.linkedinContacts || []).map((contact) => ({ ...contact, source: 'linkedin' }));

  return [
    ...datasetContacts.filter(hasDatasetContactMethod),
    ...datasetContacts.filter((contact) => !hasDatasetContactMethod(contact)),
    ...linkedinContacts,
  ];
}

function Contacts({ company, onShowAll, isLoading = false }) {
  const contacts = prioritizedCompanyContacts(company);
  const totalContacts = (company.datasetContacts?.length || 0) + (company.linkedinContacts?.length || 0);
  return <Box className="company-bottom-card company-contacts-card"><Flex className="company-bottom-title" align="center" justify="space-between"><Text>Contactos destacados</Text><Flex align="center" gap={3} flexShrink={0}><Text>{isLoading ? '…' : formatNumber(totalContacts)}</Text>{totalContacts > 0 && <button type="button" className="company-bottom-link company-bottom-header-link" onClick={onShowAll}>Ver todos <FiArrowRight size={14} /></button>}</Flex></Flex><Box className="company-contacts">{contacts.map((contact, index) => {
    const phones = contactPhones(contact);
    const href = contact.source === 'linkedin' ? contact.url : contact.email ? `mailto:${contact.email}` : '';
    return <Flex key={contact.key || `${contact.name}-${index}`} align="center" gap={2.5}><Flex className={`company-contact-avatar${contact.source === 'linkedin' ? ' is-linkedin' : ''}`} align="center" justify="center">{contact.source === 'linkedin' ? <FiLinkedin size={15} /> : initials(contact.name)}</Flex><Box flex="1" minW={0}><Text lineClamp={1}>{contact.name}</Text><Text lineClamp={contact.source === 'linkedin' ? 1 : 2}>{contact.source === 'linkedin' ? `LinkedIn · ${contact.role || 'Perfil profesional'}` : datasetContactDetail(contact) || 'Contacto de compañía'}</Text></Box>{contact.source === 'linkedin' ? (href ? <a href={href} target="_blank" rel="noreferrer" aria-label={`Abrir contacto de ${contact.name}`}><FiExternalLink size={16} /></a> : <FiLinkedin size={17} className="company-link-muted" />) : <Flex className="company-contact-actions" gap={1}>{contact.email && <a href={`mailto:${contact.email}`} aria-label={`Enviar correo a ${contact.name}`}><FiMail size={15} /></a>}{phones[0] && <a href={`tel:${phones[0].replace(/\s+/g, '')}`} aria-label={`Llamar a ${contact.name}`}><FiPhone size={14} /></a>}</Flex>}</Flex>;
  })}{!contacts.length && (isLoading ? <Flex className="company-card-empty" align="center" justify="center" gap={2}><Spinner size="xs" color="#FF5D32" /><Text>Cargando perfiles y contactos…</Text></Flex> : <Text className="company-card-empty">No hay contactos disponibles aún.</Text>)}</Box></Box>;
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
    .filter((project) => !search || [project.proyecto, project.clave, project.estado, project.genero]
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
      {isProjects ? <Box className="company-dialog-list company-dialog-projects">{projects.map((project, index) => <button type="button" key={project.id || project.clave || `${project.proyecto}-${index}`} onClick={() => onViewFicha?.(project)}><span><strong>{project.proyecto || 'Proyecto sin nombre'}</strong><small>{project.clave || 'Clave por confirmar'}</small></span><span>{project.estado || 'Estado por confirmar'} · {project.genero || 'Sin género'}</span><span>{formatCompactInvestment(project.inversion)}</span><span>{monthOf(project)}</span><FiArrowRight size={16} /></button>)}{!projects.length && <Text className="company-dialog-empty">No hay proyectos que coincidan con la búsqueda.</Text>}</Box> : <Box className="company-dialog-list company-dialog-contacts">{contacts.map((contact, index) => {
        const phones = contactPhones(contact);
        return <Flex key={contact.key || `${contact.name}-${index}`} align="center" gap={3}><Flex className={`company-dialog-contact-avatar${contact.source === 'linkedin' ? ' is-linkedin' : ''}`} align="center" justify="center">{contact.source === 'linkedin' ? <FiLinkedin size={18} /> : initials(contact.name)}</Flex><Box flex="1" minW={0}><Text>{contact.name}</Text><Text>{contact.source === 'linkedin' ? `LinkedIn · ${contact.role || 'Perfil profesional'}` : contact.role || 'Contacto de compañía'}</Text>{contact.source !== 'linkedin' && <Text>{[contact.email, ...phones].filter(Boolean).join(' · ') || 'Sin correo ni teléfono registrado'}</Text>}</Box>{contact.source === 'linkedin' ? (contact.url && <a href={contact.url} target="_blank" rel="noreferrer">Abrir LinkedIn <FiExternalLink size={14} /></a>) : <Flex className="company-dialog-contact-actions" gap={2}>{contact.email && <a href={`mailto:${contact.email}`}>Correo <FiMail size={14} /></a>}{phones[0] && <a href={`tel:${phones[0].replace(/\s+/g, '')}`}>Llamar <FiPhone size={14} /></a>}</Flex>}</Flex>;
      })}{!contacts.length && <Text className="company-dialog-empty">No hay contactos que coincidan con la búsqueda.</Text>}</Box>}
    </Box>
  </Box>;
}

function CompanyAlertDialog({ company, enabled, onClose, onConfirm }) {
  useEffect(() => {
    if (!company) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [company, onClose]);
  if (!company) return null;
  return <Box className="company-dialog-backdrop company-alert-backdrop" role="presentation" onMouseDown={onClose}>
    <Box className="company-alert-dialog" role="dialog" aria-modal="true" aria-labelledby="company-alert-title" onMouseDown={(event) => event.stopPropagation()}>
      <Flex className="company-alert-dialog-icon" align="center" justify="center"><FiBell size={21} /></Flex>
      <Text id="company-alert-title">{enabled ? 'Esta alerta ya está activa' : 'Alertar actividad de esta compañía'}</Text>
      <Text>{enabled ? `Estás dando seguimiento a ${company.name}. Puedes mantenerla activa o detenerla cuando quieras.` : `Al activarla, ${company.name} queda marcada para seguimiento en esta sesión.`}</Text>
      <Box className="company-alert-dialog-explainer"><Text>¿Qué se monitorea?</Text><Text>Nuevas obras, cambios en inversión y superficie, además de contactos identificados. Esta primera versión guarda el seguimiento localmente; no envía correos todavía.</Text></Box>
      <Flex className="company-alert-dialog-actions" justify="end" gap={2}><button type="button" onClick={onClose}>Cancelar</button><button type="button" className={enabled ? 'is-disable' : ''} onClick={onConfirm}>{enabled ? 'Desactivar alerta' : 'Activar alerta'}</button></Flex>
    </Box>
  </Box>;
}

function Dashboard({ company, saved, alertEnabled, isLoadingCompanies, onSave, onOpenAlert, onDownload, onViewFicha, onShowProjects, onShowContacts }) {
  if (!company) return <Flex className="company-dashboard-empty" direction="column" align="center" justify="center"><FiBriefcase size={28} /><Text>Selecciona una compañía para ver su actividad.</Text></Flex>;
  const trend = trendData(company); const recent = recentActivity(company);
  const linkedin = company.linkedinContacts?.find((contact) => contact.url)?.url || '';
  const location = company.states.join(' · ') || company.addresses?.[0]?.formatted || 'Ubicación por confirmar';
  const companyPhone = company.phones?.[0] || '';
  const companyEmail = company.emails?.[0] || '';
  return <Box className="company-dashboard">
    <Flex className="company-profile" align="center" gap={3.5}><Flex className="company-mark" align="center" justify="center">{initials(company.name)}</Flex><Box flex="1" minW={0}><Text className="company-name" lineClamp={1}>{company.name}</Text><Flex align="center" gap={2}><Text className="company-role" lineClamp={1}>{company.roles[0] || 'Compañía constructora'}</Text>{alertEnabled && <Text className="company-watch-status"><FiBell size={10} /> En seguimiento</Text>}</Flex><Flex className="company-location" align="center" gap={1.5}><FiMapPin size={13} /><Text lineClamp={1}>{location}</Text></Flex>{(companyPhone || companyEmail) && <Flex className="company-contact-info" align="center" gap={3}>{companyPhone && <a href={`tel:${companyPhone.replace(/\s+/g, '')}`}><FiPhone size={12} /><Text lineClamp={1}>{companyPhone}</Text></a>}{companyEmail && <a href={`mailto:${companyEmail}`}><FiMail size={12} /><Text lineClamp={1}>{companyEmail}</Text></a>}</Flex>}</Box><Flex className="company-actions" gap={2} align="center">{linkedin ? <a href={linkedin} target="_blank" rel="noreferrer" className="company-linkedin">LinkedIn <FiExternalLink size={13} /></a> : <span className="company-linkedin disabled">LinkedIn <FiLinkedin size={13} /></span>}<button type="button" className={`company-alert${alertEnabled ? ' active' : ''}`} onClick={onOpenAlert}><FiBell size={14} /> {alertEnabled ? 'Alerta activa' : 'Alertar actividad'}</button><button type="button" className={`company-save${saved ? ' saved' : ''}`} onClick={onSave}><FiBookmark size={14} /> {saved ? 'Guardada' : 'Guardar'}</button><button type="button" className="company-download" onClick={onDownload} title="Descargar CSV" aria-label="Descargar compañías en CSV"><FiDownload size={15} /></button></Flex></Flex>
    <Box className="company-metrics"><Metric label="Obras" value={formatNumber(company.projectCount)} detail="Proyectos publicados" /><Metric label="Inversión total" value={formatCompactInvestment(company.totalInvestment)} detail="Monto identificado" /><Metric label="Estados" value={formatNumber(company.stateCount)} detail="Donde tiene presencia" /><Metric label="Superficie total" value={`${formatNumber(company.totalSurface)} m²`} detail="Construidos" /></Box>
    <Flex className="company-signal" align="center" gap={3}><Flex align="center" justify="center"><FiTrendingUp size={18} /></Flex><Box flex="1" minW={0}><Text>Señal comercial</Text><Text>{recent.projects.value ? `${recent.projects.value} obras identificadas en la actividad más reciente.` : 'Actividad registrada en su portafolio.'} Mayor presencia en {company.states[0] || 'sus estados activos'}.</Text></Box><Box className="company-trend"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend} margin={{ top: 5, right: 2, bottom: 0, left: 2 }}><Line type="monotone" dataKey="value" stroke="#FF5D32" strokeWidth={2} dot={{ r: 2, fill: '#FF5D32', strokeWidth: 0 }} activeDot={{ r: 4 }} /><Tooltip formatter={(value) => [`${value} obras`, 'Publicaciones']} /></LineChart></ResponsiveContainer></Box></Flex>
    <Box className="company-insights"><Genres company={company} /><States company={company} /><Activity company={company} alertEnabled={alertEnabled} /></Box><Box className="company-bottom"><Projects company={company} onViewFicha={onViewFicha} onShowAll={onShowProjects} /><Contacts company={company} onShowAll={onShowContacts} isLoading={isLoadingCompanies} /></Box>
  </Box>;
}

export default function CompaniasView({ filteredObras = [], sourceObras = [], filtros = {}, onApplyFilters, companyRelationships = [], isLoading = false, isLoadingCompanies = false, isDarkMode = false, onViewFicha, companyDetailRequest = null }) {
  const [selectedId, setSelectedId] = useState();
  const [openDirectory, setOpenDirectory] = useState(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem('construleads-saved-companies') || '[]')); } catch { return new Set(); } });
  const [alertKeys, setAlertKeys] = useState(() => new Set(getCompanyActivityAlerts().map((alert) => alert.key)));
  // El WS de compañías únicamente enriquece. Nunca debe dejar en blanco el
  // módulo: las obras ya cargadas son suficientes para construir el primer
  // portafolio mientras llegan contactos, RFC y perfiles.
  const companies = useMemo(
    () => buildCompanyRows(filteredObras, companyRelationships),
    [companyRelationships, filteredObras]
  );
  const handledCompanyRequest = useRef('');
  useEffect(() => {
    if (!companyDetailRequest?.id || handledCompanyRequest.current === companyDetailRequest.id) return;
    const requestedName = normal(companyDetailRequest.name);
    const requestedCompany = companies.find((item) => normal(item.name) === requestedName);
    if (!requestedCompany) return;

    handledCompanyRequest.current = companyDetailRequest.id;
    const selectionTimer = window.setTimeout(() => {
      setSelectedId(requestedCompany.key);
      setSavedOnly(false);
      setOpenDirectory(null);
      setAlertDialogOpen(false);
    }, 0);
    return () => window.clearTimeout(selectionTimer);
  }, [companies, companyDetailRequest]);
  const activeId = savedOnly
    ? (companies.some((item) => item.key === selectedId && saved.has(item.key)) ? selectedId : companies.find((item) => saved.has(item.key))?.key)
    : (companies.some((item) => item.key === selectedId) ? selectedId : companies[0]?.key);
  const company = companies.find((item) => item.key === activeId) || null;
  const save = () => { if (!company) return; setSaved((current) => { const next = new Set(current); next.has(company.key) ? next.delete(company.key) : next.add(company.key); localStorage.setItem('construleads-saved-companies', JSON.stringify([...next])); return next; }); };
  const toggleAlert = () => {
    if (!company) return;
    const { alerts } = toggleCompanyActivityAlert(company);
    setAlertKeys(new Set(alerts.map((alert) => alert.key)));
  };
  const download = () => { const url = URL.createObjectURL(new Blob([`\ufeff${companiesToCsv(companies)}`], { type: 'text/csv;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'companias-construleads.csv'; anchor.click(); URL.revokeObjectURL(url); };
  return <Box h="100%" minH="0" overflow="auto" className={`companias-view${isDarkMode ? ' company-dark' : ''}`}>
    <style>{`
      .companias-view{color:#293548;scrollbar-color:#cbd1dc transparent}.company-workspace{display:grid;grid-template-columns:minmax(230px,270px) minmax(0,1fr);gap:10px;min-height:100%}.company-directory,.company-dashboard{background:var(--cl-surface,#fff);border:1px solid var(--cl-border,#e8ebef);border-radius:11px}.company-directory{display:flex;flex-direction:column;min-height:620px;overflow:hidden}.company-directory-title{color:#354054;font-size:13px;font-weight:800;padding:13px 13px 10px}.company-directory-title span{color:#758095;font-size:11px}.company-search{background:#fff;border:1px solid #e4e8ee;border-radius:8px;color:#6f7b8f;height:34px;margin:0 11px 9px;padding:0 9px}.company-search input{background:transparent;border:0;color:#354054;font-family:inherit;font-size:10px;min-width:0;outline:0;width:100%}.company-list{flex:1;min-height:0;overflow-y:auto;padding:0 4px 4px;scrollbar-width:thin}.company-list-item{align-items:center;background:transparent;border:0;border-left:3px solid transparent;color:#334054;cursor:pointer;display:flex;gap:9px;min-height:59px;padding:8px 10px;text-align:left;transition:.16s;width:100%}.company-list-item:hover{background:#fff7f3}.company-list-item.selected{background:#fff0ea;border-left-color:#ff653f}.company-list-avatar{align-items:center;background:#f4f6f8;border-radius:8px;color:#4b596c;display:inline-flex;flex:0 0 auto;font-size:10px;font-weight:800;height:31px;justify-content:center;width:31px}.selected .company-list-avatar{background:#ff653f;color:#fff}.company-list-item>span:last-child{display:flex;flex:1;flex-direction:column;min-width:0}.company-list-item strong{color:#344054;display:-webkit-box;font-size:10px;font-weight:800;line-height:1.22;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2}.company-list-item small{color:#748095;font-size:9px;line-height:1.25;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.company-more{align-items:center;background:#fff;border:1px solid #dce2e9;border-radius:7px;color:#475568;cursor:pointer;display:flex;font-family:inherit;font-size:10px;font-weight:700;gap:6px;justify-content:center;margin:9px 11px 11px;min-height:32px}.company-empty{color:#7b8695;font-size:11px;min-height:180px;padding:20px;text-align:center}.company-service-notice{align-items:center;background:#fff5ef;border:1px solid #ffd0be;border-radius:8px;color:#a7472c;display:flex;font-size:11px;gap:8px;line-height:1.35;margin-bottom:8px;padding:8px 10px}.company-dashboard{min-width:0;overflow:hidden;padding:15px}.company-profile{min-height:60px}.company-mark{background:#ff5d32;border-radius:10px;box-shadow:0 7px 15px rgba(255,93,50,.18);color:#fff;flex:0 0 auto;font-size:14px;font-weight:800;height:52px;width:52px}.company-name{color:#2f3b4e;font-size:15px;font-weight:800;letter-spacing:-.018em}.company-role{color:#5d6879;font-size:10px;font-weight:600;margin-top:1px}.company-location{color:#748094;font-size:9px;margin-top:3px}.company-location svg{color:#ff5d32;flex:0 0 auto}.company-actions{flex:0 0 auto}.company-linkedin,.company-save,.company-download{align-items:center;background:#fff;border:1px solid #dde2e8;border-radius:7px;color:#475467;display:inline-flex;font-family:inherit;font-size:10px;font-weight:700;gap:5px;height:31px;justify-content:center;padding:0 10px;text-decoration:none;white-space:nowrap}.company-linkedin.disabled{color:#a0a8b5}.company-save{background:#ff653f;border-color:#ff653f;box-shadow:0 5px 12px rgba(255,101,63,.18);color:#fff;cursor:pointer}.company-save.saved{background:#354054;border-color:#354054}.company-download{cursor:pointer;padding:0;width:31px}.company-metrics{display:grid;gap:9px;grid-template-columns:repeat(4,minmax(0,1fr));margin-top:15px}.company-metric{background:#fff;border:1px solid #e6eaf0;border-radius:9px;min-height:72px;padding:11px 13px}.company-metric p:first-child{color:#8490a1;font-size:9px;font-weight:600}.company-metric p:nth-child(2){color:#2f3b4e;font-size:16px;font-weight:800;line-height:1.2;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.company-metric p:last-child{color:#5d6a7c;font-size:9px;font-weight:600;margin-top:3px}.company-signal{background:#fff7f3;border:1px solid #ffede5;border-radius:9px;margin-top:11px;min-height:63px;padding:9px 13px}.company-signal>div:first-child{color:#ff5d32;flex:0 0 auto}.company-signal>div:nth-child(2)>p:first-child{color:#f0522d;font-size:10px;font-weight:800}.company-signal>div:nth-child(2)>p:last-child{color:#4f5a6b;font-size:9px;line-height:1.45;margin-top:2px}.company-trend{flex:0 0 130px;height:44px}.company-insights{display:grid;gap:9px;grid-template-columns:minmax(0,.96fr) minmax(0,1.08fr) minmax(0,.96fr);margin-top:11px}.company-card,.company-bottom-card{background:#fff;border:1px solid #e5e9ef;border-radius:9px;min-width:0}.company-card{min-height:164px;padding:12px}.company-card-title{color:#344054;font-size:10px;font-weight:800}.company-card-title span{color:#7d8899;font-size:8px}.company-card-empty{color:#7d8796;font-size:10px;padding:31px 0;text-align:center}.company-genre-body{height:123px}.company-pie{flex:0 0 96px;height:96px}.company-legend{flex:1;min-width:0}.company-legend>div{padding:2px 0}.company-legend span{border-radius:99px;flex:0 0 auto;height:7px;width:7px}.company-legend p:nth-child(2){color:#596579;flex:1;font-size:8px}.company-legend p:last-child{color:#4c586b;font-size:8px;font-weight:800}.company-activity{margin-top:10px}.company-activity>div{border-top:1px solid #eef0f4;min-height:35px}.company-activity>div:first-child{border-top:0}.company-activity p:first-child{color:#657185;flex:1;font-size:9px}.company-activity p:nth-child(2){color:#374356;font-size:9px;font-weight:800;text-align:right;white-space:nowrap}.company-activity p:last-child{color:#209369;font-size:8px;font-weight:800;margin-left:7px;min-width:30px;text-align:right}.company-activity p.negative{color:#d94c35}.company-bottom{display:grid;gap:9px;grid-template-columns:minmax(0,1.32fr) minmax(260px,.92fr);margin-top:11px}.company-bottom-card{min-height:188px;overflow:hidden;padding:12px 13px}.company-bottom-title{min-height:18px}.company-bottom-title p:first-child{color:#344054;font-size:10px;font-weight:800}.company-bottom-title p:last-child{color:#7b8798;font-size:9px;font-weight:600}.company-project-head,.company-project-row{display:grid;gap:10px;grid-template-columns:minmax(150px,1.7fr) minmax(96px,1fr) 74px 55px}.company-project-head{border-bottom:1px solid #e8ebef;color:#8b95a4;font-size:7px;font-weight:800;letter-spacing:.03em;padding:11px 0 6px;text-transform:uppercase}.company-project-head>:nth-child(n+3){text-align:right}.company-project-row{align-items:center;background:transparent;border:0;border-bottom:1px solid #edf0f3;color:#596579;cursor:pointer;font-family:inherit;font-size:8px;min-height:35px;padding:5px 0;text-align:left;width:100%}.company-project-row:hover{background:#fff8f4;box-shadow:0 0 0 5px #fff8f4}.company-project-row>span:first-child{display:flex;flex-direction:column;min-width:0}.company-project-row strong{color:#3f4a5b;font-size:8px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.company-project-row small{color:#929baa;font-size:7px;margin-top:1px}.company-project-row>span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.company-project-row>span:nth-child(3),.company-project-row>span:last-child{color:#465166;font-weight:800;text-align:right;white-space:nowrap}.company-bottom-link{align-items:center;color:#ff5d32;display:flex;font-size:9px;font-weight:800;gap:6px;margin-top:11px}.company-contacts{margin-top:8px}.company-contacts>div{border-bottom:1px solid #eef0f3;min-height:35px;padding:4px 0}.company-contact-avatar{background:#eef0f3;border-radius:50%;color:#4e596a;flex:0 0 auto;font-size:8px;font-weight:800;height:25px;width:25px}.company-contacts>div>div:nth-child(2)>p:first-child{color:#414c5d;font-size:9px;font-weight:800}.company-contacts>div>div:nth-child(2)>p:last-child{color:#7c8797;font-size:8px;margin-top:1px}.company-contacts a{color:#0a66c2;display:flex;flex:0 0 auto}.company-link-muted{color:#b3bac4;flex:0 0 auto}.company-dashboard-empty{background:#fff;border:1px dashed #dbe1e8;border-radius:11px;color:#748094;font-size:12px;gap:10px;min-height:500px}.company-dark .company-directory,.company-dark .company-dashboard,.company-dark .company-metric,.company-dark .company-card,.company-dark .company-bottom-card,.company-dark .company-more{background:var(--cl-surface);border-color:var(--cl-border)}.company-dark .company-directory-title,.company-dark .company-list-item strong,.company-dark .company-name,.company-dark .company-metric p:nth-child(2),.company-dark .company-card-title,.company-dark .company-bottom-title p:first-child,.company-dark .company-contacts>div>div:nth-child(2)>p:first-child,.company-dark .company-project-row strong{color:var(--cl-text-strong)}.company-dark .company-search,.company-dark .company-linkedin,.company-dark .company-download{background:var(--cl-surface-muted);border-color:var(--cl-border)}.company-dark .company-search input{color:var(--cl-text)}.company-dark .company-list-item:hover,.company-dark .company-project-row:hover{background:rgba(255,101,63,.1);box-shadow:none}.company-dark .company-list-item.selected{background:rgba(255,101,63,.16)}.company-dark .company-list-avatar,.company-dark .company-contact-avatar{background:var(--cl-surface-muted);color:var(--cl-text)}.company-dark .company-signal{background:rgba(255,101,63,.1);border-color:rgba(255,180,158,.22)}.company-dark .company-role,.company-dark .company-location,.company-dark .company-metric p:first-child,.company-dark .company-metric p:last-child,.company-dark .company-card-empty,.company-dark .company-activity p:first-child,.company-dark .company-contacts>div>div:nth-child(2)>p:last-child,.company-dark .company-list-item small{color:var(--cl-text-muted)}.company-dark .company-project-head,.company-dark .company-project-row,.company-dark .company-contacts>div,.company-dark .company-activity>div{border-color:var(--cl-border)}@media(max-width:1080px){.company-workspace{grid-template-columns:230px minmax(0,1fr)}.company-insights{grid-template-columns:1fr 1fr}.company-insights>.company-card:last-child{grid-column:span 2}.company-linkedin{font-size:0;padding:0 8px}}@media(max-width:840px){.company-workspace{grid-template-columns:1fr}.company-directory{max-height:330px;min-height:0}.company-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.company-bottom{grid-template-columns:1fr}}@media(max-width:620px){.company-dashboard{padding:11px}.company-profile{align-items:flex-start;flex-wrap:wrap}.company-actions{margin-left:64px;width:calc(100% - 64px)}.company-save{flex:1}.company-metrics,.company-insights{grid-template-columns:1fr 1fr}.company-insights>.company-card:last-child{grid-column:auto}.company-trend{display:none}.company-project-head,.company-project-row{grid-template-columns:minmax(120px,1.6fr) minmax(88px,1fr) 65px}.company-project-head>:last-child,.company-project-row>:last-child{display:none}.company-list{grid-template-columns:1fr}}
    `}</style>
    <style>{`
      .companias-view .company-alert { align-items: center; background: #FFF6F1; border: 1px solid #FFBCA8; border-radius: 7px; color: #D94F2C; cursor: pointer; display: inline-flex; font-family: inherit; font-size: 12px; font-weight: 700; gap: 5px; height: 38px; padding: 0 13px; white-space: nowrap; }
      .companias-view .company-alert.active { background: #E85632; border-color: #E85632; box-shadow: 0 5px 12px rgba(232, 86, 50, .18); color: #FFF; }
      .companias-view .company-states-list { display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }
      .companias-view .company-state-row > p:first-child { color: #536074; flex: 0 0 110px; font-size: 12px; font-weight: 700; }
      .companias-view .company-state-row progress { accent-color: #FF5D32; appearance: none; border: 0; flex: 1; height: 12px; min-width: 0; overflow: hidden; }
      .companias-view .company-state-row progress::-webkit-progress-bar { background: #EEF1F4; border-radius: 99px; }
      .companias-view .company-state-row progress::-webkit-progress-value { background: #FF5D32; border-radius: 99px; }
      .companias-view .company-state-row progress::-moz-progress-bar { background: #FF5D32; border-radius: 99px; }
      .companias-view .company-state-row > p:last-child { color: #3F4B5F; flex: 0 0 24px; font-size: 11px; font-weight: 800; text-align: right; }
      .companias-view .company-bottom-link { background: transparent; border: 0; cursor: pointer; font-family: inherit; padding: 0; text-align: left; }
      .companias-view .company-bottom-header-link { align-items: center; display: inline-flex; flex-shrink: 0; margin: 0; white-space: nowrap; }
      .companias-view .company-contact-avatar.is-linkedin, .companias-view .company-dialog-contact-avatar.is-linkedin { background: #E8F1FC; color: #0A66C2; }
      .companias-view .company-dialog-backdrop { align-items: center; background: rgba(27, 36, 51, .45); display: flex; inset: 0; justify-content: center; padding: 24px; position: fixed; z-index: 1000; }
      .companias-view .company-dialog { background: var(--cl-surface, #FFF); border-radius: 16px; box-shadow: 0 24px 64px rgba(20, 30, 46, .3); display: flex; flex-direction: column; height: min(720px, calc(100dvh - 80px)); max-width: 1080px; overflow: hidden; width: min(96vw, 1080px); }
      .companias-view .company-dialog-header { border-bottom: 1px solid var(--cl-border, #E5E9EF); min-height: 76px; padding: 12px 18px; }
      .companias-view .company-dialog-mark { background: #FF5D32; border-radius: 10px; color: #FFF; flex: 0 0 auto; font-size: 14px; font-weight: 800; height: 44px; width: 44px; }
      .companias-view .company-dialog-header > div:nth-child(2) > p:first-child { color: var(--cl-text-strong, #2F3B4E); font-size: 16px; font-weight: 800; }
      .companias-view .company-dialog-header > div:nth-child(2) > p:last-child { color: var(--cl-text-muted, #788497); font-size: 12px; margin-top: 2px; }
      .companias-view .company-dialog-header > button { align-items: center; background: transparent; border: 1px solid var(--cl-border, #E1E6ED); border-radius: 8px; color: #596579; cursor: pointer; display: flex; height: 34px; justify-content: center; width: 34px; }
      .companias-view .company-dialog-search { border-bottom: 1px solid var(--cl-border, #E5E9EF); color: #758194; padding: 12px 18px; }
      .companias-view .company-dialog-search input { background: #F8F9FB; border: 1px solid #E1E6ED; border-radius: 8px; color: #374356; font-family: inherit; font-size: 13px; height: 38px; outline: 0; padding: 0 11px; width: 100%; }
      .companias-view .company-dialog-search > p { background: #FFF0EA; border-radius: 99px; color: #D94F2C; font-size: 11px; font-weight: 800; padding: 6px 9px; }
      .companias-view .company-dialog-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 18px 16px; scrollbar-color: #CBD1DC transparent; scrollbar-width: thin; }
      .companias-view .company-dialog-projects > button { align-items: center; background: transparent; border: 0; border-bottom: 1px solid #EDF0F3; color: #657185; cursor: pointer; display: grid; font-family: inherit; font-size: 12px; gap: 14px; grid-template-columns: minmax(250px, 1.7fr) minmax(150px, 1fr) 88px 76px 20px; min-height: 64px; padding: 9px 0; text-align: left; width: 100%; }
      .companias-view .company-dialog-projects > button:hover { background: #FFF8F4; box-shadow: 0 0 0 8px #FFF8F4; }
      .companias-view .company-dialog-projects strong { color: #374356; display: block; font-size: 13px; line-height: 1.25; }
      .companias-view .company-dialog-projects small { color: #8A94A3; display: block; font-size: 11px; margin-top: 3px; }
      .companias-view .company-dialog-projects > button > span:nth-child(n+3) { color: #465166; font-size: 12px; font-weight: 800; text-align: right; }
      .companias-view .company-dialog-projects > button > svg { color: #FF5D32; }
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
        .companias-view .company-dashboard { display: grid; gap: 10px; grid-template-rows: 58px 82px 66px minmax(168px, .85fr) minmax(216px, 1.15fr); padding: 14px; }
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
        .companias-view .company-dashboard { display: grid; gap: 10px; grid-template-rows: 58px 82px 66px minmax(168px, .85fr) minmax(216px, 1.15fr); padding: 14px; }
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
      .companias-view .company-filter-trigger:hover, .companias-view .company-filter-trigger.active { background: #FFF4EF; border-color: #FFAD98; color: #D94F2C; }
      .companias-view .company-filter-trigger b { align-items: center; background: #FF653F; border-radius: 99px; color: #FFF; display: inline-flex; font-size: 9px; height: 16px; justify-content: center; min-width: 16px; padding: 0 4px; }
      .companias-view .company-filter-popover { background: var(--cl-surface, #FFF); border: 1px solid #DEE5EC; border-radius: 12px; box-shadow: 0 16px 36px rgba(36, 48, 67, .18); max-height: min(600px, calc(100dvh - 190px)); overflow-y: auto; padding: 12px; position: absolute; right: 0; scrollbar-color: #CBD1DC transparent; scrollbar-width: thin; top: 38px; width: min(360px, calc(100vw - 44px)); z-index: 40; }
      .companias-view .company-filter-popover-head { border-bottom: 1px solid #EDF0F4; padding: 0 0 10px; }
      .companias-view .company-filter-popover-head p:first-child { color: #344054; font-size: 12px; font-weight: 800; }
      .companias-view .company-filter-popover-head p:last-child { color: #7B8798; font-size: 10px; margin-top: 2px; }
      .companias-view .company-filter-popover-head button { background: transparent; border: 0; color: #E45532; cursor: pointer; font-family: inherit; font-size: 10px; font-weight: 800; padding: 4px; }
      .companias-view .company-filter-group { padding-top: 10px; }
      .companias-view .company-filter-group > p { color: #566378; font-size: 10px; font-weight: 800; margin-bottom: 6px; }
      .companias-view .company-filter-group button { background: #F6F8FA; border: 1px solid #E3E8EE; border-radius: 999px; color: #657185; cursor: pointer; font-family: inherit; font-size: 10px; line-height: 1.2; padding: 5px 8px; text-align: left; }
      .companias-view .company-filter-group button:hover { border-color: #FFB5A1; color: #D94F2C; }
      .companias-view .company-filter-group button.selected { background: #FFF0EA; border-color: #FF8A6A; color: #C94628; font-weight: 800; }
      .companias-view .company-list { padding-bottom: 8px; }
      .companias-view .company-list-item { min-height: 72px; }
      .companias-view .company-bottom-card { display: flex; flex-direction: column; }
      .companias-view .company-project-card > :nth-child(3), .companias-view .company-bottom-card .company-contacts { flex: 1; min-height: 0; }
      .companias-view .company-project-list, .companias-view .company-contacts { overflow-y: auto; overscroll-behavior: contain; scrollbar-color: #56657A transparent; scrollbar-width: thin; }
      .companias-view .company-project-row { min-height: 42px; }
      .companias-view .company-contacts > div { min-height: 40px; }
      .companias-view .company-states-single { background: #FFF9F6; border-color: #FFE1D5; display: flex; flex-direction: column; justify-content: space-between; }
      .companias-view .company-states-single > div { padding: 4px 0 2px; }
      .companias-view .company-states-single > div > p:first-child { color: #A94831; font-size: 14px; font-weight: 800; line-height: 1.2; }
      .companias-view .company-states-single > div > div { margin-top: 4px; }
      .companias-view .company-states-single > div > div > p:first-child { color: #FF5D32; font-size: 36px; font-weight: 800; letter-spacing: -.04em; line-height: .95; }
      .companias-view .company-states-single > div > div > p:last-child { color: #805F54; font-size: 11px; font-weight: 700; padding-bottom: 2px; }
      .companias-view .company-states-single > div > p:last-child { color: #756D70; font-size: 10px; line-height: 1.35; margin-top: 10px; max-width: 240px; }
      @media (min-width: 841px) {
        .companias-view .company-dashboard { grid-template-rows: 58px 82px 66px minmax(192px, .95fr) minmax(250px, 1.15fr); }
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
      .companias-view .company-alert-dialog-icon { background: #FFF0EA; border-radius: 50%; color: #E45532; height: 48px; margin: 0 auto 14px; width: 48px; }
      .companias-view .company-alert-dialog > p:nth-of-type(1) { color: #2F3B4E; font-size: 17px; font-weight: 800; }
      .companias-view .company-alert-dialog > p:nth-of-type(2) { color: #667388; font-size: 12px; line-height: 1.55; margin: 8px auto 0; max-width: 390px; }
      .companias-view .company-alert-dialog-explainer { background: #F8FAFC; border: 1px solid #E7ECF1; border-radius: 10px; margin-top: 18px; padding: 11px 13px; text-align: left; }
      .companias-view .company-alert-dialog-explainer p:first-child { color: #435065; font-size: 11px; font-weight: 800; }
      .companias-view .company-alert-dialog-explainer p:last-child { color: #748094; font-size: 10px; line-height: 1.45; margin-top: 4px; }
      .companias-view .company-alert-dialog-actions { margin-top: 20px; }
      .companias-view .company-alert-dialog-actions button { background: #FFF; border: 1px solid #DCE3EB; border-radius: 8px; color: #526074; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 800; height: 36px; padding: 0 13px; }
      .companias-view .company-alert-dialog-actions button:last-child { background: #FF653F; border-color: #FF653F; color: #FFF; }
      .companias-view .company-alert-dialog-actions button:last-child.is-disable { background: #FFF0EA; border-color: #FFB9A5; color: #D94F2C; }
      @media (min-width: 841px) {
        .companias-view .company-dashboard { grid-template-rows: 58px 82px 66px minmax(224px, 1fr) minmax(250px, 1.15fr); }
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
      .companias-view .company-region-option.selected { background: #FFF9F6; }
      .companias-view .company-region-option > div { min-height: 29px; padding: 2px 4px; }
      .companias-view .company-region-check { align-items: center; background: #FFF; border: 1px solid #D7DEE7; border-radius: 4px; color: #E45532; cursor: pointer; display: inline-flex; flex: 0 0 auto; font-family: inherit; font-size: 10px; font-weight: 900; height: 15px; justify-content: center; margin-right: 7px; padding: 0; width: 15px; }
      .companias-view .company-region-option.selected .company-region-check { background: #FFF0EA; border-color: #FF8A6A; }
      .companias-view .company-region-label { align-items: center; background: transparent; border: 0; color: #556276; cursor: pointer; display: flex; flex: 1; font-family: inherit; font-size: 10px; font-weight: 750; justify-content: flex-start; min-width: 0; padding: 3px 0; text-align: left; }
      .companias-view .company-region-label > span { color: #8A95A5; font-size: 9px; font-weight: 700; margin-left: auto; padding-left: 8px; }
      .companias-view .company-region-label svg { color: #8E98A7; flex: 0 0 auto; margin-left: 5px; transition: transform 160ms ease; }
      .companias-view .company-region-label svg.expanded { transform: rotate(90deg); }
      .companias-view .company-region-children { display: flex; flex-wrap: wrap; gap: 4px; padding: 1px 4px 7px 26px; }
      .companias-view .company-region-children button { background: #F5F7F9; border: 1px solid #E0E6ED; border-radius: 999px; color: #637084; cursor: pointer; font-family: inherit; font-size: 9px; font-weight: 700; padding: 4px 7px; }
      .companias-view .company-region-children button.selected { background: #FFF0EA; border-color: #FF936F; color: #D94F2C; }
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
      .companias-view .company-state-pair-body > div > p:nth-child(2) { color: #FF5D32; font-size: 28px; font-weight: 800; letter-spacing: -.04em; line-height: 1; margin-top: 7px; }
      .companias-view .company-state-pair-body > div > p:nth-child(3) { color: #788497; font-size: 9px; font-weight: 700; margin-top: 3px; }
      .companias-view .company-state-pair-body progress { accent-color: #FF5D32; appearance: none; border: 0; height: 10px; margin-top: 11px; overflow: hidden; width: 100%; }
      .companias-view .company-state-pair-body progress::-webkit-progress-bar { background: #E8EDF2; border-radius: 99px; }
      .companias-view .company-state-pair-body progress::-webkit-progress-value { background: #FF5D32; border-radius: 99px; }
      .companias-view .company-state-pair-body progress::-moz-progress-bar { background: #FF5D32; border-radius: 99px; }
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
        .companias-view .company-dashboard { grid-template-rows: 58px 82px 66px 242px minmax(0, 1fr); }
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
      .companias-view .company-contact-info { flex-wrap: wrap; margin-top: 5px; min-width: 0; }
      .companias-view .company-contact-info a { align-items: center; color: #536176; display: inline-flex; font-size: 11px; font-weight: 650; gap: 5px; max-width: min(100%, 290px); min-width: 0; text-decoration: none; }
      .companias-view .company-contact-info a:hover { color: #D94F2C; text-decoration: underline; }
      .companias-view .company-contact-info a svg { color: #FF653F; flex: 0 0 auto; }
      .companias-view .company-state-row > p:last-child { color: #263348; flex: 0 0 66px; font-size: 11px; font-variant-numeric: tabular-nums; font-weight: 800; }
      .companias-view .company-state-row > p:last-child span { color: #6C788A; font-size: 10px; font-weight: 700; margin-left: 2px; }
      .companias-view.company-dark { color: #E7ECF3; scrollbar-color: #546174 transparent; }
      .companias-view.company-dark .company-directory-summary { background: #202731; border-color: #36404E; }
      .companias-view.company-dark .company-directory-summary > div { border-color: #36404E; }
      .companias-view.company-dark .company-directory-summary p:first-child, .companias-view.company-dark .company-directory-title, .companias-view.company-dark .company-name, .companias-view.company-dark .company-metric p:nth-child(2), .companias-view.company-dark .company-card-title, .companias-view.company-dark .company-bottom-title p:first-child, .companias-view.company-dark .company-list-item strong, .companias-view.company-dark .company-project-row strong, .companias-view.company-dark .company-contacts > div > div:nth-child(2) > p:first-child { color: #F8FAFC; }
      .companias-view.company-dark .company-directory-title span, .companias-view.company-dark .company-directory-summary p:last-child, .companias-view.company-dark .company-role, .companias-view.company-dark .company-location, .companias-view.company-dark .company-metric p:first-child, .companias-view.company-dark .company-metric p:last-child, .companias-view.company-dark .company-list-item small, .companias-view.company-dark .company-project-head, .companias-view.company-dark .company-project-row, .companias-view.company-dark .company-project-row small, .companias-view.company-dark .company-contacts > div > div:nth-child(2) > p:last-child, .companias-view.company-dark .company-card-title span, .companias-view.company-dark .company-card-empty { color: #B9C3D0; }
      .companias-view.company-dark .company-contact-info a { color: #C8D2DE; }
      .companias-view.company-dark .company-contact-info a:hover { color: #FFB5A0; }
      .companias-view.company-dark .company-search, .companias-view.company-dark .company-filter-trigger, .companias-view.company-dark .company-saved-filter, .companias-view.company-dark .company-linkedin, .companias-view.company-dark .company-download { background: #202731; border-color: #3B4655; color: #DDE5EF; }
      .companias-view.company-dark .company-search input { color: #F8FAFC; }
      .companias-view.company-dark .company-search input::placeholder { color: #9CA9BA; }
      .companias-view.company-dark .company-filter-trigger.active, .companias-view.company-dark .company-filter-trigger:hover { background: #35231F; border-color: #B4624C; color: #FFD4C6; }
      .companias-view.company-dark .company-saved-filter.active, .companias-view.company-dark .company-saved-filter:hover { background: #243049; border-color: #7187B2; color: #E6EEFF; }
      .companias-view.company-dark .company-list-item.selected { background: #3A2420; border-left-color: #FF754F; }
      .companias-view.company-dark .company-list-avatar, .companias-view.company-dark .company-contact-avatar { background: #252D38; color: #E7ECF3; }
      .companias-view.company-dark .company-signal { background: #2B1D1A; border-color: #60392F; }
      .companias-view.company-dark .company-signal > div:nth-child(2) > p:first-child { color: #FF8A6B; }
      .companias-view.company-dark .company-signal > div:nth-child(2) > p:last-child { color: #D4DCE6; }
      .companias-view.company-dark .company-legend p:nth-child(2), .companias-view.company-dark .company-state-row > p:first-child, .companias-view.company-dark .company-activity p:first-child { color: #D5DEE9; }
      .companias-view.company-dark .company-legend p:last-child, .companias-view.company-dark .company-state-row > p:last-child, .companias-view.company-dark .company-activity p:nth-child(2) { color: #F8FAFC; }
      .companias-view.company-dark .company-state-row > p:last-child span { color: #B6C3D4; }
      .companias-view.company-dark .company-state-row progress::-webkit-progress-bar, .companias-view.company-dark .company-state-pair-body progress::-webkit-progress-bar { background: #303A47; }
      .companias-view.company-dark .company-states-single { background: #2B1D1A; border-color: #60392F; }
      .companias-view.company-dark .company-states-single > div > p:first-child { color: #FFD1C3; }
      .companias-view.company-dark .company-states-single > div > div > p:first-child { color: #FF8A6B; }
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
      .companias-view.company-dark .company-dialog-search > p { background: #3A2420; color: #FFB6A0; }
      .companias-view.company-dark .company-dialog-projects > button:hover { background: #252C36; box-shadow: 0 0 0 8px #252C36; }
      .companias-view.company-dark .company-alert-dialog-explainer { background: #202731; border-color: #3B4655; }
      .companias-view.company-dark .company-alert-dialog-explainer p:first-child { color: #F3F6FA; }
      .companias-view.company-dark .company-alert-dialog-explainer p:last-child { color: #C4CEDA; }
      @media (max-width: 1180px) { .companias-view .company-pie { flex-basis: 154px; height: 154px; } .companias-view .company-legend { flex-basis: 126px; } }
    `}</style>
    <Box className="company-workspace"><CompanyList companies={companies} selected={activeId} onSelect={(id) => { setSelectedId(id); setOpenDirectory(null); setAlertDialogOpen(false); }} loading={isLoading && !filteredObras.length} sourceObras={sourceObras} filtros={filtros} onApplyFilters={onApplyFilters} savedKeys={saved} savedOnly={savedOnly} onToggleSavedOnly={() => setSavedOnly((current) => !current)} /><Dashboard company={company} saved={company ? saved.has(company.key) : false} alertEnabled={company ? alertKeys.has(company.key) : false} isLoadingCompanies={isLoadingCompanies} onSave={save} onOpenAlert={() => setAlertDialogOpen(true)} onDownload={download} onViewFicha={onViewFicha} onShowProjects={() => setOpenDirectory('projects')} onShowContacts={() => setOpenDirectory('contacts')} /></Box>
    <CompanyDirectoryDialog mode={openDirectory} company={company} onClose={() => setOpenDirectory(null)} onViewFicha={onViewFicha} />
    {alertDialogOpen && <CompanyAlertDialog company={company} enabled={company ? alertKeys.has(company.key) : false} onClose={() => setAlertDialogOpen(false)} onConfirm={() => { toggleAlert(); setAlertDialogOpen(false); }} />}
  </Box>;
}
