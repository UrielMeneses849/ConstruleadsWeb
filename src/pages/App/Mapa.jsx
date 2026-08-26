import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  Box,
  Button,
  Flex,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import {
  MarkerClusterer,
  SuperClusterAlgorithm,
} from '@googlemaps/markerclusterer';
import {
  FiActivity,
  FiArrowRight,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCheckSquare,
  FiHome,
  FiLayers,
  FiMap,
  FiMaximize,
  FiNavigation,
  FiSettings,
  FiShoppingBag,
  FiTool,
  FiTrash2,
  FiTruck,
  FiX,
} from 'react-icons/fi';
import MapSelectionModal from './MapSelectionModal';

const DEBUG_MAPA = false;
const AUTO_FIT_INITIAL_BOUNDS = false;
const FILTER_FIT_MAX_ZOOM = 14;
const FILTER_FIT_PADDING = Object.freeze({ top: 22, right: 22, bottom: 42, left: 22 });
const FILTER_FIT_SAFETY_ZOOM = 0.06;
const MAP_MIN_ZOOM = 4;
const MAP_MAX_ZOOM = 18;
const CLUSTER_MOTION_DURATION = 360;
const UNCLUSTERED_MARKER_LIMITS = Object.freeze({
  overview: 520,
  regional: 850,
  detail: 1300,
});
const MAP_DEFAULT_CENTER = Object.freeze({ lat: 23.6, lng: -102.0 });
const MEXICO_MAP_BOUNDS = Object.freeze({
  north: 34.9,
  south: 12.0,
  west: -119.0,
  east: -84.0,
});

// El colorScheme de Google Maps sólo puede definirse al crear la instancia.
// Conservamos la cámara entre esas recreaciones para que cambiar de tema no
// se sienta como navegar de nuevo por el mapa.
let lastMapCamera = null;
let lastMountedMapTheme = null;

function isCoordinateInsideMexicoMap(lat, lng) {
  return lat >= MEXICO_MAP_BOUNDS.south &&
    lat <= MEXICO_MAP_BOUNDS.north &&
    lng >= MEXICO_MAP_BOUNDS.west &&
    lng <= MEXICO_MAP_BOUNDS.east;
}

function getCameraForPositions(positions, width, height, padding) {
  if (!positions.length || width <= 0 || height <= 0) return null;

  const toWorldPoint = ({ lat, lng }) => {
    const sinLatitude = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
    return {
      x: (lng + 180) / 360,
      y: 0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI),
    };
  };
  const worldPoints = positions.map(toWorldPoint);
  const xs = worldPoints.map((point) => point.x);
  const ys = worldPoints.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1 / (256 * (2 ** FILTER_FIT_MAX_ZOOM)));
  const spanY = Math.max(maxY - minY, 1 / (256 * (2 ** FILTER_FIT_MAX_ZOOM)));
  const availableWidth = Math.max(1, width - padding.left - padding.right);
  const availableHeight = Math.max(1, height - padding.top - padding.bottom);
  const zoomX = Math.log2(availableWidth / (256 * spanX));
  const zoomY = Math.log2(availableHeight / (256 * spanY));
  // El mapa admite zoom fraccional. Conservar el valor exacto evita regalar
  // hasta un nivel completo de zoom cuando hay varias entidades seleccionadas.
  // El pequeño margen protege el cuerpo de los pines situados en los extremos.
  const zoom = Math.max(
    MAP_MIN_ZOOM,
    Math.min(FILTER_FIT_MAX_ZOOM, Math.min(zoomX, zoomY) - FILTER_FIT_SAFETY_ZOOM)
  );
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerLng = centerX * 360 - 180;
  const centerLat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * centerY))) * 180) / Math.PI;

  return { center: { lat: centerLat, lng: centerLng }, zoom };
}

function normalizeText(value) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const compact = normalized.replace(/[\s._-]+/g, '');
  if (compact === 'aguascaliente' || compact === 'aguascalientes') {
    return 'aguascalientes';
  }

  return normalized;
}

function matchesTextList(value, list = []) {
  if (!list.length) return false;
  const normalizedValue = normalizeText(value);
  return list.some((item) => normalizeText(item) === normalizedValue);
}

function parseFilterNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const numeric = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getSingleTaxonomyValue(value) {
  const rawValue = Array.isArray(value)
    ? value.find((item) => String(item || '').trim())
    : value;

  return String(rawValue || '')
    .split(/[|;,]+/)
    .map((item) => item.trim())
    .find(Boolean) || '';
}

function getObraMarkerKey(obra, index) {
  return String(
    obra?.id ||
    obra?.clave ||
    obra?.proy_clave ||
    obra?.proyecto ||
    `${obra?.lat || obra?.latitud || obra?.Latitud || 'lat'}-${obra?.lng || obra?.longitud || obra?.Longitud || 'lng'}-${index}`
  );
}

function getObraCoordinates(obra) {
  const lat = Number(obra?.lat ?? obra?.latitud ?? obra?.Latitud);
  const lng = Number(obra?.lng ?? obra?.longitud ?? obra?.Longitud);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

const projectDateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit', month: 'short', year: 'numeric',
});

function formatProjectDate(value) {
  if (!value) return 'Por confirmar';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 'Por confirmar' : projectDateFormatter.format(value);
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Por confirmar' : projectDateFormatter.format(date);
  }

  const text = String(value).trim();
  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const local = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  const date = iso
    ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    : local
      ? new Date(Number(local[3]), Number(local[2]) - 1, Number(local[1]))
      : new Date(text);
  return Number.isNaN(date.getTime()) ? 'Por confirmar' : projectDateFormatter.format(date);
}

function getGenreIcon(genero) {
  const genre = normalizeText(genero);
  if (genre.includes('infraestructura')) return FiTruck;
  if (genre.includes('salud')) return FiActivity;
  if (genre.includes('educa')) return FiBookOpen;
  if (genre.includes('habitacional') || genre.includes('vivienda')) return FiHome;
  if (genre.includes('comercial')) return FiShoppingBag;
  if (genre.includes('industrial')) return FiSettings;
  if (genre.includes('institucional')) return FiBriefcase;
  if (genre.includes('tur') || genre.includes('recrea')) return FiMap;
  if (genre.includes('urban')) return FiTool;
  return FiLayers;
}

