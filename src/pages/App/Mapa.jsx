import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Box,
  Button,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

function Mapa({
  obras = [],
  filtros = {},
  isDarkMode = false,
  onFilteredData,
}) {
  const [externalFilterSignal, setExternalFilterSignal] = useState(0);
  const [selectedProject, setSelectedProject] = useState(null);
  const [filteredObras, setFilteredObras] = useState([]);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapLoadingMessage, setMapLoadingMessage] = useState('Cargando datos del mapa...');
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapReadyRef = useRef(false);
  const markerClusterRef = useRef(null);
  const markerElementsRef = useRef([]);
  const markerCacheRef = useRef(new Map());
  const markerUpdateTokenRef = useRef(0);
  const markerIconRef = useRef(null);
  const onFilteredDataRef = useRef(onFilteredData);
  const lastPublishedCount = useRef(-1);
  const didFitInitialBoundsRef = useRef(false);
  const DEBUG_MAPA = false;
  const debugLog = (...args) => {
    if (DEBUG_MAPA) console.log(...args);
  };
  const AUTO_FIT_INITIAL_BOUNDS = false;

  const showMapLoader = isMapLoading || !obras.length;
  const visibleMapLoadingMessage = !obras.length
    ? 'Obteniendo obras del servicio y preparando el mapa...'
    : mapLoadingMessage;

  useEffect(() => {
    onFilteredDataRef.current = onFilteredData;
  }, [onFilteredData]);


  useEffect(() => {
    const applyFilters = () => {
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

      const fechaStats = DEBUG_MAPA
        ? resultado.reduce(
            (acc, obra) => {
              const fechaObraTime = getObraTimeByFilter(obra, selectedDateField);
              const fechaObra = fechaObraTime ? new Date(fechaObraTime) : null;

              if (!fechaObra) {
                acc.invalidas += 1;
                return acc;
              }

              acc.validas += 1;

              if (!acc.min || fechaObra < acc.min) acc.min = fechaObra;
              if (!acc.max || fechaObra > acc.max) acc.max = fechaObra;

              if (acc.muestra.length < 5) {
                acc.muestra.push({
                  clave: obra.clave,
                  proyecto: obra.proyecto,
                  fecha: fechaObra.toISOString().slice(0, 10),
                  fechaPublicacion: obra.fechaPublicacion,
                  fechaInicio: obra.fechaInicio,
                  fechaTermino: obra.fechaTermino,
                });
              }

              return acc;
            },
            {
              validas: 0,
              invalidas: 0,
              min: null,
              max: null,
              muestra: [],
            }
          )
        : {
            validas: 0,
            invalidas: 0,
            min: null,
            max: null,
            muestra: [],
          };
      const totalAntesFechas = resultado.length;

      if (DEBUG_MAPA) {
        console.groupCollapsed('[Construleads][Fechas] Diagnóstico de filtro');
        console.log('Criterio:', selectedDateField);
        console.log('Rango solicitado:', {
          desde: fechaInicioFiltro,
          hasta: fechaFinFiltro,
        });
        console.log('Periodo legacy:', {
          periodIndex,
          diasSeleccionados,
        });
        console.log('Dataset antes de fecha:', totalAntesFechas);
        console.log('Fechas válidas / inválidas:', {
          validas: fechaStats.validas,
          invalidas: fechaStats.invalidas,
        });
        console.log('Rango real del dataset para criterio:', {
          min: fechaStats.min ? fechaStats.min.toISOString().slice(0, 10) : null,
          max: fechaStats.max ? fechaStats.max.toISOString().slice(0, 10) : null,
        });
        console.table(fechaStats.muestra);
      }

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
      if (DEBUG_MAPA) console.groupEnd();

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

      if (generos.length) {
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

      if (tiposProyecto.length) {
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

      if (subgeneros.length) {
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

      const superficieMin = Number(filtrosActivos.superficieMin ?? filtrosActivos.surfaceMin);
      const superficieMax = Number(filtrosActivos.superficieMax ?? filtrosActivos.surfaceMax);
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

    window.addEventListener(
      'construleads-filters-changed',
      applyFilters
    );

    return () => {
      window.removeEventListener(
        'construleads-filters-changed',
        applyFilters
      );
    };
  }, [obras, filtros, externalFilterSignal]);

useEffect(() => {
    let cancelled = false;

    const apiKey =
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      'AIzaSyAEgrLrVP-Cy2cEPyXPvRcfioV87vX1Hls';
    if (!apiKey) return;

    const formatInvestment = (value) => {
      if (!value) return '0 MDP';

      const millions = value / 1000000;

      if (millions >= 1000) {
        return `${(millions / 1000).toFixed(1)} BDP`;
      }

      return `${Math.round(millions)} MDP`;
    };

    const getGenreIcon = () => '•';

    const getMarkerTheme = () => ({
      color: '#FF6600',
      softColor: '#FFF5EB',
      borderColor: '#FF6600',
    });

    let activeMarkerElement = null;

    const cleanupMarkers = ({ clearCache = false } = {}) => {
      if (markerClusterRef.current) {
        markerClusterRef.current.clearMarkers();
      }

      if (clearCache) {
        markerCacheRef.current.forEach((marker) => {
          if (marker?.setMap) marker.setMap(null);
        });
        markerCacheRef.current.clear();
      }

      markerElementsRef.current = [];
    };

    const createClusterIcon = (count) => {
      const size = count >= 100 ? 48 : count >= 10 ? 42 : 36;
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#F3F4F6" stroke="#9CA3AF" stroke-width="2"/>
        </svg>
      `;

      return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: new window.google.maps.Size(size, size),
        anchor: new window.google.maps.Point(size / 2, size / 2),
      };
    };

    const renderCluster = ({ count, position }) => new window.google.maps.Marker({
      position,
      icon: createClusterIcon(count),
      label: {
        text: String(count),
        color: '#374151',
        fontSize: '12px',
        fontWeight: '700',
      },
      optimized: true,
      zIndex: Number(window.google.maps.Marker.MAX_ZINDEX) + count,
    });

    const getObraMarkerKey = (obra, index) => String(
      obra?.id ||
      obra?.clave ||
      obra?.proy_clave ||
      obra?.proyecto ||
      `${obra?.lat || obra?.latitud || obra?.Latitud || 'lat'}-${obra?.lng || obra?.longitud || obra?.Longitud || 'lng'}-${index}`
    );

    const buildMarker = (obra) => {
      if (obra.hasValidCoordinates === false) return null;

      const latNum = Number(obra.lat);
      const lonNum = Number(obra.lng);

      if (!Number.isFinite(latNum) || !Number.isFinite(lonNum) || latNum === 0 || lonNum === 0) {
        return null;
      }

      const marker = new window.google.maps.Marker({
        position: { lat: latNum, lng: lonNum },
        optimized: true,
        icon: markerIconRef.current,
      });

      marker.addListener('click', () => {
        setSelectedProject({
          proyecto: obra.proyecto,
          inversion: formatInvestment(obra.inversion),
          superficie: `${Number(obra.superficie || 0).toLocaleString()} m²`,
          genero: obra.genero,
          estado: obra.estado,
          subgenero: obra.subgenero,
        });
      });

      return marker;
    };


    const createMap = async () => {
      if (mapInstanceRef.current) return;
      setOptions({ apiKey, version: 'weekly' });

      const { Map } = await importLibrary('maps');

      if (cancelled || !mapRef.current) return;

      const map = new Map(mapRef.current, {
        center: { lat: 23.6, lng: -102.0 },
        zoom: 5.8,
        mapTypeId: 'satellite',
        mapId: 'bimsa-construleads-map',
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false,
      });

      mapInstanceRef.current = map;
      markerIconRef.current = {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#FFF5EB',
        fillOpacity: 1,
        strokeColor: '#FF6600',
        strokeWeight: 3,
      };
      markerClusterRef.current = new MarkerClusterer({
        map,
        markers: [],
        renderer: {
          render: renderCluster,
        },
      });
      mapReadyRef.current = true;

      requestAnimationFrame(() => {
        if (window.google?.maps?.event) {
          window.google.maps.event.trigger(map, 'resize');
        }
        map.setCenter({ lat: 23.6, lng: -102.0 });
      });

      map.addListener('click', () => {
        if (activeMarkerElement) {
          activeMarkerElement.style.transform = 'scale(1)';
          activeMarkerElement.style.zIndex = '1';
          activeMarkerElement = null;
        }
        setSelectedProject(null);
      });
    };

    const updateMarkers = async () => {
      if (!mapInstanceRef.current || !mapReadyRef.current) return;

      setIsMapLoading(true);
      setMapLoadingMessage(
        filteredObras.length
          ? `Preparando ${filteredObras.length.toLocaleString()} obras en el mapa...`
          : 'Preparando mapa...'
      );

      const updateToken = markerUpdateTokenRef.current + 1;
      markerUpdateTokenRef.current = updateToken;

      if (!filteredObras.length) {
        cleanupMarkers();

        if (!obras.length) {
          setMapLoadingMessage('Obteniendo obras del servicio y preparando el mapa...');
          setIsMapLoading(true);
          return;
        }

        setMapLoadingMessage('No hay obras para mostrar con los filtros actuales.');
        setIsMapLoading(false);
        return;
      }

      const startedAt = performance.now();
      if (markerCacheRef.current.size) {
        const desiredKeys = new Set(
          filteredObras.map((obra, index) => getObraMarkerKey(obra, index))
        );

        markerCacheRef.current.forEach((marker, key) => {
          if (!desiredKeys.has(key)) {
            if (marker?.setMap) marker.setMap(null);
            markerCacheRef.current.delete(key);
          }
        });
      }

      const markers = [];
      let builtMarkers = 0;
      const chunkSize = filteredObras.length > 1000 ? 1500 : filteredObras.length;

      for (let index = 0; index < filteredObras.length; index += 1) {
        if (markerUpdateTokenRef.current !== updateToken) return;

        const obra = filteredObras[index];
        const key = getObraMarkerKey(obra, index);
        let marker = markerCacheRef.current.get(key);

        if (!marker) {
          marker = buildMarker(obra);
          if (marker) {
            markerCacheRef.current.set(key, marker);
            builtMarkers += 1;
          }
        }

        if (marker) markers.push(marker);

        if (chunkSize < filteredObras.length && index > 0 && index % chunkSize === 0) {
          setMapLoadingMessage(
            `Pintando obras... ${Math.min(index, filteredObras.length).toLocaleString()} de ${filteredObras.length.toLocaleString()}`
          );
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      }

      if (markerUpdateTokenRef.current !== updateToken) return;

      if (markerClusterRef.current) {
        markerClusterRef.current.clearMarkers(true);
        markerClusterRef.current.addMarkers(markers, true);
        markerClusterRef.current.render();
      }

      if (markerUpdateTokenRef.current === updateToken) {
        setIsMapLoading(false);
      }

      markerElementsRef.current = markers;

      if (AUTO_FIT_INITIAL_BOUNDS && !didFitInitialBoundsRef.current && markers.length && mapInstanceRef.current) {
        const bounds = new window.google.maps.LatLngBounds();
        markers.forEach((marker, index) => {
          if (index % 4 !== 0) return;
          const position = marker.getPosition?.();
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
        ms: Math.round(performance.now() - startedAt),
      });
    };

    (async () => {
      try {
        setIsMapLoading(true);
        setMapLoadingMessage('Cargando mapa y preparando obras...');
        await createMap();
        if (cancelled) return;
        await updateMarkers();
      } catch (error) {
        console.error('Error cargando Google Maps:', error);
        setMapLoadingMessage('No se pudo cargar el mapa. Intenta recargar la página.');
        setIsMapLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      markerUpdateTokenRef.current += 1;
    };
  }, [filteredObras, obras.length]);

  return (
    <Box
      bg="var(--cl-surface)"
      h="100%"
      minH="520px"
      borderRadius="12px"
      p={0}
      border="1px solid var(--cl-border)"
      overflow="hidden"
    >
      <Box
        h="100%"
        minH="520px"
        borderRadius="12px"
        overflow="hidden"
        border="0"
        p={0}
      >
        <Box position="relative" h="100%" minH="520px" w="100%">
          <Box
            ref={mapRef}
            position="absolute"
            inset={0}
            h="100%"
            minH="520px"
            w="100%"
          />

          {showMapLoader && (
            <Box
              position="absolute"
              inset={0}
              zIndex={30}
              bg="rgba(255, 255, 255, 0.82)"
              backdropFilter="blur(6px)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              textAlign="center"
              px={6}
              pointerEvents="none"
            >
              <Box
                bg="var(--cl-surface)"
                border="1px solid var(--cl-border)"
                borderRadius="16px"
                boxShadow="var(--cl-shadow)"
                px={6}
                py={5}
                maxW="360px"
              >
                <Spinner size="lg" color="#FF6600" thickness="4px" mb={4} />
                <Text fontWeight="800" fontSize="16px" color="var(--cl-text-strong)" mb={1}>
                  Cargando datos
                </Text>
                <Text fontSize="13px" color="var(--cl-text-muted)">
                  {visibleMapLoadingMessage}
                </Text>
              </Box>
            </Box>
          )}

          {selectedProject && (
            <Box
              position="absolute"
              top="16px"
              left="16px"
              bg="var(--cl-surface)"
              borderRadius="12px"
              p={4}
              w="320px"
              boxShadow="var(--cl-shadow)"
              zIndex={20}
              border="1px solid var(--cl-border)"
              color="var(--cl-text)"
            >
              <Box
                display="inline-block"
                bg="var(--cl-surface-muted)"
                color="#FF6600"
                px={2}
                py={1}
                borderRadius="8px"
                fontSize="12px"
                fontWeight="700"
                mb={3}
              >
                {selectedProject.genero}
              </Box>
              <Text fontSize="18px" fontWeight="800" mb={3} lineHeight="1.25" color="var(--cl-text-strong)">
                {selectedProject.proyecto}
              </Text>

              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mb={3}>
                <Box bg="var(--cl-surface-muted)" p={2} borderRadius="8px" border="1px solid var(--cl-border)">
                  <Text fontSize="11px" color="var(--cl-text-muted)">💰 Inversión</Text>
                  <Text fontWeight="800" color="#FF6600">
                    {selectedProject.inversion}
                  </Text>
                </Box>

                <Box bg="var(--cl-surface-muted)" p={2} borderRadius="8px" border="1px solid var(--cl-border)">
                  <Text fontSize="11px" color="var(--cl-text-muted)">📐 Superficie</Text>
                  <Text fontWeight="800">
                    {selectedProject.superficie}
                  </Text>
                </Box>
              </Box>

              <Box
                bg="var(--cl-surface-muted)"
                border="1px solid var(--cl-border)"
                borderRadius="8px"
                p={2}
                mb={3}
                fontSize="13px"
                color="var(--cl-text-muted)"
              >
                📍 {selectedProject.estado} · {selectedProject.subgenero}
              </Box>

              <Button
                w="100%"
                bg="#FF6600"
                color="white"
                _hover={{ bg: '#E85D00' }}
                borderRadius="8px"
                transition="all 180ms ease"
              >
                Ver ficha completa →
              </Button>
            </Box>
          )}

        </Box>
      </Box>
      
    </Box>
  );
}

export default React.memo(Mapa);
