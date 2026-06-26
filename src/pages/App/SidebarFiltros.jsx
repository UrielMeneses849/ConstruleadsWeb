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

// Accordion helper
function FilterAccordion({ title, count, expanded, onToggle, children }) {
  return (
    <Box
      border="1px solid #ECECEC"
      borderRadius="12px"
      bg="white"
      mb={2}
      overflow="hidden"
      flexShrink={0}
      transition="all .18s ease"
    >
      <Flex
        align="center"
        justify="space-between"
        px={3}
        py={2}
        minH="44px"
        cursor="pointer"
        _hover={{ bg: '#FAFAFA' }}
        onClick={onToggle}
        userSelect="none"
        transition="all .18s ease"
      >
        <Text fontSize="13px" fontWeight="600" color="#202020" display="flex" alignItems="center">
          {title}
          {typeof count === 'number' && count > 0 ? (
            <Box
              as="span"
              bg="#F3F4F6"
              color="#202020"
              px={2}
              py={0.5}
              borderRadius="8px"
              fontWeight="700"
              fontSize="11px"
              ml={2}
              display="inline-block"
            >
              {count}
            </Box>
          ) : null}
        </Text>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          w="24px"
          h="24px"
          borderRadius="8px"
          transition="all 180ms ease"
          _hover={{ bg: '#FAFAFA' }}
        >
          <Box
            as="svg"
            viewBox="0 0 20 20"
            w="14px"
            h="14px"
            color="#6B7280"
            transition="transform .22s ease"
            transform={expanded ? 'rotate(180deg)' : 'rotate(0deg)'}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="5 7.5 10 12.5 15 7.5" />
          </Box>
        </Box>
      </Flex>
      {expanded && (
        <Box
          pt={0}
          pb={3}
          px={3}
          borderTop="1px solid #ECECEC"
          bg="white"
        >
          {children}
        </Box>
      )}
    </Box>
  );
}

function getDefaultAccordion(tab) {
  return tab === 'avanzados'
    ? { Subgénero: true }
    : { 'Fecha de consulta': true };
}

