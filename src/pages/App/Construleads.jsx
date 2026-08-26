import { Component, lazy, Suspense, useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import {
  Box,
  Flex,
  Spinner,
  Text,
  useMediaQuery,
} from '@chakra-ui/react';

import {
  FiBarChart2,
  FiList,
  FiMapPin,
} from 'react-icons/fi';

import SidebarFiltros from './SidebarFiltros';
import PanelResumen from './PanelResumen';
import Mapa from './Mapa';
import DownloadPanel from './DownloadPanel';
import FichaTecnicaModal from './FichaTecnicaModal';
import ConstruleadsNavbar from './ConstruleadsNavbar';
import Perfil from './Perfil';
import WelcomeExperience from './WelcomeExperience';
import { obtenerObrasProgresivas } from '../../api/obras';
import { obtenerCompanias } from '../../api/companias';
import {
  iniciarDescargaReporte,
  solicitarFichaDatos,
  solicitarReporte,
} from '../../api/reportes';
import { parseObrasXml } from '../../utils/parseObrasXml';
import { parseObrasOffMainThread } from '../../utils/parseObrasOffMainThread';
import { filterObrasByFilters } from '../../utils/filterObras';
import {
  readCachedCompanyRelationships,
  readCachedObras,
  writeCachedCompanyRelationships,
  writeCachedObras,
} from '../../utils/obrasCache';

const PREFILTERED_MAP_FILTERS = Object.freeze({ __preFiltered: true });
const loadResultadosView = () => import('./views/ResultadosView');
const loadGraficasView = () => import('./views/GraficasView');
const loadCompaniasView = () => import('../../features/companias/CompaniasView');
const Resultados = lazy(loadResultadosView);
const GraficasView = lazy(loadGraficasView);
const LicitacionesView = lazy(() => import('../../features/licitaciones/LicitacionesView'));
const CompaniasView = lazy(loadCompaniasView);

const TOP_LEVEL_MODULE_ORDER = {
  proyectos: 0,
  companias: 1,
  licitaciones: 2,
};
const COMPANY_PROFILE_DATA_VERSION = 2;

function readPersistedFilters() {
  try {
    const saved = JSON.parse(
      localStorage.getItem('construleads-filters') ||
      localStorage.getItem('construleads-filtros') ||
      '{}'
    );

    return {
      regiones: saved.selectedRegiones || saved.regiones || [],
      estados: saved.selectedEstados || saved.estados || [],
      generos: saved.selectedGeneros || saved.generos || [],
      subgeneros: saved.selectedSubgeneros || saved.subgeneros || [],
      sectores: saved.selectedSectores || saved.sectores || [],
      etapas: saved.selectedEtapas || saved.etapas || [],
      desarrollos: saved.selectedDesarrollos || saved.desarrollos || [],
      tipoObra: saved.selectedTipoObra || saved.tipoObra || [],
      tiposProyecto: saved.selectedTiposProyecto || saved.tiposProyecto || [],
      periodoIndex: saved.periodoIndex ?? -1,
      fechaInicio: saved.dateRangeStart || saved.fechaInicio || '',
      fechaFin: saved.dateRangeEnd || saved.fechaFin || '',
      hasDateRangeFilter: saved.hasDateRangeFilter === true,
      fechaConsulta:
        saved.fechaSeleccionada ||
        saved.fechaConsulta ||
        saved.selectedValues?.['Tipo de fecha'] ||
        'Fecha de publicación',
      surfaceMin: saved.hasSurfaceRangeFilter
        ? saved.surfaceMin ?? saved.superficieMin ?? null
        : null,
      surfaceMax: saved.hasSurfaceRangeFilter
        ? saved.surfaceMax ?? saved.superficieMax ?? null
        : null,
      investmentMin: saved.hasInvestmentRangeFilter
        ? saved.investmentMin ?? saved.inversionMin ?? null
        : null,
      investmentMax: saved.hasInvestmentRangeFilter
        ? saved.investmentMax ?? saved.inversionMax ?? null
        : null,
    };
  } catch {
    return {};
  }
}

function hasMeaningfulFilters(filters = {}) {
  const arrayKeys = [
    'regiones', 'estados', 'generos', 'subgeneros', 'sectores',
    'etapas', 'desarrollos', 'tipoObra', 'tiposProyecto',
  ];
  return (
    arrayKeys.some((key) => Array.isArray(filters[key]) && filters[key].length > 0) ||
    Number(filters.periodoIndex ?? -1) >= 0 ||
    filters.hasDateRangeFilter === true ||
    (filters.investmentMin !== null && filters.investmentMin !== undefined) ||
    (filters.investmentMax !== null && filters.investmentMax !== undefined) ||
    (filters.surfaceMin !== null && filters.surfaceMin !== undefined) ||
    (filters.surfaceMax !== null && filters.surfaceMax !== undefined)
  );
}

function ViewLoader({ label }) {
  return (
    <Flex h="100%" align="center" justify="center">
      <Flex
        align="center"
        gap={3}
        px={4}
        py={2.5}
        borderRadius="full"
        bg="var(--cl-surface)"
        border="1px solid var(--cl-border)"
        boxShadow="var(--cl-shadow)"
      >
        <Spinner size="sm" thickness="3px" color="#FF653F" />
        <Text fontSize="12px" fontWeight="600" color="var(--cl-text-muted)">
          Preparando {label}…
        </Text>
      </Flex>
    </Flex>
  );
}

class ModuleErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Flex h="100%" minH="0" align="center" justify="center" p={6}>
        <Box maxW="460px" p={5} bg="var(--cl-surface)" border="1px solid var(--cl-border)" borderRadius="12px" textAlign="center">
          <Text fontWeight="700" color="var(--cl-text-strong)">No pudimos abrir este módulo</Text>
          <Text mt={1.5} fontSize="12px" color="var(--cl-text-muted)">Regresa a Proyectos e inténtalo de nuevo. La aplicación principal seguirá disponible.</Text>
        </Box>
      </Flex>
    );
  }
}

