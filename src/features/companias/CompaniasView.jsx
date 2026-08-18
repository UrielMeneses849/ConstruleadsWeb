import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Flex, Spinner, Text } from '@chakra-ui/react';
import {
  FiArrowRight,
  FiBriefcase,
  FiChevronDown,
  FiEye,
  FiFilter,
  FiMapPin,
  FiSearch,
  FiX,
} from 'react-icons/fi';

import CompanyDetailModal from './CompanyDetailModal';
import PanelResumen from '../../pages/App/PanelResumen';
import {
  buildCompanyRows,
  companiesToCsv,
  formatCompactInvestment,
  formatNumber,
  getCompanyMetrics,
} from './companyData';

function CompanyTable({ companies, selectedCompanyId, onSelectCompany, onViewDetail, isLoadingProfiles = false }) {
  const [sortDirection, setSortDirection] = useState('desc');
  const sortedCompanies = useMemo(() => [...companies].sort((first, second) => {
    const difference = first.projectCount - second.projectCount;
    if (difference) return sortDirection === 'desc' ? -difference : difference;
    return first.name.localeCompare(second.name, 'es-MX');
  }), [companies, sortDirection]);

  return (
    <Box h="100%" minH="0" bg="var(--cl-surface)" border="1px solid var(--cl-border)" borderRadius="11px" overflow="hidden" display="flex" flexDirection="column">
      <Flex minH="42px" px={3.5} align="center" bg="#3D4658" color="white" flexShrink={0}>
        <Text fontSize="14px" fontWeight="700">Listado de compañías</Text>
        <Text ml="auto" fontSize="10px" color="rgba(255,255,255,.74)">{isLoadingProfiles ? 'Consultando RFC y claves…' : `${companies.length.toLocaleString()} compañías`}</Text>
      </Flex>
      <Box flex="1" minH="0" overflowY="auto" overflowX="hidden" className="company-table-scroll">
        <table className="company-table">
          <thead>
            <tr>
              <th>RFC</th>
              <th>CLAVE</th>
              <th>COMPAÑÍA</th>
              <th>
                <button type="button" onClick={() => setSortDirection((current) => current === 'desc' ? 'asc' : 'desc')}>
                  PROYECTOS <FiChevronDown className={sortDirection === 'asc' ? 'company-sort-ascending' : ''} />
                </button>
              </th>
              <th>INVERSIÓN TOTAL</th>
              <th>ESTADOS</th>
              <th aria-label="Ver detalle">DETALLE</th>
            </tr>
          </thead>
          <tbody>
            {sortedCompanies.map((company) => {
              const selected = selectedCompanyId === company.key;
              return (
                <tr
                  key={company.key}
                  className={selected ? 'company-row-selected' : ''}
                  onClick={() => onSelectCompany(company.key)}
                >
                  <td>{company.rfc || '—'}</td>
                  <td>{company.clave || '—'}</td>
                  <td className="company-name-cell">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectCompany(company.key);
                      }}
                      aria-pressed={selected}
                    >
                      <span>{company.name}</span>
                      {selected && <small>Mostrando sus obras</small>}
                    </button>
                  </td>
                  <td className="company-number-cell">{formatNumber(company.projectCount)}</td>
                  <td className="company-investment-cell">{formatCompactInvestment(company.totalInvestment)}</td>
                  <td className="company-number-cell">{formatNumber(company.stateCount)}</td>
                  <td className="company-detail-cell">
                    <Box
                      as="button"
                      type="button"
                      className="company-detail-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onViewDetail(company);
                      }}
                      aria-label={`Ver detalle de ${company.name}`}
                      title="Ver detalle"
                    >
                      <FiEye size={15} />
                    </Box>
                  </td>
                </tr>
              );
            })}
            {!companies.length && (
              <tr>
                <td colSpan="7" className="company-empty-cell">
                  {isLoadingProfiles ? (
                    <Flex align="center" justify="center" gap={2}>
                      <Spinner size="xs" color="#FF653F" />
                      <Text>Preparando los identificadores de las compañías…</Text>
                    </Flex>
                  ) : 'No hay compañías para los filtros actuales.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Box>
      <Box className="company-total-row" flexShrink={0}>
        <Text
          className="company-total-label"
          fontWeight="700"
          title="Una obra puede estar vinculada con varias compañías; estos totales son asignaciones, no obras únicas."
        >
          Total de asignaciones
        </Text>
        <Text className="company-total-projects" fontWeight="700">{formatNumber(companies.reduce((total, company) => total + company.projectCount, 0))}</Text>
        <Text className="company-total-investment" fontWeight="700">{formatCompactInvestment(companies.reduce((total, company) => total + company.totalInvestment, 0))}</Text>
      </Box>
    </Box>
  );
}

function getInitials(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'CO';
}

function ProjectMetric({ label, value }) {
  return (
    <Box className="company-project-metric">
      <Text>{label}</Text>
      <Text>{value}</Text>
    </Box>
  );
}

function CompanyProjectsPanel({ company, onClear, onViewDetail, onViewFicha }) {
  const [projectSearch, setProjectSearch] = useState('');
  const [isProjectSearchOpen, setIsProjectSearchOpen] = useState(false);
  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
  const [selectedStates, setSelectedStates] = useState([]);
  const [sortDirection, setSortDirection] = useState('desc');
  const projectSearchRef = useRef(null);
  const locationFilterRef = useRef(null);

  useEffect(() => {
    if (!isLocationFilterOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!locationFilterRef.current?.contains(event.target)) setIsLocationFilterOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsLocationFilterOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isLocationFilterOpen]);

  useEffect(() => {
    if (!isProjectSearchOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!projectSearchRef.current?.contains(event.target)) setIsProjectSearchOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsProjectSearchOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isProjectSearchOpen]);

  const allProjects = useMemo(() => [...(company?.projects || [])]
    .sort((first, second) => {
      const investmentDifference = (Number(first.inversion) || 0) - (Number(second.inversion) || 0);
      if (investmentDifference) return sortDirection === 'desc' ? -investmentDifference : investmentDifference;
      return String(first.proyecto || '').localeCompare(String(second.proyecto || ''), 'es-MX');
    }), [company, sortDirection]);

  const locationOptions = useMemo(() => [...new Set(allProjects
    .map((project) => String(project.estado || '').trim())
    .filter(Boolean))]
    .sort((first, second) => first.localeCompare(second, 'es-MX')), [allProjects]);

  const visibleProjects = useMemo(() => {
    const search = projectSearch.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return allProjects.filter((project) => {
      const matchesSearch = !search || [
        project.proyecto,
        project.clave,
        project.estado,
        project.region,
        project.genero,
      ].some((value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(search));
      const projectState = String(project.estado || '').trim();
      const matchesLocation = !selectedStates.length || selectedStates.includes(projectState);
      return matchesSearch && matchesLocation;
    });
  }, [allProjects, projectSearch, selectedStates]);

  const toggleState = (state) => {
    setSelectedStates((current) => current.includes(state)
      ? current.filter((item) => item !== state)
      : [...current, state]);
  };

  if (!company) {
    return (
      <Flex className="company-project-panel company-projects-empty" direction="column" align="center" justify="center">
        <Flex className="company-project-empty-mark" align="center" justify="center"><FiBriefcase size={24} /></Flex>
        <Text className="company-project-empty-title">Elige una compañía</Text>
        <Text className="company-project-empty-copy">Sus obras aparecerán aquí en una lista clara, lista para explorar y comparar.</Text>
        <Flex className="company-project-empty-flow" align="center" gap={2}>
          <Text>Compañía</Text><FiArrowRight size={15} /><Text>Obras</Text>
        </Flex>
      </Flex>
    );
  }

  return (
    <Box className="company-project-panel">
      <Flex className="company-project-panel-titlebar" align="center" gap={2.5}>
        <Text>Portafolio de obras</Text>
        <Box as="button" type="button" ml="auto" className="company-project-clear" onClick={onClear} aria-label="Quitar selección de compañía" title="Quitar selección">
          <FiX size={16} />
        </Box>
      </Flex>

      <Flex className="company-project-company" align="center" gap={3}>
        <Flex className="company-project-company-mark" align="center" justify="center">{getInitials(company.name)}</Flex>
        <Box minW={0} flex="1">
          <Text className="company-project-company-name" lineClamp={1}>{company.name}</Text>
          <Flex className="company-project-company-meta" align="center" gap={1.5}>
            <FiMapPin size={12} />
            <Text lineClamp={1}>{company.states.join(' · ') || 'Ubicación por confirmar'}</Text>
          </Flex>
        </Box>
        <Box as="button" type="button" className="company-project-profile-link" onClick={() => onViewDetail(company)}>
          Ver perfil <FiArrowRight size={13} />
        </Box>
      </Flex>

      <Flex className="company-project-metrics" gap={2}>
        <ProjectMetric label="Obras" value={formatNumber(company.projectCount)} />
        <ProjectMetric label="Inversión total" value={formatCompactInvestment(company.totalInvestment)} />
        <ProjectMetric label="Estados" value={formatNumber(company.stateCount)} />
      </Flex>

      <Flex className="company-project-columns" align="center" gap={3}>
        <Box className="company-project-project-header" ref={projectSearchRef}>
          <Box
            as="button"
            type="button"
            className="company-project-header-trigger"
            onClick={() => setIsProjectSearchOpen((current) => !current)}
            aria-expanded={isProjectSearchOpen}
            aria-label="Buscar por proyecto"
            title="Buscar por proyecto"
          >
            <Text>Proyecto</Text><FiSearch size={13} />
          </Box>
          {isProjectSearchOpen && (
            <Flex className="company-project-search company-project-search-popover" align="center" gap={1.5}>
              <FiSearch size={14} />
              <Box as="input" autoFocus value={projectSearch} onChange={(event) => setProjectSearch(event.target.value)} placeholder="Buscar proyecto" aria-label="Buscar proyecto de la compañía" />
            </Flex>
          )}
        </Box>
        <Box className="company-project-location-header" ref={locationFilterRef}>
          <Box
            as="button"
            type="button"
            className="company-project-header-trigger company-project-location-trigger"
            onClick={() => setIsLocationFilterOpen((current) => !current)}
            aria-expanded={isLocationFilterOpen}
            aria-label="Filtrar por ubicación"
          >
            <Text>Ubicación</Text><FiFilter size={13} />
            {!!selectedStates.length && <Text className="company-project-filter-count">{selectedStates.length}</Text>}
          </Box>
          {isLocationFilterOpen && (
            <Box className="company-project-location-menu">
              <Text className="company-project-location-menu-title">Filtrar por estado</Text>
              <Box className="company-project-location-options">
                {locationOptions.map((state) => (
                  <Box as="label" key={state} className="company-project-location-option">
                    <Box as="input" type="checkbox" checked={selectedStates.includes(state)} onChange={() => toggleState(state)} />
                    <Text>{state}</Text>
                  </Box>
                ))}
              </Box>
              <Flex className="company-project-location-actions" align="center" justify="space-between">
                <Box as="button" type="button" onClick={() => setSelectedStates([])}>Limpiar</Box>
                <Box as="button" type="button" onClick={() => setIsLocationFilterOpen(false)}>Listo</Box>
              </Flex>
            </Box>
          )}
        </Box>
        <Box as="button" type="button" className="company-project-column-sort" onClick={() => setSortDirection((current) => current === 'desc' ? 'asc' : 'desc')}>
          Inversión <FiChevronDown className={sortDirection === 'asc' ? 'company-sort-ascending' : ''} size={14} />
        </Box>
        <Text className="company-project-surface-header">Superficie</Text>
      </Flex>

      <Box className="company-project-list">
        {visibleProjects.map((project, index) => (
          <Flex key={project.id || project.clave || `${project.proyecto}-${index}`} className="company-project-row" align="center" gap={3}>
            <Box minW={0} flex="1">
              <Text className="company-project-name" lineClamp={1}>{project.proyecto || 'Proyecto sin nombre'}</Text>
              <Text className="company-project-key" lineClamp={1}>{project.clave || 'Clave por confirmar'}</Text>
            </Box>
            <Box className="company-project-location" minW={0}>
              <Text lineClamp={1}>{project.estado || 'Estado por confirmar'} · {project.genero || 'Sin género'}</Text>
            </Box>
            <Text className="company-project-investment">{formatCompactInvestment(project.inversion)}</Text>
            <Text className="company-project-surface">{formatNumber(project.superficie)} m²</Text>
            <Box
              as="button"
              type="button"
              className="company-project-ficha-hover"
              onClick={() => onViewFicha?.(project)}
              aria-label={`Ver ficha técnica de ${project.proyecto || 'este proyecto'}`}
              title="Ver ficha técnica"
            >
              <FiEye size={14} /><Text as="span">Ver ficha</Text>
            </Box>
          </Flex>
        ))}
        {!visibleProjects.length && <Text className="company-project-no-results">No encontramos obras con esa búsqueda.</Text>}
      </Box>

      <Flex className="company-project-footer" align={{ base: 'start', sm: 'center' }} justify="space-between" gap={2} direction={{ base: 'column', sm: 'row' }}>
        <Flex align="center" gap={2} minW={0}>
          <FiBriefcase size={14} />
          <Text lineClamp={1}>Portafolio de obras: <Text as="span" fontWeight="800">{company.name}</Text></Text>
        </Flex>
        <Text className="company-project-footer-count">Todos los proyectos · {formatNumber(visibleProjects.length)} de {formatNumber(allProjects.length)}</Text>
      </Flex>
    </Box>
  );
}

export default function CompaniasView({
  filteredObras = [],
  filtros,
  isLoading = false,
  companyRelationships = [],
  isLoadingCompanies = false,
  companiesError = '',
  isDarkMode = false,
  onViewFicha,
}) {
  const [selectedCompanyId, setSelectedCompanyId] = useState();
  const [detailCompany, setDetailCompany] = useState(null);
  const isAwaitingCompanyProfiles = isLoadingCompanies && !companyRelationships.length && !companiesError;
  const companies = useMemo(
    () => isAwaitingCompanyProfiles ? [] : buildCompanyRows(filteredObras, companyRelationships),
    [companyRelationships, filteredObras, isAwaitingCompanyProfiles]
  );
  const metrics = useMemo(() => getCompanyMetrics(companies), [companies]);
  const activeCompanyId = selectedCompanyId === null
    ? null
    : companies.some((company) => company.key === selectedCompanyId)
      ? selectedCompanyId
      : companies[0]?.key || null;
  const selectedCompany = useMemo(
    () => companies.find((company) => company.key === activeCompanyId) || null,
    [activeCompanyId, companies]
  );
  const handleDownload = () => {
    const content = companiesToCsv(companies);
    const file = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'companias-construleads.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box h="100%" minH="0" overflow="auto" className={`companias-view${isDarkMode ? ' company-theme-dark' : ''}`}>
      <style>{`
        .companias-view { scrollbar-color: #CBD1DC transparent; }
        .company-workspace { min-height: 100%; }
        .company-service-notice { background: #FFF5EF; border: 1px solid #FFD0BE; border-radius: 8px; color: #A7472C; font-size: 11px; line-height: 1.35; padding: 8px 10px; }
        .company-content-grid { display: grid; grid-template-columns: minmax(0, 1.02fr) minmax(0, .98fr); gap: 18px; min-height: 0; }
        .company-content-grid > * { min-width: 0; }
        .company-table-scroll { scrollbar-width: thin; }
        .company-table { border-collapse: collapse; min-width: 0; table-layout: fixed; width: 100%; font-size: 11px; color: #303846; }
        .company-table th { position: sticky; top: 0; z-index: 1; background: #F7F8FA; color: #737D8D; font-size: 10px; font-weight: 700; text-align: left; padding: 9px 12px; border-bottom: 1px solid #E2E5EA; white-space: nowrap; }
        .company-table th:first-child, .company-table td:first-child { width: 118px; white-space: nowrap; }
        .company-table th:nth-child(2), .company-table td:nth-child(2) { width: 96px; white-space: nowrap; }
        .company-table td:first-child, .company-table td:nth-child(2) { overflow: hidden; text-overflow: ellipsis; }
        .company-table th:nth-child(4) { width: 68px; text-align: right; }
        .company-table th:nth-child(5) { width: 104px; text-align: right; }
        .company-table th:nth-child(6) { width: 58px; text-align: right; }
        .company-table th:nth-child(7) { width: 52px; text-align: center; }
        .company-table th:last-child { width: 52px; text-align: center; }
        .company-table th button { align-items: center; background: none; border: 0; color: inherit; cursor: pointer; display: inline-flex; font: inherit; font-weight: 700; gap: 3px; padding: 0; }
        .company-table th svg { transition: transform .16s ease; }
        .company-sort-ascending { transform: rotate(180deg); }
        .company-table td { border-bottom: 1px solid #E7E9EE; padding: 9px 8px; vertical-align: middle; }
        .company-table tbody tr { cursor: pointer; transition: background .16s ease; }
        .company-table tbody tr:hover { background: #FFF8F4; }
        .company-table .company-row-selected { background: #FFF0EA; box-shadow: inset 3px 0 0 #FF653F; }
        .company-name-cell button { background: none; border: 0; color: #303846; cursor: pointer; display: block; font: inherit; font-weight: 600; padding: 0; text-align: left; width: 100%; }
        .company-name-cell span { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-height: 1.22; overflow: hidden; }
        .company-name-cell small { color: #E65331; display: block; font-size: 9px; font-weight: 700; margin-top: 3px; }
        .company-number-cell, .company-investment-cell { font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
        .company-investment-cell { font-weight: 600; }
        .company-detail-cell { text-align: center; }
        .company-detail-button { align-items: center; background: #FFFFFF; border: 1px solid #DCE1E9; border-radius: 7px; color: #596273; cursor: pointer; display: inline-flex; height: 28px; justify-content: center; transition: all .16s ease; width: 30px; }
        .company-detail-button:hover { background: #FFF2EC; border-color: #FFB49E; color: #DF532F; transform: translateY(-1px); }
        .company-empty-cell { color: #7B8494; padding: 32px !important; text-align: center; }
        .company-total-row { align-items: center; background: #F7F8FA; border-top: 1px solid #E2E5EA; color: #303846; display: grid; font-size: 12px; grid-template-columns: 118px 96px minmax(0, 1fr) 68px 104px 58px 52px; min-height: 35px; padding: 0 8px; }
        .company-total-label { grid-column: 1 / 4; padding-left: 4px; }
        .company-total-projects { grid-column: 4; text-align: right; }
        .company-total-investment { grid-column: 5; padding-right: 4px; text-align: right; }
        .company-project-panel { animation: company-projects-enter .32s cubic-bezier(.22, 1, .36, 1) both; background: #FFFFFF; border: 1px solid var(--cl-border); border-radius: 11px; display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; }
        @keyframes company-projects-enter { from { opacity: 0; transform: translate3d(12px, 0, 0); } to { opacity: 1; transform: none; } }
        .company-project-panel-titlebar { background: #3D4658; color: #FFFFFF; flex-shrink: 0; min-height: 42px; padding: 0 14px; }
        .company-project-panel-titlebar > p:first-child { font-size: 14px; font-weight: 700; }
        .company-project-clear { align-items: center; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.16); border-radius: 6px; color: #FFFFFF; cursor: pointer; display: inline-flex; height: 26px; justify-content: center; transition: background .16s ease; width: 26px; }
        .company-project-clear:hover { background: rgba(255,255,255,.22); }
        .company-project-company { background: linear-gradient(120deg, #FFF5F0 0%, #FFFFFF 74%); border-bottom: 1px solid #F0E6E0; flex-shrink: 0; padding: 14px; }
        .company-project-company-mark { background: #FF653F; border-radius: 11px; box-shadow: 0 6px 16px rgba(232, 89, 50, .2); color: #FFFFFF; flex-shrink: 0; font-size: 12px; font-weight: 800; height: 40px; letter-spacing: .02em; width: 40px; }
        .company-project-company-name { color: #2F394B; font-size: 14px; font-weight: 800; letter-spacing: -.015em; }
        .company-project-company-meta { color: #7A8494; font-size: 10px; margin-top: 3px; }
        .company-project-company-meta svg { color: #E45A34; flex-shrink: 0; }
        .company-project-profile-link { align-items: center; background: #FF653F; border: 1px solid #FF653F; border-radius: 7px; box-shadow: 0 5px 12px rgba(232, 89, 50, .22); color: #FFFFFF; cursor: pointer; display: inline-flex; flex-shrink: 0; font-size: 10px; font-weight: 800; gap: 4px; padding: 7px 9px; transition: all .16s ease; }
        .company-project-profile-link:hover { background: #E5532F; border-color: #E5532F; box-shadow: 0 7px 15px rgba(232, 89, 50, .3); transform: translateY(-1px); }
        .company-project-metrics { background: #FFFFFF; border-bottom: 1px solid #E9ECF1; flex-shrink: 0; padding: 10px 14px; }
        .company-project-metric { border-right: 1px solid #E9ECF1; flex: 1; min-width: 0; padding-right: 8px; }
        .company-project-metric:last-child { border-right: 0; }
        .company-project-metric > p:first-child { color: #818A99; font-size: 9px; font-weight: 600; white-space: nowrap; }
        .company-project-metric > p:last-child { color: #2F394B; font-size: 14px; font-weight: 800; line-height: 1.2; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .company-project-search { background: #FFFFFF; border: 1px solid #DCE2E9; border-radius: 8px; box-shadow: 0 8px 18px rgba(32, 41, 56, .12); color: #7D8796; height: 32px; padding: 0 9px; width: 218px; }
        .company-project-search input { background: transparent; border: 0; color: #3D4658; font-family: inherit; font-size: 10px; min-width: 0; outline: 0; width: 100%; }
        .company-project-search input::placeholder { color: #9AA3B2; }
        .company-project-columns { background: #FBFCFD; border-bottom: 1px solid #E5E9EE; border-top: 1px solid #E5E9EE; color: #7C8695; flex-shrink: 0; font-size: 9px; font-weight: 800; letter-spacing: .04em; overflow: visible; padding: 7px 14px; position: relative; text-transform: uppercase; z-index: 2; }
        .company-project-columns > :first-child { flex: 1; min-width: 0; position: relative; }
        .company-project-columns > :nth-child(2) { position: relative; width: 152px; }
        .company-project-header-trigger, .company-project-column-sort { align-items: center; background: transparent; border: 0; color: inherit; cursor: pointer; display: inline-flex; font-family: inherit; font-size: inherit; font-weight: inherit; gap: 4px; letter-spacing: inherit; padding: 0; text-transform: inherit; }
        .company-project-header-trigger:hover, .company-project-column-sort:hover { color: #E65331; }
        .company-project-location-trigger { justify-content: flex-start; }
        .company-project-header-trigger svg, .company-project-column-sort svg { transition: transform .16s ease; }
        .company-project-search-popover { left: 0; position: absolute; top: calc(100% + 8px); z-index: 5; }
        .company-project-location-menu { background: #FFFFFF; border: 1px solid #DCE2E9; border-radius: 9px; box-shadow: 0 10px 22px rgba(32, 41, 56, .14); color: #4A5568; left: 0; overflow: hidden; position: absolute; text-transform: none; top: calc(100% + 8px); width: 214px; z-index: 5; }
        .company-project-location-menu-title { color: #677184; font-size: 10px; font-weight: 700; padding: 10px 11px 7px; }
        .company-project-location-options { max-height: 186px; overflow-y: auto; padding: 0 6px 6px; scrollbar-width: thin; }
        .company-project-location-option { align-items: center; border-radius: 6px; cursor: pointer; display: flex; font-size: 11px; font-weight: 600; gap: 7px; min-height: 28px; padding: 3px 6px; }
        .company-project-location-option:hover { background: #FFF4EF; color: #D95330; }
        .company-project-location-option input { accent-color: #FF653F; height: 14px; margin: 0; width: 14px; }
        .company-project-location-actions { border-top: 1px solid #E9ECF1; gap: 8px; padding: 7px; }
        .company-project-location-actions button { background: transparent; border: 0; color: #677184; cursor: pointer; font-family: inherit; font-size: 10px; font-weight: 700; padding: 5px 6px; }
        .company-project-location-actions button:last-child { background: #FF653F; border-radius: 6px; color: #FFFFFF; padding-left: 9px; padding-right: 9px; }
        .company-project-filter-count { align-items: center; background: #FF653F; border-radius: 99px; color: #FFFFFF; display: inline-flex; font-size: 8px; height: 15px; justify-content: center; min-width: 15px; padding: 0 3px; }
        .company-project-column-sort { justify-content: flex-end; width: 76px; }
        .company-project-surface-header { text-align: right; width: 86px; }
        .company-project-column-sort svg { transition: transform .16s ease; }
        .company-project-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 14px; scrollbar-color: #CBD1DC transparent; scrollbar-width: thin; }
        .company-project-row { border-bottom: 1px solid #ECEFF3; min-height: 56px; padding: 8px 0; position: relative; transition: background .16s ease, padding .16s ease; }
        .company-project-row:hover { background: #FFF9F6; box-shadow: 0 0 0 8px #FFF9F6; }
        .company-project-name { color: #364053; font-size: 11px; font-weight: 800; line-height: 1.3; }
        .company-project-key { color: #8B95A4; font-size: 10px; margin-top: 2px; }
        .company-project-location { color: #697486; font-size: 10px; width: 152px; }
        .company-project-investment, .company-project-surface { color: #344055; font-size: 11px; font-variant-numeric: tabular-nums; font-weight: 800; text-align: right; white-space: nowrap; }
        .company-project-investment { width: 76px; }
        .company-project-surface { width: 86px; }
        .company-project-ficha-hover { align-items: center; background: #FF653F; border: 1px solid #FF653F; border-radius: 7px; box-shadow: 0 6px 16px rgba(232, 89, 50, .24); color: #FFFFFF; cursor: pointer; display: inline-flex; font-family: inherit; font-size: 10px; font-weight: 800; gap: 5px; opacity: 0; padding: 6px 8px; pointer-events: none; position: absolute; right: 0; top: 50%; transform: translate(5px, -50%); transition: opacity .16s ease, transform .16s ease; white-space: nowrap; }
        .company-project-row:hover .company-project-ficha-hover, .company-project-row:focus-within .company-project-ficha-hover { opacity: 1; pointer-events: auto; transform: translate(0, -50%); }
        .company-project-ficha-hover:hover { background: #E5532F; border-color: #E5532F; }
        .company-project-no-results { color: #7B8494; font-size: 11px; padding: 32px 0; text-align: center; }
        .company-project-footer { background: #FFFAF7; border-top: 1px solid #F3E8E2; color: #8A6A5E; flex-shrink: 0; font-size: 10px; min-height: 40px; padding: 6px 14px; }
        .company-project-footer svg { color: #E65B35; flex-shrink: 0; }
        .company-project-footer-count { color: #7D6B64; font-size: 10px; font-weight: 700; white-space: nowrap; }
        .company-projects-empty { background: radial-gradient(circle at 50% 26%, #FFF2EC 0, #FFFFFF 44%); border: 1px dashed #DDE2E9; color: #3B4557; padding: 32px; text-align: center; }
        .company-project-empty-mark { background: #FFF0E9; border: 1px solid #FFD6C5; border-radius: 14px; color: #E65B35; height: 54px; margin-bottom: 14px; width: 54px; }
        .company-project-empty-title { font-size: 16px; font-weight: 800; }
        .company-project-empty-copy { color: #768193; font-size: 11px; line-height: 1.5; margin-top: 6px; max-width: 260px; }
        .company-project-empty-flow { background: #FFFFFF; border: 1px solid #E7E9EE; border-radius: 999px; color: #5B6575; font-size: 10px; font-weight: 700; margin-top: 18px; padding: 7px 11px; }
        .company-project-empty-flow svg { color: #E65B35; }
        .company-detail-overlay { background: rgba(15, 23, 42, .52); backdrop-filter: blur(5px); inset: 0; position: fixed; z-index: 1000; }
        .company-detail-modal { background: #F7F8FA; border-radius: 18px; box-shadow: 0 28px 80px rgba(15, 23, 42, .35); display: flex; flex-direction: column; height: min(800px, calc(100dvh - 48px)); max-width: 1220px; overflow: hidden; width: min(94vw, 1220px); }
        .company-detail-header { background: #F25B2A; color: white; min-height: 92px; padding: 18px 24px; flex-shrink: 0; }
        .company-detail-company-mark { background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.28); border-radius: 13px; height: 48px; width: 48px; }
        .company-detail-title { font-size: 22px; font-weight: 700; letter-spacing: -.02em; line-height: 1.2; }
        .company-detail-status { background: rgba(255,255,255,.18); border-radius: 999px; font-size: 10px; font-weight: 700; padding: 5px 9px; white-space: nowrap; }
        .company-detail-id { color: rgba(255,255,255,.82); font-size: 11px; font-weight: 500; margin-top: 5px; }
        .company-detail-close { align-items: center; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.23); border-radius: 50%; color: white; cursor: pointer; display: flex; flex-shrink: 0; height: 34px; justify-content: center; transition: background .16s ease; width: 34px; }
        .company-detail-close:hover { background: rgba(255,255,255,.26); }
        .company-detail-body { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; overflow: hidden; padding: 18px; }
        .company-detail-metrics { flex-shrink: 0; }
        .company-detail-metric { background: #FFFFFF; border: 1px solid #E4E7EC; border-radius: 11px; flex: 1; min-width: 0; padding: 10px 12px; }
        .company-detail-icon { background: #FFF0EA; border-radius: 8px; color: #E65331; flex-shrink: 0; height: 29px; width: 29px; }
        .company-detail-metric-value { color: #263047; font-size: 16px; font-weight: 700; line-height: 1.05; white-space: nowrap; }
        .company-detail-metric-label { color: #7A8494; font-size: 9px; font-weight: 600; margin-top: 2px; white-space: nowrap; }
        .company-detail-main-grid { align-items: stretch; display: grid; flex: 1 1 auto; gap: 14px; grid-template-columns: minmax(0, 1.35fr) minmax(300px, .85fr); margin-top: 14px; min-height: 0; overflow: hidden; }
        .company-detail-analysis, .company-detail-contacts-column { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
        .company-detail-analysis { overflow-y: auto; padding-right: 2px; scrollbar-color: #CBD1DC transparent; scrollbar-width: thin; }
        .company-detail-insight { background: linear-gradient(118deg, #253047 0%, #34425D 100%); border-radius: 12px; color: white; flex-shrink: 0; min-height: 60px; padding: 11px 14px; }
        .company-detail-insight-icon { background: rgba(255,255,255,.12); border-radius: 9px; color: #FFB399; flex-shrink: 0; height: 32px; width: 32px; }
        .company-detail-insight-text { color: #F9FAFB; font-size: 12px; line-height: 1.4; }
        .company-detail-charts-grid { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; min-height: 0; }
        .company-detail-card { background: #FFFFFF; border: 1px solid #E4E7EC; border-radius: 12px; padding: 12px; }
        .company-detail-distribution { display: flex; flex-direction: column; justify-content: flex-start; min-height: 128px; padding: 13px; }
        .company-detail-distribution-row { padding: 5px 0; }
        .company-detail-section-icon { background: #FFF0EA; border-radius: 7px; color: #E65331; height: 24px; width: 24px; }
        .company-detail-linkedin-icon { background: #E8F1FC; color: #0A66C2; }
        .company-detail-section-title { color: #333D50; font-size: 12px; font-weight: 800; }
        .company-detail-bar-label { color: #4D5768; font-size: 11px; font-weight: 700; }
        .company-detail-bar-value { color: #7A8494; font-size: 10px; font-weight: 800; white-space: nowrap; }
        .company-detail-progress { appearance: none; border: 0; display: block; height: 8px; overflow: hidden; width: 100%; }
        .company-detail-progress::-webkit-progress-bar { background: #EDF0F4; border-radius: 99px; }
        .company-detail-progress::-webkit-progress-value { background: #F0642E; border-radius: 99px; }
        .company-detail-progress::-moz-progress-bar { background: #F0642E; border-radius: 99px; }
        .company-detail-progress-1::-webkit-progress-value, .company-detail-progress-1::-moz-progress-bar { background: #E38A2E; }
        .company-detail-progress-2::-webkit-progress-value, .company-detail-progress-2::-moz-progress-bar { background: #7350AC; }
        .company-detail-progress-3::-webkit-progress-value, .company-detail-progress-3::-moz-progress-bar { background: #279B91; }
        .company-detail-progress-4::-webkit-progress-value, .company-detail-progress-4::-moz-progress-bar { background: #4F7BC8; }
        .company-detail-empty-copy { color: #7A8494; font-size: 10px; line-height: 1.35; }
        .company-detail-stages { flex: 0 0 auto; padding: 12px; }
        .company-detail-stages-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); }
        .company-detail-stage { background: #FFF1EB; border-left: 3px solid #F0642E; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; min-height: 66px; min-width: 0; padding: 9px 10px; }
        .company-detail-stage-1 { background: #FFF7E9; border-left-color: #E38A2E; }
        .company-detail-stage-2 { background: #F0EBFA; border-left-color: #7350AC; }
        .company-detail-stage-3 { background: #E8F6F4; border-left-color: #279B91; }
        .company-detail-stage-count { color: #2D3748; font-size: 16px; font-weight: 800; line-height: 1; }
        .company-detail-stage-label { color: #667184; font-size: 9px; font-weight: 700; line-height: 1.2; margin-top: 4px; text-transform: uppercase; }
        .company-detail-profile-card { flex-shrink: 0; }
        .company-detail-profile-list > div { border-top: 1px solid #EEF0F3; padding-top: 7px; }
        .company-detail-profile-list > div:first-child { border-top: 0; padding-top: 0; }
        .company-detail-profile-list > div > p:first-child { color: #7A8494; font-size: 10px; }
        .company-detail-profile-list > div > p:last-child { color: #374151; font-size: 10px; font-weight: 700; text-align: right; }
        .company-detail-profile-coverage { border-top: 1px solid #EEF0F3; color: #7A8494; font-size: 10px; margin-top: 9px; padding-top: 8px; }
        .company-detail-profile-coverage > p:last-child { color: #374151; font-weight: 800; }
        .company-detail-state-list { gap: 5px; margin-top: 7px; }
        .company-detail-state-pill { background: #FFF0EA; border-radius: 999px; color: #C94F2D; font-size: 9px; font-weight: 700; padding: 4px 7px; }
        .company-detail-website { align-items: center; color: #0A66C2; display: inline-flex; font-size: 10px; font-weight: 700; gap: 4px; text-decoration: none; }
        .company-detail-contacts-card { display: flex; flex-direction: column; min-height: 0; }
        .company-detail-dataset-card { flex: 0 0 auto; }
        .company-detail-dataset-card.company-detail-contacts-card-scrollable { max-height: 248px; }
        .company-detail-linkedin-card { flex: 1 1 0; min-height: 150px; }
        .company-detail-contact-list { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; overflow-y: auto; padding-right: 2px; scrollbar-color: #CBD1DC transparent; scrollbar-width: thin; }
        .company-detail-dataset-card:not(.company-detail-contacts-card-scrollable) .company-detail-contact-list { flex: 0 0 auto; overflow: visible; }
        .company-detail-count { align-items: center; background: #FFF0EA; border-radius: 999px; color: #DF532F; display: inline-flex; font-size: 10px; font-weight: 800; height: 21px; justify-content: center; min-width: 21px; padding: 0 6px; }
        .company-detail-linkedin-count { background: #E8F1FC; color: #0A66C2; }
        .company-detail-contact-row, .company-detail-linkedin-row { align-items: center; border-top: 1px solid #EEF0F3; display: flex; gap: 8px; min-height: 38px; padding: 6px 0; text-decoration: none; }
        .company-detail-contact-list > .company-detail-contact-row:first-child, .company-detail-contact-list > .company-detail-linkedin-row:first-child { border-top: 0; padding-top: 0; }
        .company-detail-contact-avatar { background: #FFF0EA; border-radius: 50%; color: #D95330; flex-shrink: 0; font-size: 9px; font-weight: 800; height: 27px; width: 27px; }
        .company-detail-linkedin-mark { background: #E8F1FC; border-radius: 7px; color: #0A66C2; flex-shrink: 0; height: 27px; width: 27px; }
        .company-detail-contact-name { color: #374151; font-size: 10px; font-weight: 700; }
        .company-detail-contact-role { color: #7A8494; font-size: 9px; line-height: 1.2; margin-top: 1px; }
        .company-detail-contact-actions { flex-shrink: 0; }
        .company-detail-contact-actions a { align-items: center; background: #F4F6F8; border-radius: 6px; color: #5B6575; display: flex; height: 24px; justify-content: center; width: 24px; }
        .company-detail-contact-empty { background: linear-gradient(135deg, #FFF8F4 0%, #F8F9FB 100%); border: 1px dashed #E8C7B9; border-radius: 9px; flex: 1; min-height: 92px; padding: 13px; }
        .company-detail-empty-icon { background: #EDF0F4; border-radius: 7px; color: #7D8797; flex-shrink: 0; height: 28px; width: 28px; }
        .company-detail-contact-empty-title { color: #394256; font-size: 11px; font-weight: 800; }
        .company-detail-contact-empty-copy { color: #7A8494; font-size: 10px; line-height: 1.35; margin-top: 3px; }
        .company-detail-contact-pending { color: #D75731; font-size: 9px; font-weight: 800; letter-spacing: .02em; text-transform: uppercase; }
        .company-theme-dark .company-table { color: var(--cl-text); }
        .company-theme-dark .company-service-notice { background: rgba(255,101,63,.12); border-color: rgba(255,180,158,.3); color: #FFB49E; }
        .company-theme-dark .company-table th { background: var(--cl-surface-muted); border-color: var(--cl-border); color: var(--cl-text-muted); }
        .company-theme-dark .company-table td { border-color: var(--cl-border); }
        .company-theme-dark .company-table tbody tr:hover { background: var(--cl-hover); }
        .company-theme-dark .company-table .company-row-selected { background: rgba(255,101,63,.14); }
        .company-theme-dark .company-name-cell button { color: var(--cl-text); }
        .company-theme-dark .company-total-row { background: var(--cl-surface-muted); border-color: var(--cl-border); color: var(--cl-text); }
        .company-theme-dark .company-detail-button { background: var(--cl-surface-muted); border-color: var(--cl-border); color: var(--cl-text-muted); }
        .company-theme-dark .company-detail-button:hover { background: rgba(255,101,63,.14); border-color: rgba(255,180,158,.55); color: #FFB49E; }
        .company-theme-dark .company-project-panel { background: var(--cl-surface); }
        .company-theme-dark .company-project-company { background: linear-gradient(120deg, rgba(255,101,63,.12) 0%, var(--cl-surface) 74%); border-color: rgba(255,180,158,.24); }
        .company-theme-dark .company-project-company-name, .company-theme-dark .company-project-metric > p:last-child, .company-theme-dark .company-project-name, .company-theme-dark .company-project-investment { color: var(--cl-text-strong); }
        .company-theme-dark .company-project-company-meta, .company-theme-dark .company-project-metric > p:first-child, .company-theme-dark .company-project-key, .company-theme-dark .company-project-location, .company-theme-dark .company-project-no-results { color: var(--cl-text-muted); }
        .company-theme-dark .company-project-metrics { background: var(--cl-surface); }
        .company-theme-dark .company-project-metrics, .company-theme-dark .company-project-metric { border-color: var(--cl-border); }
        .company-theme-dark .company-project-search, .company-theme-dark .company-project-location-menu { background: var(--cl-surface); border-color: var(--cl-border); color: var(--cl-text-muted); }
        .company-theme-dark .company-project-search input { color: var(--cl-text); }
        .company-theme-dark .company-project-columns { background: var(--cl-surface-muted); border-color: var(--cl-border); color: var(--cl-text-muted); }
        .company-theme-dark .company-project-header-trigger:hover, .company-theme-dark .company-project-column-sort:hover { color: #FFB49E; }
        .company-theme-dark .company-project-location-menu-title, .company-theme-dark .company-project-location-actions button { color: var(--cl-text-muted); }
        .company-theme-dark .company-project-location-actions button:last-child { color: #FFFFFF; }
        .company-theme-dark .company-project-location-option { color: var(--cl-text); }
        .company-theme-dark .company-project-location-option:hover { background: rgba(255,101,63,.12); color: #FFB49E; }
        .company-theme-dark .company-project-location-actions { border-color: var(--cl-border); }
        .company-theme-dark .company-project-row { border-color: var(--cl-border); }
        .company-theme-dark .company-project-row:hover { background: rgba(255,101,63,.08); box-shadow: 0 0 0 8px rgba(255,101,63,.08); }
        .company-theme-dark .company-project-ficha-hover { box-shadow: 0 6px 16px rgba(0,0,0,.26); }
        .company-theme-dark .company-project-footer { background: rgba(255,101,63,.07); border-color: rgba(255,180,158,.2); color: var(--cl-text-muted); }
        .company-theme-dark .company-project-footer-count { color: var(--cl-text-muted); }
        .company-theme-dark .company-projects-empty { background: radial-gradient(circle at 50% 26%, rgba(255,101,63,.12) 0, var(--cl-surface) 48%); border-color: var(--cl-border); color: var(--cl-text); }
        .company-theme-dark .company-project-empty-mark { background: rgba(255,101,63,.12); border-color: rgba(255,180,158,.34); }
        .company-theme-dark .company-project-empty-copy { color: var(--cl-text-muted); }
        .company-theme-dark .company-project-empty-flow { background: var(--cl-surface-muted); border-color: var(--cl-border); color: var(--cl-text-muted); }
        .company-theme-dark .company-detail-modal { background: var(--cl-surface-muted); }
        .company-theme-dark .company-detail-metric, .company-theme-dark .company-detail-card { background: var(--cl-surface); border-color: var(--cl-border); }
        .company-theme-dark .company-detail-metric-value, .company-theme-dark .company-detail-section-title, .company-theme-dark .company-detail-bar-label, .company-theme-dark .company-detail-stage-count, .company-theme-dark .company-detail-profile-list > div > p:last-child, .company-theme-dark .company-detail-profile-coverage > p:last-child, .company-theme-dark .company-detail-contact-name { color: var(--cl-text-strong); }
        .company-theme-dark .company-detail-metric-label, .company-theme-dark .company-detail-bar-value, .company-theme-dark .company-detail-stage-label, .company-theme-dark .company-detail-profile-list > div > p:first-child, .company-theme-dark .company-detail-profile-coverage, .company-theme-dark .company-detail-contact-role, .company-theme-dark .company-detail-empty-copy { color: var(--cl-text-muted); }
        .company-theme-dark .company-detail-profile-list > div, .company-theme-dark .company-detail-profile-coverage, .company-theme-dark .company-detail-contact-row, .company-theme-dark .company-detail-linkedin-row { border-color: var(--cl-border); }
        .company-theme-dark .company-detail-state-pill { background: rgba(255,101,63,.14); color: #FFB49E; }
        .company-theme-dark .company-detail-progress::-webkit-progress-bar { background: var(--cl-input-bg); }
        .company-theme-dark .company-detail-contact-actions a, .company-theme-dark .company-detail-contact-empty { background: var(--cl-surface-muted); border-color: var(--cl-border); color: var(--cl-text-muted); }
        .company-theme-dark .company-detail-empty-icon { background: var(--cl-input-bg); color: var(--cl-text-muted); }
        .company-theme-dark .company-detail-stage { background: rgba(255,101,63,.12); border-left-color: #FF653F; }
        .company-theme-dark .company-detail-stage-1 { background: rgba(227,138,46,.13); border-left-color: #E38A2E; }
        .company-theme-dark .company-detail-stage-2 { background: rgba(115,80,172,.16); border-left-color: #9B7BD2; }
        .company-theme-dark .company-detail-stage-3 { background: rgba(39,155,145,.16); border-left-color: #36B6AA; }
        .company-theme-dark .company-detail-contact-empty-title { color: var(--cl-text-strong); }
        .company-theme-dark .company-detail-contact-empty-copy { color: var(--cl-text-muted); }
        .company-theme-dark .company-detail-contact-pending { color: #FFB49E; }
        @media (max-height: 820px) and (min-width: 1024px) { .company-detail-modal { height: calc(100dvh - 24px); } .company-detail-header { min-height: 76px; padding: 12px 18px; } .company-detail-company-mark { height: 40px; width: 40px; } .company-detail-body { padding: 12px; } .company-detail-main-grid { gap: 10px; margin-top: 10px; } .company-detail-analysis, .company-detail-contacts-column { gap: 8px; } .company-detail-card { padding: 9px; } .company-detail-charts-grid { gap: 8px; } .company-detail-insight { min-height: 58px; padding: 9px 11px; } .company-detail-distribution { min-height: 112px; } .company-detail-distribution-row { padding: 2px 0; } .company-detail-stage { padding: 7px; } }
        @media (max-width: 900px) { .company-detail-modal { height: calc(100dvh - 24px); width: calc(100vw - 20px); } .company-detail-body { overflow-y: auto; } .company-detail-main-grid { flex: 0 0 auto; grid-template-columns: 1fr; overflow: visible; } .company-detail-analysis { overflow: visible; } .company-detail-contacts-column { display: grid; grid-template-columns: repeat(2, 1fr); } .company-detail-contacts-card { min-height: 150px; } }
        @media (max-width: 660px) { .company-detail-metrics { display: grid; grid-template-columns: 1fr 1fr; } .company-detail-main-grid { margin-top: 10px; } .company-detail-contacts-column { display: flex; } .company-detail-title { font-size: 16px; } .company-detail-status { display: none; } .company-detail-charts-grid { grid-template-columns: 1fr; } .company-detail-stages-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 1120px) { .company-content-grid { grid-template-columns: 1fr; } .company-project-panel { min-height: 430px; } }
        @media (max-width: 580px) { .company-project-company { align-items: flex-start; } .company-project-profile-link { padding: 6px; } .company-project-profile-link { font-size: 0; } .company-project-profile-link svg { margin: 0; } .company-project-search { width: 100%; } .company-project-columns > :nth-child(2), .company-project-location { display: none; } }
        @media (max-width: 720px) { .company-summary { align-items: stretch !important; flex-direction: column; } .company-download { width: 100%; } }
      `}</style>
      <Flex className="company-workspace" direction="column" gap={3} h="100%" minH="0">
        {(isLoading || isLoadingCompanies) && <Flex align="center" justify="flex-end" gap={2} flexShrink={0}><Spinner size="xs" color="#FF653F" /><Text fontSize="11px" color="var(--cl-text-muted)">{isLoadingCompanies ? 'Actualizando RFC y claves…' : 'Actualizando proyectos…'}</Text></Flex>}
        {!!companiesError && <Flex className="company-service-notice" align="center" gap={2} flexShrink={0} role="status"><FiBriefcase size={14} /><Text>Los perfiles de compañía no se pudieron actualizar. Se muestra la agrupación disponible por obras.</Text></Flex>}
        <Box className="company-content-grid" flex="1" minH={{ base: 'auto', xl: 0 }}>
          <Box minH="440px"><CompanyTable companies={companies} selectedCompanyId={activeCompanyId} onSelectCompany={setSelectedCompanyId} onViewDetail={setDetailCompany} isLoadingProfiles={isAwaitingCompanyProfiles} /></Box>
          <Box minH="440px">
            <CompanyProjectsPanel
              key={selectedCompany?.key || 'company-selection-empty'}
              company={selectedCompany}
              onClear={() => setSelectedCompanyId(null)}
              onViewDetail={setDetailCompany}
              onViewFicha={onViewFicha}
            />
          </Box>
        </Box>
        <Flex className="company-summary" align="center" gap={3} flexShrink={0}>
          <Box flex="1" minW="0">
            <PanelResumen
              obras={filteredObras}
              filtros={filtros}
              variant="map"
              leadingMetric={{ value: formatNumber(metrics.companies), label: 'Compañías' }}
              metricLabels={{
                projects: 'Obras únicas',
                investment: 'Inversión única',
                states: 'Estados',
                surface: 'Superficie única',
              }}
            />
          </Box>
          <Flex className="company-download" gap={2} flexShrink={0} bg="var(--cl-surface)" border="1px solid var(--cl-border)" borderRadius="12px" p="4px">
            <Box
              as="select"
              aria-label="Formato de descarga"
              minW="160px"
              h="36px"
              px={2.5}
              border="1px solid var(--cl-border)"
              borderRadius="8px"
              bg="var(--cl-surface)"
              color="var(--cl-text)"
              fontSize="13px"
              defaultValue="csv"
            >
              <option value="csv">CSV · Compañías</option>
            </Box>
            <Button h="36px" minW="128px" bg="#FF653F" color="white" borderRadius="8px" fontSize="13px" _hover={{ bg: '#D94E2D' }} onClick={handleDownload}>Descargar todos</Button>
          </Flex>
        </Flex>
      </Flex>
      <CompanyDetailModal key={detailCompany?.key || 'closed'} company={detailCompany} onClose={() => setDetailCompany(null)} />
    </Box>
  );
}
