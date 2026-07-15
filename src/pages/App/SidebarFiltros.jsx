import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Flex,
  SimpleGrid,
} from '@chakra-ui/react';

// Accordion helper
function FilterAccordion({
  title,
  expanded,
  onToggle,
  children,
  contentMaxH,
  allowOverflow = false,
}) {
  return (
    <Box
      border="1px solid var(--cl-border)"
      borderRadius="12px"
      bg="var(--cl-surface)"
      mb={2}
      overflow={allowOverflow && expanded ? 'visible' : 'hidden'}
      flexShrink={0}
      position="relative"
      zIndex={allowOverflow && expanded ? 20 : 1}
      transition="all .18s ease"
    >
      <Flex
        align="center"
        justify="space-between"
        px={3}
        py={2}
        minH="44px"
        cursor="pointer"
        _hover={{ bg: 'var(--cl-surface-muted)' }}
        onClick={onToggle}
        userSelect="none"
        transition="all .18s ease"
      >
        <Text fontSize="13px" fontWeight="600" color={TEXT_STRONG} display="flex" alignItems="center">
          {title}
        </Text>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          w="24px"
          h="24px"
          borderRadius="8px"
          transition="all 180ms ease"
          _hover={{ bg: 'var(--cl-surface-muted)' }}
        >
          <Box
            as="svg"
            viewBox="0 0 20 20"
            w="14px"
            h="14px"
            color="var(--cl-text-muted)"
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
          borderTop="1px solid var(--cl-border)"
          bg="var(--cl-surface)"
          maxH={contentMaxH}
          overflowY={allowOverflow ? 'visible' : contentMaxH ? 'auto' : 'visible'}
          overflowX={allowOverflow ? 'visible' : 'hidden'}
          position="relative"
          zIndex={allowOverflow ? 30 : 1}
        >
          {children}
        </Box>
      )}
    </Box>
  );
}

function getDefaultAccordion() {
  return { 'Tipo de fecha': true };
}

const TEXT_PRIMARY = 'var(--cl-text)';
const TEXT_STRONG = 'var(--cl-text-strong)';
const TEXT_SECONDARY = 'var(--cl-text-muted)';
const ACCENT_GRAY = '#4B5563';

function parseFilterDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized = String(value).trim();
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

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateInputValue(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(value) {
  const date = parseFilterDate(value);
  if (!date) return 'Seleccionar';

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let index = 0; index < startDay; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function getObraDateByFilter(obra, fechaSeleccionada) {
  if (fechaSeleccionada === 'Fecha de inicio probable') {
    return parseFilterDate(obra.fechaInicioDate) || parseFilterDate(obra.fechaInicio);
  }

  if (fechaSeleccionada === 'Fecha de término probable') {
    return parseFilterDate(obra.fechaTerminoDate) || parseFilterDate(obra.fechaTermino);
  }

  return parseFilterDate(obra.fechaPublicacionDate) || parseFilterDate(obra.fechaPublicacion);
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatSurfaceNumber(value) {
  return new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0));
}

function formatInputNumber(value) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0));
}