function getObraSelectionKey(obra) {
  return String(
    obra?.Id_Obra ||
    obra?.ID_OBRA ||
    obra?.id_obra ||
    obra?.id ||
    obra?.clave ||
    obra?.proyecto ||
    ''
  );
}

function haveSameSelection(previousSelection, nextSelection) {
  if (previousSelection.length !== nextSelection.length) return false;

  const previousKeys = previousSelection
    .map(getObraSelectionKey)
    .sort()
    .join('|');
  const nextKeys = nextSelection
    .map(getObraSelectionKey)
    .sort()
    .join('|');

  return previousKeys === nextKeys;
}

export default function Construleads() {
  const navigate = useNavigate();
  const location = useLocation();
  const isProfileModule = location.pathname.includes('/perfil');
  const isLicitacionesModule = location.pathname.includes('/licitaciones');
  const isCompaniesModule = location.pathname.includes('/companias');
  const topLevelModule = isProfileModule
    ? 'perfil'
    : isLicitacionesModule
      ? 'licitaciones'
      : isCompaniesModule
        ? 'companias'
        : 'proyectos';
  const [useCompactScale] = useMediaQuery(
    '(min-width: 1100px) and (max-width: 1366px) and (max-height: 900px)'
  );
  const [useMediumScale] = useMediaQuery(
    '(min-width: 1367px) and (max-width: 1600px) and (max-height: 1000px)'
  );
  const isAuthenticated =
    localStorage.getItem(
      'cl_authenticated'
    ) === 'true';
  let user = {};

  try {
    user = JSON.parse(localStorage.getItem('construleadsUser') || '{}');
  } catch {
    user = {};
  }

  const [filtros, setFiltros] = useState(readPersistedFilters);
  const [obras, setObras] = useState([]);
  const [mapPreviewObras, setMapPreviewObras] = useState([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const [companyRelationships, setCompanyRelationships] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companiesError, setCompaniesError] = useState('');
  const [companiesSessionKey, setCompaniesSessionKey] = useState('');
  const filteredObras = useMemo(
    () => filterObrasByFilters(obras, filtros),
    [obras, filtros]
  );
  const filteredMapPreviewObras = useMemo(
    () => filterObrasByFilters(mapPreviewObras, filtros),
    [mapPreviewObras, filtros]
  );
  const hasActiveMapFilters = useMemo(
    () => hasMeaningfulFilters(filtros),
    [filtros]
  );
  const [selectedResultObras, setSelectedResultObras] = useState([]);
  const [, setGraphSelectionCount] = useState(0);
  const [companyDetailRequest, setCompanyDetailRequest] = useState(null);
  const selectionResetToken = 0;
  const [activeView, setActiveView] = useState('mapa');
  const [mountedViews, setMountedViews] = useState({
    mapa: true,
    resultados: false,
    graficas: false,
    companias: false,
  });
  const previousTopLevelModule = useRef(topLevelModule);
  const previousActiveView = useRef(activeView);
  const [moduleTransition, setModuleTransition] = useState(null);
  const [enteredTopLevelModule, setEnteredTopLevelModule] = useState(null);
  const [fichaTecnica, setFichaTecnica] = useState({
    isOpen: false, isLoading: false, isDownloading: false,
    data: null, title: '', obraKey: '', error: '', downloadError: '',
  });
  const interfaceScale = useCompactScale || useMediumScale ? 0.8 : 1;
  const usesScaledCanvas = interfaceScale < 1;
  const canvasSize = `${100 / interfaceScale}%`;
  const canvasViewportHeight = `${100 / interfaceScale}vh`;
  const [colorMode, setColorMode] = useState(() =>
    sessionStorage.getItem('cl_color_mode') || 'light'
  );
  const isDarkMode = colorMode === 'dark';
  const sidebarWidth = 'clamp(216px, 16vw, 240px)';

  useLayoutEffect(() => {
    const previousModule = previousTopLevelModule.current;
    const previousIndex = TOP_LEVEL_MODULE_ORDER[previousModule];
    const nextIndex = TOP_LEVEL_MODULE_ORDER[topLevelModule];

    if (previousModule !== topLevelModule && Number.isInteger(previousIndex) && Number.isInteger(nextIndex)) {
      // El contenido llega desde el tab de origen: al venir de Proyectos entra
      // por la izquierda; al venir de Licitaciones entra por la derecha.
      setModuleTransition({
        id: `${previousModule}-${topLevelModule}-${Date.now()}`,
        target: topLevelModule,
        direction: previousIndex < nextIndex ? 'left' : 'right',
      });
      setEnteredTopLevelModule(topLevelModule);
    }

    previousTopLevelModule.current = topLevelModule;
  }, [topLevelModule]);

  useEffect(() => {
    if (!moduleTransition) return undefined;
    const timer = window.setTimeout(() => setModuleTransition(null), 440);
    return () => window.clearTimeout(timer);
  }, [moduleTransition]);

  useEffect(() => {
    if (previousActiveView.current !== activeView && !moduleTransition) {
      setEnteredTopLevelModule(null);
    }
    previousActiveView.current = activeView;
  }, [activeView, moduleTransition]);

  const moduleEnterClass = moduleTransition?.target === topLevelModule
    ? `cl-module-enter-${moduleTransition.direction}`
    : undefined;
  const isTopLevelTransitioning = Boolean(moduleEnterClass);
  const suppressNestedEntry = enteredTopLevelModule === topLevelModule;

  const appColors = isDarkMode
    ? {
        pageBg: '#111111',
        surface: '#181818',
        surfaceMuted: '#222222',
        hover: '#242424',
        selected: '#2A2A2A',
        border: '#333333',
        text: '#E5E7EB',
        textStrong: '#F5F5F5',
        textMuted: '#A3A3A3',
        inputBg: '#1F1F1F',
        shadow: '0 12px 30px rgba(0,0,0,.34)',
        graphAccent: '#89AAFF',
        graphAccentStrong: '#6F97FF',
        graphSoft: 'rgba(137,170,255,.16)',
        graphTrack: 'rgba(137,170,255,.16)',
        navBg: '#E85A37',
        navBorder: '#E85A37',
      }
    : {
        pageBg: '#FAFAFA',
        surface: '#FFFFFF',
        surfaceMuted: '#FAFAFA',
        hover: '#FAFAFA',
        selected: '#FAFAFA',
        border: '#ECECEC',
        text: '#374151',
        textStrong: '#202020',
        textMuted: '#6B7280',
        inputBg: '#FFFFFF',
        shadow: '0 8px 24px rgba(0,0,0,.10)',
        graphAccent: '#1847B8',
        graphAccentStrong: '#123DAB',
        graphSoft: 'rgba(24,71,184,.10)',
        graphTrack: 'rgba(24,71,184,.10)',
        navBg: '#FF653F',
        navBorder: '#FF653F',
      };

  useEffect(() => {
    sessionStorage.setItem('cl_color_mode', colorMode);
  }, [colorMode]);

  useEffect(() => {
    if (isLicitacionesModule) return undefined;

    let isActive = true;
    const abortController = new AbortController();

    async function cargarObras() {
      const userId = user.idUsuario;
      let cachedObras = null;

      try {
        setLoadingObras(true);

        cachedObras = await readCachedObras(userId);
        if (isActive && cachedObras?.length) {
          setObras(cachedObras);
          setLoadingObras(false);

          // Se entrega primero el hilo principal al mapa y a sus marcadores.
          // La actualización de red comienza después, de forma silenciosa.
          await new Promise((resolve) => window.setTimeout(resolve, 900));
        }

        let firstPreviewPublished = false;
        const streamedResponse = await obtenerObrasProgresivas({
          signal: abortController.signal,
          onBatch: (fragments) => {
            if (!isActive || cachedObras?.length || firstPreviewPublished) return;
            const previewObras = parseObrasXml(
              `<NewDataSet>${fragments.join('')}</NewDataSet>`
            );
            // El primer bloque sirve también a Resultados, Gráficas y
            // Compañías: no requiere coordenadas para ser útil. Antes se
            // descartaba hasta encontrar un punto de mapa y esos módulos se
            // quedaban vacíos mientras el WS seguía descargando miles de filas.
            if (!previewObras.length) return;
            firstPreviewPublished = true;
            setMapPreviewObras(previewObras);
            setLoadingObras(false);
          },
        });
        const completeXml = streamedResponse.streamed
          ? `<NewDataSet>${streamedResponse.fragments.join('')}</NewDataSet>`
          : streamedResponse.xml;
        const obrasParseadas = await parseObrasOffMainThread(
          completeXml,
          abortController.signal
        );

        if (!isActive) return;
        setObras(obrasParseadas);
        setMapPreviewObras([]);
        void writeCachedObras(userId, obrasParseadas);
      } catch {
        if (isActive && !cachedObras?.length) setObras([]);
      } finally {
        if (isActive) setLoadingObras(false);
      }
    }

    cargarObras();
    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [isLicitacionesModule, user.idUsuario]);

  useEffect(() => {
    // El portafolio de obras es prioritario. El WS de perfiles se ejecuta al
    // terminar esa descarga (o de inmediato cuando obras viene de caché), de
    // modo que dos servicios pesados no compitan por la misma sesión al abrir.
    if (isLicitacionesModule || isProfileModule) return undefined;
    if (!mountedViews.companias) return undefined;
    if (!obras.length) return undefined;

    const sessionKey = `${COMPANY_PROFILE_DATA_VERSION}:${user.idUsuario || ''}:${user.idSession || ''}`;
    if (companiesSessionKey === sessionKey) return undefined;

    let isActive = true;
    const abortController = new AbortController();

    async function cargarCompanias() {
      const userId = user.idUsuario;
      try {
        setLoadingCompanies(true);
        setCompaniesError('');
        const cachedRelationships = await readCachedCompanyRelationships(userId);
        if (isActive && cachedRelationships?.length) {
          // Se pintan los perfiles de la última respuesta antes de esperar la
          // red. La respuesta nueva sólo enriquece/actualiza el mismo listado.
          setCompanyRelationships(cachedRelationships);
        }
        const relationships = await obtenerCompanias({ signal: abortController.signal });
        if (isActive) {
          setCompanyRelationships(relationships);
          setCompaniesSessionKey(sessionKey);
          void writeCachedCompanyRelationships(userId, relationships);
        }
      } catch (error) {
        if (isActive && !abortController.signal.aborted) {
          setCompaniesError(error instanceof Error
            ? error.message
            : 'No fue posible actualizar los datos de compañías.');
        }
      } finally {
        if (isActive) setLoadingCompanies(false);
      }
    }

    cargarCompanias();
    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [companiesSessionKey, isLicitacionesModule, isProfileModule, mountedViews.companias, obras.length, user.idSession, user.idUsuario]);

  const changeView = useCallback((nextView) => {
    setMountedViews((current) => (
      current[nextView] ? current : { ...current, [nextView]: true }
    ));
    setActiveView(nextView);
  }, []);

  const openProjectView = useCallback((nextView) => {
    changeView(nextView);
    navigate(`/construleads/proyectos/${nextView}`);
  }, [changeView, navigate]);

  const openCompaniesView = useCallback(() => {
    changeView('companias');
    navigate('/construleads/companias');
  }, [changeView, navigate]);

  const openCompanyDetail = useCallback((companyName) => {
    const name = String(companyName || '').trim();
    if (!name) return;

    // Cada solicitud conserva un identificador propio para permitir volver a
    // abrir la misma compañía desde Gráficas sin depender del valor anterior.
    setCompanyDetailRequest({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
    });
    openCompaniesView();
  }, [openCompaniesView]);

  useEffect(() => {
    const routeView = location.pathname.match(/\/proyectos\/(mapa|resultados|graficas)\/?$/)?.[1];
    if (routeView) changeView(routeView);
    if (isCompaniesModule) {
      changeView('companias');
      if (location.pathname.match(/\/proyectos\/companias\/?$/)) {
        navigate('/construleads/companias', { replace: true });
      }
    }
  }, [changeView, isCompaniesModule, location.pathname, navigate]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('cl_authenticated');
    localStorage.removeItem('construleadsUser');
    navigate('/', { replace: true });
  }, [navigate]);

  const handleResultsSelectionChange = useCallback((selectedObras) => {
    const nextSelection = Array.isArray(selectedObras)
      ? selectedObras
      : [];

    setSelectedResultObras((currentSelection) => {
      if (haveSameSelection(currentSelection, nextSelection)) {
        return currentSelection;
      }

      return nextSelection;
    });
  }, []);

  const handleViewFicha = useCallback(async (obra) => {
    const obraKey = obra?.clave || obra?.Clave_Proyecto || obra?.source?.clave;
    const title = obra?.proyecto || obra?.Proyecto || obra?.source?.proyecto || 'Ficha técnica';
    setFichaTecnica({
      isOpen: true, isLoading: true, isDownloading: false,
      data: null, title, obraKey, error: '', downloadError: '',
    });
    try {
      const data = await solicitarFichaDatos({
        userId: user.idUsuario,
        sessionId: user.idSession,
        obraKey,
      });
      setFichaTecnica({
        isOpen: true, isLoading: false, isDownloading: false,
        data, title, obraKey, error: '', downloadError: '',
      });
    } catch (error) {
      setFichaTecnica({
        isOpen: true,
        isLoading: false,
        isDownloading: false,
        data: null,
        title,
        obraKey,
        error: error instanceof Error ? error.message : 'No fue posible consultar la ficha.',
        downloadError: '',
      });
    }
  }, [user.idSession, user.idUsuario]);

  const closeFicha = useCallback(() => {
    setFichaTecnica((current) => ({ ...current, isOpen: false }));
  }, []);

  const handleDownloadFicha = useCallback(async () => {
    const obraKey = fichaTecnica.obraKey;
    if (!obraKey || fichaTecnica.isDownloading) return;

    setFichaTecnica((current) => ({
      ...current, isDownloading: true, downloadError: '',
    }));
    try {
      const { fileUrl } = await solicitarReporte({
        reportType: 'pdf_obras',
        userId: user.idUsuario,
        sessionId: user.idSession,
        obrasKeys: obraKey,
      });
      await iniciarDescargaReporte(fileUrl, `ficha-${obraKey}`);
      setFichaTecnica((current) => ({ ...current, isDownloading: false }));
    } catch (error) {
      setFichaTecnica((current) => ({
        ...current,
        isDownloading: false,
        downloadError: error instanceof Error
          ? error.message
          : 'No fue posible descargar la ficha.',
      }));
    }
  }, [
    fichaTecnica.isDownloading,
    fichaTecnica.obraKey,
    user.idSession,
    user.idUsuario,
  ]);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box
      className="cl-app-shell"
      bg={appColors.pageBg}
      p={3}
      color={appColors.text}
      transition="background 180ms ease, color 180ms ease"
      w={usesScaledCanvas ? canvasSize : '100%'}
      maxW="none"
      h={usesScaledCanvas ? canvasViewportHeight : '100dvh'}
      minH="0"
      position={usesScaledCanvas ? 'fixed' : 'relative'}
      top={usesScaledCanvas ? 0 : 'auto'}
      left={usesScaledCanvas ? 0 : 'auto'}
      overflow="hidden"
      display="flex"
      flexDirection="column"
      style={{
        transform: usesScaledCanvas ? `scale(${interfaceScale})` : 'none',
        transformOrigin: 'top left',
        '--cl-page-bg': appColors.pageBg,
        '--cl-surface': appColors.surface,
        '--cl-surface-muted': appColors.surfaceMuted,
        '--cl-hover': appColors.hover,
        '--cl-selected': appColors.selected,
        '--cl-border': appColors.border,
        '--cl-text': appColors.text,
        '--cl-text-strong': appColors.textStrong,
        '--cl-text-muted': appColors.textMuted,
        '--cl-input-bg': appColors.inputBg,
        '--cl-shadow': appColors.shadow,
        '--cl-graph-accent': appColors.graphAccent,
        '--cl-graph-accent-strong': appColors.graphAccentStrong,
        '--cl-graph-soft': appColors.graphSoft,
        '--cl-graph-track': appColors.graphTrack,
        '--cl-sidebar-width': sidebarWidth,
        '--cl-summary-columns': '132px 190px 132px 160px 160px 190px 120px',
      }}
    >
      <ConstruleadsNavbar
        activeModule={isProfileModule ? 'perfil' : isLicitacionesModule ? 'licitaciones' : isCompaniesModule ? 'companias' : 'proyectos'}
        isDarkMode={isDarkMode}
        userName={user.nombreUsuario}
        onProjects={() => openProjectView(['mapa', 'resultados', 'graficas'].includes(activeView) ? activeView : 'mapa')}
        onCompanies={openCompaniesView}
        onLicitaciones={() => navigate('/construleads/licitaciones')}
        onProfile={() => navigate('/construleads/perfil')}
        onPreferences={() => navigate('/construleads/perfil', { state: { activeTab: 'preferencias' } })}
        onToggleTheme={() => setColorMode((current) => (current === 'dark' ? 'light' : 'dark'))}
        onLogout={handleLogout}
      />
      <style>{`
        @keyframes cl-view-enter {
          0% { opacity: 0; transform: translate3d(18px, 0, 0); }
          65% { opacity: 1; transform: translate3d(-2px, 0, 0); }
          100% { opacity: 1; transform: none; }
        }
        .cl-view-enter {
          animation: cl-view-enter 360ms cubic-bezier(.22, 1, .36, 1) both;
          backface-visibility: hidden;
        }
        @keyframes cl-module-enter-from-left {
          0% { opacity: 0; transform: translate3d(-28px, 0, 0); }
          68% { opacity: 1; transform: translate3d(3px, 0, 0); }
          100% { opacity: 1; transform: none; }
        }
        @keyframes cl-module-enter-from-right {
          0% { opacity: 0; transform: translate3d(28px, 0, 0); }
          68% { opacity: 1; transform: translate3d(-3px, 0, 0); }
          100% { opacity: 1; transform: none; }
        }
        .cl-module-enter-left,
        .cl-module-enter-right {
          backface-visibility: hidden;
          will-change: transform, opacity;
        }
        .cl-module-enter-left { animation: cl-module-enter-from-left 420ms cubic-bezier(.22, 1, .36, 1) both; }
        .cl-module-enter-right { animation: cl-module-enter-from-right 420ms cubic-bezier(.22, 1, .36, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .cl-view-enter,
          .cl-module-enter-left,
          .cl-module-enter-right { animation: none; }
        }
      `}</style>
      {isProfileModule ? (
        <Box className="cl-view-enter" flex="1" minW="0" minH="0" h="100%" position="relative">
          <Perfil key={location.key} embedded isDarkMode={isDarkMode} />
        </Box>
      ) : (
      <Flex
        gap={3}
        flex="1"
        h="auto"
        minH="0"
        overflow="hidden"
        align="stretch"
        flexDirection="row"
      >
        {isLicitacionesModule ? (
          <Box className={moduleEnterClass} flex="1" minW="0" minH="0" h="100%" position="relative">
            <Suspense fallback={<ViewLoader label="licitaciones" />}>
              <LicitacionesView user={user} />
            </Suspense>
          </Box>
        ) : (
        <Flex className={moduleEnterClass} gap={3} flex="1" minW="0" minH="0" h="100%" overflow="hidden">
        {!isCompaniesModule && activeView !== 'companias' && (
          <Box position="relative" flexShrink={0} h="100%">
            <SidebarFiltros
              obras={obras}
              onApplyFilters={setFiltros}
            />
          </Box>
        )}

        <Box
          flex="1"
          minW="0"
          minH="0"
          h="100%"
          position="relative"
          display="flex"
          flexDirection="column"
        >
          {!isCompaniesModule && (
            <Flex
              h="44px"
              mb={1}
              px={3}
              align="center"
              gap={1}
              bg={appColors.surface}
              border="1px solid var(--cl-border)"
              borderRadius="10px"
              overflow="hidden"
              minW="0"
              flexShrink={0}
            >
              {[
                { key: 'mapa', label: 'Mapa', icon: FiMapPin, preload: null },
                { key: 'resultados', label: 'Resultados', icon: FiList, preload: loadResultadosView },
                { key: 'graficas', label: 'Gráficas', icon: FiBarChart2, preload: loadGraficasView },
              ].map(({ key, label, icon, preload }) => (
                <Flex
                  as="button"
                  type="button"
                  key={key}
                  h="43px"
                  px={3}
                  align="center"
                  gap={2}
                  color={activeView === key ? '#FF653F' : 'var(--cl-text)'}
                  fontSize="12px"
                  fontWeight={activeView === key ? '700' : '600'}
                  borderBottom={activeView === key ? '2px solid #FF653F' : '2px solid transparent'}
                  whiteSpace="nowrap"
                  onPointerEnter={() => { if (preload) void preload(); }}
                  onClick={() => openProjectView(key)}
                  _hover={{ color: '#FF653F', bg: 'var(--cl-hover)' }}
                >
                  <Box as={icon} boxSize="15px" />
                  {label}
                </Flex>
              ))}
            </Flex>
          )}
          {!isCompaniesModule && ['mapa', 'resultados', 'graficas'].includes(activeView) && (
            <Flex
              className="cl-project-summary-strip"
              align="stretch"
              gap={2}
              mb={2}
              minW="0"
              flexShrink={0}
              aria-label="Resumen de proyectos"
            >
              <Box flex="1" minW="0">
                <PanelResumen
                  obras={filteredObras}
                  filtros={filtros}
                  variant="map"
                />
              </Box>
              <Box flexShrink={0} display="flex" alignItems="center">
                <DownloadPanel
                  selectedObras={selectedResultObras}
                  filteredObras={filteredObras}
                  filtros={filtros}
                  user={user}
                />
              </Box>
            </Flex>
          )}

          <Box flex="1" minH="0" position="relative">
            <Box className={activeView === 'mapa' && !isTopLevelTransitioning && !suppressNestedEntry ? 'cl-view-enter' : undefined}
              display={activeView === 'mapa' ? 'block' : 'none'} h="100%" minH="0">
              <Mapa
                key={`map-theme-${isDarkMode ? 'dark' : 'light'}`}
                obras={obras.length ? filteredObras : filteredMapPreviewObras}
                filtros={PREFILTERED_MAP_FILTERS}
                isDataReady={!loadingObras}
                isVisible={activeView === 'mapa'}
                fitInitialBounds={hasActiveMapFilters}
                isDarkMode={isDarkMode}
                onViewFicha={handleViewFicha}
              />
            </Box>

            {mountedViews.resultados && (
              <Box className={activeView === 'resultados' && !isTopLevelTransitioning && !suppressNestedEntry ? 'cl-view-enter' : undefined}
                display={activeView === 'resultados' ? 'block' : 'none'} h="100%" minH="0">
                <Suspense fallback={<ViewLoader label="resultados" />}>
                  <Resultados
                    obras={filteredObras}
                    onSelectionChange={handleResultsSelectionChange}
                    selectionResetToken={selectionResetToken}
                    onGoToMap={() => openProjectView('mapa')}
                    onViewFicha={handleViewFicha}
                  />
                </Suspense>
              </Box>
            )}

            {mountedViews.graficas && (
              <Box className={activeView === 'graficas' && !isTopLevelTransitioning && !suppressNestedEntry ? 'cl-view-enter' : undefined}
                display={activeView === 'graficas' ? 'block' : 'none'} h="100%" minH="0">
                <Suspense fallback={<ViewLoader label="gráficas" />}>
                  <GraficasView
                    obras={obras}
                    filtros={filtros}
                    onSelectionCountChange={setGraphSelectionCount}
                    onOpenCompany={openCompanyDetail}
                  />
                </Suspense>
              </Box>
            )}

            {mountedViews.companias && (
              <Box className={activeView === 'companias' && !isTopLevelTransitioning && !suppressNestedEntry ? 'cl-view-enter' : undefined}
                display={activeView === 'companias' ? 'block' : 'none'} h="100%" minH="0">
                <ModuleErrorBoundary resetKey={location.pathname}>
                  <Suspense fallback={<ViewLoader label="compañías" />}>
                    <CompaniasView
                      filteredObras={obras.length ? filteredObras : filteredMapPreviewObras}
                      sourceObras={obras.length ? obras : mapPreviewObras}
                      filtros={filtros}
                      onApplyFilters={setFiltros}
                      isLoading={loadingObras}
                      companyRelationships={companyRelationships}
                      isLoadingCompanies={loadingCompanies}
                      companiesError={companiesError}
                      isDarkMode={isDarkMode}
                      onViewFicha={handleViewFicha}
                      companyDetailRequest={companyDetailRequest}
                    />
                  </Suspense>
                </ModuleErrorBoundary>
              </Box>
            )}
          </Box>
        </Box>
        </Flex>
        )}
      </Flex>
      )}
      <FichaTecnicaModal
        {...fichaTecnica}
        isDarkMode={isDarkMode}
        onClose={closeFicha}
        onDownload={handleDownloadFicha}
      />
      <WelcomeExperience
        userId={user.idUsuario}
        userName={user.nombreUsuario}
      />
    </Box>
  );
}
