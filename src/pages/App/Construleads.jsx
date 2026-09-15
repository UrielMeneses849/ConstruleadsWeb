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
import PerformanceAuditOverlay from '../../components/PerformanceAuditOverlay';
import { obtenerObrasProgresivas, obtenerPrefetchObras } from '../../api/obras';
import { isMapPreviewEndpointEnabled, obtenerObrasMapaLigero } from '../../api/mapaLigero';
import { obtenerCompanias } from '../../api/companias';
import {
  iniciarDescargaReporte,
  getProjectDetail,
  solicitarReporte,
} from '../../api/reportes';
import { parseObrasXml } from '../../utils/parseObrasXml';
import { parseObrasOffMainThread } from '../../utils/parseObrasOffMainThread';
import { filterObrasByFilters } from '../../utils/filterObras';
import { getObraSource, OBRA_SOURCES } from '../../utils/obrasSources';
import { mapProjectsFromObras } from '../../utils/mapProjects';
import {
  readCachedCompanyRelationships,
  readCachedMapProjects,
  readCachedObras,
  writeCachedCompanyRelationships,
  writeCachedMapProjects,
  writeCachedObras,
} from '../../utils/obrasCache';
import { measurePerformance, startPerformanceSpan } from '../../utils/performanceMonitor';

const PREFILTERED_MAP_FILTERS = Object.freeze({ __preFiltered: true });
const loadResultadosView = () => import('./views/ResultadosView');
const loadGraficasView = () => import('./views/GraficasView');
const loadCompaniasView = () => import('../../features/companias/CompaniasView');
const loadLicitacionesView = () => import('../../features/licitaciones/LicitacionesView');
const Resultados = lazy(loadResultadosView);
const GraficasView = lazy(loadGraficasView);
const LicitacionesView = lazy(loadLicitacionesView);
const CompaniasView = lazy(loadCompaniasView);

const TOP_LEVEL_MODULE_ORDER = {
  proyectos: 0,
  companias: 1,
  licitaciones: 2,
};
const PROJECT_VIEWS = new Set(['mapa', 'resultados', 'graficas']);
const COMPANY_PROFILE_DATA_VERSION = 4;
const FIRST_ENTRY_INTRO_DURATION_MS = 2700;
const MAP_REVEAL_DURATION_MS = 800;

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
      fuentes: Array.isArray(saved.fuentes ?? saved.sources) && (saved.fuentes ?? saved.sources).length
        ? (saved.fuentes ?? saved.sources).map(getObraSource)
        : [OBRA_SOURCES.CONSTRULEADS],
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

