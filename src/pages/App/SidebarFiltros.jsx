import { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  Heading,
  Button,
  Text,
  Flex,
  SimpleGrid,
} from '@chakra-ui/react';

export default function SidebarFiltros() {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [activeFilterTab, setActiveFilterTab] = useState('principales');

  const periodosConsulta = [
    'Hoy',
    '1 Dia',
    '7 Dias',
    '1 Mes',
    '3 Meses',
    '6 meses',
  ];

  const savedFilters = (() => {
    try {
      return JSON.parse(
        localStorage.getItem('construleads-filtros') || '{}'
      );
    } catch {
      return {};
    }
  })();

  const [periodoIndex, setPeriodoIndex] = useState(
    savedFilters.periodoIndex ?? 2
  );

  const [selectedValues, setSelectedValues] = useState(
    savedFilters.selectedValues || {}
  );

  const [selectedEstados, setSelectedEstados] = useState(
    savedFilters.selectedEstados || []
  );
  const [selectedRegiones, setSelectedRegiones] = useState(
    savedFilters.selectedRegiones || []
  );

  const [selectedGeneros, setSelectedGeneros] = useState(
    savedFilters.selectedGeneros || []
  );

  const [selectedSubgeneros, setSelectedSubgeneros] = useState(
    savedFilters.selectedSubgeneros || []
  );

  const [selectedDetalles, setSelectedDetalles] = useState(
    savedFilters.selectedDetalles || []
  );

  const [selectedSectores, setSelectedSectores] = useState(
    savedFilters.selectedSectores || []
  );

  const [selectedEtapas, setSelectedEtapas] = useState(
    savedFilters.selectedEtapas || []
  );

  const [selectedDesarrollos, setSelectedDesarrollos] = useState(
    savedFilters.selectedDesarrollos || []
  );

  const [selectedTipoObra, setSelectedTipoObra] = useState(
    savedFilters.selectedTipoObra || []
  );

  const [selectedTiposProyecto, setSelectedTiposProyecto] = useState(
    savedFilters.selectedTiposProyecto || []
  );

  // Inversión dual-range slider states
  const [investmentMin, setInvestmentMin] = useState(
    typeof savedFilters.investmentMin === 'number' ? savedFilters.investmentMin : 100000000
  );
  const [investmentMax, setInvestmentMax] = useState(
    typeof savedFilters.investmentMax === 'number' ? savedFilters.investmentMax : 800000000
  );

  const hasLoadedFilters = useRef(true);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
      }
    };

    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedFilters.current) return;

    console.log('Guardando filtros', {
      selectedValues,
      selectedRegiones,
      selectedEstados,
      selectedGeneros,
      selectedSubgeneros,
      selectedDetalles,
      selectedSectores,
      selectedEtapas,
      selectedDesarrollos,
      selectedTipoObra,
      periodoIndex,
      selectedTiposProyecto,
      investmentMin,
      investmentMax,
    });
    localStorage.setItem(
      'construleads-filtros',
      JSON.stringify({
        selectedValues,
        selectedRegiones,
        selectedEstados,
        selectedGeneros,
        selectedSubgeneros,
        selectedDetalles,
        selectedSectores,
        selectedEtapas,
        selectedDesarrollos,
        selectedTipoObra,
        periodoIndex,
        selectedTiposProyecto,
        investmentMin,
        investmentMax,
      })
    );
  }, [
    selectedValues,
    selectedRegiones,
    selectedEstados,
    selectedGeneros,
    selectedSubgeneros,
    selectedDetalles,
    selectedSectores,
    selectedEtapas,
    selectedDesarrollos,
    selectedTipoObra,
    periodoIndex,
    selectedTiposProyecto,
    investmentMin,
    investmentMax,
  ]);

  useEffect(() => {
    if (!selectedRegiones.length) {
      setSelectedEstados([]);
      return;
    }

    const estados = selectedRegiones.flatMap(
      (region) => estadosPorRegion[region] || []
    );

    setSelectedEstados((actuales) => {
      const faltantes = estados.filter(
        (estado) => !actuales.includes(estado)
      );

      return [...actuales, ...faltantes];
    });
  }, [selectedRegiones]);

  useEffect(() => {
    if (!selectedGeneros.length) {
      setSelectedSubgeneros([]);
      return;
    }

    const disponibles = selectedGeneros.flatMap((genero) =>
      Object.values(subgenerosPorGenero[genero] || {}).flat()
    );

    setSelectedSubgeneros((actuales) => {
      const vigentes = actuales.filter((item) =>
        disponibles.includes(item)
      );

      const faltantes = disponibles.filter(
        (item) => !vigentes.includes(item)
      );

      return [...vigentes, ...faltantes];
    });
  }, [selectedGeneros]);

  const estadosPorRegion = {
    Oeste: ['Jalisco', 'Colima', 'Michoacán', 'Nayarit'],
    Noroeste: ['Baja California', 'Baja California Sur', 'Sonora', 'Sinaloa', 'Chihuahua', 'Durango'],
    Centro: ['Ciudad de México', 'Estado de México', 'Hidalgo', 'Morelos', 'Puebla', 'Querétaro', 'Tlaxcala'],
    Sureste: ['Guerrero', 'Oaxaca', 'Veracruz', 'Tabasco', 'Chiapas', 'Campeche', 'Yucatán', 'Quintana Roo'],
    Noreste: ['Nuevo León', 'Coahuila', 'Tamaulipas', 'San Luis Potosí', 'Zacatecas', 'Aguascalientes']
  };

  const subgenerosPorGenero = {
    Vivienda: {
      Lujo: [
        'Condominios de lujo',
        'Vivienda unifamiliar de lujo',
      ],
      Medio: [
        'Condominios medio',
        'Vivienda unifamiliar interés medio',
      ],
      Social: [
        'Vivienda plurifamiliar interés social',
        'Vivienda unifamiliar interés social',
      ],
    },
    Edificacion: {
      Comercial: [
        'Plazas comerciales',
        'Edificios de oficinas',
        'Bancarias, bolsa y corredurías',
        'Agencias automotrices',
        'Centrales de carga y distribución',
        'Restaurantes y salones de eventos',
        'Mercados públicos y centrales de abastos',
        'Cines y teatros',
        'Centros de diversiones',
        'Gasolinerías',
        'Terminales de transporte',
        'Edificios de estacionamiento',
      ],
      Educativo: [
        'Educación superior',
        'Educación básica',
        'Educación media',
      ],
      Institucional: [
        'Judiciales y bomberos',
        'Albergues, orfanatos, asilos y conventos',
        'Iglesias y templos',
        'Crematorios y velatorios',
        'Instalaciones deportivas',
      ],
      Salud: [
        'Centros de rehabilitación y salud',
        'Clínicas, hospitales y centros médicos',
      ],
      Turistico: [
        'Desarrollos turísticos - hoteleros',
        'Hoteles 4 y 5 estrellas',
        'Hoteles de 1, 2 y 3 estrellas y moteles',
      ],
    },
    Industrial: {
      Industrial: [
        'Naves, almacenes y bodegas',
        'Cámaras frigoríficas y rastros',
        'Laboratorios',
        'Plantas industriales',
        'Parques industriales',
        'Petroleras, petroquímicas y refinerías',
        'Hidro + termoeléctricas y subestaciones',
      ],
    },
    Infraestructura: {
      Infraestructura: [
        'Hidro - agropecuaria',
        'Agua potable',
        'Drenaje y saneamiento',
        'Telecomunicaciones',
        'Electrificación',
        'Marítimas',
        'Aeropuertos',
        'Vías férreas, tren ligero, metro',
        'Urbanización',
        'Carreteras',
        'Redes de gas',
        'Presas',
        'Plantas de tratamiento de agua',
        'Puentes y estructuras',
        'Pavimentos',
        'Tren alta velocidad',
      ],
    },
  };

  const filtros = [
    {
      label: 'Fecha de consulta',
      options: [
        'Fecha de publicación',
        'Fecha de inicio probable',
        'Fecha de término probable',
      ],
      group: 'principales',
    },
    {
      label: 'Periodo de consulta',
      options: [
        'Hoy',
        '1 Dia',
        '7 Dias',
        '1 Mes',
        '3 Meses',
        '6 meses',
      ],
      group: 'principales',
    },
    {
      label: 'Región',
      options: ['Oeste', 'Noroeste', 'Centro', 'Sureste', 'Noreste'],
      multi: true,
      group: 'principales',
    },
    {
      label: 'Género',
      options: [
        'Vivienda',
        'Industrial',
        'Edificacion',
        'Infraestructura'
      ],
      multi: true,
      group: 'principales',
    },
    {
      label: 'Tipo de proyecto',
      options: [
        'Proyectos contratados',
        'Proyectos de inversion'
      ],
      multi: true,
      group: 'principales',
    },
    // Estado, Subgénero, Tipo obra after 'Tipo de proyecto'
    {
      label: 'Estado',
      options: selectedRegiones.length
        ? selectedRegiones.flatMap(
            (region) => estadosPorRegion[region] || []
          )
        : [],
      multi: true,
      group: 'avanzados',
    },
    {
      label: 'Subgénero',
      options: selectedGeneros.length
        ? selectedGeneros.flatMap((genero) =>
            Object.values(subgenerosPorGenero[genero] || {}).flat()
          )
        : [],
      multi: true,
      group: 'avanzados',
    },
    {
      label: 'Tipo obra',
      options: ['Nueva', 'Ampliación', 'Remodelación', 'Rehabilitación'],
      multi: true,
      group: 'avanzados',
    },
    {
      label: 'Etapa',
      options: [
        'Planeación',
        'Proyecto',
        'Concurso',
        'Contratado',
        'En ejecución',
        'Terminado',
      ],
      multi: true,
      group: 'avanzados',
    },
    {
      label: 'Tipo desarrollo',
      options: [
        'Adecuación',
        'Ampliación',
        'Demolición',
        'Mantenimiento',
        'Obra nueva',
        'Remodelación',
      ],
      multi: true,
      group: 'avanzados',
    },
    {
      label: 'M² superficie',
      options: ['0 - 1,000', '1,000 - 5,000', '5,000 - 10,000', '> 10,000'],
      group: 'avanzados',
    },
    {
      label: 'Inversión',
      options: ['$0 - $1M', '$1M - $10M', '$10M - $100M', '$100M+'],
      group: 'avanzados',
    },
    {
      label: 'Sector',
      options: ['Privado', 'Gobierno'],
      multi: true,
      group: 'principales',
    },
  ];

  const handleSearch = () => {
    console.log('Filtros aplicados', {
      selectedRegiones,
      selectedEstados,
      selectedGeneros,
      selectedSubgeneros,
      selectedSectores,
      selectedEtapas,
      selectedDesarrollos,
      selectedTipoObra,
      selectedTiposProyecto,
      investmentMin,
      investmentMax,
      periodoIndex,
      selectedValues,
    });
  };

  const estadosVisibles = selectedRegiones.length
    ? selectedRegiones.flatMap(
        (region) => estadosPorRegion[region] || []
      )
    : [];

  const fechaSeleccionada =
    selectedValues['Fecha de consulta'] ||
    'Fecha de publicación';

  const periodoSeleccionado =
    periodosConsulta[periodoIndex];

  const fechaHint =
    fechaSeleccionada === 'Fecha de publicación'
      ? `📢 Consultando proyectos publicados durante los últimos ${periodoSeleccionado}.`
      : fechaSeleccionada === 'Fecha de inicio probable'
      ? `🚧 Consultando proyectos que iniciarán durante los próximos ${periodoSeleccionado}.`
      : `🏁 Consultando proyectos con fecha estimada de término durante los próximos ${periodoSeleccionado}.`;

  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [hoveredGenero, setHoveredGenero] = useState(null);
  const [hoveredSubgenero, setHoveredSubgenero] = useState(null);

  const filtrosActivos = {
    regiones: selectedRegiones,
    estados: selectedEstados,
    generos: selectedGeneros,
    subgeneros: selectedSubgeneros,
    sectores: selectedSectores,
    etapas: selectedEtapas,
    desarrollos: selectedDesarrollos,
    tipoObra: selectedTipoObra,
    tiposProyecto: selectedTiposProyecto,
    investmentMin,
    investmentMax,
    periodoIndex,
    fechaConsulta: selectedValues['Fecha de consulta'],
    superficie: (() => {
      const raw = selectedValues['M² superficie'];

      if (!raw) return [];

      const values = Array.isArray(raw) ? raw : [raw];

      return values
        .map((item) => String(item).trim())
        .filter(
          (item) =>
            item.length > 0 &&
            ['0 - 1,000', '1,000 - 5,000', '5,000 - 10,000', '> 10,000'].includes(item)
        );
    })(),
  };

  useEffect(() => {
    console.log('SUPERFICIE NORMALIZADA:', filtrosActivos.superficie);
    console.log('FILTROS PUBLICADOS:', filtrosActivos);
    window.construleadsFilters = filtrosActivos;

    window.dispatchEvent(
      new Event('construleads-filters-changed')
    );
  }, [
    selectedRegiones,
    selectedEstados,
    selectedGeneros,
    selectedSubgeneros,
    selectedSectores,
    selectedEtapas,
    selectedDesarrollos,
    selectedTipoObra,
    selectedTiposProyecto,
    investmentMin,
    investmentMax,
    periodoIndex,
    selectedValues,
  ]);

  return (
    <Box
      w="280px"
      h="calc(100vh - 120px)"
      minH="calc(100vh - 120px)"
      maxH="calc(100vh - 120px)"
      display="flex"
      flexDirection="column"
      gap={2}
    >
      <Box
        bg="white"
        p={4}
        borderRadius="20px"
        boxShadow="sm"
        h="100%"
        display="flex"
        flexDirection="column"
        overflow="visual"
      >
        <Flex
          justify="space-between"
          align="center"
          mb={5}
        >
          <Heading
            size="sm"
            color="#1F2937"
          >
            Busqueda
          </Heading>

          <Text
            color="#FF6600"
            fontSize="13px"
            cursor="pointer"
            onClick={() => {
              setSelectedValues({});
              setSelectedRegiones([]);
              setSelectedEstados([]);
              setSelectedGeneros([]);
              setSelectedSubgeneros([]);
              setSelectedDetalles([]);
              setSelectedSectores([]);
              setSelectedEtapas([]);
              setSelectedDesarrollos([]);
              setSelectedTipoObra([]);
              setSelectedTiposProyecto([]);
              setInvestmentMin(0);
              setInvestmentMax(1000000000);
              localStorage.removeItem('construleads-filtros');
            }}
          >
            Limpiar filtros
          </Text>
        </Flex>

        <Flex
          mb={4}
          bg="#F5F5F5"
          borderRadius="12px"
          p="4px"
        >
          <Button
            flex={1}
            size="sm"
            borderRadius="10px"
            bg={activeFilterTab === 'principales' ? 'white' : 'transparent'}
            color={activeFilterTab === 'principales' ? '#FF6600' : '#6B7280'}
            boxShadow={activeFilterTab === 'principales' ? 'sm' : 'none'}
            onClick={() => setActiveFilterTab('principales')}
          >
            Principales
          </Button>

          <Button
            flex={1}
            size="sm"
            borderRadius="10px"
            bg={activeFilterTab === 'avanzados' ? 'white' : 'transparent'}
            color={activeFilterTab === 'avanzados' ? '#FF6600' : '#6B7280'}
            boxShadow={activeFilterTab === 'avanzados' ? 'sm' : 'none'}
            onClick={() => setActiveFilterTab('avanzados')}
          >
            Avanzados
          </Button>
        </Flex>

        <VStack
          gap={2.5}
          align="stretch"
          flex="1"
          minH={0}
          overflowY="auto"
          overflowX="visible"
          position="relative"
          zIndex={1}
          pr={1}
          pb={2}
        >
          {filtros
            .filter((filtro) => filtro.group === activeFilterTab)
            .map((filtro) => (
            <>

              {filtro.label === 'Periodo de consulta' ? (
                <Box key={filtro.label}>
                  <Text
                    fontSize="14px"
                    fontWeight="500"
                    color="#202020"
                    mb={1.5}
                  >
                    {filtro.label}
                  </Text>

                  <Box
                    border="1px solid #D9D9D9"
                    borderRadius="14px"
                    p={4}
                    bg="white"
                  >
                    <Flex justify="space-between" mb={2}>
                      <Text fontSize="13px" fontWeight="600" color="#FF6600">
                        {periodosConsulta[periodoIndex]}
                      </Text>
                    </Flex>

                    <input
                      type="range"
                      min="0"
                      max={periodosConsulta.length - 1}
                      step="1"
                      value={periodoIndex}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setPeriodoIndex(value);
                        setSelectedValues((prev) => ({
                          ...prev,
                          'Periodo de consulta': periodosConsulta[value],
                        }));
                      }}
                      style={{
                        width: '100%',
                        accentColor: '#FF6600',
                        cursor: 'pointer',
                      }}
                    />

                    <Flex justify="space-between" mt={2}>
                      {periodosConsulta.map((_, index) => (
                        <Box
                          key={index}
                          w="6px"
                          h="6px"
                          borderRadius="full"
                          bg={index <= periodoIndex ? '#FF6600' : '#D1D5DB'}
                        />
                      ))}
                    </Flex>
                  </Box>

                  <Box
                    mt={3}
                    p={3}
                    bg="#FFF7ED"
                    border="1px solid #FED7AA"
                    borderRadius="12px"
                  >
                    <Text
                      fontSize="12px"
                      color="#9A3412"
                      fontWeight="500"
                      lineHeight="1.5"
                    >
                      {fechaHint}
                    </Text>
                  </Box>
                </Box>
              )
              : filtro.label === 'Inversión' ? (
                (() => {
                  // Local constants for robust dual-slider UX
                  const INVESTMENT_MAX = 1000000000;
                  const minPercent = (investmentMin / INVESTMENT_MAX) * 100;
                  const maxPercent = (investmentMax / INVESTMENT_MAX) * 100;
                  const formatMillions = (value) => `${Math.round(value / 1000000)}M`;
                  return (
                    <Box key={filtro.label}>
                      <Text
                        fontSize="14px"
                        fontWeight="500"
                        color="#202020"
                        mb={1.5}
                      >
                        {filtro.label}
                      </Text>
                      <Box
                        border="1px solid #D9D9D9"
                        borderRadius="14px"
                        p={4}
                        bg="white"
                      >
                        <Flex align="center" justify="space-between" mb={2}>
                          <Text fontSize="13px" fontWeight="600" color="#FF6600">
                            Desde: ${formatMillions(investmentMin)}
                          </Text>
                          <Text fontSize="13px" fontWeight="600" color="#FF6600">
                            Hasta: ${formatMillions(investmentMax)}
                          </Text>
                        </Flex>
                        <Box position="relative" h="36px" mt={2}>
                          {/* Gray track background */}
                          <Box
                            position="absolute"
                            left="0"
                            right="0"
                            top="18px"
                            h="4px"
                            bg="#E5E7EB"
                            borderRadius="999px"
                            zIndex={0}
                            transform="none"
                          />
                          {/* Orange track overlay - above gray */}
                          <Box
                            position="absolute"
                            top="18px"
                            h="4px"
                            borderRadius="2px"
                            bg="#FF6600"
                            zIndex={1}
                            left={`${minPercent}%`}
                            width={`${Math.max(maxPercent - minPercent, 0)}%`}
                            transform="none"
                          />
                          {/* Dual range sliders */}
                          <input
                            type="range"
                            min={0}
                            max={INVESTMENT_MAX}
                            step={1000000}
                            value={investmentMin}
                            onChange={e => {
                              let val = Number(e.target.value);
                              if (val > investmentMax) val = investmentMax;
                              setInvestmentMin(val);
                            }}
                            className="investment-min-slider"
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: '-2px',
                              width: '100%',
                              background: 'transparent',
                              pointerEvents: 'none',
                              appearance: 'none',
                              zIndex: 3,
                            }}
                          />
                          <input
                            type="range"
                            min={0}
                            max={INVESTMENT_MAX}
                            step={1000000}
                            value={investmentMax}
                            onChange={e => {
                              let val = Number(e.target.value);
                              if (val < investmentMin) val = investmentMin;
                              setInvestmentMax(val);
                            }}
                            className="investment-max-slider"
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: '-2px',
                              width: '100%',
                              background: 'transparent',
                              pointerEvents: 'none',
                              appearance: 'none',
                              zIndex: 4,
                            }}
                          />
                          {/* Only thumbs are interactive */}
                          <style>
                            {`
                            .investment-min-slider::-webkit-slider-thumb,
                            .investment-max-slider::-webkit-slider-thumb {
                              -webkit-appearance:none;
                              appearance:none;
                              width:18px;
                              height:18px;
                              border-radius:50%;
                              background:#FF6600;
                              border:3px solid white;
                              box-shadow:0 2px 6px rgba(0,0,0,.2);
                              cursor:pointer;
                              pointer-events:auto;
                            }
                            .investment-min-slider::-webkit-slider-runnable-track,
                            .investment-max-slider::-webkit-slider-runnable-track {
                              height:4px;
                              background:transparent;
                            }
                            .investment-min-slider::-moz-range-thumb,
                            .investment-max-slider::-moz-range-thumb {
                              width:18px;
                              height:18px;
                              border-radius:50%;
                              background:#FF6600;
                              border:3px solid white;
                              box-shadow:0 2px 6px rgba(0,0,0,.2);
                              cursor:pointer;
                              pointer-events:auto;
                            }
                            .investment-min-slider::-ms-thumb,
                            .investment-max-slider::-ms-thumb {
                              width:18px;
                              height:18px;
                              border-radius:50%;
                              background:#FF6600;
                              border:3px solid white;
                              box-shadow:0 2px 6px rgba(0,0,0,.2);
                              cursor:pointer;
                              pointer-events:auto;
                            }
                            .investment-min-slider,
                            .investment-max-slider {
                              outline: none;
                            }
                            `}
                          </style>
                        </Box>
                        <Text fontSize="11px" color="#9CA3AF" mt={3} textAlign="center">
                          Valores en millones de pesos (M)
                        </Text>
                      </Box>
                    </Box>
                  );
                })()
              )
              : filtro.label === 'M² superficie' ? (
                <Box key={filtro.label}>
                  <Text
                    fontSize="14px"
                    fontWeight="500"
                    color="#202020"
                    mb={1.5}
                  >
                    {filtro.label}
                  </Text>

                  <SimpleGrid columns={2} spacing={2}>
                    {filtro.options.map((option) => {
                      const selected = (selectedValues['M² superficie'] || []).includes(option);

                      return (
                        <Box
                          key={option}
                          px={2}
                          py={3}
                          borderRadius="12px"
                          border="1px solid"
                          borderColor={selected ? '#FF6600' : '#E5E7EB'}
                          boxShadow={selected ? 'sm' : 'none'}
                          bg={selected ? '#FFF1E8' : 'white'}
                          color={selected ? '#FF6600' : '#202020'}
                          cursor="pointer"
                          textAlign="center"
                          whiteSpace="nowrap"
                          fontSize="12px"
                          lineHeight="1"
                          fontWeight={selected ? '600' : '500'}
                          transition="all 0.2s"
                          transform={selected ? 'scale(1.02)' : 'scale(1)'}
                          _hover={{
                            borderColor: '#FF6600',
                            bg: '#FFF7ED',
                          }}
                          onClick={() => {
                            setSelectedValues((prev) => {
                              const current = prev['M² superficie'] || [];

                              return {
                                ...prev,
                                'M² superficie': current.includes(option)
                                  ? current.filter((item) => item !== option)
                                  : [...current, option],
                              };
                            });
                          }}
                        >
                          {option}
                        </Box>
                      );
                    })}
                  </SimpleGrid>
                </Box>
              ) : (
                <Box key={filtro.label}>
                  <Text
                    fontSize="14px"
                    fontWeight="500"
                    color="#202020"
                    mb={1.5}
                  >
                    {filtro.label}
                  </Text>

                  <Box position="relative">
                    <Flex
                      h="48px"
                      px={2}
                      bg="white"
                      border="1px solid #D9D9D9"
                      borderRadius="14px"
                      align="center"
                      justify="space-between"
                      cursor="pointer"
                      onClick={() => {
                        setOpenDropdown(
                          openDropdown === filtro.label
                            ? null
                            : filtro.label
                        )
                      }}
                    >
                      <Text
                        fontSize="14px"
                        color={
                          (filtro.label === 'Región' && selectedRegiones.length) ||
                          (filtro.label === 'Género' && (selectedGeneros.length || selectedSubgeneros.length)) ||
                          (filtro.label === 'Estado' && selectedEstados.length) ||
                          (filtro.label === 'Subgénero' && selectedSubgeneros.length) ||
                          (filtro.label === 'Sector' && selectedSectores.length) ||
                          (filtro.label === 'Etapa' && selectedEtapas.length) ||
                          (filtro.label === 'Tipo obra' && selectedTipoObra.length) ||
                          (filtro.label === 'Tipo desarrollo' && selectedDesarrollos.length) ||
                          selectedValues[filtro.label]
                            ? '#202020'
                            : '#9CA3AF'
                        }
                      >
                        {filtro.label === 'Región'
                          ? (selectedRegiones.length
                              ? `${selectedRegiones.length} regiones seleccionadas`
                              : 'Selecciona una región')
                          : filtro.label === 'Género'
                          ? (selectedGeneros.length
                              ? `${selectedGeneros.length} género${selectedGeneros.length > 1 ? 's' : ''} seleccionado${selectedGeneros.length > 1 ? 's' : ''}`
                              : 'Selecciona una opción')
                          : filtro.label === 'Estado'
                          ? (selectedEstados.length
                              ? `${selectedEstados.length} estados seleccionados`
                              : 'Selecciona una opción')
                          : filtro.label === 'Subgénero'
                          ? (selectedSubgeneros.length
                              ? `${selectedSubgeneros.length} subgéneros seleccionados`
                              : 'Selecciona una opción')
                          : filtro.label === 'Sector'
                          ? (selectedSectores.length
                              ? `${selectedSectores.length} seleccionados`
                              : 'Selecciona una opción')
                          : filtro.label === 'Etapa'
                          ? (selectedEtapas.length
                              ? `${selectedEtapas.length} seleccionados`
                              : 'Selecciona una opción')
                          : filtro.label === 'Tipo obra'
                          ? (selectedTipoObra.length
                              ? `${selectedTipoObra.length} seleccionado${selectedTipoObra.length > 1 ? 's' : ''}`
                              : 'Selecciona una opción')
                          : filtro.label === 'Tipo de proyecto'
                          ? (selectedTiposProyecto.length
                              ? `${selectedTiposProyecto.length} seleccionado${selectedTiposProyecto.length > 1 ? 's' : ''}`
                              : 'Selecciona una opción')
                          : filtro.label === 'Tipo desarrollo'
                          ? (selectedDesarrollos.length
                              ? `${selectedDesarrollos.length} seleccionados`
                              : 'Selecciona una opción')
                          : (selectedValues[filtro.label] || 'Selecciona una opción')}
                      </Text>

                      <Text fontSize="18px">⌄</Text>
                    </Flex>

                    {openDropdown === filtro.label && (
                      <Box
                        position="absolute"
                        {
                          ...( ['Sector', 'Inversión', 'M² superficie', 'Tipo desarrollo', 'Etapa'].includes(filtro.label)
                            ? { bottom: '54px' }
                            : { top: '54px' }
                          )
                        }
                        left="0"
                        w="100%"
                        bg="white"
                        border="1px solid #E5E7EB"
                        borderRadius="14px"
                        boxShadow="xl"
                        zIndex="99999"
                        overflow="visible"
                        fontSize="12px"
                        onMouseLeave={() => {
                          setHoveredRegion(null);
                          setHoveredGenero(null);
                          setHoveredSubgenero(null);
                        }}
                      >
                        {filtro.label === 'Estado' ? (
                          <Box
                            p={3}
                            maxH="420px"
                            overflowY="auto"
                          >
                            {selectedRegiones.map((region) => {
                              const estadosRegion = estadosPorRegion[region] || [];

                              const todosSeleccionados = estadosRegion.every((estado) =>
                                selectedEstados.includes(estado)
                              );

                              return (
                                <Box key={region} mb={4}>
                                  <Flex
                                    bg="#FFF7ED"
                                    borderRadius="12px"
                                    px={3}
                                    py={3}
                                    mb={2}
                                    justify="space-between"
                                    align="center"
                                    cursor="pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();

                                      setSelectedEstados((prev) => {
                                        if (todosSeleccionados) {
                                          return prev.filter(
                                            (estado) => !estadosRegion.includes(estado)
                                          );
                                        }

                                        const nuevos = [...prev];

                                        estadosRegion.forEach((estado) => {
                                          if (!nuevos.includes(estado)) {
                                            nuevos.push(estado);
                                          }
                                        });

                                        return nuevos;
                                      });
                                    }}
                                  >
                                    <Flex align="center" gap={3}>
                                      <Box
                                        w="24px"
                                        h="24px"
                                        borderRadius="6px"
                                        border="2px solid #35B56A"
                                        bg={todosSeleccionados ? '#35B56A' : 'white'}
                                        color="white"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        fontWeight="700"
                                        fontSize="13px"
                                      >
                                        {todosSeleccionados ? '✓' : ''}
                                      </Box>

                                      <Text
                                        fontSize="13px"
                                        fontWeight="700"
                                        color="#FF6600"
                                      >
                                        {region.toUpperCase()} ({estadosRegion.length})
                                      </Text>
                                    </Flex>
                                  </Flex>

                                  <VStack align="stretch" gap={1}>
                                    {estadosRegion.map((estado) => (
                                      <Flex
                                        key={estado}
                                        px={3}
                                        py={2}
                                        borderRadius="8px"
                                        cursor="pointer"
                                        justify="space-between"
                                        align="center"
                                        bg={selectedEstados.includes(estado) ? '#FFF1E8' : 'white'}
                                        _hover={{ bg: '#FFF7ED' }}
                                        onClick={(e) => {
                                          e.stopPropagation();

                                          setSelectedEstados((prev) =>
                                            prev.includes(estado)
                                              ? prev.filter((item) => item !== estado)
                                              : [...prev, estado]
                                          );
                                        }}
                                      >
                                        <Text
                                          color={selectedEstados.includes(estado) ? '#FF6600' : '#202020'}
                                          fontSize="13px"
                                        >
                                          {estado}
                                        </Text>

                                        {selectedEstados.includes(estado) && (
                                          <Text
                                            color="#35B56A"
                                            fontWeight="700"
                                            fontSize="16px"
                                          >
                                            ✓
                                          </Text>
                                        )}
                                      </Flex>
                                    ))}
                                  </VStack>
                                </Box>
                              );
                            })}
                          </Box>
                        ) : filtro.label === 'Subgénero' ? (
  <Box p={3} maxH="420px" overflowY="auto">
    {selectedGeneros.map((genero) => {
      const subgeneros = Object.values(
        subgenerosPorGenero[genero] || {}
      ).flat();

      const todosSeleccionados =
        subgeneros.length > 0 &&
        subgeneros.every((sub) =>
          selectedSubgeneros.includes(sub)
        );

      return (
        <Box key={genero} mb={4}>
          <Flex
            bg="#FFF7ED"
            borderRadius="12px"
            px={3}
            py={3}
            mb={2}
            justify="space-between"
            align="center"
            cursor="pointer"
            onClick={(e) => {
              e.stopPropagation();

              setSelectedSubgeneros((prev) => {
                if (todosSeleccionados) {
                  return prev.filter(
                    (item) => !subgeneros.includes(item)
                  );
                }

                const nuevos = [...prev];

                subgeneros.forEach((item) => {
                  if (!nuevos.includes(item)) nuevos.push(item);
                });

                return nuevos;
              });
            }}
          >
            <Text fontSize="13px" fontWeight="700" color="#FF6600">
              {genero.toUpperCase()} ({subgeneros.length})
            </Text>

            <Box
              w="24px"
              h="24px"
              borderRadius="6px"
              border="2px solid #35B56A"
              bg={todosSeleccionados ? '#35B56A' : 'white'}
              color="white"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontWeight="700"
            >
              {todosSeleccionados ? '✓' : ''}
            </Box>
          </Flex>

          <VStack align="stretch" gap={1}>
            {subgeneros.map((subgenero) => (
              <Flex
                key={subgenero}
                px={3}
                py={2}
                borderRadius="8px"
                cursor="pointer"
                justify="space-between"
                align="center"
                bg={selectedSubgeneros.includes(subgenero)
                  ? '#FFF1E8'
                  : 'white'}
                _hover={{ bg: '#FFF7ED' }}
                onClick={(e) => {
                  e.stopPropagation();

                  setSelectedSubgeneros((prev) =>
                    prev.includes(subgenero)
                      ? prev.filter((item) => item !== subgenero)
                      : [...prev, subgenero]
                  );
                }}
              >
                <Text
                  color={selectedSubgeneros.includes(subgenero)
                    ? '#FF6600'
                    : '#202020'}
                  fontSize="13px"
                >
                  {subgenero}
                </Text>

                {selectedSubgeneros.includes(subgenero) && (
                  <Text color="#35B56A" fontWeight="700" fontSize="16px">
                    ✓
                  </Text>
                )}
              </Flex>
            ))}
          </VStack>
        </Box>
      );
    })}
  </Box>
                        ) : (
                          <>
                            {[...filtro.options]
                              .sort((a, b) => {
                                const prioridad = ['Sureste', 'Noreste', 'Centro', 'Noroeste', 'Oeste'];

                                const aIndex = prioridad.indexOf(a);
                                const bIndex = prioridad.indexOf(b);

                                if (aIndex === -1 && bIndex === -1) return 0;
                                if (aIndex === -1) return 1;
                                if (bIndex === -1) return -1;

                                return aIndex - bIndex;
                              })
                              .map((option) => (
                                <Box
                                  key={option}
                                  px={4}
                                  py={3}
                                  cursor="pointer"
                                  bg={
                                    (filtro.label === 'Región' && selectedRegiones.includes(option)) ||
                                    (filtro.label === 'Género' && selectedGeneros.includes(option)) ||
                                    (filtro.label === 'Estado' && selectedEstados.includes(option)) ||
                                    (filtro.label === 'Sector' && selectedSectores.includes(option)) ||
                                    (filtro.label === 'Etapa' && selectedEtapas.includes(option)) ||
                                    (filtro.label === 'Tipo obra' && selectedTipoObra.includes(option)) ||
                                    (filtro.label === 'Tipo desarrollo' && selectedDesarrollos.includes(option)) ||
                                    (filtro.label === 'Tipo de proyecto' && selectedTiposProyecto.includes(option))
                                      ? '#FFF1E8'
                                      : 'white'
                                  }
                                  color={
                                    (filtro.label === 'Región' && selectedRegiones.includes(option)) ||
                                    (filtro.label === 'Género' && selectedGeneros.includes(option)) ||
                                    (filtro.label === 'Estado' && selectedEstados.includes(option)) ||
                                    (filtro.label === 'Sector' && selectedSectores.includes(option)) ||
                                    (filtro.label === 'Etapa' && selectedEtapas.includes(option)) ||
                                    (filtro.label === 'Tipo obra' && selectedTipoObra.includes(option)) ||
                                    (filtro.label === 'Tipo desarrollo' && selectedDesarrollos.includes(option)) ||
                                    (filtro.label === 'Tipo de proyecto' && selectedTiposProyecto.includes(option))
                                      ? '#FF6600'
                                      : '#202020'
                                  }
                                  _hover={{
                                    bg: '#FFF1E8',
                                    color: '#FF6600',
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    if (filtro.label === 'Región') {
                                      setSelectedRegiones((prev) => {
                                        const nuevasRegiones = prev.includes(option)
                                          ? prev.filter((r) => r !== option)
                                          : [...prev, option];

                                        const estadosPermitidos = nuevasRegiones.flatMap(
                                          (region) => estadosPorRegion[region] || []
                                        );

                                        setSelectedEstados((actuales) =>
                                          actuales.filter((estado) =>
                                            estadosPermitidos.includes(estado)
                                          )
                                        );

                                        return nuevasRegiones;
                                      });
                                      return;
                                    }
                                    if (filtro.label === 'Género') {
                                      setSelectedGeneros((prev) =>
                                        prev.includes(option)
                                          ? prev.filter((g) => g !== option)
                                          : [...prev, option]
                                      );
                                      return;
                                    }
                                    if (filtro.label === 'Estado') {
                                      setSelectedEstados((prev) =>
                                        prev.includes(option)
                                          ? prev.filter((e) => e !== option)
                                          : [...prev, option]
                                      );
                                      return;
                                    }
                                    if (filtro.label === 'Subgénero') {
                                      return;
                                    }

                                    const multiMap = {
                                      'Sector': [selectedSectores, setSelectedSectores],
                                      'Etapa': [selectedEtapas, setSelectedEtapas],
                                      'Tipo desarrollo': [selectedDesarrollos, setSelectedDesarrollos],
                                      'Tipo obra': [selectedTipoObra, setSelectedTipoObra],
                                      'Tipo de proyecto': [selectedTiposProyecto, setSelectedTiposProyecto],
                                    };

                                    if (multiMap[filtro.label]) {
                                      const [selected, setter] = multiMap[filtro.label];

                                      setter(
                                        selected.includes(option)
                                          ? selected.filter((item) => item !== option)
                                          : [...selected, option]
                                      );

                                      return;
                                    }

                                    setSelectedValues((prev) => ({
                                      ...prev,
                                      [filtro.label]: option,
                                    }));
                                    setOpenDropdown(null);
                                  }}
                                  onMouseEnter={() => {
                                    if (filtro.label === 'Región') setHoveredRegion(option);
                                  }}
                                  position="relative"
                                >
                                  <Flex justify="space-between" align="center">
                                    <Flex align="center" justify="space-between" w="100%">
                                      <Text>{option}</Text>
                                      {filtro.label === 'Región' && (
                                        <Text color="#9CA3AF" fontSize="12px">
                                          ›
                                        </Text>
                                      )}
                                    </Flex>

                                    {(
                                      (filtro.label === 'Región' && selectedRegiones.includes(option)) ||
                                      (filtro.label === 'Género' && selectedGeneros.includes(option)) ||
                                      (filtro.label === 'Estado' && selectedEstados.includes(option)) ||
                                      (filtro.label === 'Sector' && selectedSectores.includes(option)) ||
                                      (filtro.label === 'Etapa' && selectedEtapas.includes(option)) ||
                                      (filtro.label === 'Tipo obra' && selectedTipoObra.includes(option)) ||
                                      (filtro.label === 'Tipo desarrollo' && selectedDesarrollos.includes(option)) ||
                                      (filtro.label === 'Tipo de proyecto' && selectedTiposProyecto.includes(option))
                                    ) && (
                                      <Text
                                        color="#35B56A"
                                        fontWeight="700"
                                        fontSize="16px"
                                      >
                                        ✓
                                      </Text>
                                    )}
                                  </Flex>
                                  {/* Región submenu */}
                                  {filtro.label === 'Región' &&
                                    hoveredRegion === option &&
                                    estadosPorRegion[option] && (
                                      <Box
                                        position="fixed"
                                        left="540px"
                                        top="260px"
                                        transform="none"
                                        ml={0}
                                        minW="240px"
                                        bg="white"
                                        border="1px solid #E5E7EB"
                                        borderRadius="12px"
                                        boxShadow="xl"
                                        zIndex="99999"
                                        p={3}
                                        maxH="420px"
                                        overflowY="auto"
                                      >
                                        <Text
                                          fontSize="12px"
                                          fontWeight="700"
                                          color="#FF6600"
                                          mb={2}
                                        >
                                          {option}
                                        </Text>
                                        <VStack align="stretch" gap={1}>
                                          <Text
                                            mb={3}
                                            fontSize="11px"
                                            color="#9CA3AF"
                                            fontStyle="italic"
                                          >
                                            ℹ Estados incluidos en esta región.
                                            Vista informativa. La selección se realiza desde el filtro avanzado de Estado.
                                          </Text>
                                          {[...estadosPorRegion[option]]
                                            .sort((a, b) => {
                                              const prioridad = ['Sureste', 'Noreste'];

                                              const indexA = prioridad.indexOf(option);
                                              const indexB = prioridad.indexOf(option);

                                              if (indexA !== -1) return -1;
                                              if (indexB !== -1) return 1;

                                              return 0;
                                            })
                                            .map((estado) => (
                                              <Flex
                                                key={estado}
                                                align="center"
                                                px={2}
                                                py={1.5}
                                                borderRadius="8px"
                                                bg="#FAFAFA"
                                              >
                                                <Text fontSize="12px" color="#374151">
                                                  {estado}
                                                </Text>
                                              </Flex>
                                            ))}
                                        </VStack>
                                      </Box>
                                    )}
                                </Box>
                              ))}
                          </>
                        )
                        }
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
            </>
          ))}

        </VStack>
        <Box
          pt={3}
          mt="auto"
          borderTop="1px solid #F1F1F1"
          bg="white"
          flexShrink={0}
        >
          <Button
            w="100%"
            bg="#FF6600"
            color="white"
            _hover={{ bg: '#E65C00' }}
            onClick={handleSearch}
          >
            Buscar
          </Button>
        </Box>
      </Box>


    </Box>
  );
}