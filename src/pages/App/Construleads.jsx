import { lazy, Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import {
  Box,
  Flex,
  HStack,
  Image,
  Spinner,
  Text,
  useMediaQuery,
} from '@chakra-ui/react';

import {
  FiBarChart2,
  FiList,
  FiMapPin,
  FiMoon,
  FiSun,
  FiSettings,
  FiLogOut,
} from 'react-icons/fi';

import SidebarFiltros from './SidebarFiltros';
import PanelResumen from './PanelResumen';
import Mapa from './Mapa';
import DownloadPanel from './DownloadPanel';
import FichaTecnicaModal from './FichaTecnicaModal';
import WelcomeExperience from './WelcomeExperience';
import { obtenerObrasProgresivas } from '../../api/obras';
import {
  iniciarDescargaReporte,
  solicitarFichaDatos,
  solicitarReporte,
} from '../../api/reportes';
import { parseObrasXml } from '../../utils/parseObrasXml';
import { parseObrasOffMainThread } from '../../utils/parseObrasOffMainThread';
import { filterObrasByFilters } from '../../utils/filterObras';
import { readCachedObras, writeCachedObras } from '../../utils/obrasCache';

const PREFILTERED_MAP_FILTERS = Object.freeze({ __preFiltered: true });
const loadResultadosView = () => import('./views/ResultadosView');
const loadGraficasView = () => import('./views/GraficasView');
const Resultados = lazy(loadResultadosView);
const GraficasView = lazy(loadGraficasView);
const LicitacionesView = lazy(() => import('../../features/licitaciones/LicitacionesView'));

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

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || 'U';
  const second = parts[1]?.[0] || parts[0]?.[1] || 'M';
  return `${first}${second}`.toUpperCase();
}