function Mapa({
  obras = [],
  filtros = {},
  isDataReady = true,
  isVisible = true,
  fitInitialBounds = false,
  isDarkMode = false,
  onFilteredData,
  onViewFicha,
}) {
  const [selectedProject, setSelectedProject] = useState(null);
  const [popupPosition, setPopupPosition] = useState(null);
  const [filteredObras, setFilteredObras] = useState([]);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapLoadingMessage, setMapLoadingMessage] = useState('Cargando datos del mapa...');
  const [markerProgress, setMarkerProgress] = useState({ loaded: 0, total: 0 });
  const [isClusteringEnabled, setIsClusteringEnabled] = useState(true);
  const [unclusteredSummary, setUnclusteredSummary] = useState(null);
  const [isRouteMode, setIsRouteMode] = useState(false);
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [selectionConfirmation, setSelectionConfirmation] = useState(null);
  const [selectedObraKeys, setSelectedObraKeys] = useState([]);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [selectionFeedback, setSelectionFeedback] = useState('');
  const projectPopupTone = isDarkMode
    ? {
        accentSoft: 'rgba(255, 101, 63, .16)',
        periodBg: 'rgba(255, 101, 63, .10)',
        periodBorder: 'rgba(255, 166, 139, .42)',
        periodIconBg: 'rgba(255, 101, 63, .22)',
        accentText: '#FFB39F',
        labelText: '#C9BBB6',
        valueText: '#FFF4F0',
      }
    : {
        accentSoft: '#FFF1EB',
        periodBg: '#FFF8F5',
        periodBorder: '#FFD9CD',
        periodIconBg: '#FFE2D8',
        accentText: '#B45035',
        labelText: '#7E6A64',
        valueText: '#3B2D28',
      };
  const mapRef = useRef(null);
  const popupCardRef = useRef(null);
  const selectedProjectRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapReadyRef = useRef(false);
  const markerLibraryReadyRef = useRef(false);
  const markerClusterRef = useRef(null);
  const markerClusterFactoryRef = useRef(null);
  const markerElementsRef = useRef([]);
  const markerKeyByElementRef = useRef(new Map());
  const unclusteredMarkerElementsRef = useRef(new Set());
  const markerCacheRef = useRef(new Map());
  const activeMarkerKeysRef = useRef(new Set());
  const markerUpdateTokenRef = useRef(0);
  const fitRequestTokenRef = useRef(0);
  const cameraAnimationFrameRef = useRef(null);
  const clusterMotionRef = useRef('idle');
  const clusterMotionTimerRef = useRef(null);
  const lastClusterZoomRef = useRef(MAP_MIN_ZOOM);
  const suppressProgressiveClusterRenderRef = useRef(
    lastMountedMapTheme !== null && lastMountedMapTheme !== isDarkMode
  );
  const selectionDragRef = useRef(null);
  const selectionOpenTimerRef = useRef(null);
  const selectedObraKeysRef = useRef(new Set());
  const isClusteringEnabledRef = useRef(true);
  const isRouteModeRef = useRef(false);
  const renderUnclusteredMarkersRef = useRef(null);
  const unclusteredRenderFrameRef = useRef(null);
  const onFilteredDataRef = useRef(onFilteredData);
  const lastPublishedCount = useRef(-1);
  const didFitInitialBoundsRef = useRef(false);
  const hasRenderedMarkerSetRef = useRef(false);
  const debugLog = () => {};

  const showMapLoader = isMapLoading || !isDataReady;
  const visibleMapLoadingMessage = !isDataReady
    ? 'Obteniendo obras del servicio y preparando el mapa...'
    : mapLoadingMessage;

  const selectedObras = useMemo(() => {
    if (!selectedObraKeys.length) return [];
    const selectedKeys = new Set(selectedObraKeys);
    return filteredObras.filter((obra, index) => selectedKeys.has(getObraMarkerKey(obra, index)));
  }, [filteredObras, selectedObraKeys]);

  const renderUnclusteredMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || isClusteringEnabledRef.current) return;

    const allMarkers = markerElementsRef.current;
    const bounds = map.getBounds?.();
    const zoom = Number(map.getZoom?.()) || MAP_MIN_ZOOM;
    const maxMarkers = zoom <= 5
      ? UNCLUSTERED_MARKER_LIMITS.overview
      : zoom <= 7
        ? UNCLUSTERED_MARKER_LIMITS.regional
        : UNCLUSTERED_MARKER_LIMITS.detail;
    const visibleMarkers = bounds
      ? allMarkers.filter((marker) => {
          try {
            return marker?.position && bounds.contains(marker.position);
          } catch {
            return false;
          }
        })
      : allMarkers;
    const selectedMarkers = visibleMarkers.filter((marker) => (
      selectedObraKeysRef.current.has(markerKeyByElementRef.current.get(marker))
    ));
    const selectedSet = new Set(selectedMarkers);
    const remainingMarkers = visibleMarkers.filter((marker) => !selectedSet.has(marker));
    const remainingLimit = Math.max(0, maxMarkers - selectedMarkers.length);
    const sampledMarkers = remainingMarkers.length <= remainingLimit
      ? remainingMarkers
      : Array.from({ length: remainingLimit }, (_, index) => (
          remainingMarkers[Math.floor((index * remainingMarkers.length) / remainingLimit)]
        ));
    const nextMarkers = new Set([...selectedMarkers, ...sampledMarkers]);

    unclusteredMarkerElementsRef.current.forEach((marker) => {
      if (!nextMarkers.has(marker)) marker.map = null;
    });
    nextMarkers.forEach((marker) => {
      if (!unclusteredMarkerElementsRef.current.has(marker)) marker.map = map;
    });
    unclusteredMarkerElementsRef.current = nextMarkers;

    const nextSummary = { visible: visibleMarkers.length, shown: nextMarkers.size };
    setUnclusteredSummary((current) => (
      current?.visible === nextSummary.visible && current?.shown === nextSummary.shown
        ? current
        : nextSummary
    ));
  }, []);

  const scheduleUnclusteredMarkers = useCallback(() => {
    if (unclusteredRenderFrameRef.current !== null) return;
    unclusteredRenderFrameRef.current = window.requestAnimationFrame(() => {
      unclusteredRenderFrameRef.current = null;
      renderUnclusteredMarkersRef.current?.();
    });
  }, []);

  useEffect(() => {
    renderUnclusteredMarkersRef.current = renderUnclusteredMarkers;
  }, [renderUnclusteredMarkers]);

  useEffect(() => {
    selectedObraKeysRef.current = new Set(selectedObraKeys);
    const selectionOrder = new Map(selectedObraKeys.map((key, index) => [key, index + 1]));
    markerCacheRef.current.forEach((marker, key) => {
      const content = marker?.content;
      const isSelected = selectedObraKeysRef.current.has(key);
      content?.classList?.toggle('cl-project-marker--selected', isSelected);
      if (!content?.dataset) return;
      if (isSelected) {
        content.dataset.routeOrder = String(selectionOrder.get(key));
      } else {
        delete content.dataset.routeOrder;
      }
    });
  }, [selectedObraKeys]);

  useEffect(() => {
    isRouteModeRef.current = isRouteMode;
  }, [isRouteMode]);

  useEffect(() => {
    isClusteringEnabledRef.current = isClusteringEnabled;
    const map = mapInstanceRef.current;
    const clusterer = markerClusterRef.current;
    if (!map || !clusterer) return;

    if (isClusteringEnabled) {
      // Un MarkerClusterer que se desmonta conserva su algoritmo interno.
      // Al crear uno nuevo evitamos el estado "sin pines" al volver a activarlo.
      unclusteredMarkerElementsRef.current.forEach((marker) => { marker.map = null; });
      unclusteredMarkerElementsRef.current = new Set();
      clusterer.setMap(null);
      const createClusterer = markerClusterFactoryRef.current;
      if (createClusterer) {
        markerClusterRef.current = createClusterer(map, markerElementsRef.current);
      }
      return;
    }

    // Desmontar el clusterer libera sus marcadores de grupo. En vez de montar
    // miles de pines, el renderer sin clúster se limita a la vista actual.
    clusterer.setMap(null);
    unclusteredMarkerElementsRef.current = new Set();
    renderUnclusteredMarkers();
  }, [isClusteringEnabled, renderUnclusteredMarkers]);

  useEffect(() => {
    if (!isRouteMode && !isBoxSelecting && !isSelectionModalOpen && !selectionConfirmation) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;

      // La ficha técnica vive por encima de este modal. Al cerrarla con Escape
      // conservamos la selección para que el usuario vuelva a su ruta.
      if (document.querySelector('[aria-label="Ficha técnica de la obra"]')) return;

      if (isSelectionModalOpen) {
        setIsSelectionModalOpen(false);
      } else {
        if (selectionOpenTimerRef.current) {
          window.clearTimeout(selectionOpenTimerRef.current);
          selectionOpenTimerRef.current = null;
        }
        setSelectionConfirmation(null);
        setIsBoxSelecting(false);
        setSelectionBox(null);
        setIsRouteMode(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isBoxSelecting, isRouteMode, isSelectionModalOpen, selectionConfirmation]);

  useEffect(() => () => {
    if (selectionOpenTimerRef.current) {
      window.clearTimeout(selectionOpenTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && map.getMapTypeId() !== 'roadmap') {
      map.setMapTypeId('roadmap');
    }
  });

  useEffect(() => {
    lastMountedMapTheme = isDarkMode;

    return () => {
      const map = mapInstanceRef.current;
      const center = map?.getCenter?.();
      const lat = center?.lat?.();
      const lng = center?.lng?.();
      const zoom = Number(map?.getZoom?.());

      if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(zoom)) {
        lastMapCamera = { center: { lat, lng }, zoom };
      }
    };
  }, [isDarkMode]);

  useEffect(() => {
    onFilteredDataRef.current = onFilteredData;
  }, [onFilteredData]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const isLocked = Boolean(selectedProject);
    map.setOptions({
      draggable: !isLocked,
      scrollwheel: !isLocked,
      disableDoubleClickZoom: isLocked,
      keyboardShortcuts: !isLocked,
      gestureHandling: isLocked ? 'none' : 'auto',
      zoomControl: !isLocked,
    });
  }, [selectedProject]);


  useEffect(() => {
    const applyFilters = () => {
      if (filtros?.__preFiltered) {
        setFilteredObras(obras);
        if (onFilteredDataRef.current && lastPublishedCount.current !== obras.length) {
          lastPublishedCount.current = obras.length;
          onFilteredDataRef.current(obras);
        }
        return;
      }

      const filtrosActivos = Object.keys(filtros || {}).length
        ? filtros
        : (window.construleadsFilters || {});
      debugLog('==================== DEBUG FILTROS ====================');
      debugLog('FILTROS ACTIVOS:', filtrosActivos);

      if (obras.length) {
        debugLog('PRIMERA OBRA:', obras[0]);
        debugLog('PRIMERA OBRA KEYS:', Object.keys(obras[0]));

        debugLog('MUESTRA OBRAS:', obras.slice(0, 5).map((o) => ({
          proyecto: o.proyecto,
          region: o.region,
          estado: o.estado,
          genero: o.genero,
          subgenero: o.subgenero,
          sector: o.sector,
          tipoProyecto: o.tipoProyecto,
          tipoDesarrollo: o.tipoDesarrollo,
          etapa: o.etapa,
          inversion: o.inversion,
          superficie: o.superficie,
        })));

        debugLog(
          'REGIONES XML:',
          [...new Set(obras.map((o) => o.region))]
        );

        debugLog(
          'ESTADOS XML:',
          [...new Set(obras.map((o) => o.estado))]
        );

        debugLog(
          'GENEROS XML:',
          [...new Set(obras.map((o) => o.genero))]
        );

        debugLog(
          'SUBGENEROS XML:',
          [...new Set(obras.map((o) => o.subgenero))]
        );

        debugLog(
  'TIPO OBRA XML:',
  [...new Set(obras.map((o) => o.tipoObra))]
);

        debugLog(
          'SECTORES XML:',
          [...new Set(obras.map((o) => o.sector))]
        );

        debugLog(
          'TIPO PROYECTO XML:',
          [...new Set(obras.map((o) => o.tipoProyecto))]
        );

        debugLog(
          'TIPO DESARROLLO XML:',
          [...new Set(obras.map((o) => o.tipoDesarrollo))]
        );

        debugLog(
          'ETAPAS XML:',
          [...new Set(obras.map((o) => o.etapa))]
        );
      }

      if (!obras.length) {
        setIsMapLoading(true);
        setMapLoadingMessage('Obteniendo obras del servicio y preparando el mapa...');
        return;
      }

      let resultado = [...obras];
      debugLog('TOTAL INICIAL:', resultado.length);

// Date parse/filter helpers replaced for timestamp-based logic
const getObraTimeByFilter = (obra, selectedDateField) => {
  if (selectedDateField === 'Fecha de inicio probable') {
    return obra.fechaInicioTime || obra.fechaInicioDate?.getTime?.() || null;
  }

  if (selectedDateField === 'Fecha de término probable') {
    return obra.fechaTerminoTime || obra.fechaTerminoDate?.getTime?.() || null;
  }

  return obra.fechaPublicacionTime || obra.fechaPublicacionDate?.getTime?.() || null;
};

      // NUEVA LÓGICA DE FILTRO DE FECHA
      const selectedDateField =
  filtrosActivos.fechaConsulta ||
  filtrosActivos.selectedValues?.['Fecha de consulta'] ||
  'Fecha de publicación';
      const periodIndex = Number(filtrosActivos.periodoIndex ?? -1);
      const fechaInicioFiltro =
        filtrosActivos.fechaInicio ||
        filtrosActivos.fechaRango?.desde ||
        '';
      const fechaFinFiltro =
        filtrosActivos.fechaFin ||
        filtrosActivos.fechaRango?.hasta ||
        '';

      const diasPorPeriodo = {
        0: 0,
        1: 1,
        2: 7,
        3: 30,
        4: 90,
        5: 180,
      };

      const diasSeleccionados = diasPorPeriodo[periodIndex];

      const totalAntesFechas = resultado.length;

      if (fechaInicioFiltro && fechaFinFiltro) {
        const fechaInicio = new Date(`${fechaInicioFiltro}T00:00:00`);
        const fechaFin = new Date(`${fechaFinFiltro}T23:59:59`);

        if (!Number.isNaN(fechaInicio.getTime()) && !Number.isNaN(fechaFin.getTime())) {
          const fechaInicioTime = fechaInicio.getTime();
          const fechaFinTime = fechaFin.getTime();

          resultado = resultado.filter((obra) => {
            const fechaObraTime = getObraTimeByFilter(obra, selectedDateField);
            if (!fechaObraTime) return false;

            return fechaObraTime >= fechaInicioTime && fechaObraTime <= fechaFinTime;
          });

          debugLog('POST FECHAS:', resultado.length);
        }
      } else if (typeof diasSeleccionados === 'number' && diasSeleccionados >= 0) {
        const hoy = new Date();
        const fechaInicio = new Date(hoy);
        const fechaFin = new Date(hoy);

        if (selectedDateField === 'Fecha de publicación') {
          fechaInicio.setDate(hoy.getDate() - diasSeleccionados);
        } else {
          fechaFin.setDate(hoy.getDate() + diasSeleccionados);
        }

        fechaInicio.setHours(0, 0, 0, 0);
        fechaFin.setHours(23, 59, 59, 999);
        const fechaInicioTime = fechaInicio.getTime();
        const fechaFinTime = fechaFin.getTime();

        resultado = resultado.filter((obra) => {
          const fechaObraTime = getObraTimeByFilter(obra, selectedDateField);
          if (!fechaObraTime) return false;

          return fechaObraTime >= fechaInicioTime && fechaObraTime <= fechaFinTime;
        });

        debugLog('POST FECHAS LEGACY:', resultado.length);
      }

      debugLog('Resultado fecha:', {
        antes: totalAntesFechas,
        despues: resultado.length,
        removidos: totalAntesFechas - resultado.length,
      });

const regiones =
  filtrosActivos.regiones ||
  filtrosActivos.selectedRegiones ||
  [];

const estados =
  filtrosActivos.estados ||
  filtrosActivos.selectedEstados ||
  [];

const generos =
  filtrosActivos.generos ||
  filtrosActivos.selectedGeneros ||
  [];

const subgeneros =
  filtrosActivos.subgeneros ||
  filtrosActivos.selectedSubgeneros ||
  [];

  const tiposObraPorSubgenero = {
  Lujo: [
    'Condominios de Lujo',
    'Vivienda Unifamiliar de Lujo',
  ],

  Medio: [
    'Condominios Medio',
    'Vivienda Unifamiliar Interes Medio',
  ],

  Social: [
    'Vivienda Plurifamiliar Interes Social',
    'Vivienda Unifamiliar Interes Social',
  ],

  Comercial: [
    'Plazas Comercio, Tiendas, Autoservicio',
    'Edificios de Oficinas',
    'Bancarias, Bolsa y Corredurias',
    'Agencias Automotrices y Talleres',
    'Centrales de Carga y Distribucion',
    'Restaurantes y Salones de Eventos',
    'Mercados Publicos y Centrales de Abastos',
    'Cines y Teatros',
    'Centros de Diversiones',
    'Gasolinerias',
    'Terminales de Transporte',
    'Edificios de Estacionamiento',
  ],

  Educativo: [
    'Edificios de Educacion Superior',
    'Edificios de Educacion Basica',
    'Edificios de Educacion Media',
  ],

  Institucional: [
    'Judiciales y Bomberos',
    'Albergues, Orfanatos, Asilos y Conventos',
    'Iglesias y Templos',
    'Crematorios y Velatorios',
    'Instalaciones Deportivas',
  ],

  Salud: [
    'Centros de Rehabilitacion y Salud',
    'Clinicas, Hospitales y Centros Medicos',
  ],

  Turistico: [
    'Desarrollos Turisticos - Hoteleros',
    'Hoteles 4, 5 Estrellas, G.Turismo, Negocios',
    'Hoteles de 1, 2 y 3 Estrellas y Moteles',
  ],

  Industrial: [
    'Naves, Almacenes y Bodegas',
    'Camaras Frigorificas y Rastros',
    'Laboratorios',
    'Plantas Industriales',
    'Parques Industriales',
    'Petroleras, Petroquimicas y Refinerias',
    'Hidro + Termoelectricas y Subestaciones',
  ],

  Infraestructura: [
    'Hidro - Agropecuaria',
    'Agua Potable',
    'Drenaje y Saneamiento',
    'Telecomunicaciones',
    'Electrificacion',
    'Maritimas',
    'Aeropuertos',
    'Vias Ferreas, Tren Ligero, Metro',
    'Urbanizacion',
    'Carreteras',
    'Redes de Gas',
    'Presas',
    'Plantas de Tratamiento de Agua',
    'Puentes y Estructuras',
    'Pavimentos',
    'Tren Alta Velocidad',
  ],
};

const sectores =
  filtrosActivos.sectores ||
  filtrosActivos.selectedSectores ||
  [];

const etapas =
  filtrosActivos.etapas ||
  filtrosActivos.selectedEtapas ||
  [];

const desarrollos =
  filtrosActivos.desarrollos ||
  filtrosActivos.selectedDesarrollos ||
  [];

const tipoObra =
  filtrosActivos.tipoObra ||
  filtrosActivos.selectedTipoObra ||
  [];

debugLog('FILTRO SUBGENEROS:', subgeneros);
debugLog('FILTRO TIPO OBRA:', tipoObra);

const tiposProyecto =
  filtrosActivos.tiposProyecto ||
  filtrosActivos.selectedTiposProyecto ||
  [];
      if (regiones.length) {
        resultado = resultado.filter((o) =>
          matchesTextList(o.region, regiones)
        );
        debugLog('POST REGIONES:', resultado.length);
      }

      if (estados.length) {
        resultado = resultado.filter((o) =>
          matchesTextList(o.estado, estados)
        );
        debugLog('POST ESTADOS:', resultado.length);
      }

      if (!tipoObra.length && !subgeneros.length && generos.length) {
        resultado = resultado.filter((o) =>
          matchesTextList(o.genero, generos)
        );
        debugLog('POST GENEROS:', resultado.length);
      }

      if (tipoObra.length) {
        resultado = resultado.filter((o) =>
          matchesTextList(o.tipoObra, tipoObra)
        );
        debugLog('POST TIPO OBRA:', resultado.length);
      }

      if (desarrollos.length) {
        resultado = resultado.filter((o) =>
          matchesTextList(o.tipoDesarrollo, desarrollos)
        );
        debugLog('POST DESARROLLOS:', resultado.length);
      }

      if (etapas.length) {
        resultado = resultado.filter((o) =>
          matchesTextList(o.etapa, etapas)
        );
        debugLog('POST ETAPAS:', resultado.length);
      }

      if (!etapas.length && tiposProyecto.length) {
        debugLog('TIPOS PROYECTO FILTRO:', tiposProyecto);

        debugLog(
          'TIPOS PROYECTO EN RESULTADO:',
          [...new Set(resultado.map(o => o.tipoProyecto))]
        );

        debugLog(
  'TIPOS PROYECTO SELECCIONADOS:',
  filtros.tipoProyecto
);

debugLog(
  'TIPOS PROYECTO PRIMERAS OBRAS:',
  obras.slice(0,5).map(
    o => o.tipoProyecto
  )
);

        resultado = resultado.filter((o) =>
          matchesTextList(o.tipoProyecto, tiposProyecto)
        );

        debugLog('POST TIPO PROYECTO:', resultado.length);
      }

      if (!tipoObra.length && subgeneros.length) {
  const tiposObraPermitidos = subgeneros.flatMap(
    (sub) => tiposObraPorSubgenero[sub] || []
  );

  debugLog(
    'SUBGENEROS SELECCIONADOS:',
    subgeneros
  );

  debugLog(
    'TIPOS OBRA RESUELTOS:',
    tiposObraPermitidos
  );

  resultado = resultado.filter((o) =>
    matchesTextList(o.tipoObra, tiposObraPermitidos)
  );

  debugLog(
    'POST SUBGENEROS:',
    resultado.length
  );
}

      const investmentMinPesos = parseFilterNumber(
        filtrosActivos.investmentMin ?? filtrosActivos.inversionMin,
        0
      );
      const investmentMaxPesos = parseFilterNumber(
        filtrosActivos.investmentMax ?? filtrosActivos.inversionMax,
        null
      );
      const hasValidInvestmentRange =
        Number.isFinite(investmentMinPesos) &&
        Number.isFinite(investmentMaxPesos) &&
        investmentMaxPesos >= investmentMinPesos;

      if (hasValidInvestmentRange && investmentMinPesos > 0) {
        resultado = resultado.filter(
          (o) => o.inversion >= investmentMinPesos
        );
      }

      if (hasValidInvestmentRange && investmentMaxPesos > 0) {
        resultado = resultado.filter(
          (o) => o.inversion <= investmentMaxPesos
        );
      }

      debugLog('RANGO INVERSION FILTRO:', investmentMinPesos, investmentMaxPesos);
      debugLog('POST INVERSION:', resultado.length);
      debugLog(
        'SUPERFICIE FILTRO:',
        filtrosActivos.superficie
      );

      debugLog(
        'SUPERFICIES RESTANTES:',
        resultado.map((o) => o.superficie)
      );

      const superficieMin = parseFilterNumber(
        filtrosActivos.superficieMin ?? filtrosActivos.surfaceMin,
        null
      );
      const superficieMax = parseFilterNumber(
        filtrosActivos.superficieMax ?? filtrosActivos.surfaceMax,
        null
      );
      const hasNumericSurfaceRange =
        Number.isFinite(superficieMin) &&
        Number.isFinite(superficieMax) &&
        superficieMax >= superficieMin;

      if (hasNumericSurfaceRange) {
        resultado = resultado.filter((o) => {
          const superficie = Number(o.superficie);
          if (!Number.isFinite(superficie)) return false;
          return superficie >= superficieMin && superficie <= superficieMax;
        });
      } else if (filtrosActivos.superficie?.length) {
        resultado = resultado.filter((o) => {
          return filtrosActivos.superficie.some((rango) => {
            if (rango.includes('0 - 1,000') || rango.includes('0 - 1000')) {
              return o.superficie <= 1000;
            }

            if (rango.includes('1,000 - 5,000') || rango.includes('1000 - 5000')) {
              return o.superficie > 1000 && o.superficie <= 5000;
            }

            if (rango.includes('5,000 - 10,000') || rango.includes('5000 - 10000')) {
              return o.superficie > 5000 && o.superficie <= 10000;
            }

            if (rango.includes('> 10,000') || rango.includes('> 10000')) {
              return o.superficie > 10000;
            }

            return false;
          });
        });
        debugLog('POST SUPERFICIE:', resultado.length);
      }

      if (sectores.length) {
        resultado = resultado.filter((o) =>
          matchesTextList(o.sector, sectores)
        );
        debugLog('POST SECTORES:', resultado.length);
      }

      debugLog(
        'Filtro aplicado:',
        resultado.length,
        'de',
        obras.length
      );

      debugLog('RESULTADO FINAL:', resultado.length);

      setFilteredObras(resultado);

      if (onFilteredDataRef.current && lastPublishedCount.current !== resultado.length) {
        lastPublishedCount.current = resultado.length;
        onFilteredDataRef.current(resultado);
      }
    };

    debugLog('MAPA RECALCULANDO FILTROS');
    applyFilters();

  }, [obras, filtros]);

useEffect(() => {
    if (!isVisible) return undefined;
    let cancelled = false;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    const formatInvestment = (value) => {
      if (!value) return '0 MDP';

      const millions = value / 1000000;

      if (millions >= 1000) {
        return `${(millions / 1000).toFixed(1)} BDP`;
      }

      return `${Math.round(millions)} MDP`;
    };

    const cleanupMarkers = ({ clearCache = false } = {}) => {
      if (markerClusterRef.current) {
        markerClusterRef.current.clearMarkers();
      }

      // `clearMarkers` sólo vacía el inventario del clusterer. Cuando éste
      // está apagado, los pines viven directamente sobre el mapa y hay que
      // retirarlos también para no dejar proyectos de filtros anteriores.
      markerElementsRef.current.forEach((marker) => {
        if (marker) marker.map = null;
      });
      unclusteredMarkerElementsRef.current = new Set();
      setUnclusteredSummary(null);

      if (clearCache) {
        markerCacheRef.current.forEach((marker) => {
          if (marker) marker.map = null;
        });
        markerCacheRef.current.clear();
        markerKeyByElementRef.current.clear();
      }

      markerElementsRef.current = [];
      activeMarkerKeysRef.current = new Set();
    };

    const createClusterContent = (count) => {
      const size = count >= 50 ? 50 : count >= 10 ? 42 : 36;
      const motion = clusterMotionRef.current;
      const content = document.createElement('div');
      content.className = `cl-map-cluster${motion === 'idle' ? '' : ` cl-map-cluster--${motion}`}`;
      content.textContent = String(count);
      Object.assign(content.style, {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: '#FFFFFF',
        border: '2px solid #B8BEC7',
        boxShadow: '0 3px 10px rgba(31, 41, 55, .28)',
        color: '#24272D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Poppins, sans-serif',
        fontSize: count > 99 ? '12px' : '13px',
        fontWeight: '700',
        boxSizing: 'border-box',
      });
      return content;
    };

    const renderCluster = ({ count, position }) => new window.google.maps.marker.AdvancedMarkerElement({
      position,
      content: createClusterContent(count),
      zIndex: 1000000 + count,
    });

    const buildMarker = (obra, markerKey) => {
      if (obra.hasValidCoordinates === false) return null;

      const latNum = Number(obra.lat);
      const lonNum = Number(obra.lng);

      if (
        !Number.isFinite(latNum) ||
        !Number.isFinite(lonNum) ||
        !isCoordinateInsideMexicoMap(latNum, lonNum)
      ) {
        return null;
      }

      const markerContent = document.createElement('div');
      markerContent.setAttribute('aria-label', `Proyecto ${obra?.clave || obra?.proyecto || ''}`.trim());
      markerContent.className = 'cl-project-marker';
      markerContent.classList.toggle('cl-project-marker--selected', selectedObraKeysRef.current.has(markerKey));
      if (selectedObraKeysRef.current.has(markerKey)) {
        markerContent.dataset.routeOrder = String(
          [...selectedObraKeysRef.current].indexOf(markerKey) + 1
        );
      }
      markerContent.innerHTML = `
        <svg width="30" height="38" viewBox="0 0 30 38" aria-hidden="true" focusable="false">
          <path
            d="M15 1.5C7.82 1.5 2 7.18 2 14.18c0 9.22 10.6 20.01 12.15 21.54a1.2 1.2 0 0 0 1.7 0C17.4 34.19 28 23.4 28 14.18 28 7.18 22.18 1.5 15 1.5Z"
            fill="#FF5A36"
            stroke="#FFFFFF"
            stroke-width="2.5"
          />
          <circle cx="15" cy="14" r="5.25" fill="#FFFFFF" />
          <circle cx="15" cy="14" r="2.25" fill="#FF5A36" />
        </svg>`;
      Object.assign(markerContent.style, {
        width: '30px',
        height: '38px',
        display: 'block',
        position: 'relative',
        filter: 'drop-shadow(0 2px 3px rgba(83, 35, 21, 0.34))',
        transform: 'translateY(1px)',
      });

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: latNum, lng: lonNum },
        content: markerContent,
      });

      marker.addListener('click', (event) => {
        if (isRouteModeRef.current) {
          setSelectedObraKeys((current) => {
            const isSelected = current.includes(markerKey);
            const nextSelection = isSelected
              ? current.filter((key) => key !== markerKey)
              : [...current, markerKey];
            selectedObraKeysRef.current = new Set(nextSelection);
            return nextSelection;
          });
          setSelectionFeedback('');
          return;
        }

        const clickedPosition = event?.latLng || marker.position;
        const clickedLat = typeof clickedPosition?.lat === 'function' ? clickedPosition.lat() : clickedPosition?.lat ?? latNum;
        const clickedLng = typeof clickedPosition?.lng === 'function' ? clickedPosition.lng() : clickedPosition?.lng ?? lonNum;
        const project = {
          clave: obra.clave,
          proyecto: obra.proyecto,
          inversion: formatInvestment(obra.inversion),
          superficie: `${Number(obra.superficie || 0).toLocaleString()} m²`,
          genero: getSingleTaxonomyValue(obra.genero),
          estado: obra.estado,
          subgenero: getSingleTaxonomyValue(obra.subgenero),
          fechaInicio: obra.fechaInicioDate || obra.fechaInicio,
          fechaFin: obra.fechaTerminoDate || obra.fechaFinDate || obra.fechaTermino || obra.fechaFin,
          lat: clickedLat,
          lng: clickedLng,
        };
        selectedProjectRef.current = project;
        setPopupPosition(null);
        setSelectedProject(project);
        const activeMap = mapInstanceRef.current;
        const targetLatLng = new window.google.maps.LatLng(clickedLat, clickedLng);

        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!mapRef.current || !popupCardRef.current) return;

          const mapWidth = mapRef.current.clientWidth;
          const mapHeight = mapRef.current.clientHeight;
          const cardWidth = popupCardRef.current.offsetWidth;
          const cardHeight = popupCardRef.current.offsetHeight;
          const padding = 12;
          const pointerSize = 16;
          const pointerGap = 4;
          const left = Math.max(
            padding,
            Math.min((mapWidth - cardWidth) / 2, mapWidth - cardWidth - padding)
          );
          const top = Math.max(
            padding,
            Math.min((mapHeight - cardHeight) / 2, mapHeight - cardHeight - padding)
          );
          const markerPointY = Math.min(
            mapHeight - padding,
            top + cardHeight + pointerSize / 2 + pointerGap
          );

          setPopupPosition({
            left,
            top,
            placement: 'above',
            pointerLeft: Math.max(22, Math.min(cardWidth / 2 - pointerSize / 2, cardWidth - 38)),
          });

          const projection = activeMap?.getProjection();
          const zoom = activeMap?.getZoom();
          if (activeMap && projection && Number.isFinite(zoom)) {
            const worldPoint = projection.fromLatLngToPoint(targetLatLng);
            const worldOffsetY = (mapHeight / 2 - markerPointY) / (2 ** zoom);
            activeMap.panTo(projection.fromPointToLatLng(
              new window.google.maps.Point(worldPoint.x, worldPoint.y + worldOffsetY)
            ));
          } else {
            activeMap?.panTo(targetLatLng);
          }
        }));
      });

      return marker;
    };


    const createMap = async () => {
      if (mapInstanceRef.current) return;
      if (!globalThis.__construleadsGoogleMapsConfigured) {
        setOptions({ apiKey, version: 'weekly' });
        globalThis.__construleadsGoogleMapsConfigured = true;
      }

      const { Map } = await importLibrary('maps');

      if (cancelled || !mapRef.current) return;

      const initialCamera = lastMapCamera;

      const map = new Map(mapRef.current, {
        center: initialCamera?.center || MAP_DEFAULT_CENTER,
        zoom: initialCamera?.zoom || 5,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
        restriction: {
          latLngBounds: MEXICO_MAP_BOUNDS,
          strictBounds: false,
        },
        mapTypeId: 'roadmap',
        mapId: 'DEMO_MAP_ID',
        // Google aplica un estilo vectorial oscuro real: caminos, agua,
        // etiquetas y controles conservan contraste sin usar un filtro CSS.
        colorScheme: isDarkMode ? 'DARK' : 'LIGHT',
        isFractionalZoomEnabled: true,
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false,
      });

      // El mapId anterior podía imponer el tipo configurado en Google Cloud.
      // Forzamos el mapa estándar también sobre la instancia ya creada.
      map.setMapTypeId('roadmap');
      mapInstanceRef.current = map;
      lastClusterZoomRef.current = Number(map.getZoom()) || MAP_MIN_ZOOM;
      const createMarkerClusterer = (clusterMap, markers = []) => new MarkerClusterer({
        map: clusterMap,
        markers,
        algorithm: new SuperClusterAlgorithm({
          radius: 80,
          maxZoom: 17,
        }),
        renderer: {
          render: renderCluster,
        },
        onClusterClick: (_event, cluster, clusterMap) => {
          selectedProjectRef.current = null;
          setSelectedProject(null);
          setPopupPosition(null);

          const currentZoom = Number(clusterMap.getZoom()) || 5;
          const targetZoom = Math.min(currentZoom + 2, 18);
          clusterMap.panTo(cluster.position);

          window.setTimeout(() => {
            clusterMap.setZoom(Math.min(currentZoom + 1, targetZoom));
          }, 140);
          window.setTimeout(() => {
            clusterMap.setZoom(targetZoom);
          }, 320);
        },
      });
      markerClusterFactoryRef.current = createMarkerClusterer;
      markerClusterRef.current = createMarkerClusterer(
        isClusteringEnabledRef.current ? map : null,
        []
      );
      mapReadyRef.current = true;

      requestAnimationFrame(() => {
        if (window.google?.maps?.event) {
          window.google.maps.event.trigger(map, 'resize');
        }
        map.setCenter(initialCamera?.center || MAP_DEFAULT_CENTER);
      });

      map.addListener('zoom_changed', () => {
        const nextZoom = Number(map.getZoom());
        const previousZoom = lastClusterZoomRef.current;
        if (!Number.isFinite(nextZoom) || Math.abs(nextZoom - previousZoom) < 0.05) return;

        // El renderer crea los nuevos grupos al quedar estable el zoom. Esta
        // dirección le indica si deben "abrirse" o "concentrarse" primero.
        clusterMotionRef.current = nextZoom > previousZoom ? 'split' : 'merge';
        lastClusterZoomRef.current = nextZoom;

        if (clusterMotionTimerRef.current) {
          window.clearTimeout(clusterMotionTimerRef.current);
        }
        clusterMotionTimerRef.current = window.setTimeout(() => {
          clusterMotionRef.current = 'idle';
          clusterMotionTimerRef.current = null;
        }, CLUSTER_MOTION_DURATION + 160);
      });

      map.addListener('idle', () => {
        const zoom = Number(map.getZoom());
        if (!Number.isFinite(zoom) || zoom < MAP_MIN_ZOOM) {
          map.setZoom(MAP_MIN_ZOOM);
        }

        const center = map.getCenter();
        const lat = center?.lat();
        const lng = center?.lng();
        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          !isCoordinateInsideMexicoMap(lat, lng)
        ) {
          map.setCenter(MAP_DEFAULT_CENTER);
        }

        if (!isClusteringEnabledRef.current) {
          scheduleUnclusteredMarkers();
        }
      });

      map.addListener('click', () => {
        selectedProjectRef.current = null;
        setSelectedProject(null);
        setPopupPosition(null);
      });
    };

    const updateMarkers = async () => {
      if (!mapInstanceRef.current || !mapReadyRef.current) return;

      setIsMapLoading(true);
      setMarkerProgress({ loaded: 0, total: filteredObras.length });
      setMapLoadingMessage(
        filteredObras.length
          ? `Preparando ${filteredObras.length.toLocaleString()} obras en el mapa...`
          : 'Preparando mapa...'
      );

      const updateToken = markerUpdateTokenRef.current + 1;
      markerUpdateTokenRef.current = updateToken;
      if (cameraAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(cameraAnimationFrameRef.current);
        cameraAnimationFrameRef.current = null;
      }

      selectedProjectRef.current = null;
      setSelectedProject(null);
      setPopupPosition(null);

      if (!filteredObras.length) {
        cleanupMarkers();

        if (!isDataReady) {
          setMapLoadingMessage('Obteniendo obras del servicio y preparando el mapa...');
          setIsMapLoading(true);
          return;
        }

        setMapLoadingMessage('No hay obras para mostrar con los filtros actuales.');
        setIsMapLoading(false);
        return;
      }

      if (!markerLibraryReadyRef.current) {
        await importLibrary('marker');
        if (cancelled || !mapInstanceRef.current) return;
        markerLibraryReadyRef.current = true;
      }

      const startedAt = DEBUG_MAPA ? performance.now() : 0;
      const markers = [];
      const markerKeys = [];
      let builtMarkers = 0;
      const firstMarkerBatchSize = Math.min(48, filteredObras.length);
      const markerBatchSize = 400;
      // Durante el cambio claro/oscuro esperamos a tener todo el conjunto.
      // Así los clústeres no se reacomodan por lotes y el único cambio
      // perceptible es el color del mapa.
      const suppressProgressiveClusterRender = suppressProgressiveClusterRenderRef.current;
      let nextBatchEnd = firstMarkerBatchSize;
      let markerBatch = [];
      let renderedPreview = false;
      let pendingClusterRender = false;

      for (let index = 0; index < filteredObras.length; index += 1) {
        if (markerUpdateTokenRef.current !== updateToken) return;

        const obra = filteredObras[index];
        const key = getObraMarkerKey(obra, index);
        let marker = markerCacheRef.current.get(key);

        if (!marker) {
          marker = buildMarker(obra, key);
          if (marker) {
            markerCacheRef.current.set(key, marker);
            builtMarkers += 1;
          }
        }

        if (marker) {
          markers.push(marker);
          markerKeys.push(key);
          markerKeyByElementRef.current.set(marker, key);
          if (!activeMarkerKeysRef.current.has(key)) {
            markerBatch.push(marker);
          }
        }

        const completesBatch =
          index + 1 >= nextBatchEnd || index === filteredObras.length - 1;

        if (completesBatch) {
          if (markerBatch.length && markerClusterRef.current) {
            markerClusterRef.current.addMarkers(markerBatch, true);
            if (
              isClusteringEnabledRef.current &&
              !suppressProgressiveClusterRender &&
              !renderedPreview
            ) {
              markerClusterRef.current.render();
              renderedPreview = true;
            } else if (isClusteringEnabledRef.current) {
              pendingClusterRender = true;
            }
            markerBatch = [];
          }
          markerElementsRef.current = [...markers];
          setMarkerProgress({ loaded: index + 1, total: filteredObras.length });
          setMapLoadingMessage(
            `${(index + 1).toLocaleString()} de ${filteredObras.length.toLocaleString()} proyectos`
          );
          nextBatchEnd += markerBatchSize;
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      }

      if (markerUpdateTokenRef.current !== updateToken) return;

      const nextMarkerKeys = new Set(markerKeys);
      const markerSetChanged =
        nextMarkerKeys.size !== activeMarkerKeysRef.current.size ||
        markerKeys.some((key) => !activeMarkerKeysRef.current.has(key));
      const removedMarkers = [];
      activeMarkerKeysRef.current.forEach((key) => {
        if (nextMarkerKeys.has(key)) return;
        const marker = markerCacheRef.current.get(key);
        if (marker) removedMarkers.push(marker);
      });

      if (removedMarkers.length && markerClusterRef.current) {
        markerClusterRef.current.removeMarkers(removedMarkers, true);
        pendingClusterRender = isClusteringEnabledRef.current;
      }

      if (markerBatch.length && markerClusterRef.current) {
        markerClusterRef.current.addMarkers(markerBatch, true);
        pendingClusterRender = isClusteringEnabledRef.current;
      }

      if (
        isClusteringEnabledRef.current &&
        markerClusterRef.current &&
        (pendingClusterRender || !renderedPreview)
      ) {
        markerClusterRef.current.render();
      }
      suppressProgressiveClusterRenderRef.current = false;

      if (markerUpdateTokenRef.current === updateToken) {
        setMarkerProgress({
          loaded: filteredObras.length,
          total: filteredObras.length,
        });
        setIsMapLoading(false);
      }

      markerElementsRef.current = markers;
      activeMarkerKeysRef.current = nextMarkerKeys;
      if (!isClusteringEnabledRef.current) {
        renderUnclusteredMarkersRef.current?.();
      }

      if (
        (hasRenderedMarkerSetRef.current || fitInitialBounds) &&
        markerSetChanged &&
        markers.length &&
        mapInstanceRef.current
      ) {
        const fitRequestToken = fitRequestTokenRef.current + 1;
        fitRequestTokenRef.current = fitRequestToken;
        const validPositions = filteredObras.reduce((positions, obra) => {
          const lat = Number(obra?.lat);
          const lng = Number(obra?.lng);
          if (Number.isFinite(lat) && Number.isFinite(lng) && isCoordinateInsideMexicoMap(lat, lng)) {
            positions.push({ lat, lng });
          }
          return positions;
        }, []);
        await new Promise((resolve) => window.setTimeout(resolve, 220));
        if (
          markerUpdateTokenRef.current !== updateToken ||
          fitRequestTokenRef.current !== fitRequestToken ||
          !mapRef.current ||
          !mapInstanceRef.current
        ) return;

        const camera = getCameraForPositions(
          validPositions,
          mapRef.current.clientWidth,
          mapRef.current.clientHeight,
          FILTER_FIT_PADDING
        );
        if (camera) {
          const map = mapInstanceRef.current;
          const startCenter = map.getCenter();
          const startZoom = Number(map.getZoom());
          const from = {
            lat: Number(startCenter?.lat()),
            lng: Number(startCenter?.lng()),
            zoom: Number.isFinite(startZoom) ? startZoom : MAP_MIN_ZOOM,
          };
          const distance = Math.hypot(camera.center.lat - from.lat, camera.center.lng - from.lng);
          const zoomDistance = Math.abs(camera.zoom - from.zoom);
          const duration = Math.min(950, Math.max(560, 500 + distance * 12 + zoomDistance * 45));
          const startedAt = performance.now();
          const easeInOutCubic = (progress) => progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - ((-2 * progress + 2) ** 3) / 2;

          const animateCamera = (now) => {
            if (
              markerUpdateTokenRef.current !== updateToken ||
              fitRequestTokenRef.current !== fitRequestToken ||
              !mapInstanceRef.current
            ) {
              cameraAnimationFrameRef.current = null;
              return;
            }

            const progress = Math.min(1, (now - startedAt) / duration);
            const eased = easeInOutCubic(progress);
            mapInstanceRef.current.moveCamera({
              center: {
                lat: from.lat + (camera.center.lat - from.lat) * eased,
                lng: from.lng + (camera.center.lng - from.lng) * eased,
              },
              zoom: from.zoom + (camera.zoom - from.zoom) * eased,
            });

            if (progress < 1) {
              cameraAnimationFrameRef.current = window.requestAnimationFrame(animateCamera);
            } else {
              mapInstanceRef.current.moveCamera(camera);
              cameraAnimationFrameRef.current = null;
            }
          };

          cameraAnimationFrameRef.current = window.requestAnimationFrame(animateCamera);
        }
      }
      hasRenderedMarkerSetRef.current = true;

      if (AUTO_FIT_INITIAL_BOUNDS && !didFitInitialBoundsRef.current && markers.length && mapInstanceRef.current) {
        const bounds = new window.google.maps.LatLngBounds();
        markers.forEach((marker, index) => {
          if (index % 4 !== 0) return;
          const position = marker.position;
          if (position) bounds.extend(position);
        });
        mapInstanceRef.current.fitBounds(bounds);
        didFitInitialBoundsRef.current = true;
      }

      debugLog('[Construleads][Mapa] updateMarkers terminado:', {
        obrasFiltradas: filteredObras.length,
        markers: markers.length,
        nuevos: builtMarkers,
        reutilizados: markers.length - builtMarkers,
        cache: markerCacheRef.current.size,
        ms: DEBUG_MAPA ? Math.round(performance.now() - startedAt) : undefined,
      });
    };

    const updateTimer = window.setTimeout(async () => {
      try {
        setIsMapLoading(true);
        setMapLoadingMessage('Cargando mapa y preparando obras...');
        await createMap();
        if (cancelled) return;
        if (window.google?.maps?.event && mapInstanceRef.current) {
          window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
        }
        await updateMarkers();
      } catch {
        setMapLoadingMessage('No se pudo cargar el mapa. Intenta recargar la página.');
        setIsMapLoading(false);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(updateTimer);
      if (cameraAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(cameraAnimationFrameRef.current);
        cameraAnimationFrameRef.current = null;
      }
      if (clusterMotionTimerRef.current) {
        window.clearTimeout(clusterMotionTimerRef.current);
        clusterMotionTimerRef.current = null;
      }
      if (unclusteredRenderFrameRef.current !== null) {
        window.cancelAnimationFrame(unclusteredRenderFrameRef.current);
        unclusteredRenderFrameRef.current = null;
      }
      markerUpdateTokenRef.current += 1;
      fitRequestTokenRef.current += 1;
    };
  }, [filteredObras, fitInitialBounds, isDataReady, isVisible, isDarkMode, scheduleUnclusteredMarkers]);

  const clearZoneSelection = () => {
    if (selectionOpenTimerRef.current) {
      window.clearTimeout(selectionOpenTimerRef.current);
      selectionOpenTimerRef.current = null;
    }
    setSelectionConfirmation(null);
    selectedObraKeysRef.current = new Set();
    setSelectedObraKeys([]);
    setIsSelectionModalOpen(false);
    setSelectionFeedback('');
  };

  const toggleRouteMode = () => {
    if (selectionOpenTimerRef.current) {
      window.clearTimeout(selectionOpenTimerRef.current);
      selectionOpenTimerRef.current = null;
    }
    selectedProjectRef.current = null;
    setSelectedProject(null);
    setPopupPosition(null);
    setSelectionBox(null);
    setSelectionConfirmation(null);
    setSelectionFeedback('');
    const nextRouteMode = !isRouteMode;
    isRouteModeRef.current = nextRouteMode;
    setIsRouteMode(nextRouteMode);
    // El flujo principal de "Armar ruta" conserva la selección por cuadro:
    // al activarlo el cursor queda listo para dibujar sin un segundo clic.
    setIsBoxSelecting(nextRouteMode);
  };

  const toggleAreaSelection = () => {
    if (selectionOpenTimerRef.current) {
      window.clearTimeout(selectionOpenTimerRef.current);
      selectionOpenTimerRef.current = null;
    }
    selectedProjectRef.current = null;
    setSelectedProject(null);
    setPopupPosition(null);
    setSelectionBox(null);
    setSelectionConfirmation(null);
    setSelectionFeedback('');
    if (!isRouteModeRef.current) {
      isRouteModeRef.current = true;
      setIsRouteMode(true);
    }
    setIsBoxSelecting((current) => !current);
  };

  const getPointerPosition = (event) => {
    const selectionLayer = event.currentTarget;
    const mapElement = mapRef.current;
    const layerRect = selectionLayer?.getBoundingClientRect?.();
    const mapRect = mapElement?.getBoundingClientRect?.();
    if (!layerRect || !mapRect || !selectionLayer || !mapElement) return null;

    // La interfaz puede escalarse al 80%. getBoundingClientRect() devuelve
    // píxeles ya escalados, mientras que left/top del recuadro usan píxeles
    // CSS sin escalar. Normalizamos ambos sistemas para que el box siga al
    // cursor y el cálculo geográfico use el tamaño real del mapa.
    const toAxisPosition = (clientValue, start, renderedSize, cssSize) => {
      const relative = Math.max(0, Math.min(renderedSize, clientValue - start));
      return renderedSize > 0 ? (relative / renderedSize) * cssSize : 0;
    };

    const layerWidth = selectionLayer.clientWidth || selectionLayer.offsetWidth;
    const layerHeight = selectionLayer.clientHeight || selectionLayer.offsetHeight;
    const mapWidth = mapElement.clientWidth || mapElement.offsetWidth;
    const mapHeight = mapElement.clientHeight || mapElement.offsetHeight;

    return {
      x: toAxisPosition(event.clientX, layerRect.left, layerRect.width, layerWidth),
      y: toAxisPosition(event.clientY, layerRect.top, layerRect.height, layerHeight),
      mapX: toAxisPosition(event.clientX, mapRect.left, mapRect.width, mapWidth),
      mapY: toAxisPosition(event.clientY, mapRect.top, mapRect.height, mapHeight),
      width: layerWidth,
      height: layerHeight,
      mapWidth,
      mapHeight,
    };
  };

  const handleBoxPointerDown = (event) => {
    const point = getPointerPosition(event);
    if (!point) return;
    event.preventDefault();
    if (selectionOpenTimerRef.current) {
      window.clearTimeout(selectionOpenTimerRef.current);
      selectionOpenTimerRef.current = null;
    }
    setSelectionConfirmation(null);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectionFeedback('');
    selectionDragRef.current = {
      startX: point.x,
      startY: point.y,
      startMapX: point.mapX,
      startMapY: point.mapY,
      width: point.width,
      height: point.height,
      mapWidth: point.mapWidth,
      mapHeight: point.mapHeight,
    };
    setSelectionBox({ left: point.x, top: point.y, width: 0, height: 0 });
  };

  const handleBoxPointerMove = (event) => {
    const drag = selectionDragRef.current;
    const point = getPointerPosition(event);
    if (!drag || !point) return;
    const left = Math.min(drag.startX, point.x);
    const top = Math.min(drag.startY, point.y);
    setSelectionBox({
      left,
      top,
      width: Math.abs(point.x - drag.startX),
      height: Math.abs(point.y - drag.startY),
    });
  };

  const handleBoxPointerUp = (event) => {
    const drag = selectionDragRef.current;
    const point = getPointerPosition(event);
    selectionDragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setSelectionBox(null);
    setIsBoxSelecting(false);
    if (!drag || !point || Math.abs(point.x - drag.startX) < 10 || Math.abs(point.y - drag.startY) < 10) return;

    const finalSelectionBox = {
      left: Math.min(drag.startX, point.x),
      top: Math.min(drag.startY, point.y),
      width: Math.abs(point.x - drag.startX),
      height: Math.abs(point.y - drag.startY),
    };

    const map = mapInstanceRef.current;
    const projection = map?.getProjection?.();
    const center = map?.getCenter?.();
    const zoom = Number(map?.getZoom?.());
    if (!projection || !center || !Number.isFinite(zoom) || !window.google?.maps?.Point) return;

    const centerPoint = projection.fromLatLngToPoint(center);
    // `fromLatLngToPoint` trabaja sobre el world-point base de 256 px.
    // Para convertir un desplazamiento de pantalla al mismo sistema sólo se
    // divide entre la escala del zoom. Agregar 256 aquí reducía el rectángulo
    // geográfico 256 veces y por eso una zona que visualmente contenía pines
    // terminaba sin proyectos seleccionados.
    const zoomScale = 2 ** zoom;
    const pointToLatLng = (x, y) => {
      const worldPoint = new window.google.maps.Point(
        centerPoint.x + (x - drag.mapWidth / 2) / zoomScale,
        centerPoint.y + (y - drag.mapHeight / 2) / zoomScale
      );
      const latLng = projection.fromPointToLatLng(worldPoint);
      return { lat: latLng.lat(), lng: latLng.lng() };
    };

    const first = pointToLatLng(drag.startMapX, drag.startMapY);
    const last = pointToLatLng(point.mapX, point.mapY);
    const north = Math.max(first.lat, last.lat);
    const south = Math.min(first.lat, last.lat);
    const east = Math.max(first.lng, last.lng);
    const west = Math.min(first.lng, last.lng);
    const zoneSelection = filteredObras.reduce((keys, obra, index) => {
      const coordinate = getObraCoordinates(obra);
      if (
        coordinate &&
        coordinate.lat <= north && coordinate.lat >= south &&
        coordinate.lng <= east && coordinate.lng >= west
      ) {
        keys.push(getObraMarkerKey(obra, index));
      }
      return keys;
    }, []);

    if (zoneSelection.length) {
      const nextSelection = [...new Set([...selectedObraKeysRef.current, ...zoneSelection])];
      selectedObraKeysRef.current = new Set(nextSelection);
      setSelectedObraKeys(nextSelection);
      setSelectionFeedback('');
      setSelectionConfirmation({
        ...finalSelectionBox,
        count: zoneSelection.length,
      });
      selectionOpenTimerRef.current = window.setTimeout(() => {
        selectionOpenTimerRef.current = null;
        setSelectionConfirmation(null);
        setIsSelectionModalOpen(true);
      }, 300);
      return;
    }

    setSelectionFeedback('No encontramos proyectos dentro de esta zona. Intenta ampliar el área.');
  };

  return (
    <Box
      bg="var(--cl-surface)"
      h="100%"
      minH="0"
      borderRadius="12px"
      p={0}
      border="1px solid var(--cl-border)"
      overflow="hidden"
    >
      <style>{`
        .cl-map-cluster {
          transform-origin: center;
          will-change: transform, opacity;
        }
        .cl-map-cluster--split {
          animation: cl-map-cluster-split ${CLUSTER_MOTION_DURATION}ms cubic-bezier(.16, 1, .3, 1) both;
        }
        .cl-map-cluster--merge {
          animation: cl-map-cluster-merge ${CLUSTER_MOTION_DURATION}ms cubic-bezier(.22, .8, .32, 1) both;
        }
        @keyframes cl-map-cluster-split {
          0% { opacity: 0; transform: scale(.42); filter: blur(1px); }
          68% { opacity: 1; transform: scale(1.08); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes cl-map-cluster-merge {
          0% { opacity: 0; transform: scale(.68); filter: blur(.7px); }
          72% { opacity: 1; transform: scale(1.05); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cl-map-cluster--split,
          .cl-map-cluster--merge { animation: none; }
        }
        .cl-project-marker {
          transform-origin: 50% 100%;
          transition: transform 150ms ease, filter 150ms ease;
        }
        .cl-project-marker--selected {
          transform: translateY(1px) scale(1.18) !important;
          filter: drop-shadow(0 4px 9px rgba(24, 71, 184, .58)) !important;
        }
        .cl-project-marker--selected svg path { fill: #1847B8; stroke: #FFFFFF; }
        .cl-project-marker--selected svg circle:last-child { fill: #1847B8; }
        .cl-project-marker--selected::after {
          content: attr(data-route-order);
          position: absolute;
          top: -7px;
          right: -7px;
          display: grid;
          place-items: center;
          width: 18px;
          height: 18px;
          border: 2px solid #FFFFFF;
          border-radius: 999px;
          background: #FF653F;
          box-shadow: 0 2px 5px rgba(0,0,0,.26);
          color: #FFFFFF;
          font: 700 9px/1 Poppins, sans-serif;
        }
      `}</style>
      <Box
        h="100%"
        minH="0"
        borderRadius="12px"
        overflow="hidden"
        border="0"
        p={0}
      >
        <Box position="relative" h="100%" minH="0" w="100%">
          <style>{`
            @keyframes cl-map-zone-confirm-box {
              0% { opacity: .95; transform: scale(1); }
              65% { opacity: 1; transform: scale(1.012); }
              100% { opacity: 0; transform: scale(1.025); }
            }
            @keyframes cl-map-zone-confirm-badge {
              0% { opacity: 0; transform: translate(-50%, -50%) scale(.92); }
              22% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
              74% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
              100% { opacity: 0; transform: translate(-50%, -50%) scale(.98); }
            }
            @media (prefers-reduced-motion: reduce) {
              .cl-map-zone-confirm-box, .cl-map-zone-confirm-badge { animation-duration: 1ms !important; }
            }
          `}</style>
          <Box
            ref={mapRef}
            position="absolute"
            inset={0}
            h="100%"
            minH="0"
            w="100%"
          />

          <Flex
            position="absolute"
            left="50%"
            bottom={4}
            transform="translateX(-50%)"
            zIndex={35}
            maxW="calc(100% - 24px)"
            bg="var(--cl-surface)"
            border="1px solid var(--cl-border)"
            borderRadius="14px"
            p={1.5}
            gap={1}
            boxShadow="0 14px 34px rgba(0,0,0,.22)"
            align="center"
            aria-label="Herramientas del mapa"
          >
            <Button
              h="42px"
              px={3}
              variant="ghost"
              borderRadius="10px"
              color="var(--cl-text-strong)"
              _hover={{ bg: 'var(--cl-hover)' }}
              onClick={() => setIsClusteringEnabled((current) => !current)}
              role="switch"
              aria-checked={isClusteringEnabled}
              aria-label={`Clústeres ${isClusteringEnabled ? 'activados' : 'desactivados'}`}
              title={isClusteringEnabled
                ? 'Agrupa los proyectos cercanos'
                : 'Mostramos una cantidad segura de pines de la vista. Acerca el mapa para ver más.'}
            >
              <Flex align="center" gap={2.5}>
                <Box textAlign="left">
                  <Text fontSize="11px" fontWeight="700" lineHeight="1.15">Clústeres</Text>
                  <Text fontSize="9px" color="var(--cl-text-muted)" lineHeight="1.25">
                    {isClusteringEnabled
                      ? 'Agrupar puntos'
                      : unclusteredSummary
                        ? unclusteredSummary.visible > unclusteredSummary.shown
                          ? `${unclusteredSummary.shown.toLocaleString('es-MX')} de ${unclusteredSummary.visible.toLocaleString('es-MX')} puntos`
                          : 'Puntos de la vista'
                        : 'Preparando puntos'}
                  </Text>
                </Box>
                <Flex
                  w="30px"
                  h="18px"
                  p="2px"
                  borderRadius="full"
                  bg={isClusteringEnabled ? '#FF653F' : 'var(--cl-border)'}
                  transition="background 180ms ease"
                  align="center"
                >
                  <Box
                    w="14px"
                    h="14px"
                    borderRadius="full"
                    bg="white"
                    boxShadow="0 1px 3px rgba(0,0,0,.22)"
                    transform={isClusteringEnabled ? 'translateX(12px)' : 'translateX(0)'}
                    transition="transform 180ms ease"
                  />
                </Flex>
              </Flex>
            </Button>

            <Box w="1px" h="26px" bg="var(--cl-border)" flexShrink={0} />

            <Button
              h="42px"
              px={3}
              borderRadius="10px"
              bg={isRouteMode ? '#FF653F' : 'var(--cl-surface-muted)'}
              color={isRouteMode ? 'white' : 'var(--cl-text-strong)'}
              border={isRouteMode ? '1px solid #FF653F' : '1px solid var(--cl-border)'}
              _hover={{ bg: isRouteMode ? '#D94E2D' : 'var(--cl-hover)' }}
              fontSize="12px"
              fontWeight="700"
              leftIcon={<FiNavigation size={15} />}
              onClick={toggleRouteMode}
              aria-pressed={isRouteMode}
            >
              {isRouteMode ? 'Editando ruta' : 'Armar ruta'}
            </Button>

            {isRouteMode && (
              <Button
                aria-label={isBoxSelecting ? 'Cancelar selección por zona' : 'Seleccionar proyectos por zona'}
                title={isBoxSelecting ? 'Cancelar selección por zona' : 'Seleccionar por zona'}
                h="42px"
                minW="42px"
                w="42px"
                p={0}
                borderRadius="10px"
                bg={isBoxSelecting ? '#FFF0EA' : 'transparent'}
                color={isBoxSelecting ? '#D94E2D' : 'var(--cl-text-muted)'}
                _hover={{ bg: isBoxSelecting ? '#FFE2D8' : 'var(--cl-hover)', color: '#D94E2D' }}
                onClick={toggleAreaSelection}
              >
                <FiMaximize size={16} />
              </Button>
            )}

            {selectedObras.length > 0 && (
              <>
                <Box w="1px" h="26px" bg="var(--cl-border)" flexShrink={0} />
                <Button
                  h="42px"
                  px={3}
                  bg="var(--cl-orange-soft)"
                  color="#D94E2D"
                  borderRadius="10px"
                  _hover={{ bg: '#FFE2D8' }}
                  fontSize="11px"
                  fontWeight="700"
                  leftIcon={<FiCheckSquare size={14} />}
                  onClick={() => setIsSelectionModalOpen(true)}
                >
                  {selectedObras.length.toLocaleString('es-MX')} en ruta
                </Button>
                <Button
                  aria-label="Limpiar ruta"
                  title="Limpiar ruta"
                  h="42px"
                  minW="36px"
                  w="36px"
                  p={0}
                  borderRadius="10px"
                  bg="transparent"
                  color="var(--cl-text-muted)"
                  _hover={{ bg: 'var(--cl-hover)', color: 'var(--cl-text-strong)' }}
                  onClick={clearZoneSelection}
                >
                  <FiTrash2 size={14} />
                </Button>
              </>
            )}
          </Flex>

          {isRouteMode && !isBoxSelecting && (
            <Flex
              position="absolute"
              left="50%"
              bottom="78px"
              transform="translateX(-50%)"
              zIndex={34}
              maxW="calc(100% - 32px)"
              px={3}
              py={1.5}
              gap={2}
              align="center"
              bg="rgba(18, 22, 32, .9)"
              color="white"
              borderRadius="full"
              boxShadow="0 8px 22px rgba(0,0,0,.22)"
              pointerEvents="none"
            >
              <FiCheckSquare size={13} color="#FF9C83" aria-hidden="true" />
              <Text fontSize="10px" fontWeight="600" whiteSpace="nowrap">
                Haz clic en los proyectos que quieras incluir
              </Text>
            </Flex>
          )}

          {selectionFeedback && !isBoxSelecting && (
            <Flex
              position="absolute"
              top="52px"
              left={3}
              zIndex={35}
              align="center"
              gap={2}
              maxW="min(360px, calc(100% - 24px))"
              px={3}
              py={2}
              bg="var(--cl-surface)"
              border="1px solid var(--cl-border)"
              borderRadius="9px"
              boxShadow="0 8px 22px rgba(0,0,0,.16)"
            >
              <Text fontSize="11px" color="var(--cl-text-muted)" lineHeight="1.35">
                {selectionFeedback}
              </Text>
              <Button
                aria-label="Cerrar mensaje"
                variant="ghost"
                minW="24px"
                w="24px"
                h="24px"
                p={0}
                color="var(--cl-text-muted)"
                _hover={{ bg: 'var(--cl-hover)', color: 'var(--cl-text-strong)' }}
                onClick={() => setSelectionFeedback('')}
              >
                <FiX size={14} />
              </Button>
            </Flex>
          )}

          {selectionConfirmation && (
            <Box position="absolute" inset={0} zIndex={32} pointerEvents="none" aria-live="polite">
              <Box
                className="cl-map-zone-confirm-box"
                position="absolute"
                left={`${selectionConfirmation.left}px`}
                top={`${selectionConfirmation.top}px`}
                w={`${selectionConfirmation.width}px`}
                h={`${selectionConfirmation.height}px`}
                bg="rgba(255, 101, 63, .16)"
                border="2px solid #FF653F"
                borderRadius="5px"
                transformOrigin="center"
                animation="cl-map-zone-confirm-box 300ms ease-out both"
              />
              <Flex
                className="cl-map-zone-confirm-badge"
                position="absolute"
                left={`${selectionConfirmation.left + selectionConfirmation.width / 2}px`}
                top={`${selectionConfirmation.top + selectionConfirmation.height / 2}px`}
                align="center"
                gap={2}
                px={3}
                py={2}
                bg="var(--cl-surface)"
                color="var(--cl-text-strong)"
                border="1px solid var(--cl-border)"
                borderRadius="full"
                boxShadow="0 12px 30px rgba(0,0,0,.24)"
                fontSize="11px"
                fontWeight="600"
                whiteSpace="nowrap"
                animation="cl-map-zone-confirm-badge 300ms cubic-bezier(.2,.8,.2,1) both"
              >
                <FiCheckSquare size={15} color="#FF653F" aria-hidden="true" />
                {selectionConfirmation.count.toLocaleString('es-MX')} proyectos agregados a la ruta
              </Flex>
            </Box>
          )}

          {isBoxSelecting && (
            <Box
              position="absolute"
              inset={0}
              zIndex={28}
              cursor="crosshair"
              touchAction="none"
              onPointerDown={handleBoxPointerDown}
              onPointerMove={handleBoxPointerMove}
              onPointerUp={handleBoxPointerUp}
              onPointerCancel={() => {
                selectionDragRef.current = null;
                setSelectionBox(null);
                setIsBoxSelecting(false);
              }}
              onWheel={(event) => event.preventDefault()}
            >
              {selectionBox && (
                <Box
                  position="absolute"
                  left={`${selectionBox.left}px`}
                  top={`${selectionBox.top}px`}
                  w={`${selectionBox.width}px`}
                  h={`${selectionBox.height}px`}
                  bg="rgba(255, 101, 63, .12)"
                  border="2px dashed #FF653F"
                  borderRadius="4px"
                  pointerEvents="none"
                />
              )}
              {!selectionBox && (
                <Flex
                  position="absolute"
                  left="50%"
                  bottom="78px"
                  transform="translateX(-50%)"
                  bg="rgba(18, 22, 32, .86)"
                  color="white"
                  borderRadius="full"
                  px={3.5}
                  py={2}
                  fontSize="11px"
                  fontWeight="500"
                  whiteSpace="nowrap"
                  pointerEvents="none"
                >
                  Arrastra sobre el mapa para seleccionar proyectos
                </Flex>
              )}
            </Box>
          )}

          {showMapLoader && (
            <Box
              position="absolute"
              top="14px"
              left="50%"
              transform="translateX(-50%)"
              zIndex={30}
              pointerEvents="none"
            >
              <Flex
                bg="var(--cl-surface)"
                border="1px solid var(--cl-border)"
                borderRadius="full"
                boxShadow="var(--cl-shadow)"
                px={4}
                py={2.5}
                align="center"
                gap={3}
                minW="260px"
              >
                <Spinner size="sm" color="#FF653F" thickness="3px" />
                <Box>
                  <Text fontWeight="700" fontSize="12px" color="var(--cl-text-strong)" lineHeight="1.2">
                    Cargando proyectos
                  </Text>
                  <Text fontSize="11px" color="var(--cl-text-muted)" lineHeight="1.2">
                    {markerProgress.total
                      ? `${markerProgress.loaded.toLocaleString()} de ${markerProgress.total.toLocaleString()} proyectos`
                      : visibleMapLoadingMessage}
                  </Text>
                </Box>
              </Flex>
            </Box>
          )}

          {selectedProject && (
            <Box
              position="absolute"
              inset={0}
              zIndex={20}
              bg="rgba(20,20,20,.06)"
              onClick={() => {
                selectedProjectRef.current = null;
                setSelectedProject(null);
                setPopupPosition(null);
              }}
              onWheel={(event) => event.preventDefault()}
              onTouchMove={(event) => event.preventDefault()}
            >
              <Box
                ref={popupCardRef}
                position="absolute"
                top={`${popupPosition?.top || 0}px`}
                left={`${popupPosition?.left || 0}px`}
                visibility={popupPosition ? 'visible' : 'hidden'}
                bg="var(--cl-surface)"
                borderRadius="14px"
                p={3.5}
                w="340px"
                maxW="calc(100% - 24px)"
                maxH="calc(100% - 24px)"
                overflow="visible"
                boxShadow="0 16px 38px rgba(0,0,0,.28)"
                border="1px solid var(--cl-border)"
                color="var(--cl-text)"
                onClick={(event) => event.stopPropagation()}
              >
              <Box
                position="absolute"
                left={`${popupPosition?.pointerLeft || 24}px`}
                top={popupPosition?.placement === 'below' ? '-8px' : 'auto'}
                bottom={popupPosition?.placement === 'above' ? '-8px' : 'auto'}
                w="16px"
                h="16px"
                bg="var(--cl-surface)"
                borderLeft={popupPosition?.placement === 'below' ? '1px solid var(--cl-border)' : '0'}
                borderTop={popupPosition?.placement === 'below' ? '1px solid var(--cl-border)' : '0'}
                borderRight={popupPosition?.placement === 'above' ? '1px solid var(--cl-border)' : '0'}
                borderBottom={popupPosition?.placement === 'above' ? '1px solid var(--cl-border)' : '0'}
                transform="rotate(45deg)"
              />
              <Button
                position="absolute"
                top="10px"
                right="10px"
                minW="28px"
                w="28px"
                h="28px"
                p={0}
                borderRadius="full"
                bg="var(--cl-surface-muted)"
                color="var(--cl-text-muted)"
                border="1px solid var(--cl-border)"
                fontSize="18px"
                fontWeight="400"
                lineHeight="1"
                aria-label="Cerrar ficha"
                title="Cerrar"
                _hover={{ bg: 'var(--cl-hover)', color: 'var(--cl-text-strong)' }}
                onClick={(event) => {
                  event.stopPropagation();
                  selectedProjectRef.current = null;
                  setSelectedProject(null);
                  setPopupPosition(null);
                }}
              >
                ×
              </Button>
              <Flex align="center" gap={2} pr="34px" mb={2.5}>
                <Flex align="center" justify="center" w="30px" h="30px" flexShrink={0} borderRadius="9px" bg={projectPopupTone.accentSoft} color="#FF653F">
                  {React.createElement(getGenreIcon(selectedProject.genero), { size: 16, 'aria-hidden': true })}
                </Flex>
                <Box minW={0}>
                  <Text fontSize="9px" textTransform="uppercase" letterSpacing=".06em" fontWeight="700" color="var(--cl-text-muted)">Género</Text>
                  <Text fontSize="11px" fontWeight="700" color="var(--cl-text-strong)" lineClamp={1}>{selectedProject.genero || 'Proyecto'}</Text>
                </Box>
                {selectedProject.subgenero && normalizeText(selectedProject.subgenero) !== normalizeText(selectedProject.genero) && (
                  <Box ml="auto" maxW="128px" px={2} py={1} borderRadius="999px" bg="var(--cl-surface-muted)" border="1px solid var(--cl-border)">
                    <Text fontSize="9px" color="var(--cl-text-muted)" lineClamp={1}>{selectedProject.subgenero}</Text>
                  </Box>
                )}
              </Flex>

              {selectedProject.clave && (
                <Flex align="center" gap={1.5} mb={1}>
                  <Box w="5px" h="5px" borderRadius="full" bg="#FF653F" />
                  <Text fontSize="10px" color="var(--cl-text-muted)" lineClamp={1}>{selectedProject.clave}</Text>
                </Flex>
              )}

              <Text fontSize="18px" fontWeight="600" mb={3} lineHeight="1.25" letterSpacing="-.01em" color="var(--cl-text-strong)" noOfLines={2}>
                {selectedProject.proyecto}
              </Text>

              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mb={3}>
                <Box bg="var(--cl-surface-muted)" p={2.5} borderRadius="10px" border="1px solid var(--cl-border)">
                  <Text fontSize="9px" textTransform="uppercase" letterSpacing=".05em" fontWeight="700" color="var(--cl-text-muted)">Inversión</Text>
                  <Text mt={0.5} fontSize="14px" fontWeight="600" color="var(--cl-text-strong)">
                    {selectedProject.inversion}
                  </Text>
                </Box>

                <Box bg="var(--cl-surface-muted)" p={2.5} borderRadius="10px" border="1px solid var(--cl-border)">
                  <Text fontSize="9px" textTransform="uppercase" letterSpacing=".05em" fontWeight="700" color="var(--cl-text-muted)">Superficie</Text>
                  <Text mt={0.5} fontSize="14px" fontWeight="600" color="var(--cl-text-strong)">
                    {selectedProject.superficie}
                  </Text>
                </Box>
              </Box>

              <Box bg={projectPopupTone.periodBg} border={`1px solid ${projectPopupTone.periodBorder}`} borderRadius="10px" px={3} py={2.5} mb={3}>
                <Flex align="center" gap={2} mb={2}>
                  <Flex align="center" justify="center" w="22px" h="22px" borderRadius="full" bg={projectPopupTone.periodIconBg} color="#FF653F"><FiCalendar size={12} /></Flex>
                  <Text fontSize="9px" textTransform="uppercase" letterSpacing=".05em" fontWeight="700" color={projectPopupTone.accentText}>Periodo estimado</Text>
                </Flex>
                <Flex align="center" gap={2}>
                  <Box flex="1" minW={0}>
                    <Text fontSize="9px" color={projectPopupTone.labelText}>Inicio</Text>
                    <Text mt={0.5} fontSize="11px" fontWeight="700" color={projectPopupTone.valueText} lineClamp={1}>{formatProjectDate(selectedProject.fechaInicio)}</Text>
                  </Box>
                  <FiArrowRight size={14} color="#FF653F" aria-hidden="true" />
                  <Box flex="1" minW={0}>
                    <Text fontSize="9px" color={projectPopupTone.labelText}>Fin</Text>
                    <Text mt={0.5} fontSize="11px" fontWeight="700" color={projectPopupTone.valueText} lineClamp={1}>{formatProjectDate(selectedProject.fechaFin)}</Text>
                  </Box>
                </Flex>
              </Box>

              <Button
                w="100%"
                bg="#FF653F"
                color="white"
                _hover={{ bg: '#D94E2D' }}
                borderRadius="8px"
                transition="all 180ms ease"
                fontWeight="500"
                h="38px"
                onClick={() => onViewFicha?.(selectedProject)}
              >
                Ver ficha <FiArrowRight />
              </Button>
              </Box>
            </Box>
          )}

          {isSelectionModalOpen && (
            <MapSelectionModal
              obras={selectedObras}
              onClose={() => setIsSelectionModalOpen(false)}
              onViewProject={(obra) => {
                onViewFicha?.(obra);
              }}
            />
          )}

        </Box>
      </Box>
      
    </Box>
  );
}

export default React.memo(Mapa);
