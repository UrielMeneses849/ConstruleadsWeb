import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  VStack,
  Heading,
  Text,
  Flex,
  SimpleGrid,
} from '@chakra-ui/react';
import { filterObrasByFilters } from '../../utils/filterObras';

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
  return {};
}

const TEXT_PRIMARY = 'var(--cl-text)';
const TEXT_STRONG = 'var(--cl-text-strong)';
const TEXT_SECONDARY = 'var(--cl-text-muted)';
const ACCENT_GRAY = '#4B5563';
const CALENDAR_POPOVER_WIDTH = 240;
const CALENDAR_VIEWPORT_GAP = 12;
const CALENDAR_ESTIMATED_HEIGHT = 292;

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

function getDateBoundsForCriterion(obras, criterio) {
  const dates = (obras || [])
    .map((obra) => getObraDateByFilter(obra, criterio))
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());

  if (!dates.length) return { min: '', max: '' };

  return {
    min: toDateInputValue(dates[0]),
    max: toDateInputValue(dates[dates.length - 1]),
  };
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

const ESTADOS_POR_REGION_CATALOG = {
  Oeste: ['Jalisco', 'Colima', 'Michoacán', 'Nayarit', 'Aguascalientes'],
  Noroeste: ['Baja California', 'Baja California Sur', 'Sonora', 'Sinaloa', 'Chihuahua', 'Durango'],
  Centro: ['Ciudad de México', 'Estado de México', 'Hidalgo', 'Morelos', 'Puebla', 'Querétaro', 'Tlaxcala'],
  Sureste: ['Guerrero', 'Oaxaca', 'Veracruz', 'Tabasco', 'Chiapas', 'Campeche', 'Yucatán', 'Quintana Roo'],
  Noreste: ['Nuevo León', 'Coahuila', 'Tamaulipas', 'San Luis Potosí', 'Zacatecas']
};