export default function Construleads() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLicitacionesModule = location.pathname.includes('/licitaciones');
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
  const [, setLoadingObras] = useState(true);
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
  const [graphSelectionCount, setGraphSelectionCount] = useState(0);
  const selectionResetToken = 0;
  const [activeView, setActiveView] = useState('mapa');
  const [mountedViews, setMountedViews] = useState({
    mapa: true,
    resultados: false,
    graficas: false,
  });
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
  const sidebarWidth = 'clamp(240px, 18vw, 272px)';

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
            const hasMapPoints = previewObras.some((obra) => obra.hasValidCoordinates);
            if (
              !previewObras.length ||
              !hasMapPoints
            ) return;
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

  useEffect(() => {
    const routeView = location.pathname.match(/\/proyectos\/(mapa|resultados|graficas)\/?$/)?.[1];
    if (routeView) changeView(routeView);
  }, [changeView, location.pathname]);

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
      bg={appColors.pageBg}
      minH="100vh"
      p={3}
      color={appColors.text}
      transition="background 180ms ease, color 180ms ease"
      w={usesScaledCanvas ? canvasSize : '100%'}
      maxW="none"
      minH={usesScaledCanvas ? canvasViewportHeight : '100vh'}
      position={usesScaledCanvas ? 'fixed' : 'relative'}
      top={usesScaledCanvas ? 0 : 'auto'}
      left={usesScaledCanvas ? 0 : 'auto'}
      overflow={usesScaledCanvas ? 'hidden' : 'visible'}
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
        '--cl-sidebar-width': sidebarWidth,
        '--cl-summary-columns': '132px 190px 132px 160px 190px 120px',
      }}
    >
      <Flex
        bg={appColors.navBg}
        borderRadius="12px"
        px={4}
        py={2}
        mb={3}
        minH="60px"
        align="center"
        justify="flex-start"
        border={`1px solid ${appColors.navBorder}`}
        gap={4}
      >
        <Box
          w="252px"
          flexShrink={0}
          display="flex"
          alignItems="center"
        >
          <Image
            src={`${import.meta.env.BASE_URL}logo-construleads.svg`}
            alt="BIMSA Reports"
            h="48px"
            objectFit="contain"
            filter="brightness(0) invert(1)"
          />
        </Box>

        <HStack
          spacing={1}
          flex="1"
          justify="flex-start"
          overflowX="auto"
        >
          <Box
            as="button"
            type="button"
            px={3}
            h="38px"
            display="flex"
            alignItems="center"
            borderRadius="9px"
            bg={!isLicitacionesModule ? 'rgba(255,255,255,.2)' : 'transparent'}
            color="white"
            fontWeight="700"
            fontSize="13px"
            whiteSpace="nowrap"
            transition="all 180ms ease"
            _hover={{ bg: 'rgba(255,255,255,.24)' }}
            onClick={() => openProjectView(activeView)}
          >
            Proyectos
          </Box>

          <Box
            as="button"
            type="button"
            px={3}
            h="38px"
            display="flex"
            alignItems="center"
            borderRadius="9px"
            bg={isLicitacionesModule ? 'rgba(255,255,255,.2)' : 'transparent'}
            color="white"
            fontWeight="700"
            fontSize="13px"
            whiteSpace="nowrap"
            transition="all 180ms ease"
            _hover={{ bg: 'rgba(255,255,255,.24)' }}
            onClick={() => navigate('/construleads/licitaciones')}
          >
            Licitaciones
          </Box>

          {/* <Box
            px={3}
            h="44px"
            display="flex"
            alignItems="center"
            color="white"
            cursor="pointer"
            fontSize="14px"
            fontWeight="500"
            borderRadius="8px"
            borderBottom="3px solid transparent"
            transition="all 180ms ease"
            _hover={{ bg: 'rgba(255,255,255,.14)' }}
          >
            Analytics
          </Box> */}

          {/* <Box
            px={3}
            h="44px"
            display="flex"
            alignItems="center"
            color="white"
            cursor="pointer"
            fontSize="14px"
            fontWeight="500"
            borderRadius="8px"
            borderBottom="3px solid transparent"
            transition="all 180ms ease"
            _hover={{ bg: 'rgba(255,255,255,.14)' }}
          >
            Personalizado
          </Box> */}
        </HStack>

        <HStack spacing={3}>
          <Box
            as={isDarkMode ? FiSun : FiMoon}
            boxSize="20px"
            color="white"
            cursor="pointer"
            transition="all 180ms ease"
            _hover={{ color: 'rgba(255,255,255,.82)' }}
            onClick={() => {
              setColorMode((current) =>
                current === 'dark' ? 'light' : 'dark'
              );
            }}
          />

          <Box
            as={FiSettings}
            boxSize="20px"
            color="white"
            cursor="pointer"
            transition="all 180ms ease"
            _hover={{ color: 'rgba(255,255,255,.82)' }}
          />

          <Box
            as={FiLogOut}
            boxSize="20px"
            color="white"
            cursor="pointer"
            transition="all 180ms ease"
            _hover={{ color: 'rgba(255,255,255,.82)' }}
            onClick={handleLogout}
            role="button"
            tabIndex={0}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') handleLogout();
            }}
          />

          <Box position="relative">
            <Box
              as="button"
              type="button"
              w="32px"
              h="32px"
              borderRadius="full"
              bg="white"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontWeight="600"
              fontSize="12px"
              color="#FF653F"
              cursor="pointer"
              transition="transform 160ms ease, box-shadow 160ms ease"
              _hover={{ transform: 'translateY(-1px)' }}
              onClick={() => navigate('/construleads/perfil')}
              aria-label="Abrir perfil"
              title="Abrir perfil"
            >
              {getInitials(user.nombreUsuario)}
            </Box>

            <Box
              position="absolute"
              bottom="1px"
              right="-1px"
              w="8px"
              h="8px"
              borderRadius="full"
              bg="#35B56A"
              border="1px solid white"
            />
          </Box>
        </HStack>
      </Flex>
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
        @media (prefers-reduced-motion: reduce) { .cl-view-enter { animation: none; } }
      `}</style>
      <Flex
        gap={3}
        height={usesScaledCanvas
          ? `calc(${canvasViewportHeight} - 96px)`
          : 'calc(100vh - 96px)'}
        minH="0"
        overflow="hidden"
        align="stretch"
        flexDirection="row"
      >
        {isLicitacionesModule ? (
          <Box className="cl-view-enter" flex="1" minW="0" minH="0" h="100%" position="relative">
            <Suspense fallback={<ViewLoader label="licitaciones" />}>
              <LicitacionesView user={user} />
            </Suspense>
          </Box>
        ) : (
        <>
        <Box position="relative" flexShrink={0} h="100%">
          <SidebarFiltros
            obras={obras}
            onApplyFilters={setFiltros}
          />
        </Box>

        <Box
          flex="1"
          minW="0"
          minH="0"
          h="100%"
          position="relative"
          display="flex"
          flexDirection="column"
        >
          <Flex
            h="44px"
            mb={1}
            px={3}
            align="center"
            gap={1}
            bg={appColors.surface}
            border="1px solid var(--cl-border)"
            borderRadius="10px"
            overflowX="auto"
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
          <Box
            position="fixed"
            left={`calc(var(--cl-sidebar-width) + 24px)`}
            right="12px"
            bottom="12px"
            zIndex={40}
            pointerEvents="none"
          >
            <Flex
              pointerEvents="auto"
              align="end"
              gap={3}
              justify="space-between"
              width="100%"
            >
              <Box flex="1" minW="0">
                <PanelResumen
                  obras={filteredObras}
                  filtros={filtros}
                  variant="map"
                  showCurrentSelection={activeView === 'graficas'}
                  currentSelectionCount={graphSelectionCount}
                />
              </Box>
              <Box flexShrink={0}>
                <DownloadPanel
                  selectedObras={selectedResultObras}
                  filteredObras={filteredObras}
                  filtros={filtros}
                  user={user}
                />
              </Box>
            </Flex>
          </Box>

          <Box flex="1" minH="0" position="relative">
            <Box className={activeView === 'mapa' ? 'cl-view-enter' : undefined}
              display={activeView === 'mapa' ? 'block' : 'none'} h="100%" minH="0" pb="68px">
              <Mapa
                obras={obras.length ? filteredObras : filteredMapPreviewObras}
                filtros={PREFILTERED_MAP_FILTERS}
                isDataReady={obras.length > 0}
                fitInitialBounds={hasActiveMapFilters}
                isDarkMode={isDarkMode}
                onViewFicha={handleViewFicha}
              />
            </Box>

            {mountedViews.resultados && (
              <Box className={activeView === 'resultados' ? 'cl-view-enter' : undefined}
                display={activeView === 'resultados' ? 'block' : 'none'} h="100%" minH="0" pb="68px">
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
              <Box className={activeView === 'graficas' ? 'cl-view-enter' : undefined}
                display={activeView === 'graficas' ? 'block' : 'none'} h="100%" minH="0" pb="68px">
                <Suspense fallback={<ViewLoader label="gráficas" />}>
                  <GraficasView
                    obras={obras}
                    filtros={filtros}
                    onSelectionCountChange={setGraphSelectionCount}
                  />
                </Suspense>
              </Box>
            )}
          </Box>
        </Box>
        </>
        )}
      </Flex>
      <FichaTecnicaModal
        {...fichaTecnica}
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
