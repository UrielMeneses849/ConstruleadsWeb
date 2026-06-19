import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Button,
  Text,
} from '@chakra-ui/react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

export default function Mapa({ filtros = {}, onFilteredData }) {
  const [obras, setObras] = useState([]);
  const [filteredObras, setFilteredObras] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/WS_CL_OBRAS_DUMMY_200.txt`)
      .then(response => response.text())
      .then(str => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(str, 'application/xml');
        const datosNodes = Array.from(xml.getElementsByTagName('datos'));
        const parsedObras = datosNodes.map(node => {
          const lat = node.getElementsByTagName('Latitude')[0]?.textContent || '';
          const lon = node.getElementsByTagName('Longitude')[0]?.textContent || '';
          const proyecto = node.getElementsByTagName('Proyecto')[0]?.textContent || '';
          const genero = node.getElementsByTagName('Genero')[0]?.textContent || 'Sin género';
          const subgenero = node.getElementsByTagName('Subgenero')[0]?.textContent || '';
          const tipoObra = node.getElementsByTagName('Tipo_Obra')[0]?.textContent || '';
          const estado = node.getElementsByTagName('Estado_Proyecto')[0]?.textContent || '';
          const region = node.getElementsByTagName('Region')[0]?.textContent || '';
          const sector = node.getElementsByTagName('Sector')[0]?.textContent || '';
          const tipoProyecto = node.getElementsByTagName('Tipo_Proyecto')[0]?.textContent || '';
          const tipoDesarrollo = node.getElementsByTagName('Tipo_Desarrollo')[0]?.textContent || '';
          const etapa = node.getElementsByTagName('Etapa')[0]?.textContent || '';
          const inversion = Number(node.getElementsByTagName('Inversion')[0]?.textContent || 0);
          const superficie = Number(node.getElementsByTagName('Sup_Construida')[0]?.textContent || 0);
const fechaPublicacion = node.getElementsByTagName('Fecha_Publicacion')[0]?.textContent || '';
const fechaInicio = node.getElementsByTagName('Fecha_Inicio')[0]?.textContent || '';
const fechaTerminacion = node.getElementsByTagName('Fecha_Termino')[0]?.textContent || '';
          return {
            lat,
            lon,
            proyecto,
            genero,
            subgenero,
            tipoObra,
            estado,
            region,
            sector,
            tipoProyecto,
            tipoDesarrollo,
            etapa,
            inversion,
            superficie,
            fechaPublicacion,
            fechaInicio,
            fechaTerminacion,
          };
        });
        setObras(parsedObras);
        setFilteredObras(parsedObras);
      })
      .catch(() => {
        setObras([]);
      });
  }, []);

  useEffect(() => {
    const applyFilters = () => {
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

const parseDate = (dateStr) => {
  if (!dateStr) return null;

  const date = new Date(dateStr);

  return isNaN(date.getTime())
    ? null
    : date;
};

      // NUEVA LÓGICA DE FILTRO DE FECHA
      const selectedDateField =
  filtrosActivos.fechaConsulta ||
  filtrosActivos.selectedValues?.['Fecha de consulta'] ||
  '';
      const periodIndex = Number(filtrosActivos.periodoIndex ?? -1);

      const diasPorPeriodo = {
        0: 0,
        1: 1,
        2: 7,
        3: 30,
        4: 90,
        5: 180,
      };

      const diasSeleccionados = diasPorPeriodo[periodIndex];

      console.log('FILTRO FECHA:', selectedDateField);
      console.log('PERIODO INDEX:', periodIndex);
      console.log('DIAS SELECCIONADOS:', diasSeleccionados);

// FILTRO FECHAS DESACTIVADO TEMPORALMENTE
console.log('FILTRO FECHAS DESACTIVADO TEMPORALMENTE');

if (
  selectedDateField &&
  selectedDateField !== 'Todas' &&
  diasSeleccionados !== undefined
) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  let fechaLimite = new Date(today);

  if (diasSeleccionados > 0) {
    fechaLimite.setDate(
      today.getDate() + diasSeleccionados
    );
  }

  resultado = resultado.filter((o) => {
    let fechaProyecto = null;

    switch (selectedDateField) {
      case 'Fecha de publicación':
        fechaProyecto = parseDate(
          o.fechaPublicacion
        );
        break;

      case 'Fecha de inicio probable':
        fechaProyecto = parseDate(
          o.fechaInicio
        );
        break;

      case 'Fecha de término probable':
        fechaProyecto = parseDate(
          o.fechaTerminacion
        );
        break;

      default:
        return true;
    }

    if (!fechaProyecto) {
      return false;
    }

    fechaProyecto.setHours(0, 0, 0, 0);

    // HOY
    if (diasSeleccionados === 0) {
      return (
        fechaProyecto.getTime() ===
        today.getTime()
      );
    }

    // RANGO
    return (
      fechaProyecto >= today &&
      fechaProyecto <= fechaLimite
    );
  });

  console.log(
    'POST FECHAS:',
    resultado.length
  );
}

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

      // Independent filters for tipoObra, desarrollos, etapas, tiposProyecto, subgeneros (in this order)
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

        resultado = resultado.filter((o) =>
          tiposProyecto.includes(o.tipoProyecto)
        );

        console.log('POST TIPO PROYECTO:', resultado.length);
      }

      if (subgeneros.length) {
        resultado = resultado.filter((o) =>
          subgeneros.includes(o.subgenero)
        );
        console.log('POST SUBGENEROS:', resultado.length);
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
      console.log('SET FILTERED OBRAS EJECUTANDO');
      setFilteredObras(resultado);

      if (onFilteredData) {
        onFilteredData(resultado);
      }
    };

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
  }, [obras, filtros, onFilteredData]);

useEffect(() => {
  console.log(
    'MAPA RECIBIÓ:',
    filteredObras.length,
    'OBRAS'
  );
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

        const map = new Map(mapRef.current, {
          center: { lat: 23.6345, lng: -102.5528 },
          zoom: 5,
          mapId: 'bimsa-construleads-map',
        });

        let activeMarkerElement = null;

        const formatInvestment = (value) => {
          if (!value) return '0 MDP';

          const millions = value / 1000000;

          if (millions >= 1000) {
            return `${(millions / 1000).toFixed(1)} BDP`;
          }

          return `${Math.round(millions)} MDP`;
        };

        const getGenreIcon = (genre) => {
          switch (genre) {
            case 'Industrial':
              return '🏭';
            case 'Infraestructura':
              return '🛣️';
            case 'Edificación':
              return '🏢';
            case 'Vivienda':
              return '🏠';
            default:
              return '📍';
          }
        };

        filteredObras.forEach((obra) => {
          const latNum = parseFloat(obra.lat);
          const lonNum = parseFloat(obra.lon);

          if (!isNaN(latNum) && !isNaN(lonNum)) {
            // Create custom HTML marker
            const markerContent = document.createElement('div');
            markerContent.innerHTML = `
              <div style="
                display:flex;
                align-items:center;
                gap:6px;
                background:white;
                border:2px solid #FF6600;
                border-radius:999px;
                padding:6px 10px;
                box-shadow:0 4px 12px rgba(0,0,0,.15);
                font-family:Inter,sans-serif;
                font-size:12px;
                font-weight:700;
                color:#202020;
                cursor:pointer;
                white-space:nowrap;
              ">
                <span>${getGenreIcon(obra.genero)}</span>
                <span>${Math.round(obra.inversion / 1000000)}M</span>
              </div>
            `;

            // Create the marker using AdvancedMarkerElement with custom content
            const marker = new AdvancedMarkerElement({
              map,
              position: {
                lat: latNum,
                lng: lonNum,
              },
              title: obra.proyecto,
              content: markerContent,
            });

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
  }, [filteredObras]);

  return (
    <Box
      bg="white"
      h="100%"
      borderRadius="20px"
      p={2}
      boxShadow="sm"
    >
      <Box
        h="100%"
        borderRadius="16px"
        overflow="auto"
        border="1px solid #E5E7EB"
        p={4}
      >
        <Box position="relative" h="100%" w="100%">
          <Box ref={mapRef} h="100%" w="100%" />

          {selectedProject && (
            <Box
              position="absolute"
              top="20px"
              left="20px"
              bg="white"
              borderRadius="20px"
              p={5}
              w="340px"
              boxShadow="0 12px 32px rgba(0,0,0,.18)"
              zIndex={20}
              border="1px solid #F0F0F0"
            >
              <Box
                display="inline-block"
                bg="#FFF3EB"
                color="#FF6600"
                px={3}
                py={1}
                borderRadius="999px"
                fontSize="12px"
                fontWeight="700"
                mb={3}
              >
                {selectedProject.genero}
              </Box>

              <Text fontSize="20px" fontWeight="800" mb={4} lineHeight="1.2">
                {selectedProject.proyecto}
              </Text>

              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={3} mb={4}>
                <Box bg="#F8F8F8" p={3} borderRadius="14px">
                  <Text fontSize="11px" color="gray.500">💰 Inversión</Text>
                  <Text fontWeight="800" color="#FF6600">
                    {selectedProject.inversion}
                  </Text>
                </Box>

                <Box bg="#F8F8F8" p={3} borderRadius="14px">
                  <Text fontSize="11px" color="gray.500">📐 Superficie</Text>
                  <Text fontWeight="800">
                    {selectedProject.superficie}
                  </Text>
                </Box>
              </Box>

              <Box
                bg="#FFF8F3"
                border="1px solid #FFE0CC"
                borderRadius="12px"
                p={3}
                mb={4}
                fontSize="13px"
                color="gray.600"
              >
                📍 {selectedProject.estado} · {selectedProject.subgenero}
              </Box>

              <Button
                w="100%"
                bg="#FF6600"
                color="white"
                _hover={{ bg: '#E85D00' }}
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