export default function SidebarFiltros() {
  // Accordions state
  const [openedAccordions, setOpenedAccordions] = useState(
    getDefaultAccordion('principales')
  );
  const [activeFilterTab, setActiveFilterTab] = useState('principales');
  const [expandedRegions, setExpandedRegions] = useState({});

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
      Object.keys(subgenerosPorGenero[genero] || {})
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
        'Condominios de Lujo',
        'Vivienda Unifamiliar de Lujo',
      ],
      Medio: [
        'Condominios Medio',
        'Vivienda Unifamiliar Interés Medio',
      ],
      Social: [
        'Vivienda Plurifamiliar Interés Social',
        'Vivienda Unifamiliar Interés Social',
      ],
    },
    Edificacion: {
      Comercial: [
        'Plazas Comercio, Tiendas, Autoservicio',
        'Edificios de Oficinas',
        'Bancarias, Bolsa y Corredurías',
        'Agencias Automotrices y Talleres',
        'Centrales de Carga y Distribución',
        'Restaurantes y Salones de Eventos',
        'Mercados Públicos y Centrales de Abastos',
        'Cines y Teatros',
        'Centros de Diversiones',
        'Gasolinerías',
        'Terminales de Transporte',
        'Edificios de Estacionamiento',
      ],
      Educativo: [
        'Edificios de Educación Superior',
        'Edificios de Educación Básica',
        'Edificios de Educación Media',
      ],
      Institucional: [
        'Judiciales y Bomberos',
        'Albergues, Orfanatos, Asilos y Conventos',
        'Iglesias y Templos',
        'Crematorios y Velatorios',
        'Instalaciones Deportivas',
      ],
      Salud: [
        'Centros de Rehabilitación y Salud',
        'Clínicas, Hospitales y Centros Médicos',
      ],
      Turistico: [
        'Desarrollos Turísticos - Hoteleros',
        'Hoteles 4 y 5 Estrellas, GTurismo y Negocios',
        'Hoteles de 1, 2 y 3 Estrellas y Moteles',
      ],
    },
    Industrial: {
      Industrial: [
        'Naves, Almacenes y Bodegas',
        'Cámaras Frigoríficas y Rastros',
        'Laboratorios',
        'Plantas Industriales',
        'Parques Industriales',
        'Petroleras, Petroquímicas y Refinerías',
        'Hidro + Termoeléctricas y Subestaciones',
      ],
    },
    Infraestructura: {
      Infraestructura: [
        'Hidro - Agropecuaria',
        'Agua Potable',
        'Drenaje y Saneamiento',
        'Telecomunicaciones',
        'Electrificación',
        'Marítimas',
        'Aeropuertos',
        'Vías Férreas, Tren Ligero, Metro',
        'Urbanización',
        'Carreteras',
        'Redes de Gas',
        'Presas',
        'Plantas de Tratamiento de Agua',
        'Puentes y Estructuras',
        'Pavimentos',
        'Tren Alta Velocidad',
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
        'Proyecto contratado',
        'Proyecto de inversion'
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
        Object.keys(subgenerosPorGenero[genero] || {})
      )
    : [],
  multi: true,
  group: 'avanzados',
},

    {
      label: 'Etapa',
      options: [
        'Inicio',
        'Obra Negociada',
        'Pre-Inicio',
        'Plan',
        'Proyecto',
        'Pre-Plan',
      ],
      multi: true,
      group: 'avanzados',
    },
    {
      label: 'Tipo desarrollo',
      options: [
        'Obra Nueva',
        'Ampliacion',
        'Rehabilitacion',
        'Mantenimiento',
        'Remodelacion',
        'Adecuacion',
        'Terminacion',
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


  const filtrosActivos = {
    regiones: selectedRegiones,
    estados: selectedEstados,
    generos: selectedGeneros,
    subgeneros: selectedSubgeneros,
    sectores: selectedSectores,
    etapas: selectedEtapas,
    desarrollos: selectedDesarrollos,
    tipoObra: selectedTipoObra,
    tipoObraSeleccionados: selectedTipoObra,
    tiposObra: selectedTipoObra,
    tiposObraFiltro: selectedTipoObra,
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
    console.log('TIPOS OBRA PUBLICADOS:', selectedTipoObra);
    console.log('SUBGENEROS PUBLICADOS:', filtrosActivos.subgeneros);
    console.log('TIPOS OBRA FILTRO:', filtrosActivos.tiposObraFiltro);
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

  // Search helpers for filtering options if > 10
  const [searchInputs, setSearchInputs] = useState({});
  function renderOptionsWithSearch(options, label, selectedArr, setSelectedArr, multi = true) {
    const searchValue = searchInputs[label] || '';
    const filtered = searchValue
      ? options.filter((o) => o.toLowerCase().includes(searchValue.toLowerCase()))
      : options;
    return (
      <Box>
        {options.length > 10 && (
          <Box mb={2}>
            <input
              value={searchValue}
              onChange={e =>
                setSearchInputs((prev) => ({ ...prev, [label]: e.target.value }))
              }
              placeholder="Buscar..."
              style={{
                width: '100%',
                fontSize: '13px',
                padding: '6px 8px',
                border: '1px solid #ECECEC',
                borderRadius: '8px',
                marginBottom: 4,
                outline: 'none',
                color: '#202020',
                background: '#FAFAFA'
              }}
            />
          </Box>
        )}
        <VStack align="stretch" spacing={1}>
          {filtered.map((option) => {
            const selected = selectedArr.includes(option);
            return (
              <Flex
                key={option}
                px={2}
                py={1}
                borderRadius="8px"
                cursor="pointer"
                align="center"
                bg={selected ? '#FAFAFA' : 'white'}
                color={selected ? '#202020' : '#202020'}
                boxShadow={selected ? 'inset 0 0 0 1px #D1D5DB' : 'none'}
                fontSize="13px"
                transition="all 180ms ease"
                _hover={{ bg: '#FAFAFA' }}
                onClick={() => {
                  setSelectedArr((prev) =>
                    prev.includes(option)
                      ? prev.filter((item) => item !== option)
                      : multi
                      ? [...prev, option]
                      : [option]
                  );
                }}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  readOnly
                  style={{
                    marginRight: 8,
                    accentColor: '#202020',
                    width: 12,
                    height: 12,
                  }}
                />
                <Text flex={1}>{option}</Text>
              </Flex>
            );
          })}
        </VStack>
      </Box>
    );
  }

  // Accordion open/close logic
  function toggleAccordion(key) {
    setOpenedAccordions({ [key]: true });
  }

  function renderRegionAccordion() {
    const regiones = ['Oeste', 'Noroeste', 'Centro', 'Sureste', 'Noreste'];

    return (
      <FilterAccordion
        title="Región"
        count={selectedRegiones.length}
        expanded={!!openedAccordions['Región']}
        onToggle={() => toggleAccordion('Región')}
      >
        <VStack align="stretch" spacing={1}>
          {regiones.map((region) => {
            const estadosRegion = estadosPorRegion[region] || [];
            const selected = selectedRegiones.includes(region);
            const expanded = !!expandedRegions[region];

            return (
              <Box key={region}>
                <Flex
                  px={2}
                  py={1}
                  borderRadius="8px"
                  align="center"
                  bg={selected ? '#FAFAFA' : 'white'}
                  boxShadow={selected ? 'inset 0 0 0 1px #D1D5DB' : 'none'}
                  transition="all 180ms ease"
                  _hover={{ bg: '#FAFAFA' }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    readOnly
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedRegiones((prev) =>
                        prev.includes(region)
                          ? prev.filter((item) => item !== region)
                          : [...prev, region]
                      );
                    }}
                    style={{
                      marginRight: 8,
                      accentColor: '#202020',
                      width: 12,
                      height: 12,
                      cursor: 'pointer',
                    }}
                  />
                  <Text flex={1} fontSize="13px" color="#202020">
                    {region}
                  </Text>
                  <Box
                    color="#6B7280"
                    cursor="pointer"
                    fontSize="18px"
                    lineHeight="1"
                    px={1}
                    transform={expanded ? 'rotate(90deg)' : 'rotate(0deg)'}
                    transition="transform 180ms ease"
                    onClick={(event) => {
                      event.stopPropagation();
                      setExpandedRegions((prev) => ({
                        ...prev,
                        [region]: !prev[region],
                      }));
                    }}
                  >
                    ›
                  </Box>
                </Flex>

                {expanded && (
                  <VStack align="stretch" spacing={1} mt={1} pl={5}>
                    {estadosRegion.map((estado) => {
                      const estadoSeleccionado = selectedEstados.includes(estado);

                      return (
                        <Flex
                          key={estado}
                          px={2}
                          py={1}
                          borderRadius="8px"
                          align="center"
                          bg={estadoSeleccionado ? '#FAFAFA' : 'white'}
                          boxShadow={estadoSeleccionado ? 'inset 0 0 0 1px #D1D5DB' : 'none'}
                          cursor="pointer"
                          transition="all 180ms ease"
                          _hover={{ bg: '#FAFAFA' }}
                          onClick={() => {
                            setSelectedEstados((prev) =>
                              prev.includes(estado)
                                ? prev.filter((item) => item !== estado)
                                : [...prev, estado]
                            );
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={estadoSeleccionado}
                            readOnly
                            style={{
                              marginRight: 8,
                              accentColor: '#202020',
                              width: 12,
                              height: 12,
                            }}
                          />
                          <Text flex={1} fontSize="12px" color="#374151">
                            {estado}
                          </Text>
                        </Flex>
                      );
                    })}
                  </VStack>
                )}
              </Box>
            );
          })}
        </VStack>
      </FilterAccordion>
    );
  }

  // Accordions for Principales
  function renderPrincipales() {
    return (
      <>
        <FilterAccordion
          title="Fecha de consulta"
          count={selectedValues['Fecha de consulta'] ? 1 : 0}
          expanded={!!openedAccordions['Fecha de consulta']}
          onToggle={() => toggleAccordion('Fecha de consulta')}
        >
          <VStack align="stretch" gap={1}>
            {['Fecha de publicación', 'Fecha de inicio probable', 'Fecha de término probable'].map((option) => (
              <Flex
                key={option}
                align="center"
                px={2}
                py={1}
                borderRadius="8px"
                cursor="pointer"
                transition="all 180ms ease"
                _hover={{ bg: '#FAFAFA' }}
                bg={selectedValues['Fecha de consulta'] === option ? '#FAFAFA' : 'white'}
                boxShadow={selectedValues['Fecha de consulta'] === option ? 'inset 0 0 0 1px #D1D5DB' : 'none'}
                color={selectedValues['Fecha de consulta'] === option ? '#202020' : '#202020'}
                fontSize="13px"
                onClick={() =>
                  setSelectedValues((prev) => ({
                    ...prev,
                    'Fecha de consulta': option,
                  }))
                }
              >
                <input
                  type="radio"
                  name="fecha-consulta"
                  checked={selectedValues['Fecha de consulta'] === option}
                  readOnly
                  style={{
                    marginRight: 8,
                    accentColor: '#202020',
                    width: 12,
                    height: 12,
                  }}
                />
                <Text flex={1}>{option}</Text>
              </Flex>
            ))}
          </VStack>
        </FilterAccordion>

        <FilterAccordion
          title="Periodo de consulta"
          count={1}
          expanded={!!openedAccordions['Periodo de consulta']}
          onToggle={() => toggleAccordion('Periodo de consulta')}
        >
          <Box>
            <Flex justify="space-between" mb={2}>
              <Text fontSize="13px" fontWeight="600" color="#202020">
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
                accentColor: '#202020',
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
                  bg={index <= periodoIndex ? '#202020' : '#D1D5DB'}
                />
              ))}
            </Flex>
            <Box
              mt={3}
              p={2}
              bg="#FAFAFA"
              border="1px solid #ECECEC"
              borderRadius="8px"
            >
              <Text
                fontSize="12px"
                color="#6B7280"
                fontWeight="500"
                lineHeight="1.5"
              >
                {fechaHint}
              </Text>
            </Box>
          </Box>
        </FilterAccordion>

        {renderRegionAccordion()}

        <FilterAccordion
          title="Género"
          count={selectedGeneros.length}
          expanded={!!openedAccordions['Género']}
          onToggle={() => toggleAccordion('Género')}
        >
          {renderOptionsWithSearch(
            ['Vivienda', 'Industrial', 'Edificacion', 'Infraestructura'],
            'Género',
            selectedGeneros,
            setSelectedGeneros,
            true
          )}
        </FilterAccordion>

        <FilterAccordion
          title="Tipo de proyecto"
          count={selectedTiposProyecto.length}
          expanded={!!openedAccordions['Tipo de proyecto']}
          onToggle={() => toggleAccordion('Tipo de proyecto')}
        >
          {renderOptionsWithSearch(
            ['Proyecto contratado', 'Proyecto de inversion'],
            'Tipo de proyecto',
            selectedTiposProyecto,
            setSelectedTiposProyecto,
            true
          )}
        </FilterAccordion>

        <FilterAccordion
          title="Sector"
          count={selectedSectores.length}
          expanded={!!openedAccordions['Sector']}
          onToggle={() => toggleAccordion('Sector')}
        >
          {renderOptionsWithSearch(
            ['Privado', 'Gobierno'],
            'Sector',
            selectedSectores,
            setSelectedSectores,
            true
          )}
        </FilterAccordion>
      </>
    );
  }

  // Subgénero anidado Género → Subgénero → Tipo de obra
  function renderSubgeneroAccordion() {
    return (
      <FilterAccordion
        title="Subgénero"
        count={selectedTipoObra.length || selectedSubgeneros.length}
        expanded={!!openedAccordions['Subgénero']}
        onToggle={() => toggleAccordion('Subgénero')}
      >
        {selectedGeneros.length === 0 ? (
          <Text color="#9CA3AF" fontSize="13px" py={2}>
            Selecciona primero uno o más géneros.
          </Text>
        ) : (
          <Box maxH="360px" overflowY="auto" overflowX="hidden" pr={1}>
          {selectedGeneros.map((genero) => {
            const subgeneros = Object.keys(subgenerosPorGenero[genero] || {});
            const searchValue = searchInputs[`Subgénero-${genero}`] || '';
            const filteredSubgeneros = searchValue
              ? subgeneros.filter((sg) => sg.toLowerCase().includes(searchValue.toLowerCase()))
              : subgeneros;
            return (
              <Box key={genero} mb={2}>
                <Text fontWeight="700" fontSize="13px" color="#202020" mb={1}>
                  {genero.toUpperCase()} ({subgeneros.length} subgéneros)
                </Text>
                {subgeneros.length > 10 && (
                  <Box mb={1}>
                    <input
                      value={searchValue}
                      onChange={e =>
                        setSearchInputs((prev) => ({
                          ...prev,
                          [`Subgénero-${genero}`]: e.target.value,
                        }))
                      }
                      placeholder="Buscar subgénero..."
                      style={{
                        width: '100%',
                        fontSize: '13px',
                          padding: '6px 8px',
                          border: '1px solid #ECECEC',
                        borderRadius: '8px',
                        marginBottom: 2,
                        outline: 'none',
                        color: '#202020',
                        background: '#FAFAFA'
                      }}
                    />
                  </Box>
                )}
                <VStack align="stretch" spacing={1}>
                  {filteredSubgeneros.map((subgenero) => {
                    const tiposObra = subgenerosPorGenero[genero]?.[subgenero] || [];
                    const seleccionado = selectedSubgeneros.includes(subgenero);
                    const searchTipo = searchInputs[`TipoObra-${genero}-${subgenero}`] || '';
                    const filteredTiposObra = searchTipo
                      ? tiposObra.filter((t) => t.toLowerCase().includes(searchTipo.toLowerCase()))
                      : tiposObra;
                    return (
                      <Box
                        key={subgenero}
                        mb={2}
                        borderRadius="8px"
                        border="1px solid #ECECEC"
                        p={2}
                        bg={seleccionado ? '#FAFAFA' : 'white'}
                        boxShadow={seleccionado ? 'inset 0 0 0 1px #D1D5DB' : 'none'}
                      >
                        <Flex
                          align="center"
                          justify="space-between"
                          cursor="pointer"
                          onClick={() => {
                            setSelectedSubgeneros((prev) =>
                              prev.includes(subgenero)
                                ? prev.filter((item) => item !== subgenero)
                                : [...prev, subgenero]
                            );
                          }}
                        >
                          <Flex align="center">
                            <input
                              type="checkbox"
                              checked={seleccionado}
                              readOnly
                              style={{
                                marginRight: 8,
                                accentColor: '#202020',
                                width: 12,
                                height: 12,
                              }}
                            />
                            <Text fontWeight="600" fontSize="13px" color={seleccionado ? '#202020' : '#202020'}>
                              {subgenero}
                            </Text>
                          </Flex>
                        </Flex>
                        {tiposObra.length > 10 && (
                          <Box mt={2}>
                            <input
                              value={searchTipo}
                              onChange={e =>
                                setSearchInputs((prev) => ({
                                  ...prev,
                                  [`TipoObra-${genero}-${subgenero}`]: e.target.value,
                                }))
                              }
                              placeholder="Buscar tipo de obra..."
                              style={{
                                width: '100%',
                                fontSize: '13px',
                                  padding: '6px 8px',
                                  border: '1px solid #ECECEC',
                                borderRadius: '8px',
                                marginBottom: 2,
                                outline: 'none',
                                color: '#202020',
                                background: '#FAFAFA'
                              }}
                            />
                          </Box>
                        )}
                        <VStack align="stretch" spacing={1} mt={2}>
                          {filteredTiposObra.map((tipo) => {
                            const tipoSeleccionado = selectedTipoObra.includes(tipo);
                            return (
                              <Flex
                                key={tipo}
                                px={2}
                                py={1}
                                borderRadius="8px"
                                cursor="pointer"
                                align="center"
                                bg={tipoSeleccionado ? '#FAFAFA' : 'white'}
                                boxShadow={tipoSeleccionado ? 'inset 0 0 0 1px #D1D5DB' : 'none'}
                                color={tipoSeleccionado ? '#202020' : '#374151'}
                                fontSize="12px"
                                transition="all 180ms ease"
                                _hover={{ bg: '#FAFAFA' }}
                                onClick={() => {
                                  setSelectedTipoObra((prev) =>
                                    prev.includes(tipo)
                                      ? prev.filter((item) => item !== tipo)
                                      : [...prev, tipo]
                                  );
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={tipoSeleccionado}
                                  readOnly
                                  style={{
                                    marginRight: 8,
                                    accentColor: '#202020',
                                    width: 12,
                                    height: 12,
                                  }}
                                />
                                <Text flex={1}>{tipo}</Text>
                              </Flex>
                            );
                          })}
                        </VStack>
                      </Box>
                    );
                  })}
                </VStack>
              </Box>
            );
          })}
          </Box>
        )}
      </FilterAccordion>
    );
  }

  // M2 superficie
  function renderSuperficieAccordion() {
    return (
      <FilterAccordion
        title="M² superficie"
        count={Array.isArray(selectedValues['M² superficie']) ? selectedValues['M² superficie'].length : 0}
        expanded={!!openedAccordions['M² superficie']}
        onToggle={() => toggleAccordion('M² superficie')}
      >
        <SimpleGrid columns={2} spacing={2}>
          {['0 - 1,000', '1,000 - 5,000', '5,000 - 10,000', '> 10,000'].map((option) => {
            const selected = (selectedValues['M² superficie'] || []).includes(option);
            return (
              <Box
                key={option}
                px={2}
                py={2}
                borderRadius="8px"
                border="1px solid"
                borderColor={selected ? '#202020' : '#ECECEC'}
                bg={selected ? '#FAFAFA' : 'white'}
                boxShadow={selected ? 'inset 0 0 0 1px #D1D5DB' : 'none'}
                color={selected ? '#202020' : '#202020'}
                cursor="pointer"
                textAlign="center"
                whiteSpace="nowrap"
                fontSize="12px"
                lineHeight="1"
                fontWeight={selected ? '600' : '500'}
                transition="all 180ms ease"
                transform="none"
                _hover={{
                  borderColor: '#202020',
                  bg: '#FAFAFA',
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
      </FilterAccordion>
    );
  }

  // Inversión slider
  function renderInversionAccordion() {
    const INVESTMENT_MAX = 1000000000;
    const minPercent = (investmentMin / INVESTMENT_MAX) * 100;
    const maxPercent = (investmentMax / INVESTMENT_MAX) * 100;
    const formatMillions = (value) => `${Math.round(value / 1000000)}M`;
    return (
      <FilterAccordion
        title="Inversión"
        count={1}
        expanded={!!openedAccordions['Inversión']}
        onToggle={() => toggleAccordion('Inversión')}
      >
        <Box>
          <Flex align="center" justify="space-between" mb={2}>
            <Text fontSize="13px" fontWeight="600" color="#202020">
              Desde: ${formatMillions(investmentMin)}
            </Text>
            <Text fontSize="13px" fontWeight="600" color="#202020">
              Hasta: ${formatMillions(investmentMax)}
            </Text>
          </Flex>
          <Box position="relative" h="32px" mt={2}>
            <Box
              position="absolute"
              left="0"
              right="0"
              top="16px"
              h="4px"
              bg="#ECECEC"
              borderRadius="999px"
              zIndex={0}
              transform="none"
            />
            <Box
              position="absolute"
              top="16px"
              h="4px"
              borderRadius="2px"
              bg="#202020"
              zIndex={1}
              left={`${minPercent}%`}
              width={`${Math.max(maxPercent - minPercent, 0)}%`}
              transform="none"
            />
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
                top: '-4px',
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
                top: '-4px',
                width: '100%',
                background: 'transparent',
                pointerEvents: 'none',
                appearance: 'none',
                zIndex: 4,
              }}
            />
            <style>
              {`
              .investment-min-slider::-webkit-slider-thumb,
              .investment-max-slider::-webkit-slider-thumb {
                -webkit-appearance:none;
                appearance:none;
                width:16px;
                height:16px;
                border-radius:50%;
                background:#202020;
                border:2px solid white;
                box-shadow:0 1px 4px rgba(0,0,0,.16);
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
                width:16px;
                height:16px;
                border-radius:50%;
                background:#202020;
                border:2px solid white;
                box-shadow:0 1px 4px rgba(0,0,0,.16);
                cursor:pointer;
                pointer-events:auto;
              }
              .investment-min-slider::-ms-thumb,
              .investment-max-slider::-ms-thumb {
                width:16px;
                height:16px;
                border-radius:50%;
                background:#202020;
                border:2px solid white;
                box-shadow:0 1px 4px rgba(0,0,0,.16);
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
      </FilterAccordion>
    );
  }

  // Etapa, Tipo desarrollo, etc.
  function renderSimpleAccordion(label, options, selectedArr, setSelectedArr, multi = true) {
    return (
      <FilterAccordion
        title={label}
        count={selectedArr.length}
        expanded={!!openedAccordions[label]}
        onToggle={() => toggleAccordion(label)}
      >
        {renderOptionsWithSearch(options, label, selectedArr, setSelectedArr, multi)}
      </FilterAccordion>
    );
  }

  return (
    <Box
      w="272px"
      h="calc(100vh - 96px)"
      minH="calc(100vh - 96px)"
      maxH="calc(100vh - 96px)"
      display="flex"
      flexDirection="column"
      gap={2}
    >
      <Box
        bg="white"
        p={3}
        borderRadius="12px"
        border="1px solid #ECECEC"
        h="100%"
        display="flex"
        flexDirection="column"
        overflow="visible"
      >
        <Flex
          justify="space-between"
          align="center"
          mb={3}
        >
          <Heading
            size="sm"
            color="#202020"
            fontSize="16px"
          >
            Busqueda
          </Heading>

          <Text
            color="#202020"
            fontSize="12px"
            fontWeight="600"
            cursor="pointer"
            transition="all 180ms ease"
            _hover={{ color: '#000000' }}
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
              setOpenedAccordions(getDefaultAccordion(activeFilterTab));
              setSearchInputs({});
            }}
          >
            Limpiar filtros
          </Text>
        </Flex>

<Flex
  mb={3}
  bg="white"
  position="sticky"
  top={0}
  zIndex={2}
  pb={2}
  borderBottom="1px solid #ECECEC"
>
          <Button
            flex={1}
            size="sm"
            borderRadius="8px"
            bg="transparent"
            color={activeFilterTab === 'principales' ? '#202020' : '#6B7280'}
            borderBottom={activeFilterTab === 'principales' ? '3px solid #202020' : '3px solid transparent'}
            boxShadow="none"
            fontSize="13px"
            fontWeight="600"
            transition="all 180ms ease"
            _hover={{ bg: '#FAFAFA' }}
            onClick={() => {
              setActiveFilterTab('principales');
              setOpenedAccordions(getDefaultAccordion('principales'));
            }}
          >
            Principales
          </Button>

          <Button
            flex={1}
            size="sm"
            borderRadius="8px"
            bg="transparent"
            color={activeFilterTab === 'avanzados' ? '#202020' : '#6B7280'}
            borderBottom={activeFilterTab === 'avanzados' ? '3px solid #202020' : '3px solid transparent'}
            boxShadow="none"
            fontSize="13px"
            fontWeight="600"
            transition="all 180ms ease"
            _hover={{ bg: '#FAFAFA' }}
            onClick={() => {
              setActiveFilterTab('avanzados');
              setOpenedAccordions(getDefaultAccordion('avanzados'));
            }}
          >
            Avanzados
          </Button>
        </Flex>

        <VStack
          gap={2}
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
          {activeFilterTab === 'principales' && renderPrincipales()}
          {activeFilterTab === 'avanzados' && (
            <>
              {renderSubgeneroAccordion()}
              {renderSimpleAccordion(
                'Etapa',
                [
                  'Inicio',
                  'Obra Negociada',
                  'Pre-Inicio',
                  'Plan',
                  'Proyecto',
                  'Pre-Plan',
                ],
                selectedEtapas,
                setSelectedEtapas,
                true
              )}
              {renderSimpleAccordion(
                'Tipo desarrollo',
                [
                  'Obra Nueva',
                  'Ampliacion',
                  'Rehabilitacion',
                  'Mantenimiento',
                  'Remodelacion',
                  'Adecuacion',
                  'Terminacion',
                ],
                selectedDesarrollos,
                setSelectedDesarrollos,
                true
              )}
              {renderSuperficieAccordion()}
              {renderInversionAccordion()}
            </>
          )}
        </VStack>
      </Box>
    </Box>
  );
}