function parseFormattedNumber(value) {
  const normalized = String(value || '').replace(/[^0-9.-]/g, '');
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeFilterLabel(value) {
  return normalizeText(value);
}

function getSavedRangeValue(savedFiltersValue, fallback = null) {
  if (savedFiltersValue === null || savedFiltersValue === undefined || savedFiltersValue === '') {
    return fallback;
  }

  const numeric = Number(savedFiltersValue);
  return Number.isFinite(numeric) ? numeric : fallback;
}

const estadosPorRegion = {
  Oeste: ['Jalisco', 'Colima', 'Michoacán', 'Nayarit'],
  Noroeste: ['Baja California', 'Baja California Sur', 'Sonora', 'Sinaloa', 'Chihuahua', 'Durango'],
  Centro: ['Ciudad de México', 'Estado de México', 'Hidalgo', 'Morelos', 'Puebla', 'Querétaro', 'Tlaxcala'],
  Sureste: ['Guerrero', 'Oaxaca', 'Veracruz', 'Tabasco', 'Chiapas', 'Campeche', 'Yucatán', 'Quintana Roo'],
  Noreste: ['Nuevo León', 'Coahuila', 'Tamaulipas', 'San Luis Potosí', 'Zacatecas', 'Aguascalientes']
};

export default function SidebarFiltros({ obras = [] }) {
  // Accordions state
  const [openedAccordions, setOpenedAccordions] = useState(
    getDefaultAccordion()
  );
  const [expandedRegion, setExpandedRegion] = useState(null);
  const [expandedGenero, setExpandedGenero] = useState(null);
  const [expandedSubgenero, setExpandedSubgenero] = useState(null);
  const [expandedTipoProyecto, setExpandedTipoProyecto] = useState(null);

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
  const [dateRangeStart, setDateRangeStart] = useState(
    savedFilters.dateRangeStart || ''
  );
  const [dateRangeEnd, setDateRangeEnd] = useState(
    savedFilters.dateRangeEnd || ''
  );
  const [openDatePicker, setOpenDatePicker] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    parseFilterDate(savedFilters.dateRangeStart) || new Date()
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

  const [surfaceMin, setSurfaceMin] = useState(
    getSavedRangeValue(savedFilters.surfaceMin ?? savedFilters.superficieMin, null)
  );
  const [surfaceMax, setSurfaceMax] = useState(
    getSavedRangeValue(savedFilters.surfaceMax ?? savedFilters.superficieMax, null)
  );

  // Inversión dual-range slider states
  const [investmentMin, setInvestmentMin] = useState(
    getSavedRangeValue(savedFilters.investmentMin ?? savedFilters.inversionMin, null)
  );
  const [investmentMax, setInvestmentMax] = useState(
    getSavedRangeValue(savedFilters.investmentMax ?? savedFilters.inversionMax, null)
  );

  const hasLoadedFilters = useRef(true);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setOpenDatePicker(null);
      }
    };
    const handleClickOutside = () => {
      setOpenDatePicker(null);
    };

    window.addEventListener('keydown', handleEsc);
    window.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const estados = selectedRegiones.flatMap(
      (region) => estadosPorRegion[region] || []
    );

    setSelectedEstados((actuales) => {
      const faltantes = estados.filter(
        (estado) => !actuales.includes(estado)
      );

      return [...actuales, ...faltantes];
    });
  }, [selectedRegiones, estadosPorRegion]);

  function getRegionesForEstados(estados) {
    return Object.entries(estadosPorRegion)
      .filter(([, estadosRegion]) =>
        estadosRegion.length > 0 &&
        estadosRegion.every((estado) => estados.includes(estado))
      )
      .map(([region]) => region);
  }

  function getGenerosForSubgeneros(subgeneros) {
    return Object.entries(subgenerosPorGenero)
      .filter(([, subgenerosGenero]) => {
        const subgenerosDisponibles = Object.keys(subgenerosGenero || {});
        return subgenerosDisponibles.length > 0 &&
          subgenerosDisponibles.every((subgenero) =>
            subgeneros.includes(subgenero)
          );
      })
      .map(([genero]) => genero);
  }

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
      label: 'Tipo de fecha',
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
        'Proyecto de inversión'
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
        'Ampliación',
        'Rehabilitación',
        'Mantenimiento',
        'Remodelación',
        'Adecuación',
        'Terminación',
      ],
      multi: true,
      group: 'avanzados',
    },
    {
      label: 'Inversión (MDP)',
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
    selectedValues['Tipo de fecha'] ||
    'Fecha de publicación';

  const dateBounds = useMemo(() => {
    const dates = (obras || [])
      .map((obra) => getObraDateByFilter(obra, fechaSeleccionada))
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime());

    if (!dates.length) {
      return {
        min: '',
        max: '',
      };
    }

    return {
      min: toDateInputValue(dates[0]),
      max: toDateInputValue(dates[dates.length - 1]),
    };
  }, [obras, fechaSeleccionada]);

  const investmentBounds = useMemo(() => {
    const values = (obras || [])
      .map((obra) => Number(obra.inversion || 0))
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b);

    if (!values.length) {
      return {
        min: 0,
        max: 1000000,
      };
    }

    return {
      min: Math.max(0, Math.floor(values[0])),
      max: Math.max(1, Math.ceil(values[values.length - 1])),
    };
  }, [obras]);

  useEffect(() => {
    if (!dateBounds.min || !dateBounds.max) return;

    setDateRangeStart((current) => {
      if (!current || current < dateBounds.min || current > dateBounds.max) {
        return dateBounds.min;
      }

      return current;
    });

    setDateRangeEnd((current) => {
      if (!current || current > dateBounds.max || current < dateBounds.min) {
        return dateBounds.max;
      }

      return current;
    });
  }, [dateBounds.min, dateBounds.max, dateRangeStart, dateRangeEnd]);

  const surfaceBounds = useMemo(() => {
    const values = (obras || [])
      .map((obra) => Number(obra.superficie || 0))
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b);

    if (!values.length) {
      return {
        min: 0,
        max: 1000,
      };
    }

    return {
      min: Math.max(0, Math.floor(values[0])),
      max: Math.max(1, Math.ceil(values[values.length - 1])),
    };
  }, [obras]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    console.log('[SidebarFiltros][bounds]', {
      investmentBounds,
      surfaceBounds,
      sampleInvestment: (obras || [])
        .map((obra) => Number(obra.inversion || 0))
        .filter((value) => Number.isFinite(value) && value > 0)
        .slice(0, 5),
      sampleSurface: (obras || [])
        .map((obra) => Number(obra.superficie || 0))
        .filter((value) => Number.isFinite(value) && value > 0)
        .slice(0, 5),
    });
  }, [obras, investmentBounds, surfaceBounds]);

  useEffect(() => {
    if (!investmentBounds.max) return;

    setInvestmentMin((current) => {
      const value = Number(current);

      if (!Number.isFinite(value) || value < investmentBounds.min || value > investmentBounds.max) {
        return investmentBounds.min;
      }

      return value;
    });

    setInvestmentMax((current) => {
      const value = Number(current);

      if (
        current === null ||
        !Number.isFinite(value) ||
        value > investmentBounds.max ||
        value < investmentBounds.min ||
        (value === investmentBounds.min && investmentBounds.max > investmentBounds.min)
      ) {
        return investmentBounds.max;
      }

      return value;
    });
  }, [investmentBounds.min, investmentBounds.max]);

  useEffect(() => {
    if (!surfaceBounds.max) return;

    setSurfaceMin((current) => {
      const value = Number(current);

      if (
        current === null ||
        !Number.isFinite(value) ||
        value < surfaceBounds.min ||
        value > surfaceBounds.max
      ) {
        return surfaceBounds.min;
      }

      return value;
    });

    setSurfaceMax((current) => {
      const value = Number(current);

      if (
        current === null ||
        !Number.isFinite(value) ||
        value > surfaceBounds.max ||
        value < surfaceBounds.min ||
        (value === surfaceBounds.min && surfaceBounds.max > surfaceBounds.min)
      ) {
        return surfaceBounds.max;
      }

      return value;
    });
  }, [surfaceBounds.min, surfaceBounds.max]);

  const resolvedInvestmentMin = Math.max(
    investmentBounds.min,
    Math.min(
      Number.isFinite(Number(investmentMin)) ? Number(investmentMin) : investmentBounds.min,
      investmentBounds.max
    )
  );
  const resolvedInvestmentMax = Math.max(
    resolvedInvestmentMin,
    Math.min(
      Number.isFinite(Number(investmentMax)) ? Number(investmentMax) : investmentBounds.max,
      investmentBounds.max
    )
  );
  const resolvedSurfaceMin = Math.max(
    surfaceBounds.min,
    Math.min(
      Number.isFinite(Number(surfaceMin)) ? Number(surfaceMin) : surfaceBounds.min,
      surfaceBounds.max
    )
  );
  const resolvedSurfaceMax = Math.max(
    resolvedSurfaceMin,
    Math.min(
      Number.isFinite(Number(surfaceMax)) ? Number(surfaceMax) : surfaceBounds.max,
      surfaceBounds.max
    )
  );
  const superficieMin = resolvedSurfaceMin;
  const superficieMax = resolvedSurfaceMax;

  useEffect(() => {
    try {
      localStorage.setItem(
        'construleads-filters',
        JSON.stringify({
          selectedRegiones,
          selectedEstados,
          selectedGeneros,
          selectedSubgeneros,
          selectedSectores,
          selectedEtapas,
          selectedDesarrollos,
          selectedTipoObra,
          selectedTiposProyecto,
          fechaSeleccionada,
          periodoIndex,
          dateRangeStart,
          dateRangeEnd,
          surfaceMin: resolvedSurfaceMin,
          surfaceMax: resolvedSurfaceMax,
          investmentMin: resolvedInvestmentMin,
          investmentMax: resolvedInvestmentMax,
          selectedValues,
        })
      );
    } catch (error) {
      console.warn('[Construleads][Filtros] No se pudo persistir el estado:', error);
    }
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
    fechaSeleccionada,
    periodoIndex,
    dateRangeStart,
    dateRangeEnd,
    resolvedSurfaceMin,
    resolvedSurfaceMax,
    resolvedInvestmentMin,
    resolvedInvestmentMax,
    selectedValues,
  ]);

  const rangeFiltersReady =
    Number.isFinite(Number(resolvedInvestmentMin)) &&
    Number.isFinite(Number(resolvedInvestmentMax)) &&
    Number(resolvedInvestmentMax) >= Number(resolvedInvestmentMin) &&
    !(
      Number(resolvedInvestmentMax) === Number(resolvedInvestmentMin) &&
      investmentBounds.max > investmentBounds.min
    );

  const fechaHint =
    fechaSeleccionada === 'Fecha de publicación'
      ? 'Consultando proyectos por fecha de publicación dentro del rango seleccionado.'
      : fechaSeleccionada === 'Fecha de inicio probable'
      ? 'Consultando proyectos por fecha probable de inicio dentro del rango seleccionado.'
      : 'Consultando proyectos por fecha probable de término dentro del rango seleccionado.';


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
    investmentMin: resolvedInvestmentMin,
    investmentMax: resolvedInvestmentMax,
    periodoIndex,
    dateRangeStart,
    dateRangeEnd,
    fechaInicio: dateRangeStart,
    fechaFin: dateRangeEnd,
    fechaRango: {
      desde: dateRangeStart,
      hasta: dateRangeEnd,
    },
    fechaConsulta: fechaSeleccionada,
    surfaceMin: superficieMin,
    surfaceMax: superficieMax,
    superficie: [],
  };

  useEffect(() => {
    if (!rangeFiltersReady) {
      console.log('[Construleads][Filtros] Esperando rango de inversión inicial antes de publicar filtros', {
        investmentMin: resolvedInvestmentMin,
        investmentMax: resolvedInvestmentMax,
        investmentBounds,
      });
      return;
    }

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
    resolvedInvestmentMin,
    resolvedInvestmentMax,
    periodoIndex,
    dateRangeStart,
    dateRangeEnd,
    resolvedSurfaceMin,
    resolvedSurfaceMax,
    selectedValues,
    rangeFiltersReady,
  ]);

  // Search helpers for filtering options if > 10
  const [searchInputs, setSearchInputs] = useState({});
  function renderOptionsWithSearch(options, label, selectedArr, setSelectedArr, multi = true) {
    const searchValue = searchInputs[label] || '';
    const filtered = searchValue
      ? options.filter((o) =>
          normalizeFilterLabel(o).includes(normalizeFilterLabel(searchValue))
        )
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
                border: '1px solid var(--cl-border)',
                borderRadius: '8px',
                marginBottom: 4,
                outline: 'none',
                color: TEXT_PRIMARY,
                background: 'var(--cl-surface-muted)'
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
                bg={selected ? 'var(--cl-surface-muted)' : 'var(--cl-surface)'}
                color={TEXT_PRIMARY}
                boxShadow={selected ? 'inset 0 0 0 1px var(--cl-border)' : 'none'}
                fontSize="13px"
                transition="all 180ms ease"
                _hover={{ bg: 'var(--cl-surface-muted)' }}
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
                    accentColor: ACCENT_GRAY,
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
    setOpenedAccordions((current) =>
      current[key] ? {} : { [key]: true }
    );
  }

  function renderRegionAccordion() {
    const regiones = ['Oeste', 'Noroeste', 'Centro', 'Sureste', 'Noreste'];

    return (
      <FilterAccordion
        title="Región"
        expanded={!!openedAccordions['Región']}
        onToggle={() => toggleAccordion('Región')}
        contentMaxH="280px"
      >
        <VStack align="stretch" spacing={1}>
          {regiones.map((region) => {
            const estadosRegion = estadosPorRegion[region] || [];
            const selected = estadosRegion.length > 0 &&
              estadosRegion.every((estado) => selectedEstados.includes(estado));
            const partiallySelected = !selected &&
              estadosRegion.some((estado) => selectedEstados.includes(estado));
            const expanded = expandedRegion === region;

            return (
              <Box key={region}>
                <Flex
                  px={2}
                  py={1}
                  borderRadius="8px"
                  align="center"
                  cursor="pointer"
                  bg={selected || partiallySelected ? 'var(--cl-surface-muted)' : 'var(--cl-surface)'}
                  boxShadow={selected || partiallySelected ? 'inset 0 0 0 1px var(--cl-border)' : 'none'}
                  transition="all 180ms ease"
                  _hover={{ bg: 'var(--cl-surface-muted)' }}
                  onClick={() => {
                    setExpandedRegion((prev) =>
                      prev === region ? null : region
                    );
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    readOnly
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = partiallySelected;
                      }
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      const nextEstados = selected || partiallySelected
                        ? selectedEstados.filter((estado) => !estadosRegion.includes(estado))
                        : [
                            ...selectedEstados,
                            ...estadosRegion.filter((estado) => !selectedEstados.includes(estado)),
                          ];

                      setSelectedEstados(nextEstados);
                      setSelectedRegiones(getRegionesForEstados(nextEstados));
                    }}
                    style={{
                      marginRight: 8,
                      accentColor: ACCENT_GRAY,
                      width: 12,
                      height: 12,
                      cursor: 'pointer',
                    }}
                  />
                  <Text flex={1} fontSize="13px" color={TEXT_PRIMARY}>
                    {region}
                  </Text>
                  <Box
                    color="var(--cl-text-muted)"
                    fontSize="18px"
                    lineHeight="1"
                    px={1}
                    transform={expanded ? 'rotate(90deg)' : 'rotate(0deg)'}
                    transition="transform 180ms ease"
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
                          bg={estadoSeleccionado ? 'var(--cl-surface-muted)' : 'var(--cl-surface)'}
                          boxShadow={estadoSeleccionado ? 'inset 0 0 0 1px var(--cl-border)' : 'none'}
                          cursor="pointer"
                          transition="all 180ms ease"
                          _hover={{ bg: 'var(--cl-surface-muted)' }}
                          onClick={() => {
                            const nextEstados = estadoSeleccionado
                              ? selectedEstados.filter((item) => item !== estado)
                              : [...selectedEstados, estado];

                            setSelectedEstados(nextEstados);
                            setSelectedRegiones(getRegionesForEstados(nextEstados));
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={estadoSeleccionado}
                            readOnly
                            style={{
                              marginRight: 8,
                              accentColor: ACCENT_GRAY,
                              width: 12,
                              height: 12,
                            }}
                          />
                          <Text flex={1} fontSize="12px" color="var(--cl-text)">
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

  function renderGeneroAccordion() {
    const generos = ['Vivienda', 'Industrial', 'Edificacion', 'Infraestructura'];

    return (
      <FilterAccordion
        title="Género"
        expanded={!!openedAccordions['Género']}
        onToggle={() => toggleAccordion('Género')}
        contentMaxH="320px"
      >
        <VStack align="stretch" spacing={1}>
          {generos.map((genero) => {
            const subgenerosMap = subgenerosPorGenero[genero] || {};
            const subgeneros = Object.keys(subgenerosMap);
            const tiposGenero = subgeneros.flatMap((subgenero) =>
              subgenerosMap[subgenero] || []
            );
            const isSubgeneroComplete = (subgenero) => {
              const tiposObra = subgenerosMap[subgenero] || [];
              return selectedSubgeneros.includes(subgenero) ||
                (tiposObra.length > 0 &&
                  tiposObra.every((tipo) => selectedTipoObra.includes(tipo)));
            };
            const hasSubgeneroSelection = (subgenero) => {
              const tiposObra = subgenerosMap[subgenero] || [];
              return isSubgeneroComplete(subgenero) ||
                tiposObra.some((tipo) => selectedTipoObra.includes(tipo));
            };
            const selected = subgeneros.length > 0 &&
              subgeneros.every((subgenero) => isSubgeneroComplete(subgenero));
            const partiallySelected = !selected &&
              subgeneros.some((subgenero) => hasSubgeneroSelection(subgenero));
            const expanded = expandedGenero === genero;

            return (
              <Box key={genero}>
                <Flex
                  px={2}
                  py={1}
                  borderRadius="8px"
                  align="center"
                  cursor="pointer"
                  bg={selected || partiallySelected ? 'var(--cl-surface-muted)' : 'var(--cl-surface)'}
                  boxShadow={selected || partiallySelected ? 'inset 0 0 0 1px var(--cl-border)' : 'none'}
                  transition="all 180ms ease"
                  _hover={{ bg: 'var(--cl-surface-muted)' }}
                  onClick={() => {
                    setExpandedGenero((prev) =>
                      prev === genero ? null : genero
                    );
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    readOnly
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = partiallySelected;
                      }
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      const nextSubgeneros = selected || partiallySelected
                        ? selectedSubgeneros.filter((subgenero) => !subgeneros.includes(subgenero))
                        : [
                            ...selectedSubgeneros,
                            ...subgeneros.filter((subgenero) => !selectedSubgeneros.includes(subgenero)),
                          ];
                      const nextTiposObra = selected || partiallySelected
                        ? selectedTipoObra.filter((tipo) => !tiposGenero.includes(tipo))
                        : [
                            ...selectedTipoObra,
                            ...tiposGenero.filter((tipo) => !selectedTipoObra.includes(tipo)),
                          ];

                      setSelectedSubgeneros(nextSubgeneros);
                      setSelectedGeneros(getGenerosForSubgeneros(nextSubgeneros));
                      setSelectedTipoObra(nextTiposObra);
                    }}
                    style={{
                      marginRight: 8,
                      accentColor: ACCENT_GRAY,
                      width: 12,
                      height: 12,
                      cursor: 'pointer',
                    }}
                  />
                  <Text flex={1} fontSize="13px" color={TEXT_PRIMARY}>
                    {genero}
                  </Text>
                  <Box
                    color="var(--cl-text-muted)"
                    fontSize="18px"
                    lineHeight="1"
                    px={1}
                    transform={expanded ? 'rotate(90deg)' : 'rotate(0deg)'}
                    transition="transform 180ms ease"
                  >
                    ›
                  </Box>
                </Flex>

                {expanded && (
                  <VStack align="stretch" spacing={1} mt={1} pl={5}>
                    {subgeneros.map((subgenero) => {
                      const tiposObra = subgenerosMap[subgenero] || [];
                      const selectedSubgenero = selectedSubgeneros.includes(subgenero) ||
                        (tiposObra.length > 0 &&
                          tiposObra.every((tipo) => selectedTipoObra.includes(tipo)));
                      const partiallySelectedSubgenero = !selectedSubgenero &&
                        tiposObra.some((tipo) => selectedTipoObra.includes(tipo));
                      const expandedSub = expandedSubgenero === `${genero}-${subgenero}`;

                      return (
                        <Box key={subgenero}>
                          <Flex
                            px={2}
                            py={1}
                            borderRadius="8px"
                            align="center"
                            cursor="pointer"
                            bg={selectedSubgenero || partiallySelectedSubgenero ? 'var(--cl-surface-muted)' : 'var(--cl-surface)'}
                            boxShadow={selectedSubgenero || partiallySelectedSubgenero ? 'inset 0 0 0 1px var(--cl-border)' : 'none'}
                            transition="all 180ms ease"
                            _hover={{ bg: 'var(--cl-surface-muted)' }}
                            onClick={() => {
                              setExpandedSubgenero((prev) =>
                                prev === `${genero}-${subgenero}` ? null : `${genero}-${subgenero}`
                              );
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedSubgenero}
                              readOnly
                              ref={(input) => {
                                if (input) {
                                  input.indeterminate = partiallySelectedSubgenero;
                                }
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                                const nextSubgeneros = selectedSubgenero || partiallySelectedSubgenero
                                  ? selectedSubgeneros.filter((item) => item !== subgenero)
                                  : [...selectedSubgeneros, subgenero];
                                const nextTiposObra = selectedSubgenero || partiallySelectedSubgenero
                                  ? selectedTipoObra.filter((tipo) => !tiposObra.includes(tipo))
                                  : [
                                      ...selectedTipoObra,
                                      ...tiposObra.filter((tipo) => !selectedTipoObra.includes(tipo)),
                                    ];

                                setSelectedSubgeneros(nextSubgeneros);
                                setSelectedGeneros(getGenerosForSubgeneros(nextSubgeneros));
                                setSelectedTipoObra(nextTiposObra);
                              }}
                              style={{
                                marginRight: 8,
                                accentColor: ACCENT_GRAY,
                                width: 12,
                                height: 12,
                                cursor: 'pointer',
                              }}
                            />
                            <Text flex={1} fontSize="12px" color="var(--cl-text)">
                              {subgenero}
                            </Text>
                            <Box
                              color="var(--cl-text-muted)"
                              fontSize="16px"
                              lineHeight="1"
                              px={1}
                              transform={expandedSub ? 'rotate(90deg)' : 'rotate(0deg)'}
                              transition="transform 180ms ease"
                            >
                              ›
                            </Box>
                          </Flex>

                          {expandedSub && (
                            <VStack align="stretch" spacing={1} mt={1} pl={5}>
                              {tiposObra.map((tipo) => {
                                const selectedTipo = selectedTipoObra.includes(tipo);

                                return (
                                  <Flex
                                    key={tipo}
                                    px={2}
                                    py={1}
                                    borderRadius="8px"
                                    align="center"
                                    bg={selectedTipo ? 'var(--cl-surface-muted)' : 'var(--cl-surface)'}
                                    boxShadow={selectedTipo ? 'inset 0 0 0 1px var(--cl-border)' : 'none'}
                                    cursor="pointer"
                                    transition="all 180ms ease"
                                    _hover={{ bg: 'var(--cl-surface-muted)' }}
                                    onClick={() => {
                                      const nextTiposObra = selectedTipo
                                        ? selectedTipoObra.filter((item) => item !== tipo)
                                        : [...selectedTipoObra, tipo];
                                      const subgeneroCompleto = tiposObra.length > 0 &&
                                        tiposObra.every((item) => nextTiposObra.includes(item));
                                      const nextSubgeneros = subgeneroCompleto
                                        ? selectedSubgeneros.includes(subgenero)
                                          ? selectedSubgeneros
                                          : [...selectedSubgeneros, subgenero]
                                        : selectedSubgeneros.filter((item) => item !== subgenero);

                                      setSelectedTipoObra(nextTiposObra);
                                      setSelectedSubgeneros(nextSubgeneros);
                                      setSelectedGeneros(getGenerosForSubgeneros(nextSubgeneros));
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedTipo}
                                      readOnly
                                      style={{
                                        marginRight: 8,
                                        accentColor: ACCENT_GRAY,
                                        width: 12,
                                        height: 12,
                                      }}
                                    />
                                    <Text flex={1} fontSize="12px" color="var(--cl-text)">
                                      {tipo}
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
                )}
              </Box>
            );
          })}
        </VStack>
      </FilterAccordion>
    );
  }

  function renderDateField({
    id,
    label,
    value,
    min,
    max,
    onChange,
  }) {
    const selectedDate = parseFilterDate(value);
    const minDate = parseFilterDate(min);
    const maxDate = parseFilterDate(max);
    const visibleMonth = selectedDate || minDate || calendarMonth;
    const monthLabel = new Intl.DateTimeFormat('es-MX', {
      month: 'long',
      year: 'numeric',
    }).format(calendarMonth);

    return (
      <Box position="relative">
        <Text fontSize="11px" fontWeight="600" color={TEXT_SECONDARY} mb={1}>
          {label}
        </Text>

        <Flex
          as="button"
          type="button"
          w="100%"
          h="34px"
          px={2}
          align="center"
          justify="space-between"
          border="1px solid var(--cl-border)"
          borderRadius="8px"
          bg="var(--cl-surface)"
          color={TEXT_PRIMARY}
          fontSize="12px"
          transition="all 160ms ease"
          _hover={{ bg: 'var(--cl-surface-muted)' }}
          onClick={(event) => {
            event.stopPropagation();
            setCalendarMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1));
            setOpenDatePicker((current) => (current === id ? null : id));
          }}
        >
          <Text as="span" noOfLines={1}>
            {formatDateForDisplay(value)}
          </Text>
          <Text as="span" color={TEXT_SECONDARY} fontSize="13px">
            ▾
          </Text>
        </Flex>

        {openDatePicker === id && (
          <Box
            position="absolute"
            top="58px"
            left={id === 'desde' ? 0 : 'auto'}
            right={id === 'hasta' ? 0 : 'auto'}
            zIndex={120}
            w="224px"
            maxW="calc(100vw - 32px)"
            p={2}
            bg="var(--cl-surface)"
            border="1px solid var(--cl-border)"
            borderRadius="10px"
            boxShadow="var(--cl-shadow)"
            overflow="visible"
            onClick={(event) => event.stopPropagation()}
          >
            <Flex align="center" justify="space-between" mb={2}>
              <Text fontSize="12px" fontWeight="700" color={TEXT_STRONG} textTransform="capitalize">
                {monthLabel}
              </Text>

              <Flex gap={1}>
                <Box
                  as="button"
                  type="button"
                  w="28px"
                  h="28px"
                  borderRadius="8px"
                  color={TEXT_SECONDARY}
                  _hover={{ bg: 'var(--cl-surface-muted)' }}
                  onClick={() => setCalendarMonth((current) => addMonths(current, -1))}
                >
                  ‹
                </Box>
                <Box
                  as="button"
                  type="button"
                  w="28px"
                  h="28px"
                  borderRadius="8px"
                  color={TEXT_SECONDARY}
                  _hover={{ bg: 'var(--cl-surface-muted)' }}
                  onClick={() => setCalendarMonth((current) => addMonths(current, 1))}
                >
                  ›
                </Box>
              </Flex>
            </Flex>

            <SimpleGrid columns={7} spacing={1} mb={1}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                <Text key={day} fontSize="10px" fontWeight="700" color={TEXT_SECONDARY} textAlign="center">
                  {day}
                </Text>
              ))}
            </SimpleGrid>

            <SimpleGrid columns={7} spacing={1}>
              {getCalendarDays(calendarMonth).map((day, index) => {
                const dayValue = day ? toDateInputValue(day) : '';
                const isSelected = dayValue && dayValue === value;
                const disabled = !day ||
                  (minDate && day < minDate) ||
                  (maxDate && day > maxDate);

                return (
                  <Box
                    key={dayValue || `empty-${index}`}
                    as="button"
                    type="button"
                    h="28px"
                    borderRadius="8px"
                    fontSize="11px"
                    fontWeight={isSelected ? '700' : '600'}
                    color={isSelected ? 'white' : disabled ? 'var(--cl-text-muted)' : TEXT_PRIMARY}
                    opacity={disabled ? 0.35 : 1}
                    bg={isSelected ? '#FF6600' : 'transparent'}
                    cursor={disabled ? 'default' : 'pointer'}
                    _hover={disabled ? {} : { bg: isSelected ? '#FF6600' : 'var(--cl-surface-muted)' }}
                    onClick={() => {
                      if (disabled) return;

                      onChange(dayValue);
                      setOpenDatePicker(null);
                    }}
                  >
                    {day ? day.getDate() : ''}
                  </Box>
                );
              })}
            </SimpleGrid>
          </Box>
        )}
      </Box>
    );
  }

  // Accordions for Principales
  function renderPrincipales() {
    const etapasPorTipo = {
      'Proyecto contratado': ['Obra Negociada', 'Pre-Inicio', 'Inicio'],
      'Proyecto de inversión': ['Pre-Plan', 'Plan', 'Proyecto'],
    };
    return (
      <>
        <FilterAccordion
          title="Tipo de fecha"
          count={selectedValues['Tipo de fecha'] ? 1 : 0}
          expanded={!!openedAccordions['Tipo de fecha']}
          onToggle={() => toggleAccordion('Tipo de fecha')}
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
                _hover={{ bg: 'var(--cl-surface-muted)' }}
                bg={fechaSeleccionada === option ? 'var(--cl-surface-muted)' : 'var(--cl-surface)'}
                boxShadow={fechaSeleccionada === option ? 'inset 0 0 0 1px var(--cl-border)' : 'none'}
                color={TEXT_PRIMARY}
                fontSize="13px"
                onClick={() => {
                  setSelectedValues((prev) => ({
                    ...prev,
                    'Tipo de fecha': option,
                  }));
                  setDateRangeStart('');
                  setDateRangeEnd('');
                }}
              >
                <input
                  type="radio"
                  name="fecha-consulta"
                  checked={fechaSeleccionada === option}
                  readOnly
                  style={{
                    marginRight: 8,
                    accentColor: ACCENT_GRAY,
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
          allowOverflow
        >
          <Box>
            <Box
              mb={3}
              px={2}
              py={2}
              bg="var(--cl-surface-muted)"
              border="1px solid var(--cl-border)"
              borderRadius="8px"
            >
              <Text fontSize="10px" color={TEXT_SECONDARY} fontWeight="700" lineHeight="1">
                Criterio de fecha
              </Text>
              <Text fontSize="12px" color={TEXT_STRONG} fontWeight="700" mt={1}>
                {fechaSeleccionada}
              </Text>
            </Box>

            <SimpleGrid columns={2} spacing={2}>
              {renderDateField({
                id: 'desde',
                label: 'Desde',
                value: dateRangeStart,
                min: dateBounds.min,
                max: dateRangeEnd || dateBounds.max,
                onChange: (value) => {
                  const clampedValue = value < dateBounds.min
                    ? dateBounds.min
                    : value > dateBounds.max
                    ? dateBounds.max
                    : value;

                  setDateRangeStart(clampedValue);
                  if (dateRangeEnd && clampedValue > dateRangeEnd) {
                    setDateRangeEnd(clampedValue);
                  }
                  setPeriodoIndex(-1);
                  setSelectedValues((prev) => ({
                    ...prev,
                    'Periodo de consulta': 'Rango personalizado',
                  }));
                },
              })}

              {renderDateField({
                id: 'hasta',
                label: 'Hasta',
                value: dateRangeEnd,
                min: dateRangeStart || dateBounds.min,
                max: dateBounds.max,
                onChange: (value) => {
                  const clampedValue = value < dateBounds.min
                    ? dateBounds.min
                    : value > dateBounds.max
                    ? dateBounds.max
                    : value;

                  setDateRangeEnd(clampedValue);
                  if (dateRangeStart && clampedValue < dateRangeStart) {
                    setDateRangeStart(clampedValue);
                  }
                  setPeriodoIndex(-1);
                  setSelectedValues((prev) => ({
                    ...prev,
                    'Periodo de consulta': 'Rango personalizado',
                  }));
                },
              })}
            </SimpleGrid>

            {dateBounds.min && dateBounds.max && (
              <Text fontSize="11px" color="var(--cl-text-muted)" mt={2}>
                Disponible: {dateBounds.min} a {dateBounds.max}
              </Text>
            )}
          </Box>
        </FilterAccordion>

        {renderRegionAccordion()}

        {renderGeneroAccordion()}

        <FilterAccordion
          title="Tipo de proyecto"
          count={selectedTiposProyecto.length + selectedEtapas.length}
          expanded={!!openedAccordions['Tipo de proyecto']}
          onToggle={() => toggleAccordion('Tipo de proyecto')}
        >
          <VStack align="stretch" spacing={2}>
            {['Proyecto contratado', 'Proyecto de inversión'].map((tipo) => {
              const etapas = etapasPorTipo[tipo] || [];
              const tipoSelected = selectedTiposProyecto.includes(tipo);
              const tipoActive = tipoSelected || etapas.some((etapa) => selectedEtapas.includes(etapa));
              const expanded = expandedTipoProyecto === tipo;

              return (
                <Box key={tipo}>
                  <Flex
                    px={2}
                    py={1}
                    borderRadius="8px"
                    align="center"
                    cursor="pointer"
                    bg={tipoActive ? 'var(--cl-surface-muted)' : 'var(--cl-surface)'}
                    boxShadow={tipoActive ? 'inset 0 0 0 1px var(--cl-border)' : 'none'}
                    transition="all 180ms ease"
                    _hover={{ bg: 'var(--cl-surface-muted)' }}
                    onClick={() => setExpandedTipoProyecto((prev) => (prev === tipo ? null : tipo))}
                  >
                    <input
                      type="checkbox"
                      checked={tipoActive}
                      readOnly
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextTiposProyecto = tipoActive
                          ? selectedTiposProyecto.filter((item) => item !== tipo)
                          : [...selectedTiposProyecto, tipo];
                        const nextEtapas = tipoActive
                          ? selectedEtapas.filter((etapa) => !etapas.includes(etapa))
                          : selectedEtapas;

                        setSelectedTiposProyecto(nextTiposProyecto);
                        setSelectedEtapas(nextEtapas);
                      }}
                      style={{
                        marginRight: 8,
                        accentColor: ACCENT_GRAY,
                        width: 12,
                        height: 12,
                        cursor: 'pointer',
                      }}
                    />
                    <Text flex={1} fontSize="13px" color={TEXT_PRIMARY}>
                      {tipo}
                    </Text>
                    <Box
                      color="var(--cl-text-muted)"
                      fontSize="18px"
                      lineHeight="1"
                      px={1}
                      transform={expanded ? 'rotate(90deg)' : 'rotate(0deg)'}
                      transition="transform 180ms ease"
                    >
                      ›
                    </Box>
                  </Flex>

                  {expanded && (
                    <Box mt={2} pl={5}>
                      <Text
                        fontSize="12px"
                        color={TEXT_SECONDARY}
                        fontWeight="700"
                        mb={2}
                      >
                        Etapa
                      </Text>
                      {renderOptionsWithSearch(
                        etapas,
                        `Etapa - ${tipo}`,
                        selectedEtapas,
                        setSelectedEtapas,
                        true
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}
          </VStack>
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

  // M2 superficie
  function renderSuperficieAccordion() {
    const SURFACE_MIN = surfaceBounds.min;
    const SURFACE_MAX = surfaceBounds.max;
    const surfaceSpan = Math.max(SURFACE_MAX - SURFACE_MIN, 1);
    const minPercent = Math.max(
      0,
      Math.min(((resolvedSurfaceMin - SURFACE_MIN) / surfaceSpan) * 100, 100)
    );
    const maxPercent = Math.max(
      0,
      Math.min(((resolvedSurfaceMax - SURFACE_MIN) / surfaceSpan) * 100, 100)
    );

    const setMinFromSurface = (value) => {
      const nextValue = clampNumber(
        Number(value || 0),
        SURFACE_MIN,
        resolvedSurfaceMax
      );
      setSurfaceMin(nextValue);
    };

    const setMaxFromSurface = (value) => {
      const nextValue = clampNumber(
        Number(value || 0),
        resolvedSurfaceMin,
        SURFACE_MAX
      );
      setSurfaceMax(nextValue);
    };

    return (
      <FilterAccordion
        title="M² superficie"
        count={
          resolvedSurfaceMin !== SURFACE_MIN || resolvedSurfaceMax !== SURFACE_MAX ? 1 : 0
        }
        expanded={!!openedAccordions['M² superficie']}
        onToggle={() => toggleAccordion('M² superficie')}
      >
        <Box>
          <SimpleGrid columns={2} spacing={2} mb={3}>
            <Box>
              <Text fontSize="11px" color={TEXT_SECONDARY} fontWeight="700" mb={1}>
                Desde
              </Text>
              <Flex
                align="center"
                h="34px"
                px={2}
                border="1px solid var(--cl-border)"
                borderRadius="8px"
                bg="var(--cl-input-bg)"
              >
                <Text fontSize="12px" color={TEXT_SECONDARY} mr={1}>m²</Text>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatInputNumber(resolvedSurfaceMin)}
                  onChange={(event) => setMinFromSurface(parseFormattedNumber(event.target.value))}
                  style={{
                    width: '100%',
                    border: 0,
                    outline: 'none',
                    background: 'transparent',
                    color: 'var(--cl-text)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                />
              </Flex>
            </Box>
            <Box>
              <Text fontSize="11px" color={TEXT_SECONDARY} fontWeight="700" mb={1}>
                Hasta
              </Text>
              <Flex
                align="center"
                h="34px"
                px={2}
                border="1px solid var(--cl-border)"
                borderRadius="8px"
                bg="var(--cl-input-bg)"
              >
                <Text fontSize="12px" color={TEXT_SECONDARY} mr={1}>m²</Text>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatInputNumber(resolvedSurfaceMax)}
                  onChange={(event) => setMaxFromSurface(parseFormattedNumber(event.target.value))}
                  style={{
                    width: '100%',
                    border: 0,
                    outline: 'none',
                    background: 'transparent',
                    color: 'var(--cl-text)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                />
              </Flex>
            </Box>
          </SimpleGrid>

          <Box position="relative" h="34px" mt={1}>
            <Box
              position="absolute"
              left="0"
              right="0"
              top="16px"
              h="4px"
              bg="var(--cl-border)"
              borderRadius="999px"
              zIndex={0}
              transform="none"
            />
            <Box
              position="absolute"
              top="16px"
              h="4px"
              borderRadius="2px"
              bg={ACCENT_GRAY}
              zIndex={1}
              left={`${minPercent}%`}
              width={`${Math.max(maxPercent - minPercent, 0)}%`}
              transform="none"
            />
            <input
              type="range"
              min={SURFACE_MIN}
              max={SURFACE_MAX}
              step={1}
              value={resolvedSurfaceMin}
              onChange={(e) => {
                let val = Number(e.target.value);
                if (val > resolvedSurfaceMax) val = resolvedSurfaceMax;
                setSurfaceMin(val);
              }}
              className="surface-min-slider"
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
              min={SURFACE_MIN}
              max={SURFACE_MAX}
              step={1}
              value={resolvedSurfaceMax}
              onChange={(e) => {
                let val = Number(e.target.value);
                if (val < resolvedSurfaceMin) val = resolvedSurfaceMin;
                setSurfaceMax(val);
              }}
              className="surface-max-slider"
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
              .surface-min-slider::-webkit-slider-thumb,
              .surface-max-slider::-webkit-slider-thumb {
                -webkit-appearance:none;
                appearance:none;
                width:16px;
                height:16px;
                border-radius:50%;
                background:#4B5563;
                border:2px solid white;
                box-shadow:0 1px 4px rgba(0,0,0,.16);
                cursor:pointer;
                pointer-events:auto;
              }
              .surface-min-slider::-webkit-slider-runnable-track,
              .surface-max-slider::-webkit-slider-runnable-track {
                height:4px;
                background:transparent;
              }
              .surface-min-slider::-moz-range-thumb,
              .surface-max-slider::-moz-range-thumb {
                width:16px;
                height:16px;
                border-radius:50%;
                background:#4B5563;
                border:2px solid white;
                box-shadow:0 1px 4px rgba(0,0,0,.16);
                cursor:pointer;
                pointer-events:auto;
              }
              .surface-min-slider::-ms-thumb,
              .surface-max-slider::-ms-thumb {
                width:16px;
                height:16px;
                border-radius:50%;
                background:#4B5563;
                border:2px solid white;
                box-shadow:0 1px 4px rgba(0,0,0,.16);
                cursor:pointer;
                pointer-events:auto;
              }
              .surface-min-slider,
              .surface-max-slider {
                outline: none;
              }
              `}
            </style>
          </Box>
        </Box>
      </FilterAccordion>
    );
  }

  // Inversión slider
  function renderInversionAccordion() {
    const INVESTMENT_MIN = investmentBounds.min;
    const INVESTMENT_MAX = investmentBounds.max;
    const investmentSpan = Math.max(INVESTMENT_MAX - INVESTMENT_MIN, 1);
    const minPercent = Math.max(
      0,
      Math.min(((resolvedInvestmentMin - INVESTMENT_MIN) / investmentSpan) * 100, 100)
    );
    const maxPercent = Math.max(
      0,
      Math.min(((resolvedInvestmentMax - INVESTMENT_MIN) / investmentSpan) * 100, 100)
    );
    const formatMillions = (value) => `${Math.round(value / 1000000)}M`;
    const setMinFromMillions = (value) => {
      const nextValue = Math.max(
        INVESTMENT_MIN,
        Math.min(Number(value || 0) * 1000000, resolvedInvestmentMax)
      );
      setInvestmentMin(nextValue);
    };
    const setMaxFromMillions = (value) => {
      const nextValue = Math.min(
        INVESTMENT_MAX,
        Math.max(Number(value || 0) * 1000000, resolvedInvestmentMin)
      );
      setInvestmentMax(nextValue);
    };

    return (
      <FilterAccordion
        title="Inversión (MDP)"
        count={
          resolvedInvestmentMin !== investmentBounds.min ||
          resolvedInvestmentMax !== investmentBounds.max
            ? 1
            : 0
        }
        expanded={!!openedAccordions['Inversión']}
        onToggle={() => toggleAccordion('Inversión')}
      >
        <Box>
          <SimpleGrid columns={2} spacing={2} mb={3}>
            <Box>
              <Text fontSize="11px" color={TEXT_SECONDARY} fontWeight="700" mb={1}>
                Desde
              </Text>
              <Flex
                align="center"
                h="34px"
                px={2}
                border="1px solid var(--cl-border)"
                borderRadius="8px"
                bg="var(--cl-input-bg)"
              >
                <Text fontSize="12px" color={TEXT_SECONDARY} mr={1}>$</Text>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatInputNumber(resolvedInvestmentMin / 1000000)}
                  onChange={(event) => setMinFromMillions(parseFormattedNumber(event.target.value))}
                  style={{
                    width: '100%',
                    border: 0,
                    outline: 'none',
                    background: 'transparent',
                    color: 'var(--cl-text)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                />
                <Text fontSize="11px" color={TEXT_SECONDARY}>M</Text>
              </Flex>
            </Box>
            <Box>
              <Text fontSize="11px" color={TEXT_SECONDARY} fontWeight="700" mb={1}>
                Hasta
              </Text>
              <Flex
                align="center"
                h="34px"
                px={2}
                border="1px solid var(--cl-border)"
                borderRadius="8px"
                bg="var(--cl-input-bg)"
              >
                <Text fontSize="12px" color={TEXT_SECONDARY} mr={1}>$</Text>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatInputNumber(resolvedInvestmentMax / 1000000)}
                  onChange={(event) => setMaxFromMillions(parseFormattedNumber(event.target.value))}
                  style={{
                    width: '100%',
                    border: 0,
                    outline: 'none',
                    background: 'transparent',
                    color: 'var(--cl-text)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                />
                <Text fontSize="11px" color={TEXT_SECONDARY}>M</Text>
              </Flex>
            </Box>
          </SimpleGrid>

          <Box position="relative" h="34px" mt={1}>
            <Box
              position="absolute"
              left="0"
              right="0"
              top="16px"
              h="4px"
              bg="var(--cl-border)"
              borderRadius="999px"
              zIndex={0}
              transform="none"
            />
            <Box
              position="absolute"
              top="16px"
              h="4px"
              borderRadius="2px"
              bg={ACCENT_GRAY}
              zIndex={1}
              left={`${minPercent}%`}
              width={`${Math.max(maxPercent - minPercent, 0)}%`}
              transform="none"
            />
            <input
              type="range"
              min={INVESTMENT_MIN}
              max={INVESTMENT_MAX}
              step={1000000}
              value={resolvedInvestmentMin}
              onChange={e => {
                let val = Number(e.target.value);
                if (val > resolvedInvestmentMax) val = resolvedInvestmentMax;
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
              min={INVESTMENT_MIN}
              max={INVESTMENT_MAX}
              step={1000000}
              value={resolvedInvestmentMax}
              onChange={e => {
                let val = Number(e.target.value);
                if (val < resolvedInvestmentMin) val = resolvedInvestmentMin;
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
                background:#4B5563;
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
                background:#4B5563;
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
                background:#4B5563;
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
      w="var(--cl-sidebar-width)"
      minW="240px"
      maxW="272px"
      h="100%"
      minH="0"
      maxH="100%"
      display="flex"
      flexDirection="column"
      gap={2}
    >
      <Box
        bg="var(--cl-surface)"
        p={3}
        borderRadius="12px"
        border="1px solid var(--cl-border)"
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
            color={TEXT_STRONG}
            fontSize="16px"
          >
            Busqueda
          </Heading>

          <Text
            color={TEXT_STRONG}
            fontSize="12px"
            fontWeight="600"
            cursor="pointer"
            transition="all 180ms ease"
            _hover={{ color: TEXT_PRIMARY }}
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
              setInvestmentMin(investmentBounds.min);
              setInvestmentMax(investmentBounds.max);
              setSurfaceMin(surfaceBounds.min);
              setSurfaceMax(surfaceBounds.max);
              setDateRangeStart('');
              setDateRangeEnd('');
              localStorage.removeItem('construleads-filtros');
              setOpenedAccordions(getDefaultAccordion());
              setSearchInputs({});
            }}
          >
            Limpiar filtros
          </Text>
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
          {renderPrincipales()}
          {renderSimpleAccordion(
            'Tipo desarrollo',
            [
              'Obra Nueva',
              'Ampliación',
              'Rehabilitación',
              'Mantenimiento',
              'Remodelación',
              'Adecuación',
              'Terminación',
            ],
            selectedDesarrollos,
            setSelectedDesarrollos,
            true
          )}
          {renderSuperficieAccordion()}
          {renderInversionAccordion()}
        </VStack>
      </Box>
    </Box>
  );
}