function getMapFitRequestKey(filters = {}) {
  if (!hasMeaningfulFilters(filters)) return null;

  const orderedValues = (value) => Array.isArray(value)
    ? [...value].map((item) => String(item)).sort((first, second) => first.localeCompare(second, 'es-MX'))
    : [];

  // Es una identidad del filtro ya publicado, no de los resultados. El mapa
  // sólo ajusta la cámara una vez por esta identidad, incluso si llegan más
  // datos o el usuario cambia de estado varias veces en sucesión.
  return JSON.stringify({
    regiones: orderedValues(filters.regiones),
    estados: orderedValues(filters.estados),
    generos: orderedValues(filters.generos),
    subgeneros: orderedValues(filters.subgeneros),
    sectores: orderedValues(filters.sectores),
    etapas: orderedValues(filters.etapas),
    desarrollos: orderedValues(filters.desarrollos),
    tipoObra: orderedValues(filters.tipoObra),
    tiposProyecto: orderedValues(filters.tiposProyecto),
    periodoIndex: Number(filters.periodoIndex ?? -1),
    fechaConsulta: filters.hasDateRangeFilter ? filters.fechaConsulta || '' : '',
    fechaInicio: filters.hasDateRangeFilter ? filters.fechaInicio || filters.dateRangeStart || '' : '',
    fechaFin: filters.hasDateRangeFilter ? filters.fechaFin || filters.dateRangeEnd || '' : '',
    investmentMin: filters.investmentMin ?? null,
    investmentMax: filters.investmentMax ?? null,
    surfaceMin: filters.surfaceMin ?? null,
    surfaceMax: filters.surfaceMax ?? null,
  });
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
        <Spinner size="sm" thickness="3px" color="#D95B27" />
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

  // Sólo la primera entrada autenticada de esta pestaña recibe la coreografía.
  // Las navegaciones posteriores conservan una interfaz inmediata.
  const [isFirstConstruleadsEntry] = useState(() => {
    try {
      return sessionStorage.getItem(`cl_suite_welcome_pending:${user.idUsuario || 'guest'}`) === '1';
    } catch {
      return false;
    }
  });
  const [introPhase, setIntroPhase] = useState(() => (
    isFirstConstruleadsEntry ? 'welcome' : 'idle'
  ));
  const [isMapCoverVisible, setIsMapCoverVisible] = useState(isFirstConstruleadsEntry);
  const [isMapCoverFading, setIsMapCoverFading] = useState(false);
  const [isMapVisualReady, setIsMapVisualReady] = useState(!isFirstConstruleadsEntry);
  const showFirstEntryIntro = introPhase === 'content';
  const handleWelcomeComplete = useCallback(() => {
    setIntroPhase((current) => current === 'welcome' ? 'content' : current);
  }, []);
  const handleMapVisualReady = useCallback(() => {
    setIsMapVisualReady(true);
  }, []);
  useEffect(() => {
    if (!showFirstEntryIntro) return undefined;
    const timer = window.setTimeout(() => setIntroPhase('idle'), FIRST_ENTRY_INTRO_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [showFirstEntryIntro]);

  const [filtros, setFiltros] = useState(readPersistedFilters);
  const [obras, setObras] = useState([]);
  const [mapPreviewObras, setMapPreviewObras] = useState([]);
  // Sólo el endpoint ligero permite retrasar el catálogo rico. La bandera no
  // depende de cada cambio de pestaña, evitando abortar/repetir ws_cl_obras.
  const [fullCatalogRequested, setFullCatalogRequested] = useState(
    () => !isMapPreviewEndpointEnabled()
  );
  const [loadingObras, setLoadingObras] = useState(true);
  const [companyRelationships, setCompanyRelationships] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companiesError, setCompaniesError] = useState('');
  const [companiesSessionKey, setCompaniesSessionKey] = useState('');
  const filteredObras = useMemo(
    () => measurePerformance(
      'filters.obras',
      { records: obras.length, sources: (filtros.fuentes || []).length },
      () => filterObrasByFilters(obras, filtros)
    ),
    [obras, filtros]
  );
  const filteredMapPreviewObras = useMemo(
    () => measurePerformance(
      'filters.map-preview',
      { records: mapPreviewObras.length },
      () => filterObrasByFilters(mapPreviewObras, filtros)
    ),
    [mapPreviewObras, filtros]
  );
  const mapDatasetObras = obras.length ? filteredObras : filteredMapPreviewObras;
  useEffect(() => {
    // La capa se conserva hasta que termina la coreografía y existe contenido
    // real. El mapa de Google nunca se transforma: sólo se revela la capa.
    if (
      !isMapCoverVisible ||
      introPhase !== 'idle' ||
      !isMapVisualReady ||
      (loadingObras && !mapDatasetObras.length)
    ) return undefined;

    setIsMapCoverFading(true);
    const timer = window.setTimeout(() => setIsMapCoverVisible(false), MAP_REVEAL_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [introPhase, isMapCoverVisible, isMapVisualReady, loadingObras, mapDatasetObras.length]);
  const mapFitRequestKey = useMemo(
    () => getMapFitRequestKey(filtros),
    [filtros]
  );
  const [selectedResultObras, setSelectedResultObras] = useState([]);
  const [, setGraphSelectionCount] = useState(0);
  const [companyDetailRequest, setCompanyDetailRequest] = useState(null);
  const selectionResetToken = 0;
  const [activeView, setActiveView] = useState('mapa');
  const lastProjectView = useRef(
    location.pathname.match(/\/proyectos\/(mapa|resultados|graficas)\/?$/)?.[1] || 'mapa'
  );
  const graphFilters = useMemo(() => ({
    ...filtros,
    fuentes: [OBRA_SOURCES.CONSTRULEADS],
  }), [filtros]);
  const graphSummaryObras = useMemo(
    () => measurePerformance(
      'filters.graph-summary',
      { records: obras.length },
      () => filterObrasByFilters(obras, graphFilters)
    ),
    [obras, graphFilters]
  );
  const [mountedViews, setMountedViews] = useState({
    mapa: true,
    resultados: false,
    graficas: false,
    companias: false,
  });
  const previousTopLevelModule = useRef(topLevelModule);
  const [moduleTransition, setModuleTransition] = useState(null);
  const [projectViewTransition, setProjectViewTransition] = useState(null);
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
      // La vista nueva llega desde la dirección de la pestaña destino.
      // Ej.: Proyectos → Compañías entra desde la derecha.
      setModuleTransition({
        id: `${previousModule}-${topLevelModule}-${Date.now()}`,
        target: topLevelModule,
        direction: previousIndex < nextIndex ? 'right' : 'left',
      });
    }

    previousTopLevelModule.current = topLevelModule;
  }, [topLevelModule]);

  useEffect(() => {
    if (!moduleTransition) return undefined;
    const timer = window.setTimeout(() => setModuleTransition(null), 280);
    return () => window.clearTimeout(timer);
  }, [moduleTransition]);

  useEffect(() => {
    if (!projectViewTransition) return undefined;
    const timer = window.setTimeout(() => setProjectViewTransition(null), 260);
    return () => window.clearTimeout(timer);
  }, [projectViewTransition]);

  const moduleEnterClass = moduleTransition?.target === topLevelModule
    ? `cl-module-enter-${moduleTransition.direction}`
    : undefined;

  const projectViewEnterClass = (view) => (
    projectViewTransition?.target === view ? 'cl-view-enter' : undefined
  );

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
        graphAccent: '#475569',
        graphAccentStrong: '#64748B',
        graphSoft: 'rgba(71,85,105,.22)',
        graphTrack: 'rgba(71,85,105,.28)',
        navBg: '#B9471E',
        navBorder: '#B9471E',
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
        graphAccent: '#475569',
        graphAccentStrong: '#334155',
        graphSoft: 'rgba(71,85,105,.10)',
        graphTrack: 'rgba(71,85,105,.14)',
        navBg: '#D95B27',
        navBorder: '#D95B27',
      };

  useEffect(() => {
    sessionStorage.setItem('cl_color_mode', colorMode);
  }, [colorMode]);

  useEffect(() => {
    // Compañías y Licitaciones tienen sus propios WS. Descargar Obras al
    // entrar directamente a uno de esos módulos sólo les roba red y CPU.
    if (isLicitacionesModule || isCompaniesModule) return undefined;

    let isActive = true;
    const abortController = new AbortController();

    async function cargarObras() {
      const userId = user.idUsuario;
      let cachedObras = null;
      let loadedRecords = 0;
      let loadStatus = 'error';
      let servedFromCache = false;
      let firstPreviewMs = null;
      let fullObrasReady = false;
      let lightweightPreviewApplied = false;
      const loadSpan = startPerformanceSpan('obras.load', { userId: Boolean(userId) });

      try {
        setLoadingObras(true);

        // La red y el disco no deben esperar uno al otro. En una primera
        // visita no habrá caché; arrancar el WS antes de consultar IndexedDB
        // elimina esa espera de la ruta crítica hacia el primer marcador.
        const cachePromise = readCachedObras(userId);
        const mapCachePromise = readCachedMapProjects(userId);
        const streamedPreviewKeys = new Set();
        let firstPreviewPublished = false;
        const requestStartedAt = performance.now();
        const requestSpan = startPerformanceSpan('obras.request', { cached: false });
        // Cuando el backend habilite el endpoint compacto, éste devuelve el
        // inventario de pines antes que el XML detallado. Ambos WS corren en
        // paralelo; si el compacto no existe o falla, el flujo actual sigue
        // exactamente igual y la vista nunca queda bloqueada.
        const mapEndpointEnabled = isMapPreviewEndpointEnabled();
        const lightweightRequest = obtenerObrasMapaLigero({
          userId: user.idUsuario,
          sessionId: user.idSession,
          signal: abortController.signal,
        }).then((lightweightObras) => {
          if (!isActive || fullObrasReady || !lightweightObras?.length) return;

          lightweightPreviewApplied = true;
          firstPreviewPublished = true;
          firstPreviewMs = Math.round(performance.now() - requestStartedAt);
          setMapPreviewObras(lightweightObras);
          void writeCachedMapProjects(userId, lightweightObras);
          setLoadingObras(false);
          return lightweightObras;
        }).catch(() => {
          // Es un acelerador opcional. `ws_cl_obras` conserva el fallback.
          return null;
        });

        // Stale-while-revalidate: el dataset mínimo persistido es suficiente
        // para montar el mapa; la respuesta ligera lo sustituye sólo si llega.
        const cachedMapDataset = await mapCachePromise;
        if (isActive && cachedMapDataset?.projects?.length) {
          setMapPreviewObras(cachedMapDataset.projects);
          setLoadingObras(false);
        }

        // Con contrato ligero habilitado, Mapa no descarga el XML completo.
        // Resultados/Gráficas lo pedirán al activarse; un fallo ligero continúa
        // por el fallback actual sin ocultar el mapa ni silenciar el error.
        if (mapEndpointEnabled && !fullCatalogRequested) {
          const lightweightObras = await lightweightRequest;
          if (lightweightObras?.length) {
            loadedRecords = lightweightObras.length;
            loadStatus = 'map-light-success';
            return;
          }
        }
        const prefetchedRequest = obtenerPrefetchObras({
          userId,
          sessionId: user.idSession,
        });
        const requestPromise = prefetchedRequest || obtenerObrasProgresivas({
          signal: abortController.signal,
          // El primer punto aparece de inmediato y los siguientes bloques se
          // incorporan al mapa. No esperamos a que el ASMX cierre todo el XML:
          // ese servicio puede tardar bastante en completar la respuesta.
          firstBatchSize: 1,
          batchSize: 25,
          onBatch: (fragments) => {
            if (!isActive || cachedObras?.length || lightweightPreviewApplied) return;
            // Cada fragmento se procesa una sola vez. Así evitamos reprocesar
            // todo el XML en cada actualización y el mapa sigue creciendo
            // mientras la respuesta del WS continúa abierta.
            const previewSpan = startPerformanceSpan('obras.preview-parse', { fragments: fragments.length });
            const previewObras = parseObrasXml(
              `<NewDataSet>${fragments.join('')}</NewDataSet>`
            ).filter((obra) => obra?.hasValidCoordinates);
            previewSpan.end({ records: previewObras.length });

            if (!previewObras.length) return;
            const newPreviewObras = previewObras.filter((obra) => {
              const key = String(obra.clave || obra.id || '');
              if (!key || streamedPreviewKeys.has(key)) return false;
              streamedPreviewKeys.add(key);
              return true;
            });
            if (!newPreviewObras.length) return;

            if (!firstPreviewPublished) {
              firstPreviewPublished = true;
              firstPreviewMs = Math.round(performance.now() - requestStartedAt);
            }
            setMapPreviewObras((current) => {
              const existingKeys = new Set(current.map((obra) => String(
                obra.clave || obra.id || `${obra.lat}:${obra.lng}`
              )));
              return [
                ...current,
                ...newPreviewObras.filter((obra) => !existingKeys.has(String(
                  obra.clave || obra.id || `${obra.lat}:${obra.lng}`
                ))),
              ];
            });
            setLoadingObras(false);
          },
        });

        cachedObras = await cachePromise;
        if (isActive && cachedObras?.length) {
          servedFromCache = true;
          loadedRecords = cachedObras.length;
          setObras(cachedObras);
          setLoadingObras(false);

          // Se entrega primero el hilo principal al mapa y a sus marcadores.
          // La actualización de red comienza después, de forma silenciosa.
          await new Promise((resolve) => window.setTimeout(resolve, 900));
        }

        let streamedResponse;
        try {
          streamedResponse = await requestPromise;
          requestSpan.end({
            streamed: streamedResponse.streamed,
            fragments: streamedResponse.fragments?.length || 0,
            cache: Boolean(cachedObras?.length),
            firstPreviewMs,
          });
        } catch (error) {
          requestSpan.end({ error: true });
          throw error;
        }
        const completeXml = streamedResponse.streamed
          ? `<NewDataSet>${streamedResponse.fragments.join('')}</NewDataSet>`
          : streamedResponse.xml;
        const parseSpan = startPerformanceSpan('obras.parse', { bytes: completeXml.length });
        let obrasParseadas;
        try {
          obrasParseadas = await parseObrasOffMainThread(
            completeXml,
            abortController.signal
          );
          parseSpan.end({ records: obrasParseadas.length });
        } catch (error) {
          parseSpan.end({ error: true });
          throw error;
        }

        if (!isActive) return;
        fullObrasReady = true;
        loadedRecords = obrasParseadas.length;
        loadStatus = 'success';
        setObras(obrasParseadas);
        setMapPreviewObras([]);
        void writeCachedMapProjects(userId, mapProjectsFromObras(obrasParseadas));
        void writeCachedObras(userId, obrasParseadas);
      } catch {
        loadStatus = abortController.signal.aborted ? 'aborted' : 'error';
        if (isActive && !cachedObras?.length) setObras([]);
      } finally {
        loadSpan.end({
          records: loadedRecords,
          status: loadStatus,
          cache: servedFromCache,
          firstPreviewMs,
        });
        if (isActive) setLoadingObras(false);
      }
    }

    // React Strict Mode vuelve a ejecutar los efectos durante el desarrollo.
    // Al diferir un turno el arranque, la primera ejecución de comprobación
    // se limpia antes de abrir el WS y sólo queda una solicitud real. En
    // producción el retraso es imperceptible (un turno de event loop).
    const startTimer = window.setTimeout(cargarObras, 0);
    return () => {
      isActive = false;
      window.clearTimeout(startTimer);
      abortController.abort();
    };
  }, [fullCatalogRequested, isCompaniesModule, isLicitacionesModule, user.idSession, user.idUsuario]);

  useEffect(() => {
    if (activeView !== 'mapa') setFullCatalogRequested(true);
  }, [activeView]);

  useEffect(() => {
    // Compañías usa su propio WS, que ya contiene su portafolio y relaciones.
    // Se carga exclusivamente al entrar a su módulo: no compite con Mapa.
    if (!isCompaniesModule || isLicitacionesModule || isProfileModule) return undefined;

    const sessionKey = `${COMPANY_PROFILE_DATA_VERSION}:${user.idUsuario || ''}:${user.idSession || ''}`;
    if (companiesSessionKey === sessionKey) return undefined;

    let isActive = true;

    async function cargarCompanias() {
      const userId = user.idUsuario;
      let relationshipCount = 0;
      let loadStatus = 'error';
      const loadSpan = startPerformanceSpan('companies.load', { userId: Boolean(userId) });
      try {
        setLoadingCompanies(true);
        setCompaniesError('');
        // La lectura local y la descarga del WS no dependen una de otra. Al
        // iniciarlas juntas reducimos el tiempo hasta contactos frescos sin
        // perder el primer pintado inmediato desde caché.
        const cachedRelationshipsPromise = readCachedCompanyRelationships(userId);
        const relationshipsPromise = obtenerCompanias({
          caller: 'Construleads',
          reason: 'companies-view',
        });
        const cachedRelationships = await cachedRelationshipsPromise;
        if (isActive && cachedRelationships?.length) {
          // Se pintan los perfiles de la última respuesta antes de esperar la
          // red. La respuesta nueva sólo enriquece/actualiza el mismo listado.
          setCompanyRelationships(cachedRelationships);
        }
        const relationships = await relationshipsPromise;
        if (isActive) {
          relationshipCount = relationships.length;
          loadStatus = 'success';
          setCompanyRelationships(relationships);
          setCompaniesSessionKey(sessionKey);
          void writeCachedCompanyRelationships(userId, relationships);
        }
      } catch (error) {
        loadStatus = 'error';
        if (isActive) {
          setCompaniesError(error instanceof Error
            ? error.message
            : 'No fue posible actualizar los datos de compañías.');
        }
      } finally {
        loadSpan.end({ relationships: relationshipCount, status: loadStatus });
        if (isActive) setLoadingCompanies(false);
      }
    }

    void loadCompaniasView();
    cargarCompanias();

    return () => {
      isActive = false;
    };
  }, [companiesSessionKey, isCompaniesModule, isLicitacionesModule, isProfileModule, user.idSession, user.idUsuario]);

  const changeView = useCallback((nextView, { animateProjectView = false } = {}) => {
    if (PROJECT_VIEWS.has(nextView)) lastProjectView.current = nextView;
    if (animateProjectView && nextView !== activeView) {
      setProjectViewTransition({
        id: `${nextView}-${Date.now()}`,
        target: nextView,
      });
    }
    setMountedViews((current) => (
      current[nextView] ? current : { ...current, [nextView]: true }
    ));
    setActiveView(nextView);
  }, [activeView]);

  const openProjectView = useCallback((nextView) => {
    changeView(nextView, { animateProjectView: topLevelModule === 'proyectos' });
    navigate(`/construleads/proyectos/${nextView}`);
  }, [changeView, navigate, topLevelModule]);

  const openCompaniesView = useCallback(() => {
    // Navegar antes de montar la vista evita un frame intermedio de
    // "Compañías" dentro del shell de Proyectos, que era el origen del
    // parpadeo/doble entrada al pulsar la pestaña superior.
    setMountedViews((current) => (
      current.companias ? current : { ...current, companias: true }
    ));
    navigate('/construleads/companias');
  }, [navigate]);

  const openLicitacionesView = useCallback(() => {
    navigate('/construleads/licitaciones');
  }, [navigate]);

  const openCompanyDetail = useCallback((companyReference) => {
    const source = typeof companyReference === 'object' && companyReference
      ? companyReference
      : {};
    const company = source.company || {};
    const name = String(
      typeof companyReference === 'string'
        ? companyReference
        : source.compania || source.Compania || company.name || source.name || source.nombre || ''
    ).trim();
    const clave = String(
      source.claveCompania || source.Clave_Compania || source.clave_cia || company.clave || ''
    ).trim();
    const rfc = String(
      source.rfcCompania || source.RFC_Compania || company.rfc || source.rfc || source.RFC || ''
    ).trim();
    const projectKey = String(
      source.clave || source.Clave_Proyecto || source.clave_proyecto || source.id || ''
    ).trim();
    if (!name && !clave && !rfc) return;

    // Cada solicitud conserva un identificador propio para permitir volver a
    // abrir la misma compañía desde Gráficas o Resultados sin depender del
    // valor anterior. Clave y RFC evitan colisiones entre razones sociales.
    setCompanyDetailRequest({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      clave,
      rfc,
      projectKey,
    });
    openCompaniesView();
  }, [openCompaniesView]);

  useLayoutEffect(() => {
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
      const data = await getProjectDetail({
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
      className={`cl-app-shell${showFirstEntryIntro ? ' cl-first-entry' : ''}`}
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
        onProjects={() => openProjectView(lastProjectView.current)}
        onCompanies={openCompaniesView}
        onLicitaciones={openLicitacionesView}
        onProfile={() => navigate('/construleads/perfil')}
        onPreferences={() => navigate('/construleads/perfil', { state: { activeTab: 'preferencias' } })}
        onToggleTheme={() => setColorMode((current) => (current === 'dark' ? 'light' : 'dark'))}
        onLogout={handleLogout}
      />
      <style>{`
        @keyframes cl-view-enter {
          0% { opacity: 0; transform: translate3d(18px, 0, 0); }
          100% { opacity: 1; transform: none; }
        }
        .cl-view-enter {
          animation: cl-view-enter 260ms cubic-bezier(.22, 1, .36, 1) both;
          backface-visibility: hidden;
        }
        @keyframes cl-module-enter-from-left {
          0% { opacity: 0; transform: translate3d(-24px, 0, 0); }
          100% { opacity: 1; transform: none; }
        }
        @keyframes cl-module-enter-from-right {
          0% { opacity: 0; transform: translate3d(24px, 0, 0); }
          100% { opacity: 1; transform: none; }
        }
        .cl-module-enter-left,
        .cl-module-enter-right {
          backface-visibility: hidden;
          will-change: transform, opacity;
        }
        .cl-module-enter-left { animation: cl-module-enter-from-left 280ms cubic-bezier(.22, 1, .36, 1) both; }
        .cl-module-enter-right { animation: cl-module-enter-from-right 280ms cubic-bezier(.22, 1, .36, 1) both; }
        @keyframes cl-app-intro-sidebar {
          from { opacity: 0; transform: translate3d(-28px, 0, 0); }
          to { opacity: 1; transform: none; }
        }
        @keyframes cl-app-intro-rise {
          from { opacity: 0; transform: translate3d(0, 18px, 0) scale(.985); }
          to { opacity: 1; transform: none; }
        }
        .cl-first-entry .cl-app-intro-sidebar { animation: cl-app-intro-sidebar 760ms cubic-bezier(.22, 1, .36, 1) 160ms both; }
        .cl-first-entry .cl-app-intro-sidebar { animation-delay: 100ms; }
        .cl-first-entry .cl-app-intro-tabs { animation: cl-app-intro-rise 700ms cubic-bezier(.22, 1, .36, 1) 320ms both; }
        .cl-first-entry .cl-summary-metrics > * { animation: cl-app-intro-rise 620ms cubic-bezier(.22, 1, .36, 1) both; }
        .cl-first-entry .cl-summary-metrics > *:nth-child(1) { animation-delay: 620ms; }
        .cl-first-entry .cl-summary-metrics > *:nth-child(2) { animation-delay: 790ms; }
        .cl-first-entry .cl-summary-metrics > *:nth-child(3) { animation-delay: 960ms; }
        .cl-first-entry .cl-summary-metrics > *:nth-child(4) { animation-delay: 1130ms; }
        .cl-first-entry .cl-summary-metrics > *:nth-child(5) { animation-delay: 1300ms; }
        .cl-first-entry .cl-summary-metrics > *:nth-child(6) { animation-delay: 1470ms; }
        .cl-first-entry .cl-summary-metrics > *:nth-child(7) { animation-delay: 1640ms; }
        .cl-first-entry .cl-app-intro-download { animation: cl-app-intro-rise 640ms cubic-bezier(.22, 1, .36, 1) 1950ms both; }
        .cl-map-intro-cover { opacity: 1; transition: opacity ${MAP_REVEAL_DURATION_MS}ms cubic-bezier(.22, 1, .36, 1); }
        .cl-map-intro-cover.is-fading { opacity: 0; }
        @media (prefers-reduced-motion: reduce) {
          .cl-view-enter,
          .cl-module-enter-left,
          .cl-module-enter-right,
          .cl-app-intro-sidebar,
          .cl-app-intro-tabs,
          .cl-summary-metrics > *,
          .cl-app-intro-download { animation: none; }
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
          <Box className="cl-app-intro-sidebar" position="relative" flexShrink={0} h="100%">
            <SidebarFiltros
              obras={obras.length ? obras : mapPreviewObras}
              onApplyFilters={setFiltros}
              isGraphView={activeView === 'graficas'}
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
              className="cl-app-intro-tabs"
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
                  color={activeView === key ? '#D95B27' : 'var(--cl-text)'}
                  fontSize="12px"
                  fontWeight={activeView === key ? '700' : '600'}
                  borderBottom={activeView === key ? '2px solid #D95B27' : '2px solid transparent'}
                  whiteSpace="nowrap"
                  onPointerEnter={() => { if (preload) void preload(); }}
                  onClick={() => openProjectView(key)}
                  _hover={{ color: '#D95B27', bg: 'var(--cl-hover)' }}
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
                  obras={activeView === 'graficas' ? graphSummaryObras : mapDatasetObras}
                  filtros={activeView === 'graficas' ? graphFilters : filtros}
                  variant="map"
                />
              </Box>
              <Box className="cl-app-intro-download" flexShrink={0} display="flex" alignItems="center">
                <DownloadPanel
                  selectedObras={selectedResultObras}
                  filteredObras={filteredObras}
                  obras={obras}
                  filtros={filtros}
                  user={user}
                />
              </Box>
            </Flex>
          )}

          <Box flex="1" minH="0" position="relative">
            <Box className={activeView === 'mapa' ? projectViewEnterClass('mapa') || undefined : undefined}
              display={activeView === 'mapa' ? 'block' : 'none'} h="100%" minH="0">
              <Mapa
                key={`map-theme-${isDarkMode ? 'dark' : 'light'}`}
                obras={mapDatasetObras}
                filtros={PREFILTERED_MAP_FILTERS}
                isDataReady={!loadingObras}
                isVisible={activeView === 'mapa'}
                onVisualReady={handleMapVisualReady}
                fitRequestKey={mapFitRequestKey}
                isDarkMode={isDarkMode}
                onViewFicha={handleViewFicha}
              />
            </Box>
            {activeView === 'mapa' && isMapCoverVisible && (
              <Flex
                className={`cl-map-intro-cover${isMapCoverFading ? ' is-fading' : ''}`}
                position="absolute"
                inset={0}
                zIndex={100}
                align="center"
                justify="center"
                direction="column"
                bg={appColors.surfaceMuted}
                borderRadius="12px"
                pointerEvents="none"
              >
                <Spinner thickness="2px" speed=".75s" color="#D95B27" size="sm" mb={3} />
                <Text fontSize="13px" fontWeight="650" color={appColors.textStrong}>Preparando el mapa</Text>
                <Text mt={1} fontSize="11px" color={appColors.textMuted}>Ubicando proyectos disponibles…</Text>
              </Flex>
            )}

            {mountedViews.resultados && (
              <Box className={activeView === 'resultados' ? projectViewEnterClass('resultados') : undefined}
                display={activeView === 'resultados' ? 'block' : 'none'} h="100%" minH="0">
                <Suspense fallback={<ViewLoader label="resultados" />}>
                  <Resultados
                    key={`results-sources-${(filtros.fuentes || []).slice().sort().join('-')}`}
                    obras={filteredObras}
                    activeSources={filtros.fuentes}
                    onSelectionChange={handleResultsSelectionChange}
                    selectionResetToken={selectionResetToken}
                    onGoToMap={() => openProjectView('mapa')}
                    onViewFicha={handleViewFicha}
                    onOpenCompany={openCompanyDetail}
                  />
                </Suspense>
              </Box>
            )}

            {mountedViews.graficas && (
              <Box className={activeView === 'graficas' ? projectViewEnterClass('graficas') : undefined}
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
              <Box
                display={activeView === 'companias' ? 'block' : 'none'} h="100%" minH="0">
                <ModuleErrorBoundary resetKey={location.pathname}>
                  <Suspense fallback={<ViewLoader label="compañías" />}>
                    <CompaniasView
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
        onComplete={handleWelcomeComplete}
      />
      <PerformanceAuditOverlay />
    </Box>
  );
}