export default function SidebarFiltros({ obras = [], onApplyFilters }) {
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

  const hasSavedFilters = Boolean(
    localStorage.getItem('construleads-filters') ||
    localStorage.getItem('construleads-filtros')
  );
  const savedFilters = (() => {
    try {
      const storedFilters =
        localStorage.getItem('construleads-filters') ||
        localStorage.getItem('construleads-filtros') ||
        '{}';
      return JSON.parse(storedFilters);
    } catch {
      return {};
    }
  })();

  const [periodoIndex, setPeriodoIndex] = useState(
    savedFilters.periodoIndex ?? -1
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
  const [calendarPopover, setCalendarPopover] = useState(null);
  const dateFieldRefs = useRef({});
  const calendarPopoverRef = useRef(null);

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
  const [searchInputs, setSearchInputs] = useState({});
  // Maqueta local: prepara la interacción de fuentes sin alterar todavía los
  // resultados, hasta que Explorer tenga datos conectados al mismo contrato.
  const [sourcePreview, setSourcePreview] = useState({
    construleads: true,
    explorer: false,
  });

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

  const shouldInitializeAllFilters = useRef(!hasSavedFilters);

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

  // El panel de filtros tiene scroll propio; un calendario absoluto dentro de
  // él queda recortado aunque sus padres usen `overflow: visible`. Lo llevamos
  // al `body` y lo anclamos con coordenadas de viewport para que pueda cubrir
  // el mapa sin salirse nunca de la pantalla.
  const positionCalendarPopover = useCallback((id) => {
    const trigger = dateFieldRefs.current[id];
    if (!trigger || typeof window === 'undefined') return;

    const triggerRect = trigger.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const popoverWidth = Math.min(CALENDAR_POPOVER_WIDTH, viewportWidth - CALENDAR_VIEWPORT_GAP * 2);
    const popoverHeight = calendarPopoverRef.current?.offsetHeight || CALENDAR_ESTIMATED_HEIGHT;
    const preferredTop = triggerRect.bottom + 8;
    const top = preferredTop + popoverHeight <= viewportHeight - CALENDAR_VIEWPORT_GAP
      ? preferredTop
      : Math.max(CALENDAR_VIEWPORT_GAP, triggerRect.top - popoverHeight - 8);
    const left = Math.max(
      CALENDAR_VIEWPORT_GAP,
      Math.min(triggerRect.left, viewportWidth - popoverWidth - CALENDAR_VIEWPORT_GAP)
    );
    const computedStyle = window.getComputedStyle(trigger);

    setCalendarPopover({
      id,
      top: Math.round(top),
      left: Math.round(left),
      theme: {
        '--cl-surface': computedStyle.getPropertyValue('--cl-surface').trim() || '#FFFFFF',
        '--cl-surface-muted': computedStyle.getPropertyValue('--cl-surface-muted').trim() || '#FAFAFA',
        '--cl-border': computedStyle.getPropertyValue('--cl-border').trim() || '#E5E7EB',
        '--cl-text': computedStyle.getPropertyValue('--cl-text').trim() || '#374151',
        '--cl-text-strong': computedStyle.getPropertyValue('--cl-text-strong').trim() || '#202020',
        '--cl-text-muted': computedStyle.getPropertyValue('--cl-text-muted').trim() || '#6B7280',
        '--cl-shadow': computedStyle.getPropertyValue('--cl-shadow').trim() || '0 12px 30px rgba(0,0,0,.16)',
      },
    });
  }, []);

  useEffect(() => {
    if (!openDatePicker) return undefined;

    const updatePosition = () => positionCalendarPopover(openDatePicker);
    const animationFrame = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    // El evento en captura también detecta el scroll del contenedor de filtros.
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [calendarMonth, openDatePicker, positionCalendarPopover]);

  const SUBGENEROS_POR_GENERO_CATALOG = {
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

  const estadosPorRegion = useMemo(() => {
    const grouped = new Map();
    obras.forEach((obra) => {
      const estado = String(obra.estado || '').trim();
      if (!estado) return;
      const regionFromData = String(obra.region || '').trim();
      const inferredRegion = Object.entries(ESTADOS_POR_REGION_CATALOG).find(([, estados]) => (
        estados.some((item) => normalizeFilterLabel(item) === normalizeFilterLabel(estado))
      ))?.[0];
      const region = regionFromData || inferredRegion || 'Sin región';
      const regionKey = normalizeFilterLabel(region);
      if (!grouped.has(regionKey)) grouped.set(regionKey, { label: region, estados: new Map() });
      grouped.get(regionKey).estados.set(normalizeFilterLabel(estado), estado);
    });
    return Object.fromEntries([...grouped.values()].map(({ label, estados }) => [
      label,
      [...estados.values()].sort((a, b) => a.localeCompare(b, 'es')),
    ]));
  }, [obras]);

  const subgenerosPorGenero = useMemo(() => {
    const grouped = new Map();
    obras.forEach((obra) => {
      const genero = String(obra.genero || '').trim();
      const subgenero = String(obra.subgenero || '').trim();
      const tipoObra = String(obra.tipoObra || '').trim();
      if (!genero) return;
      const generoKey = normalizeFilterLabel(genero);
      if (!grouped.has(generoKey)) grouped.set(generoKey, { label: genero, subgeneros: new Map() });
      if (!subgenero) return;
      const subgeneros = grouped.get(generoKey).subgeneros;
      const subgeneroKey = normalizeFilterLabel(subgenero);
      if (!subgeneros.has(subgeneroKey)) subgeneros.set(subgeneroKey, { label: subgenero, tipos: new Map() });
      if (tipoObra) subgeneros.get(subgeneroKey).tipos.set(normalizeFilterLabel(tipoObra), tipoObra);
    });
    return Object.fromEntries([...grouped.values()].map(({ label, subgeneros }) => [
      label,
      Object.fromEntries([...subgeneros.values()].map(({ label: subLabel, tipos }) => [
        subLabel,
        [...tipos.values()].sort((a, b) => a.localeCompare(b, 'es')),
      ])),
    ]));
  }, [obras]);

  const dynamicOptions = useMemo(() => {
    const unique = (key) => {
      const values = new Map();
      obras.forEach((obra) => {
        const value = String(obra[key] || '').trim();
        if (value) values.set(normalizeFilterLabel(value), value);
      });
      return [...values.values()].sort((a, b) => a.localeCompare(b, 'es'));
    };
    const etapasPorTipo = {};
    obras.forEach((obra) => {
      const tipo = String(obra.tipoProyecto || '').trim();
      const etapa = String(obra.etapa || '').trim();
      if (!tipo) return;
      if (!etapasPorTipo[tipo]) etapasPorTipo[tipo] = new Map();
      if (etapa) etapasPorTipo[tipo].set(normalizeFilterLabel(etapa), etapa);
    });
    return {
      sectores: unique('sector'),
      desarrollos: unique('tipoDesarrollo'),
      tiposProyecto: unique('tipoProyecto'),
      etapasPorTipo: Object.fromEntries(Object.entries(etapasPorTipo).map(([tipo, etapas]) => [tipo, [...etapas.values()]])),
    };
  }, [obras]);

  useEffect(() => {
    if (!obras.length) return;
    const keepAvailable = (selected, available) => {
      const normalizedAvailable = new Set(available.map(normalizeFilterLabel));
      return selected.filter((value) => normalizedAvailable.has(normalizeFilterLabel(value)));
    };
    const availableSubgeneros = Object.values(subgenerosPorGenero).flatMap((group) => Object.keys(group));
    const availableTiposObra = Object.values(subgenerosPorGenero)
      .flatMap((group) => Object.values(group).flat());

    const cleanupTimer = window.setTimeout(() => {
      setSelectedRegiones((current) => keepAvailable(current, Object.keys(estadosPorRegion)));
      setSelectedEstados((current) => keepAvailable(current, Object.values(estadosPorRegion).flat()));
      setSelectedGeneros((current) => keepAvailable(current, Object.keys(subgenerosPorGenero)));
      setSelectedSubgeneros((current) => keepAvailable(current, availableSubgeneros));
      setSelectedTipoObra((current) => keepAvailable(current, availableTiposObra));
      setSelectedSectores((current) => keepAvailable(current, dynamicOptions.sectores));
      setSelectedTiposProyecto((current) => keepAvailable(current, dynamicOptions.tiposProyecto));
      setSelectedEtapas((current) => keepAvailable(current, Object.values(dynamicOptions.etapasPorTipo).flat()));
      setSelectedDesarrollos((current) => keepAvailable(current, dynamicOptions.desarrollos));
    }, 0);
    return () => window.clearTimeout(cleanupTimer);
  }, [dynamicOptions, estadosPorRegion, obras.length, subgenerosPorGenero]);

  // Conservamos el catálogo únicamente como referencia de orden/compatibilidad;
  // ninguna opción se muestra si no existe en el XML recibido.
  void SUBGENEROS_POR_GENERO_CATALOG;

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
      options: Object.keys(estadosPorRegion),
      multi: true,
      group: 'principales',
    },
    {
      label: 'Género',
      options: Object.keys(subgenerosPorGenero),
      multi: true,
      group: 'principales',
    },
    {
      label: 'Tipo de proyecto',
      options: dynamicOptions.tiposProyecto,
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
      options: Object.values(dynamicOptions.etapasPorTipo).flat(),
      multi: true,
      group: 'avanzados',
    },
    {
      label: 'Tipo desarrollo',
      options: dynamicOptions.desarrollos,
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
      options: dynamicOptions.sectores,
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

  // Los límites numéricos deben reflejar la información que sigue disponible
  // después de los filtros generales, sin condicionarse entre sí.
  const obrasDisponiblesParaRangos = useMemo(
    () => filterObrasByFilters(obras, {
      regiones: selectedRegiones,
      estados: selectedEstados,
      generos: selectedGeneros,
      subgeneros: selectedSubgeneros,
      sectores: selectedSectores,
      etapas: selectedEtapas,
      desarrollos: selectedDesarrollos,
      tipoObra: selectedTipoObra,
      tiposProyecto: selectedTiposProyecto,
      periodoIndex,
      dateRangeStart,
      dateRangeEnd,
      fechaInicio: dateRangeStart,
      fechaFin: dateRangeEnd,
      fechaConsulta: fechaSeleccionada,
      superficie: [],
      surfaceMin: null,
      surfaceMax: null,
      investmentMin: null,
      investmentMax: null,
    }),
    [
      obras,
      selectedRegiones,
      selectedEstados,
      selectedGeneros,
      selectedSubgeneros,
      selectedSectores,
      selectedEtapas,
      selectedDesarrollos,
      selectedTipoObra,
      selectedTiposProyecto,
      periodoIndex,
      dateRangeStart,
      dateRangeEnd,
      fechaSeleccionada,
    ]
  );

  const dateBounds = useMemo(() => {
    return getDateBoundsForCriterion(obras, fechaSeleccionada);
  }, [obras, fechaSeleccionada]);

  const investmentBounds = useMemo(() => {
    const values = obrasDisponiblesParaRangos
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
  }, [obrasDisponiblesParaRangos]);

  useEffect(() => {
    if (!dateBounds.min || !dateBounds.max) return;

    setDateRangeStart(dateBounds.min);
    setDateRangeEnd(dateBounds.max);
  }, [dateBounds.min, dateBounds.max]);

  const surfaceBounds = useMemo(() => {
    const values = obrasDisponiblesParaRangos
      .map((obra) => Number(obra.superficie || 0))
      .filter((value) => Number.isFinite(value) && value >= 0)
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
  }, [obrasDisponiblesParaRangos]);

  useEffect(() => {
    if (!investmentBounds.max) return;

    setInvestmentMin(investmentBounds.min);
    setInvestmentMax(investmentBounds.max);
  }, [investmentBounds.min, investmentBounds.max]);

  useEffect(() => {
    if (!surfaceBounds.max) return;

    setSurfaceMin(surfaceBounds.min);
    setSurfaceMax(surfaceBounds.max);
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
          hasDateRangeFilter: Boolean(
            dateRangeStart &&
            dateRangeEnd &&
            (dateRangeStart !== dateBounds.min || dateRangeEnd !== dateBounds.max)
          ),
          hasSurfaceRangeFilter:
            resolvedSurfaceMin > surfaceBounds.min ||
            resolvedSurfaceMax < surfaceBounds.max,
          hasInvestmentRangeFilter:
            resolvedInvestmentMin > investmentBounds.min ||
            resolvedInvestmentMax < investmentBounds.max,
          selectedValues,
        })
      );
    } catch {
      return undefined;
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
    dateBounds.min,
    dateBounds.max,
    surfaceBounds.min,
    surfaceBounds.max,
    investmentBounds.min,
    investmentBounds.max,
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

  const allRegionesCount = Object.keys(estadosPorRegion).length;
  const allEstadosCount = Object.values(estadosPorRegion).flat().length;
  const allGenerosCount = Object.keys(subgenerosPorGenero).length;
  const allSubgenerosCount = Object.values(subgenerosPorGenero)
    .reduce((total, subgeneros) => total + Object.keys(subgeneros).length, 0);
  const allTiposObraCount = Object.values(subgenerosPorGenero)
    .flatMap((subgeneros) => Object.values(subgeneros).flat()).length;
  const selectionForPayload = (selected, total) => {
    if (selected.length === total) return [];
    if (selected.length === 0) return [];
    return selected;
  };

  useEffect(() => {
    if (!shouldInitializeAllFilters.current || !obras.length) return;

    shouldInitializeAllFilters.current = false;
    setSelectedValues({ 'Tipo de fecha': 'Fecha de publicación' });
    setSelectedRegiones([]);
    setSelectedEstados([]);
    setSelectedGeneros([]);
    setSelectedSubgeneros([]);
    setSelectedSectores([]);
    setSelectedEtapas([]);
    setSelectedDesarrollos([]);
    setSelectedTipoObra([]);
    setSelectedTiposProyecto([]);
    setPeriodoIndex(-1);
    setDateRangeStart(dateBounds.min);
    setDateRangeEnd(dateBounds.max);
    setInvestmentMin(investmentBounds.min);
    setInvestmentMax(investmentBounds.max);
    setSurfaceMin(surfaceBounds.min);
    setSurfaceMax(surfaceBounds.max);
  }, [
    obras.length,
    dateBounds.min,
    dateBounds.max,
    investmentBounds.min,
    investmentBounds.max,
    surfaceBounds.min,
    surfaceBounds.max,
  ]);

  const hasInvestmentRangeFilter =
    resolvedInvestmentMin > investmentBounds.min ||
    resolvedInvestmentMax < investmentBounds.max;
  const hasSurfaceRangeFilter =
    resolvedSurfaceMin > surfaceBounds.min ||
    resolvedSurfaceMax < surfaceBounds.max;
  const hasDateRangeFilter = Boolean(
    dateRangeStart &&
    dateRangeEnd &&
    (dateRangeStart !== dateBounds.min || dateRangeEnd !== dateBounds.max)
  );

  const filtrosActivos = {
    regiones: selectionForPayload(selectedRegiones, allRegionesCount),
    estados: selectionForPayload(selectedEstados, allEstadosCount),
    generos: selectionForPayload(selectedGeneros, allGenerosCount),
    subgeneros: selectionForPayload(selectedSubgeneros, allSubgenerosCount),
    sectores: selectionForPayload(selectedSectores, dynamicOptions.sectores.length),
    etapas: selectionForPayload(selectedEtapas, Object.values(dynamicOptions.etapasPorTipo).flat().length),
    desarrollos: selectionForPayload(selectedDesarrollos, dynamicOptions.desarrollos.length),
    tipoObra: selectionForPayload(selectedTipoObra, allTiposObraCount),
    tipoObraSeleccionados: selectionForPayload(selectedTipoObra, allTiposObraCount),
    tiposObra: selectionForPayload(selectedTipoObra, allTiposObraCount),
    tiposObraFiltro: selectionForPayload(selectedTipoObra, allTiposObraCount),
    tiposProyecto: selectionForPayload(selectedTiposProyecto, dynamicOptions.tiposProyecto.length),
    investmentMin: hasInvestmentRangeFilter ? resolvedInvestmentMin : null,
    investmentMax: hasInvestmentRangeFilter ? resolvedInvestmentMax : null,
    periodoIndex,
    dateRangeStart,
    dateRangeEnd,
    fechaInicio: dateRangeStart,
    fechaFin: dateRangeEnd,
    fechaRango: {
      desde: dateRangeStart,
      hasta: dateRangeEnd,
    },
    hasDateRangeFilter,
    fechaConsulta: fechaSeleccionada,
    surfaceMin: hasSurfaceRangeFilter ? superficieMin : null,
    surfaceMax: hasSurfaceRangeFilter ? superficieMax : null,
    superficie: [],
  };

  useEffect(() => {
    if (!rangeFiltersReady) {
      return;
    }

    window.construleadsFilters = filtrosActivos;
    const publishTimer = window.setTimeout(() => {
      onApplyFilters?.(filtrosActivos);
    }, 140);

    return () => window.clearTimeout(publishTimer);
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
    onApplyFilters,
  ]);

  function resetAllFilters() {
    const publicationBounds = getDateBoundsForCriterion(obras, 'Fecha de publicación');

    setSelectedValues({ 'Tipo de fecha': 'Fecha de publicación' });
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
    setExpandedTipoProyecto(null);
    setInvestmentMin(investmentBounds.min);
    setInvestmentMax(investmentBounds.max);
    setSurfaceMin(surfaceBounds.min);
    setSurfaceMax(surfaceBounds.max);
    setPeriodoIndex(-1);
    setDateRangeStart(publicationBounds.min);
    setDateRangeEnd(publicationBounds.max);
    localStorage.removeItem('construleads-filters');
    localStorage.removeItem('construleads-filtros');
    setOpenedAccordions(getDefaultAccordion());
    setSearchInputs({});
  }

  // Search helpers for filtering options if > 10
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
    const regiones = Object.keys(estadosPorRegion);

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
            const parentSelected = selectedRegiones.includes(region);
            const selectedChildrenCount = estadosRegion.filter((estado) =>
              selectedEstados.includes(estado)
            ).length;
            const selected = parentSelected && selectedChildrenCount === estadosRegion.length;
            const partiallySelected = parentSelected && !selected;
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
                      setExpandedRegion(region);
                      if (selected) {
                        setSelectedRegiones((current) =>
                          current.filter((item) => item !== region)
                        );
                        setSelectedEstados((current) =>
                          current.filter((estado) => !estadosRegion.includes(estado))
                        );
                      } else {
                        setSelectedRegiones((current) =>
                          current.includes(region) ? current : [...current, region]
                        );
                        setSelectedEstados((current) => [
                          ...current,
                          ...estadosRegion.filter((estado) => !current.includes(estado)),
                        ]);
                      }
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
                            const hasSelectedChildren = estadosRegion.some((item) =>
                              nextEstados.includes(item)
                            );

                            setSelectedEstados(nextEstados);
                            setSelectedRegiones((current) => {
                              if (hasSelectedChildren) {
                                return current.includes(region) ? current : [...current, region];
                              }
                              return current.filter((item) => item !== region);
                            });
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
    const generos = Object.keys(subgenerosPorGenero);

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
            const parentSelected = selectedGeneros.includes(genero);
            const selected = parentSelected &&
              subgeneros.every((subgenero) => selectedSubgeneros.includes(subgenero)) &&
              tiposGenero.every((tipo) => selectedTipoObra.includes(tipo));
            const partiallySelected = parentSelected && !selected;
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
                      setExpandedGenero(genero);
                      if (selected) {
                        setSelectedGeneros((current) =>
                          current.filter((item) => item !== genero)
                        );
                        setSelectedSubgeneros((current) =>
                          current.filter((item) => !subgeneros.includes(item))
                        );
                        setSelectedTipoObra((current) =>
                          current.filter((item) => !tiposGenero.includes(item))
                        );
                      } else {
                        setSelectedGeneros((current) =>
                          current.includes(genero) ? current : [...current, genero]
                        );
                        setSelectedSubgeneros((current) => [
                          ...current,
                          ...subgeneros.filter((item) => !current.includes(item)),
                        ]);
                        setSelectedTipoObra((current) => [
                          ...current,
                          ...tiposGenero.filter((item) => !current.includes(item)),
                        ]);
                      }
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
                      const parentSubgeneroSelected = selectedSubgeneros.includes(subgenero);
                      const selectedSubgenero = parentSubgeneroSelected &&
                        tiposObra.every((tipo) => selectedTipoObra.includes(tipo));
                      const partiallySelectedSubgenero = parentSubgeneroSelected &&
                        !selectedSubgenero;
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
                                setExpandedSubgenero(`${genero}-${subgenero}`);
                                if (selectedSubgenero) {
                                  const nextSubgeneros = selectedSubgeneros.filter(
                                    (item) => item !== subgenero
                                  );
                                  const nextTiposObra = selectedTipoObra.filter(
                                    (tipo) => !tiposObra.includes(tipo)
                                  );
                                  const hasSelectedDescendants =
                                    subgeneros.some((item) => nextSubgeneros.includes(item)) ||
                                    tiposGenero.some((item) => nextTiposObra.includes(item));

                                  setSelectedSubgeneros(nextSubgeneros);
                                  setSelectedTipoObra(nextTiposObra);
                                  if (!hasSelectedDescendants) {
                                    setSelectedGeneros((current) =>
                                      current.filter((item) => item !== genero)
                                    );
                                  }
                                } else {
                                  setSelectedSubgeneros((current) =>
                                    current.includes(subgenero) ? current : [...current, subgenero]
                                  );
                                  setSelectedTipoObra((current) => [
                                    ...current,
                                    ...tiposObra.filter((tipo) => !current.includes(tipo)),
                                  ]);
                                  if (!selectedGeneros.includes(genero)) {
                                    setSelectedGeneros((current) => [...current, genero]);
                                  }
                                }
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
                                      const hasSelectedTypesInSubgenero = tiposObra.some((item) =>
                                        nextTiposObra.includes(item)
                                      );
                                      const nextSubgeneros = hasSelectedTypesInSubgenero
                                        ? selectedSubgeneros.includes(subgenero)
                                          ? selectedSubgeneros
                                          : [...selectedSubgeneros, subgenero]
                                        : selectedSubgeneros.filter((item) => item !== subgenero);
                                      const hasSelectedDescendantsInGenero =
                                        subgeneros.some((item) => nextSubgeneros.includes(item)) ||
                                        tiposGenero.some((item) => nextTiposObra.includes(item));

                                      setSelectedTipoObra(nextTiposObra);
                                      setSelectedSubgeneros(nextSubgeneros);
                                      setSelectedGeneros((current) => {
                                        if (hasSelectedDescendantsInGenero) {
                                          return current.includes(genero) ? current : [...current, genero];
                                        }
                                        return current.filter((item) => item !== genero);
                                      });
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
    const formattedMonthLabel = new Intl.DateTimeFormat('es-MX', {
      month: 'long',
      year: 'numeric',
    }).format(calendarMonth);
    const monthLabel = formattedMonthLabel.charAt(0).toUpperCase() + formattedMonthLabel.slice(1);

    return (
      <Box position="relative">
        <Text fontSize="11px" fontWeight="600" color={TEXT_SECONDARY} mb={1}>
          {label}
        </Text>

        <Flex
          as="button"
          type="button"
          ref={(element) => { dateFieldRefs.current[id] = element; }}
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
            const nextPicker = openDatePicker === id ? null : id;
            if (nextPicker) positionCalendarPopover(nextPicker);
            setOpenDatePicker(nextPicker);
          }}
          aria-expanded={openDatePicker === id}
          aria-haspopup="dialog"
        >
          <Text as="span" noOfLines={1}>
            {formatDateForDisplay(value)}
          </Text>
          <Text as="span" color={TEXT_SECONDARY} fontSize="13px">
            ▾
          </Text>
        </Flex>

        {openDatePicker === id && calendarPopover?.id === id && typeof document !== 'undefined' && createPortal(
          <Box
            ref={calendarPopoverRef}
            role="dialog"
            aria-label={`Calendario para ${label.toLowerCase()}`}
            position="fixed"
            top={`${calendarPopover.top}px`}
            left={`${calendarPopover.left}px`}
            zIndex={1400}
            w="min(240px, calc(100vw - 24px))"
            p={2}
            bg="var(--cl-surface, #FFFFFF)"
            border="1px solid var(--cl-border, #E5E7EB)"
            borderRadius="10px"
            boxShadow="var(--cl-shadow, 0 12px 30px rgba(0,0,0,.16))"
            overflow="visible"
            style={calendarPopover.theme}
            onClick={(event) => event.stopPropagation()}
          >
            <Flex align="center" justify="space-between" mb={2}>
              <Text fontSize="12px" fontWeight="700" color="var(--cl-text-strong, #202020)">
                {monthLabel}
              </Text>

              <Flex gap={1}>
                <Box
                  as="button"
                  type="button"
                  w="28px"
                  h="28px"
                  borderRadius="8px"
                  color="var(--cl-text-muted, #6B7280)"
                  _hover={{ bg: 'var(--cl-surface-muted, #FAFAFA)' }}
                  onClick={() => setCalendarMonth((current) => addMonths(current, -1))}
                  aria-label="Mes anterior"
                >
                  ‹
                </Box>
                <Box
                  as="button"
                  type="button"
                  w="28px"
                  h="28px"
                  borderRadius="8px"
                  color="var(--cl-text-muted, #6B7280)"
                  _hover={{ bg: 'var(--cl-surface-muted, #FAFAFA)' }}
                  onClick={() => setCalendarMonth((current) => addMonths(current, 1))}
                  aria-label="Mes siguiente"
                >
                  ›
                </Box>
              </Flex>
            </Flex>

            <SimpleGrid columns={7} spacing={1} mb={1}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                <Text key={day} fontSize="10px" fontWeight="700" color="var(--cl-text-muted, #6B7280)" textAlign="center">
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
                    color={isSelected ? 'white' : disabled ? 'var(--cl-text-muted, #6B7280)' : 'var(--cl-text, #374151)'}
                    opacity={disabled ? 0.35 : 1}
                    bg={isSelected ? '#FF653F' : 'transparent'}
                    cursor={disabled ? 'default' : 'pointer'}
                    _hover={disabled ? {} : { bg: isSelected ? '#FF653F' : 'var(--cl-surface-muted, #FAFAFA)' }}
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
          </Box>,
          document.body
        )}
      </Box>
    );
  }

  // Accordions for Principales
  function renderPrincipales() {
    const etapasPorTipo = dynamicOptions.etapasPorTipo;
    const setEtapasWithParent = (tipo, updater) => {
      const nextEtapas = typeof updater === 'function'
        ? updater(selectedEtapas)
        : updater;
      const etapasTipo = etapasPorTipo[tipo] || [];
      const hasSelectedChildren = etapasTipo.some((etapa) => nextEtapas.includes(etapa));

      setSelectedEtapas(nextEtapas);
      setSelectedTiposProyecto((current) => {
        if (hasSelectedChildren) {
          return current.includes(tipo) ? current : [...current, tipo];
        }
        return current.filter((item) => item !== tipo);
      });
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
                  const nextBounds = getDateBoundsForCriterion(obras, option);
                  setSelectedValues((prev) => ({
                    ...prev,
                    'Tipo de fecha': option,
                  }));
                  setDateRangeStart(nextBounds.min);
                  setDateRangeEnd(nextBounds.max);
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
            {dynamicOptions.tiposProyecto.map((tipo) => {
              const etapas = etapasPorTipo[tipo] || [];
              const parentSelected = selectedTiposProyecto.includes(tipo);
              const tipoSelected = parentSelected &&
                etapas.every((etapa) => selectedEtapas.includes(etapa));
              const tipoPartiallySelected = parentSelected && !tipoSelected;
              const tipoActive = parentSelected;
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
                      checked={tipoSelected}
                      readOnly
                      ref={(input) => {
                        if (input) input.indeterminate = tipoPartiallySelected;
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedTipoProyecto(tipo);
                        if (tipoSelected) {
                          setSelectedTiposProyecto((current) =>
                            current.filter((item) => item !== tipo)
                          );
                          setSelectedEtapas((current) =>
                            current.filter((etapa) => !etapas.includes(etapa))
                          );
                        } else {
                          setSelectedTiposProyecto((current) =>
                            current.includes(tipo) ? current : [...current, tipo]
                          );
                          setSelectedEtapas((current) => [
                            ...current,
                            ...etapas.filter((etapa) => !current.includes(etapa)),
                          ]);
                        }
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
                        (updater) => setEtapasWithParent(tipo, updater),
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
            dynamicOptions.sectores,
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

  function renderSourcesAccordion() {
    const sources = [
      {
        key: 'construleads',
        label: 'Construleads',
        detail: 'Base BIMSA',
        color: '#FF653F',
      },
      {
        key: 'explorer',
        label: 'Explorer',
        detail: 'Nueva fuente',
        color: '#1847B8',
      },
    ];

    return (
      <FilterAccordion
        title="Fuente"
        expanded={!!openedAccordions.Fuente}
        onToggle={() => toggleAccordion('Fuente')}
      >
        <Flex align="center" justify="space-between" mb={2}>
          <Text fontSize="10px" color={TEXT_SECONDARY}>
            Vista previa de fuentes
          </Text>
          <Text
            px={1.5}
            py={0.5}
            borderRadius="full"
            bg="var(--cl-surface-muted)"
            border="1px solid var(--cl-border)"
            color={TEXT_SECONDARY}
            fontSize="8px"
            fontWeight="700"
            letterSpacing=".04em"
          >
            BETA
          </Text>
        </Flex>

        <VStack align="stretch" spacing={1}>
          {sources.map((source) => {
            const isEnabled = sourcePreview[source.key];
            return (
              <Flex
                as="button"
                type="button"
                key={source.key}
                w="100%"
                align="center"
                justify="space-between"
                gap={2}
                px={2}
                py={1.5}
                borderRadius="9px"
                bg={isEnabled ? 'var(--cl-surface-muted)' : 'transparent'}
                cursor="pointer"
                textAlign="left"
                transition="background 160ms ease"
                _hover={{ bg: 'var(--cl-surface-muted)' }}
                onClick={() => setSourcePreview((current) => ({
                  ...current,
                  [source.key]: !current[source.key],
                }))}
                role="switch"
                aria-checked={isEnabled}
                aria-label={`${source.label} ${isEnabled ? 'visible' : 'oculta'}; maqueta`}
              >
                <Flex align="center" gap={2} minW={0}>
                  <Box w="7px" h="7px" borderRadius="full" bg={source.color} flexShrink={0} />
                  <Box minW={0}>
                    <Text fontSize="11px" fontWeight="600" color={TEXT_STRONG} lineHeight="1.15">
                      {source.label}
                    </Text>
                    <Text mt={0.5} fontSize="9px" color={TEXT_SECONDARY} lineHeight="1.1">
                      {source.detail}
                    </Text>
                  </Box>
                </Flex>
                <Flex
                  w="28px"
                  h="16px"
                  p="2px"
                  borderRadius="full"
                  bg={isEnabled ? source.color : 'var(--cl-border)'}
                  flexShrink={0}
                  align="center"
                  transition="background 180ms ease"
                >
                  <Box
                    w="12px"
                    h="12px"
                    borderRadius="full"
                    bg="white"
                    boxShadow="0 1px 3px rgba(0,0,0,.2)"
                    transform={isEnabled ? 'translateX(12px)' : 'translateX(0)'}
                    transition="transform 180ms ease"
                  />
                </Flex>
              </Flex>
            );
          })}
        </VStack>
      </FilterAccordion>
    );
  }

  return (
    <Box
      w="var(--cl-sidebar-width)"
      minW="216px"
      maxW="240px"
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
            onClick={resetAllFilters}
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
          {renderSourcesAccordion()}
          {renderPrincipales()}
          {renderSimpleAccordion(
            'Tipo desarrollo',
            dynamicOptions.desarrollos,
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
