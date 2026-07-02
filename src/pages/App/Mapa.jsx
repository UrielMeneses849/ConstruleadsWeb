import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Button,
  Text,
} from '@chakra-ui/react';
import PanelResumen from './PanelResumen';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

function Mapa({
  obras = [],
  filtros = {},
  isDarkMode = false,
  selectedObras = [],
  onFilteredData,
}) {
  const [filteredObras, setFilteredObras] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const mapRef = useRef(null);
  const lastPublishedCount = useRef(-1);


  useEffect(() => {
    const applyFilters = () => {
      if (Array.isArray(selectedObras) && selectedObras.length > 0) {
        console.log('MAPA EN MODO SELECCION:', selectedObras.length);
        setFilteredObras(selectedObras);
        setSelectedProject(null);
        return;
      }

      const filtrosActivos = Object.keys(filtros || {}).length
        ? filtros
        : (window.construleadsFilters || {});
      console.log('==================== DEBUG FILTROS ====================');
      console.log('FILTROS ACTIVOS:', filtrosActivos);

      if (obras.length) {
        console.log('PRIMERA OBRA:', obras[0]);
        console.log('PRIMERA OBRA KEYS:', Object.keys(obras[0]));

        console.log('MUESTRA OBRAS:', obras.slice(0, 5).map((o) => ({
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

        console.log(
          'REGIONES XML:',
          [...new Set(obras.map((o) => o.region))]
        );

        console.log(
          'ESTADOS XML:',
          [...new Set(obras.map((o) => o.estado))]
        );

        console.log(
          'GENEROS XML:',
          [...new Set(obras.map((o) => o.genero))]
        );

        console.log(
          'SUBGENEROS XML:',
          [...new Set(obras.map((o) => o.subgenero))]
        );

        console.log(
  'TIPO OBRA XML:',
  [...new Set(obras.map((o) => o.tipoObra))]
);

        console.log(
          'SECTORES XML:',
          [...new Set(obras.map((o) => o.sector))]
        );

        console.log(
          'TIPO PROYECTO XML:',
          [...new Set(obras.map((o) => o.tipoProyecto))]
        );

        console.log(
          'TIPO DESARROLLO XML:',
          [...new Set(obras.map((o) => o.tipoDesarrollo))]
        );

        console.log(
          'ETAPAS XML:',
          [...new Set(obras.map((o) => o.etapa))]
        );
      }

      if (!obras.length) return;

      let resultado = [...obras];
      console.log('TOTAL INICIAL:', resultado.length);

const parseDate = (dateValue) => {
  if (!dateValue) return null;

  if (dateValue instanceof Date) {
    return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  }

  const normalized = String(dateValue).trim();
  if (!normalized) return null;

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const localMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (localMatch) {
    const [, day, month, year] = localMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getObraDateByFilter = (obra, selectedDateField) => {
  if (selectedDateField === 'Fecha de inicio probable') {
    return parseDate(obra.fechaInicioDate) || parseDate(obra.fechaInicio);
  }

  if (selectedDateField === 'Fecha de término probable') {
    return parseDate(obra.fechaTerminoDate) || parseDate(obra.fechaTermino);
  }

  return parseDate(obra.fechaPublicacionDate) || parseDate(obra.fechaPublicacion);
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

      const fechaStats = resultado.reduce(
        (acc, obra) => {
          const fechaObra = getObraDateByFilter(obra, selectedDateField);

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
      );
      const totalAntesFechas = resultado.length;

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

      if (fechaInicioFiltro && fechaFinFiltro) {
        const fechaInicio = parseDate(fechaInicioFiltro);
        const fechaFin = parseDate(fechaFinFiltro);

        if (fechaInicio && fechaFin) {
          fechaInicio.setHours(0, 0, 0, 0);
          fechaFin.setHours(23, 59, 59, 999);

          resultado = resultado.filter((obra) => {
            const fechaObra = getObraDateByFilter(obra, selectedDateField);
            if (!fechaObra) return false;

            return fechaObra >= fechaInicio && fechaObra <= fechaFin;
          });

          console.log('POST FECHAS:', resultado.length);
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

        resultado = resultado.filter((obra) => {
          const fechaObra = getObraDateByFilter(obra, selectedDateField);
          if (!fechaObra) return false;

          return fechaObra >= fechaInicio && fechaObra <= fechaFin;
        });

        console.log('POST FECHAS LEGACY:', resultado.length);
      }

      console.log('Resultado fecha:', {
        antes: totalAntesFechas,
        despues: resultado.length,
        removidos: totalAntesFechas - resultado.length,
      });
      console.groupEnd();

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

console.log('FILTRO SUBGENEROS:', subgeneros);
console.log('FILTRO TIPO OBRA:', tipoObra);

const tiposProyecto =
  filtrosActivos.tiposProyecto ||
  filtrosActivos.selectedTiposProyecto ||
  [];
      if (regiones.length) {
        resultado = resultado.filter((o) =>
          regiones.includes(o.region)
        );
        console.log('POST REGIONES:', resultado.length);
      }

      if (estados.length) {
        resultado = resultado.filter((o) =>
          estados.includes(o.estado)
        );
        console.log('POST ESTADOS:', resultado.length);
      }

      if (generos.length) {
        resultado = resultado.filter((o) =>
          generos.includes(o.genero)
        );
        console.log('POST GENEROS:', resultado.length);
      }

      if (tipoObra.length) {
        resultado = resultado.filter((o) =>
          tipoObra.includes(o.tipoObra)
        );
        console.log('POST TIPO OBRA:', resultado.length);
      }

      if (desarrollos.length) {
        resultado = resultado.filter((o) =>
          desarrollos.includes(o.tipoDesarrollo)
        );
        console.log('POST DESARROLLOS:', resultado.length);
      }

      if (etapas.length) {
        resultado = resultado.filter((o) =>
          etapas.includes(o.etapa)
        );
        console.log('POST ETAPAS:', resultado.length);
      }

      if (tiposProyecto.length) {
        console.log('TIPOS PROYECTO FILTRO:', tiposProyecto);

        console.log(
          'TIPOS PROYECTO EN RESULTADO:',
          [...new Set(resultado.map(o => o.tipoProyecto))]
        );

        console.log(
  'TIPOS PROYECTO SELECCIONADOS:',
  filtros.tipoProyecto
);

console.log(
  'TIPOS PROYECTO PRIMERAS OBRAS:',
  obras.slice(0,5).map(
    o => o.tipoProyecto
  )
);

        resultado = resultado.filter((o) =>
          tiposProyecto.includes(o.tipoProyecto)
        );

        console.log('POST TIPO PROYECTO:', resultado.length);
      }

      if (subgeneros.length) {
  const tiposObraPermitidos = subgeneros.flatMap(
    (sub) => tiposObraPorSubgenero[sub] || []
  );

  console.log(
    'SUBGENEROS SELECCIONADOS:',
    subgeneros
  );

  console.log(
    'TIPOS OBRA RESUELTOS:',
    tiposObraPermitidos
  );

  resultado = resultado.filter((o) =>
    tiposObraPermitidos.includes(o.tipoObra)
  );

  console.log(
    'POST SUBGENEROS:',
    resultado.length
  );
}

      const investmentMin = Number(filtrosActivos.investmentMin || 0);
      const investmentMax = Number(filtrosActivos.investmentMax || 0);

      // El slider trabaja en millones y el XML en pesos
      const investmentMinPesos = investmentMin < 1000000 ? investmentMin * 1000000 : investmentMin;
      const investmentMaxPesos = investmentMax < 1000000 ? investmentMax * 1000000 : investmentMax;

      if (investmentMinPesos > 0) {
        resultado = resultado.filter(
          (o) => o.inversion >= investmentMinPesos
        );
      }

      if (investmentMaxPesos > 0) {
        resultado = resultado.filter(
          (o) => o.inversion <= investmentMaxPesos
        );
      }

      console.log('RANGO INVERSION FILTRO:', investmentMinPesos, investmentMaxPesos);
      console.log('POST INVERSION:', resultado.length);
      console.log(
        'SUPERFICIE FILTRO:',
        filtrosActivos.superficie
      );

      console.log(
        'SUPERFICIES RESTANTES:',
        resultado.map((o) => o.superficie)
      );

      if (filtrosActivos.superficie?.length) {
        resultado = resultado.filter((o) => {
          return filtrosActivos.superficie.some((rango) => {
            if (rango.includes('0 - 1,000')) {
              return o.superficie <= 1000;
            }

            if (rango.includes('1,000 - 5,000') || rango.includes('1000 - 5000')) {
              return o.superficie > 1000 && o.superficie <= 5000;
            }

            if (rango.includes('5,000 - 10,000') || rango.includes('5000 - 10000')) {
              return o.superficie > 5000 && o.superficie <= 10000;
            }

            if (rango.includes('> 10,000')) {
              return o.superficie > 10000;
            }

            return false;
          });
        });
        console.log('POST SUPERFICIE:', resultado.length);
      }

      if (sectores.length) {
        resultado = resultado.filter((o) =>
          sectores.includes(o.sector)
        );
        console.log('POST SECTORES:', resultado.length);
      }

      console.log(
        'Filtro aplicado:',
        resultado.length,
        'de',
        obras.length
      );

      console.log('RESULTADO FINAL:', resultado.length);

      setFilteredObras(resultado);

      if (onFilteredData) {
        lastPublishedCount.current = resultado.length;
        onFilteredData(resultado);
      }
    };

    console.log('MAPA RECALCULANDO FILTROS');
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
  }, [obras, filtros, selectedObras, onFilteredData]);

useEffect(() => {
    let cancelled = false;

    const apiKey =
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      'AIzaSyCIapQrNE18PGaxIYd6nRMpCoAlbYD4xkA';
    if (!apiKey) return;

    (async () => {
      try {
        setOptions({
          apiKey,
          version: 'weekly',
        });

        const { Map } = await importLibrary('maps');
        const { AdvancedMarkerElement } = await importLibrary('marker');

        if (cancelled) return;
        if (!mapRef.current) return;
        const map = new Map(mapRef.current, {
          center: { lat: 23.6, lng: -102.0 },
          zoom: 5.8,
          mapTypeId: 'satellite',
          mapId: 'bimsa-construleads-map',
          fullscreenControl: true,
          mapTypeControl: true,
          streetViewControl: false,
        });

        requestAnimationFrame(() => {
          if (window.google?.maps?.event) {
            window.google.maps.event.trigger(map, 'resize');
          }

          map.setCenter({ lat: 23.6, lng: -102.0 });
        });

        let activeMarkerElement = null;
        const markers = [];

        const formatInvestment = (value) => {
          if (!value) return '0 MDP';

          const millions = value / 1000000;

          if (millions >= 1000) {
            return `${(millions / 1000).toFixed(1)} BDP`;
          }

          return `${Math.round(millions)} MDP`;
        };

        const getGenreMeta = (genre = '') => {
          const normalizedGenre = genre
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

          switch (normalizedGenre) {
            case 'Industrial':
              return { icon: '🏭', color: '#64748B' };
            case 'Infraestructura':
              return { icon: '🛣️', color: '#2563EB' };
            case 'Edificacion':
              return { icon: '🏢', color: '#7C3AED' };
            case 'Vivienda':
              return { icon: '🏠', color: '#059669' };
            default:
              return { icon: '•', color: '#6B7280' };
          }
        };

        const getGenreIcon = (genre) => {
          return getGenreMeta(genre).icon;
        };

        const getGenreColor = (genre) => {
          return getGenreMeta(genre).color;
        };

        const hexToRgba = (hex, alpha) => {
          const cleanHex = hex.replace('#', '');
          const r = parseInt(cleanHex.slice(0, 2), 16);
          const g = parseInt(cleanHex.slice(2, 4), 16);
          const b = parseInt(cleanHex.slice(4, 6), 16);

          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        const getMarkerTheme = (genre) => {
          const color = getGenreColor(genre);
          return {
            color,
            softColor: '#FFFFFF',
            borderColor: color,
          };
        };

        filteredObras.forEach((obra) => {
          if (cancelled) return;

          const latNum = parseFloat(obra.lat);
          const lonNum = parseFloat(obra.lng);

          if (!isNaN(latNum) && !isNaN(lonNum)) {
            const markerTheme = getMarkerTheme(obra.genero);
            // Create custom HTML marker
            const markerContent = document.createElement('div');
            markerContent.innerHTML = `
              <div style="
                display:flex;
                align-items:center;
                justify-content:center;
                width:34px;
                height:34px;
                background:${markerTheme.softColor};
                border:3px solid ${markerTheme.borderColor};
                border-radius:10px;
                box-shadow:0 4px 12px rgba(0,0,0,.16);
                font-family:Inter,sans-serif;
                font-size:16px;
                color:${markerTheme.color};
                cursor:pointer;
                backdrop-filter:blur(6px);
                transition:transform 160ms ease, box-shadow 160ms ease;
              ">
                <span>${getGenreIcon(obra.genero)}</span>
              </div>
            `;
            // Create the marker using AdvancedMarkerElement with custom content
            const marker = new AdvancedMarkerElement({
              position: {
                lat: latNum,
                lng: lonNum,
              },
              title: obra.proyecto,
              content: markerContent,
            });

            markers.push(marker);

            markerContent.addEventListener('click', (e) => {
              e.stopPropagation();

              if (activeMarkerElement) {
                activeMarkerElement.style.transform = 'scale(1)';
                activeMarkerElement.style.zIndex = '1';
              }

              markerContent.firstElementChild.style.transform = 'scale(1.12)';
              markerContent.firstElementChild.style.zIndex = '999';

              activeMarkerElement = markerContent.firstElementChild;

              setSelectedProject({
                proyecto: obra.proyecto,
                inversion: formatInvestment(obra.inversion),
                superficie: `${obra.superficie.toLocaleString()} m²`,
                genero: obra.genero,
                estado: obra.estado,
                subgenero: obra.subgenero,
              });
            });
          }
        });

new MarkerClusterer({
  map,
  markers,

  renderer: {
    render({ count, position }) {
      const clusterElement = document.createElement('div');

      clusterElement.innerHTML = `
        <div style="
          min-width:54px;
          height:30px;
          padding:0 8px;
          border-radius:8px;
          background:var(--cl-surface);
          border:1px solid var(--cl-border);
          display:flex;
          align-items:center;
          justify-content:center;
          font-family:Inter,sans-serif;
          font-weight:800;
          font-size:12px;
          color:var(--cl-text-strong);
          box-shadow:0 4px 12px rgba(0,0,0,.16);
        ">
          ${count} proy.
        </div>
      `;

      return new google.maps.marker.AdvancedMarkerElement({
        position,
        content: clusterElement,
      });
    },
  },
});

        map.addListener('click', () => {
          if (activeMarkerElement) {
            activeMarkerElement.style.transform = 'scale(1)';
            activeMarkerElement.style.zIndex = '1';
            activeMarkerElement = null;
          }

          setSelectedProject(null);
        });
      } catch (error) {
        console.error('Error cargando Google Maps:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filteredObras, isDarkMode]);

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

          <Box
            position="absolute"
            left="24px"
            right="96px"
            bottom="16px"
            zIndex={15}
          >
            <PanelResumen obras={filteredObras} variant="map" />
          </Box>
        </Box>
      </Box>
      
    </Box>
  );
}

export default React.memo(Mapa);
