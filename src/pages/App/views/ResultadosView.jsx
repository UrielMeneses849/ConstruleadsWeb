import {
  Box,
  Flex,
  Button,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useMemo, useState, useRef, useEffect } from 'react';
import {
  FiEye,
  FiChevronUp,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiSliders,
} from 'react-icons/fi';

const RESULTS_PER_PAGE = 100;
const DATE_FIELDS = ['inicio', 'fin', 'publicacion'];

function parseTableDate(value) {
  if (!value || value === '-') return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const normalized = String(value).trim();
  // Los valores seleccionados del filtro son llaves de mes (`AAAA-MM`).
  // `new Date('2026-02')` se interpreta como UTC y en México termina siendo
  // 31 de enero; los construimos localmente para no retroceder de mes/año.
  const monthKeyMatch = normalized.match(/^(\d{4})-(\d{2})$/);
  if (monthKeyMatch) {
    const [, year, month] = monthKeyMatch;
    return new Date(Number(year), Number(month) - 1, 1);
  }

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

const tableMonthFormatter = new Intl.DateTimeFormat('es-MX', {
  month: 'short',
});

function formatTableDateDisplay(value) {
  if (!value || value === '-') return '-';

  const parsed = value instanceof Date
    ? value
    : parseTableDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return String(value);

  const month = tableMonthFormatter.format(parsed).replace('.', '');
  const capitalizedMonth = `${month.charAt(0).toUpperCase()}${month.slice(1)}`;
  return `${capitalizedMonth} ${parsed.getDate()}, ${parsed.getFullYear()}`;
}

function getMonthGroupKey(value) {
  const date = parseTableDate(value);
  if (!date) return 'Sin fecha';

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function parseNumberValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatCurrencyMXN(value) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumberMX(value) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 0,
  }).format(value);
}

function rowMatchesColumnFilters(row, filters, excludedFields = []) {
  const excluded = new Set(excludedFields);

  return Object.entries(filters).every(([field, values]) => {
    if (excluded.has(field) || !values || values.length === 0) return true;

    if (field === 'categoria') {
      return values.some((token) => {
        const [kind, genero, subgenero] = String(token).split('::');
        if (kind === 'genero') return row.genero === genero;
        return kind === 'subgenero' && row.genero === genero && row.subgenero === subgenero;
      });
    }

    if (DATE_FIELDS.includes(field)) {
      const monthGroup = getMonthGroupKey(row[`${field}Raw`] || row[field]);
      return values.includes(monthGroup);
    }

    return values.includes(String(row[field] ?? ''));
  });
}

function getFacetExclusions(field) {
  // Estado y Proyecto comparten un solo menú. Al abrirlo mostramos las
  // opciones compatibles con el resto de filtros, no sólo con su propia
  // selección actual.
  return field === 'estado' || field === 'proyecto'
    ? ['estado', 'proyecto']
    : [field];
}

function ResultadosView({
  obras = [],
  onSelectionChange,
  selectionResetToken = 0,
  onViewFicha,
}) {
  const [filterMenu, setFilterMenu] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [filterSearch, setFilterSearch] = useState({});
  const [expandedGenreFilters, setExpandedGenreFilters] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [page, setPage] = useState(1);
  const filterMenuRef = useRef(null);
  const resultsContainerRef = useRef(null);
  const lastSelectionResetToken = useRef(selectionResetToken);
  const lastSelectionSignature = useRef('');

  const [filterPosition, setFilterPosition] = useState({
    top: 0,
    left: 0,
  });

  const ui = {
    surface: 'var(--cl-surface)',
    surfaceMuted: 'var(--cl-surface-muted)',
    hover: 'var(--cl-hover)',
    border: 'var(--cl-border)',
    text: 'var(--cl-text)',
    textStrong: 'var(--cl-text-strong)',
    textMuted: 'var(--cl-text-muted)',
    inputBg: 'var(--cl-input-bg)',
    shadow: 'var(--cl-shadow)',
  };

  const toggleSort = (field) => {
    setPage(1);
    setSortConfig((current) => {
      if (current.field === field) {
        return {
          field,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return { field, direction: 'asc' };
    });
  };

  const getSortIconColor = (field, direction) => {
    if (sortConfig.field !== field) return ui.textMuted;
    return sortConfig.direction === direction ? '#FF653F' : ui.textMuted;
  };

  const tableData = useMemo(() => {
    return (obras || []).map((obra, index) => ({
      id:
        obra.Id_Obra ||
        obra.ID_OBRA ||
        obra.id_obra ||
        obra.id ||
        index,

      clave:
        obra.clave ||
        obra.Clave_Proyecto ||
        obra.CLAVE_PROYECTO ||
        obra.clave_proyecto ||
        obra.claveProyecto ||
        obra.ClaveProyecto ||
        obra.claveproyecto ||
        '-',

      proyecto:
        obra.proyecto ||
        obra.Proyecto ||
        obra.PROYECTO ||
        obra.Nombre_Proyecto ||
        obra.NOMBRE_PROYECTO ||
        '-',

      genero:
        obra.genero ||
        obra.Genero ||
        obra.GENERO ||
        '-',

      subgenero:
        obra.subgenero ||
        obra.Subgenero ||
        obra.SUBGENERO ||
        obra.subGenero ||
        '-',

        tipoobra:
        obra.tipoObra ||
        obra.Tipo_Obra ||
        obra.TIPO_OBRA ||
        obra.tipo_obra ||
        obra.TipoObra ||
        obra.tipoobra ||
        '-',

      inversionRaw:
        parseNumberValue(
          obra.inversion ||
          obra.Inversion ||
          obra.INVERSION ||
          obra.inversionTotal ||
          obra.InversionTotal ||
          null
        ),
      inversion:
        parseNumberValue(
          obra.inversion ||
          obra.Inversion ||
          obra.INVERSION ||
          obra.inversionTotal ||
          null
        ) !== null
          ? formatCurrencyMXN(
              parseNumberValue(
                obra.inversion ||
                obra.Inversion ||
                obra.INVERSION ||
                obra.inversionTotal ||
                null
              )
            )
          : '-',

      superficieRaw:
        parseNumberValue(
          obra.superficie ??
          obra.Superficie ??
          obra.SUPERFICIE ??
          obra.superficieTotal ??
          obra.SuperficieTotal ??
          0
        ),
      superficie:
        parseNumberValue(
          obra.superficie ??
          obra.Superficie ??
          obra.SUPERFICIE ??
          obra.superficieTotal ??
          obra.SuperficieTotal ??
          0
        ) > 0
          ? `${formatNumberMX(
              parseNumberValue(
                obra.superficie ??
                obra.Superficie ??
                obra.SUPERFICIE ??
                obra.superficieTotal ??
                obra.SuperficieTotal ??
                0
              )
            )} m²`
          : 'No definido',

      estado:
        obra.estado ||
        obra.Estado_Proyecto ||
        obra.ESTADO_PROYECTO ||
        obra.estado_proyecto ||
        obra.Estado ||
        obra.ESTADO ||
        '-',

      localizacion:
        obra.localizacion ||
        obra.Localizacion1 ||
        obra.ubicacion ||
        obra.Ubicacion ||
        obra.direccion ||
        obra.Direccion ||
        '',

      inicioRaw:
        obra.fechaInicioDate ||
        obra.fechaInicioTime ||
        obra.fechaInicio ||
        obra.Fecha_Inicio ||
        obra.FECHA_INICIO ||
        obra.fecha_inicio ||
        obra.FechaInicio ||
        obra.fechainicio ||
        '-',

      inicio:
        formatTableDateDisplay(
          obra.fechaInicioDate ||
            obra.fechaInicioTime ||
            obra.fechaInicio ||
            obra.Fecha_Inicio ||
            obra.FECHA_INICIO ||
            obra.fecha_inicio ||
            obra.FechaInicio ||
            obra.fechainicio
        ),

      finRaw:
        obra.fechaTerminoDate ||
        obra.fechaTerminoTime ||
        obra.fechaTerminacionDate ||
        obra.fechaFinDate ||
        obra.fechaTermino ||
        obra.fechaTerminacion ||
        obra.fechaFin ||
        obra.Fecha_Terminacion ||
        obra.Fecha_Termino ||
        obra.FECHA_TERMINACION ||
        obra.FECHA_TERMINO ||
        obra.fecha_terminacion ||
        obra.fecha_termino ||
        obra.FechaTerminacion ||
        obra.FechaTermino ||
        obra.fechaterminacion ||
        obra.fechatermino ||
        obra.Fecha_Fin ||
        obra.FECHA_FIN ||
        obra.fecha_fin ||
        '-',

      fin:
        formatTableDateDisplay(
          obra.fechaTerminoDate ||
            obra.fechaTerminoTime ||
            obra.fechaTerminacionDate ||
            obra.fechaFinDate ||
            obra.fechaTermino ||
            obra.fechaTerminacion ||
            obra.fechaFin ||
            obra.Fecha_Terminacion ||
            obra.Fecha_Termino ||
            obra.FECHA_TERMINACION ||
            obra.FECHA_TERMINO ||
            obra.fecha_terminacion ||
            obra.fecha_termino ||
            obra.FechaTerminacion ||
            obra.FechaTermino ||
            obra.fechaterminacion ||
            obra.fechatermino ||
            obra.Fecha_Fin ||
            obra.FECHA_FIN ||
            obra.fecha_fin ||
            '-'
        ),

      publicacionRaw:
        obra.fechaPublicacionDate ||
        obra.fechaPublicacionTime ||
        obra.fechaPublicacion ||
        obra.Fecha_publicacion ||
        obra.FECHA_PUBLICACION ||
        obra.fecha_publicacion ||
        obra.FechaPublicacion ||
        obra.fechapublicacion ||
        obra.Fecha_Publicacion ||
        '-',

      publicacion:
        formatTableDateDisplay(
          obra.fechaPublicacionDate ||
            obra.fechaPublicacionTime ||
            obra.fechaPublicacion ||
            obra.Fecha_publicacion ||
            obra.FECHA_PUBLICACION ||
            obra.fecha_publicacion ||
            obra.FechaPublicacion ||
            obra.fechapublicacion ||
            obra.Fecha_Publicacion
        ),

      // El parser ya expone el valor canónico entregado por el WS. La tabla no
      // debe traducirlo, corregirlo ni reconstruirlo con aliases.
      tipo: obra.tipoProyecto || '-',

      compania:
        obra.compania ||
        obra.Compania ||
        obra.COMPANIA ||
        '-',

      source: obra,
    }));
  }, [obras]);

  const getRowKey = (row) => String(row.id || row.clave || row.proyecto);

  const cellTextStyle = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    lineHeight: '1.3',
    maxHeight: '2.6em',
    textAlign: 'left',
  };

  const renderCellText = (value, className = '') => (
    <div className={`result-cell-text ${className}`} style={cellTextStyle} title={typeof value === 'string' ? value : undefined}>
      {value ?? '-'}
    </div>
  );

  const renderProjectCell = (row) => {
    const location = [row.localizacion, row.estado]
      .filter(Boolean)
      .filter((value, index, values) => values.findIndex((item) => String(item).toLowerCase() === String(value).toLowerCase()) === index)
      .join(' · ');

    return (
      <div className="result-project-cell" title={row.proyecto}>
        <span className="result-project-title">{row.proyecto || '-'}</span>
        {location && <span className="result-project-location">{location}</span>}
      </div>
    );
  };

  const renderGenreCell = (row) => (
    <div className="result-genre-cell" title={`${row.genero || '-'} · ${row.subgenero || '-'}`}>
      <span className="result-genre-title">{row.genero || '-'}</span>
      {row.subgenero && row.subgenero !== '-' && (
        <span className="result-subgenre-title">{row.subgenero}</span>
      )}
    </div>
  );

  useEffect(() => {
    if (lastSelectionResetToken.current === selectionResetToken) return;

    lastSelectionResetToken.current = selectionResetToken;
    setSelectedRows([]);
  }, [selectionResetToken]);

  useEffect(() => {
    const visibleKeys = new Set(tableData.map(getRowKey));
    const frame = window.requestAnimationFrame(() => {
      setSelectedRows((current) => current.filter((key) => visibleKeys.has(key)));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tableData]);

  useEffect(() => {
    if (!onSelectionChange) return;

    const selectionSignature = [...selectedRows].sort().join('|');
    if (lastSelectionSignature.current === selectionSignature) return;
    lastSelectionSignature.current = selectionSignature;

    const selectedSet = new Set(selectedRows);
    const selectedObras = tableData
      .filter((row) => selectedSet.has(getRowKey(row)))
      .map((row) => row.source);

    onSelectionChange(selectedObras);
  }, [selectedRows, tableData, onSelectionChange]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setFilterMenu(null);
      }
    };

    const handleClickOutside = (event) => {
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(event.target)
      ) {
        setFilterMenu(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredData = useMemo(
    () => tableData.filter((row) => rowMatchesColumnFilters(row, columnFilters)),
    [tableData, columnFilters]
  );

  const sortedData = useMemo(() => {
    if (!sortConfig.field) return filteredData;

    const sorted = [...filteredData];
    const { field, direction } = sortConfig;

    sorted.sort((a, b) => {
      const aValue = String(a[field] ?? '').trim();
      const bValue = String(b[field] ?? '').trim();

      if (DATE_FIELDS.includes(field)) {
        const aDate = parseTableDate(a[`${field}Raw`] || aValue);
        const bDate = parseTableDate(b[`${field}Raw`] || bValue);
        if (aDate && bDate) {
          return direction === 'asc'
            ? aDate.getTime() - bDate.getTime()
            : bDate.getTime() - aDate.getTime();
        }
        if (aDate) return direction === 'asc' ? -1 : 1;
        if (bDate) return direction === 'asc' ? 1 : -1;
        return 0;
      }

      if (field === 'inversion' || field === 'superficie') {
        const aNum = Number(a[`${field}Raw`] ?? NaN);
        const bNum = Number(b[`${field}Raw`] ?? NaN);
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
          return direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
        if (Number.isFinite(aNum)) return direction === 'asc' ? -1 : 1;
        if (Number.isFinite(bNum)) return direction === 'asc' ? 1 : -1;
        return 0;
      }

      const compareResult = aValue.localeCompare(bValue, 'es', { numeric: true });
      return direction === 'asc' ? compareResult : -compareResult;
    });

    return sorted;
  }, [filteredData, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / RESULTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visibleData = useMemo(() => {
    const start = (currentPage - 1) * RESULTS_PER_PAGE;
    return sortedData.slice(start, start + RESULTS_PER_PAGE);
  }, [sortedData, currentPage]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    const columnLabels = {
      clave: 'Clave', proyecto: 'Proyecto', compania: 'Compañía', genero: 'Género',
      subgenero: 'Subgénero', tipoobra: 'Tipo de obra', estado: 'Estado',
      categoria: 'Género',
      inversion: 'Inversión', superficie: 'Superficie', inicio: 'Inicio',
      fin: 'Término', publicacion: 'Publicación',
    };
    Object.entries(columnFilters).forEach(([field, values]) => {
      if (!Array.isArray(values) || !values.length) return;
      chips.push({
        key: `column-${field}`,
        label: columnLabels[field] || field,
        value: values.length === 1
          ? values[0].replace(/^genero::|^subgenero::/u, '').replace(/::/g, ' · ')
          : `${values.length} seleccionados`,
      });
    });

    return chips;
  }, [columnFilters]);

  const clearAllVisibleFilters = () => {
    setColumnFilters({});
    setFilterSearch({});
    setFilterMenu(null);
    setPage(1);
  };

  const selectedRowsSet = useMemo(
    () => new Set(selectedRows),
    [selectedRows]
  );

  const facetedRowsByField = useMemo(() => {
    const fields = [
      'clave',
      'proyecto',
      'genero',
      'subgenero',
      'estado',
      'inversion',
      'superficie',
      'inicio',
      'fin',
      'publicacion',
      'tipoobra',
      'compania',
    ];

    return fields.reduce((acc, field) => {
      acc[field] = tableData.filter((row) => (
        rowMatchesColumnFilters(row, columnFilters, getFacetExclusions(field))
      ));
      return acc;
    }, {});
  }, [tableData, columnFilters]);

  const uniqueValuesByField = useMemo(() => {
    return Object.entries(facetedRowsByField).reduce((acc, [field, rows]) => {
      const selectedValues = columnFilters[field] || [];
      acc[field] = [
        ...new Set(
          rows
            .map((row) => String(row[`${field}Raw`] || row[field] || ''))
            .filter(Boolean)
            .concat(selectedValues)
        ),
      ].sort((a, b) => {
        const dateA = parseTableDate(a);
        const dateB = parseTableDate(b);
        if (dateA && dateB) return dateA.getTime() - dateB.getTime();
        return a.localeCompare(b, 'es');
      });

      return acc;
    }, {});
  }, [columnFilters, facetedRowsByField]);

  const genreFacetRows = useMemo(
    () => tableData.filter((row) => rowMatchesColumnFilters(row, columnFilters, ['categoria'])),
    [tableData, columnFilters]
  );

  const genreHierarchy = useMemo(() => {
    const hierarchy = new Map();
    genreFacetRows.forEach((row) => {
      const genero = String(row.genero || '-');
      const subgenero = String(row.subgenero || '-');
      if (!hierarchy.has(genero)) hierarchy.set(genero, new Set());
      if (subgenero && subgenero !== '-') hierarchy.get(genero).add(subgenero);
    });

    return [...hierarchy.entries()]
      .map(([genero, subgeneros]) => ({
        genero,
        subgeneros: [...subgeneros].sort((a, b) => a.localeCompare(b, 'es')),
      }))
      .sort((a, b) => a.genero.localeCompare(b.genero, 'es'));
  }, [genreFacetRows]);

  const allFilteredSelected =
    filteredData.length > 0 &&
    filteredData.every((row) => selectedRowsSet.has(getRowKey(row)));

  const partiallySelected =
    selectedRows.length > 0 &&
    filteredData.some((row) => selectedRowsSet.has(getRowKey(row))) &&
    !allFilteredSelected;

  const openFilterMenu = (field, target) => {
    const targetRect = target.getBoundingClientRect();
    const container = resultsContainerRef.current;
    const containerRect = container?.getBoundingClientRect();
    const scaleX = container && containerRect?.width
      ? containerRect.width / container.offsetWidth
      : 1;
    const scaleY = container && containerRect?.height
      ? containerRect.height / container.offsetHeight
      : scaleX;
    const menuWidth = DATE_FIELDS.includes(field) ? 300 : field === 'categoria' ? 320 : field === 'proyecto' ? 340 : 280;
    const localLeft = containerRect
      ? (targetRect.left - containerRect.left) / scaleX - 20
      : targetRect.left;

    setFilterPosition({
      top: containerRect
        ? (targetRect.bottom - containerRect.top) / scaleY + 8
        : targetRect.bottom + 8,
      left: container
        ? Math.max(8, Math.min(localLeft, container.offsetWidth - menuWidth - 8))
        : localLeft,
    });

    setFilterMenu((current) => (current === field ? null : field));
  };

  const getUniqueValues = (field) => {
    return uniqueValuesByField[field] || [];
  };

  const toggleFilterValue = (field, value) => {
    setPage(1);
    setColumnFilters(prev => {
      const current = prev[field] || [];

      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value],
      };
    });
  };

  const toggleGenreFilter = (genero) => {
    const parentToken = `genero::${genero}`;
    setPage(1);
    setColumnFilters((current) => {
      const categoryFilters = current.categoria || [];
      const isSelected = categoryFilters.includes(parentToken);
      const withoutGenre = categoryFilters.filter((token) => (
        !token.startsWith(`genero::${genero}`) &&
        !token.startsWith(`subgenero::${genero}::`)
      ));
      return {
        ...current,
        categoria: isSelected ? withoutGenre : [...withoutGenre, parentToken],
      };
    });
  };

  const toggleSubgenreFilter = (genero, subgenero) => {
    const parentToken = `genero::${genero}`;
    const childToken = `subgenero::${genero}::${subgenero}`;
    setPage(1);
    setColumnFilters((current) => {
      const categoryFilters = current.categoria || [];
      const withoutParent = categoryFilters.filter((token) => token !== parentToken);
      return {
        ...current,
        categoria: withoutParent.includes(childToken)
          ? withoutParent.filter((token) => token !== childToken)
          : [...withoutParent, childToken],
      };
    });
  };

  const toggleRow = (row) => {
    const key = getRowKey(row);
    setSelectedRows((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  };

  const toggleAllFiltered = () => {
    const filteredKeys = filteredData.map(getRowKey);

    setSelectedRows((current) => {
      if (allFilteredSelected) {
        return current.filter((key) => !filteredKeys.includes(key));
      }

      return [...new Set([...current, ...filteredKeys])];
    });
  };

  const renderHeaderCell = (field, label, { compact = false } = {}) => {
    const controlSize = compact ? '16px' : '18px';
    const controlHeight = compact ? '18px' : '18px';

    return (
    <Flex align="center" justify="space-between" gap={1} minW={0} w="100%">
      <Text
        fontSize={compact ? '9px' : '10px'}
        fontWeight="800"
        color={ui.textMuted}
        letterSpacing=".045em"
        textTransform="none"
        whiteSpace="nowrap"
        minW={0}
        overflow="visible"
        textOverflow="clip"
      >
        {label}
      </Text>
      <HStack spacing={0} flexShrink={0}>
        <Button
          variant="ghost"
          size="xs"
          minW={controlSize}
          w={controlSize}
          h={controlHeight}
          p={0}
          borderRadius="6px"
          _hover={{ bg: ui.hover }}
          onClick={(event) => {
            event.stopPropagation();
            openFilterMenu(field, event.currentTarget);
          }}
          aria-label={`Filtrar ${label}`}
          title={`Filtrar ${label}`}
        >
          <FiSliders size={compact ? 10 : 10} color={ui.textMuted} />
        </Button>
        <Button
          variant="ghost"
          size="xs"
          minW={controlSize}
          w={controlSize}
          h={controlHeight}
          p={0}
          borderRadius="6px"
          _hover={{ bg: ui.hover }}
          onClick={(event) => {
            event.stopPropagation();
            toggleSort(field);
          }}
          aria-label={`Ordenar ${label}`}
          title={`Ordenar ${label}`}
        >
          <Flex direction="column" align="center" gap={0}>
            <FiChevronUp size={compact ? 8 : 8} color={getSortIconColor(field, 'asc')} />
            <FiChevronDown size={compact ? 8 : 8} color={getSortIconColor(field, 'desc')} />
          </Flex>
        </Button>
      </HStack>
    </Flex>
    );
  };

  const renderGenreHeaderCell = () => (
    <Flex align="center" justify="flex-start" gap={1} minW="max-content">
      <Text
        fontSize="10px"
        fontWeight="800"
        color={ui.textMuted}
        letterSpacing=".02em"
        whiteSpace="nowrap"
        flexShrink={0}
      >
        Género
      </Text>
      <HStack spacing={0} flexShrink={0}>
        <Button
          variant="ghost"
          size="xs"
          minW="18px"
          w="18px"
          h="18px"
          p={0}
          borderRadius="6px"
          _hover={{ bg: ui.hover }}
          onClick={(event) => {
            event.stopPropagation();
            openFilterMenu('categoria', event.currentTarget);
          }}
          aria-label="Filtrar género y subgénero"
          title="Filtrar género y subgénero"
        >
          <FiSliders size={10} color={ui.textMuted} />
        </Button>
        <Button
          variant="ghost"
          size="xs"
          minW="18px"
          w="18px"
          h="18px"
          p={0}
          borderRadius="6px"
          _hover={{ bg: ui.hover }}
          onClick={(event) => {
            event.stopPropagation();
            toggleSort('genero');
          }}
          aria-label="Ordenar género"
          title="Ordenar género"
        >
          <Flex direction="column" align="center" gap={0}>
            <FiChevronUp size={8} color={getSortIconColor('genero', 'asc')} />
            <FiChevronDown size={8} color={getSortIconColor('genero', 'desc')} />
          </Flex>
        </Button>
      </HStack>
    </Flex>
  );

  const renderDateFilter = (field) => {
    const values = getUniqueValues(field).filter((value) => parseTableDate(value));
    const groupedByYear = values.reduce((acc, value) => {
      const date = parseTableDate(value);
      const year = date ? String(date.getFullYear()) : 'Sin fecha';
      const monthKey = getMonthGroupKey(value);
      const monthLabel = date
        ? new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(date)
        : value;

      acc[year] = acc[year] || [];
      if (!acc[year].some((item) => item.key === monthKey)) {
        acc[year].push({ key: monthKey, label: monthLabel, date });
      }
      return acc;
    }, {});

    const yearKeys = Object.keys(groupedByYear).sort((a, b) => {
      if (a === 'Sin fecha') return 1;
      if (b === 'Sin fecha') return -1;
      return Number(b) - Number(a);
    });

    return (
      <Box>
        <Text fontSize="12px" fontWeight="700" color={ui.textStrong} mb={3}>
          Año y meses con información
        </Text>
        {yearKeys.map((year) => (
          <Box key={year} mb={4}>
            <Text
              fontSize="12px"
              fontWeight="700"
              color={ui.textMuted}
              mb={2}
            >
              {year}
            </Text>
            <Box display="grid" gridTemplateColumns="repeat(4, minmax(0, 1fr))" gap="6px">
              {groupedByYear[year]
                .sort((a, b) => a.date?.getTime() - b.date?.getTime())
                .map(({ key, label }) => {
                  const selected = (columnFilters[field] || []).includes(key);
                  return (
                    <Button
                      key={key}
                      size="xs"
                      h="30px"
                      minW="0"
                      borderRadius="8px"
                      bg={selected ? '#FF653F' : ui.surfaceMuted}
                      color={selected ? 'white' : ui.text}
                      border={`1px solid ${selected ? '#FF653F' : ui.border}`}
                      _hover={{
                        bg: selected ? '#FF653F' : ui.hover,
                        borderColor: selected ? '#FF653F' : ui.textMuted,
                      }}
                      onClick={() => toggleFilterValue(field, key)}
                      title={label}
                    >
                      {label}
                    </Button>
                  );
                })}
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  const renderGenreFilter = () => {
    const selectedCategories = columnFilters.categoria || [];

    return (
      <Box>
        <Text fontSize="12px" fontWeight="700" color={ui.textStrong} mb={2}>
          Género y subgénero
        </Text>
        <Text fontSize="11px" color={ui.textMuted} mb={3} lineHeight="1.35">
          Selecciona un género completo o abre sus subgéneros para afinar el resultado.
        </Text>
        {genreHierarchy.map(({ genero, subgeneros }) => {
          const parentToken = `genero::${genero}`;
          const isParentSelected = selectedCategories.includes(parentToken);
          const selectedSubgenres = subgeneros.filter((subgenero) => (
            selectedCategories.includes(`subgenero::${genero}::${subgenero}`)
          ));
          const isPartial = !isParentSelected && selectedSubgenres.length > 0;
          const isExpanded = expandedGenreFilters.includes(genero);

          return (
            <Box key={genero} mb={1} borderRadius="8px" overflow="hidden">
              <Flex
                align="center"
                gap={2}
                px={2}
                py={1.5}
                bg={isParentSelected || isPartial ? ui.surfaceMuted : 'transparent'}
                borderRadius="8px"
                _hover={{ bg: ui.hover }}
                cursor="pointer"
                onClick={() => setExpandedGenreFilters((current) => (
                  current.includes(genero)
                    ? current.filter((value) => value !== genero)
                    : [...current, genero]
                ))}
              >
                <input
                  type="checkbox"
                  checked={isParentSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isPartial;
                  }}
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => toggleGenreFilter(genero)}
                  style={{ accentColor: '#FF653F', width: 14, height: 14 }}
                />
                <Text flex="1" fontSize="12px" fontWeight="700" color={ui.textStrong} lineClamp={1}>
                  {genero}
                </Text>
                {subgeneros.length > 0 && (
                  <Box color={ui.textMuted} transform={isExpanded ? 'rotate(90deg)' : 'none'} transition="transform 160ms ease">
                    <FiChevronRight size={15} />
                  </Box>
                )}
              </Flex>

              {isExpanded && subgeneros.length > 0 && (
                <Box ml={5} mt={1} pl={2} borderLeft={`1px solid ${ui.border}`}>
                  {subgeneros.map((subgenero) => {
                    const childToken = `subgenero::${genero}::${subgenero}`;
                    const isChildSelected = selectedCategories.includes(childToken);
                    return (
                      <Flex
                        key={subgenero}
                        align="center"
                        gap={2}
                        py={1.5}
                        cursor="pointer"
                        _hover={{ color: ui.textStrong }}
                        onClick={() => toggleSubgenreFilter(genero, subgenero)}
                      >
                        <input
                          type="checkbox"
                          checked={isChildSelected}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleSubgenreFilter(genero, subgenero)}
                          style={{ accentColor: '#FF653F', width: 13, height: 13 }}
                        />
                        <Text fontSize="12px" color={ui.text} lineClamp={1}>{subgenero}</Text>
                      </Flex>
                    );
                  })}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderProjectStatusFilter = () => {
    const projectSearch = filterSearch.proyecto || '';
    const matchingProjects = getUniqueValues('proyecto').filter((value) => (
      String(value).toLowerCase().includes(projectSearch.toLowerCase())
    ));
    const visibleProjects = projectSearch ? matchingProjects.slice(0, 50) : [];

    return (
      <Box>
        <Text fontSize="12px" fontWeight="700" color={ui.textStrong} mb={3}>
          Proyecto y estado
        </Text>

        <Text fontSize="11px" fontWeight="700" color={ui.textMuted} mb={1.5}>
          Proyecto
        </Text>
        <input
          value={projectSearch}
          onChange={(event) => setFilterSearch((current) => ({
            ...current,
            proyecto: event.target.value,
          }))}
          placeholder="Buscar proyecto..."
          style={{
            width: '100%',
            height: '34px',
            borderRadius: '8px',
            border: `1px solid ${ui.border}`,
            padding: '0 10px',
            background: ui.inputBg,
            color: ui.text,
            outline: 'none',
            fontSize: '13px',
          }}
        />
        {!projectSearch && (
          <Text fontSize="11px" color={ui.textMuted} mt={1.5}>
            Escribe para buscar entre {getUniqueValues('proyecto').length} proyectos.
          </Text>
        )}

        <Box mt={3} pt={3} borderTop={`1px solid ${ui.border}`}>
          <Text fontSize="11px" fontWeight="700" color={ui.textMuted} mb={1.5}>
            Estado
          </Text>
          <Box display="grid" gridTemplateColumns="repeat(2, minmax(0, 1fr))" columnGap={2} rowGap={1}>
            {getUniqueValues('estado').map((value) => (
              <label
                key={value}
                style={{
                  display: 'flex',
                  gap: '7px',
                  alignItems: 'center',
                  minWidth: 0,
                  cursor: 'pointer',
                  lineHeight: 1.25,
                }}
              >
                <input
                  type="checkbox"
                  checked={(columnFilters.estado || []).includes(value)}
                  onChange={() => toggleFilterValue('estado', value)}
                  style={{ accentColor: '#4B5563', flexShrink: 0 }}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={value}>
                  {value}
                </span>
              </label>
            ))}
          </Box>
        </Box>

        {projectSearch && (
          <Box mt={3} pt={3} borderTop={`1px solid ${ui.border}`}>
            {visibleProjects.map((value) => (
              <label
                key={value}
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                  marginBottom: '8px',
                  lineHeight: 1.35,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={(columnFilters.proyecto || []).includes(value)}
                  onChange={() => toggleFilterValue('proyecto', value)}
                  style={{ accentColor: '#4B5563', marginTop: '2px' }}
                />
                <span>{value}</span>
              </label>
            ))}
            {!visibleProjects.length && (
              <Text fontSize="11px" color={ui.textMuted}>No encontramos proyectos con ese nombre.</Text>
            )}
          </Box>
        )}
      </Box>
    );
  };

  const renderOptionFilter = (field) => {
    const search = filterSearch[field] || '';
    const hasSearchInput = field === 'clave' || field === 'proyecto' || field === 'compania';
    const values = getUniqueValues(field).filter((value) =>
      String(value).toLowerCase().includes(search.toLowerCase())
    );
    const visibleValues = hasSearchInput && !search
      ? values.slice(0, 80)
      : values;

    return (
      <Box>
        {hasSearchInput && (
          <input
            value={search}
            onChange={(event) =>
              setFilterSearch((current) => ({
                ...current,
                [field]: event.target.value,
              }))
            }
            placeholder={
              field === 'compania'
                ? 'Buscar compañía...'
                : field === 'clave'
                  ? 'Buscar clave...'
                  : 'Buscar proyecto...'
            }
            style={{
              width: '100%',
              height: '34px',
              borderRadius: '8px',
              border: `1px solid ${ui.border}`,
              padding: '0 10px',
              marginBottom: '10px',
              background: ui.inputBg,
              color: ui.text,
              outline: 'none',
              fontSize: '13px',
            }}
          />
        )}

        {hasSearchInput && !search && values.length > visibleValues.length && (
          <Text fontSize="11px" color={ui.textMuted} mb={2}>
            Escribe para buscar entre {values.length} {
              field === 'compania' ? 'compañías' : field === 'clave' ? 'claves' : 'proyectos'
            }.
          </Text>
        )}

        {visibleValues.map(value => (
          <label
            key={value}
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
              marginBottom: '8px',
              lineHeight: 1.35,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={(columnFilters[filterMenu] || []).includes(value)}
              onChange={() => toggleFilterValue(filterMenu, value)}
              style={{ accentColor: '#4B5563', marginTop: '2px' }}
            />
            <span>{value}</span>
          </label>
        ))}
      </Box>
    );
  };

  return (
    <Box
      height="100%"
      minH="0"
      overflow="hidden"
      display="flex"
      flexDirection="column"
      bg={ui.surface}
      color={ui.text}
      pt={0}
    >

      <Box
        ref={resultsContainerRef}
        bg={ui.surface}
        border={`1px solid ${ui.border}`}
        borderRadius="8px"
        overflow="hidden"
        flex="1"
        minH="0"
        display="flex"
        flexDirection="column"
        position="relative"
      >
        <Box
          flex="1"
          minH="0"
          minW="0"
          overflow="hidden"
          overscrollBehavior="contain"
        >
          <style>
            {`
              .resultados-scroll {
                scrollbar-width: auto;
                scrollbar-color: var(--cl-text-muted) var(--cl-surface-muted);
              }
              .resultados-scroll::-webkit-scrollbar {
                width: 12px;
                height: 12px;
              }
              .resultados-scroll::-webkit-scrollbar-track {
                background: var(--cl-surface-muted);
                border-radius: 999px;
              }
              .resultados-scroll::-webkit-scrollbar-thumb {
                background: var(--cl-text-muted);
                border: 3px solid var(--cl-surface-muted);
                border-radius: 999px;
              }
              .resultados-scroll::-webkit-scrollbar-thumb:hover {
                background: var(--cl-text-strong);
              }
              .resultados-table thead th {
                position: sticky;
                top: 0;
                z-index: 2;
                background: var(--cl-surface-muted);
              }
              .resultados-table th,
              .resultados-table td {
                box-sizing: border-box;
                text-align: left !important;
                vertical-align: middle;
              }
              .resultados-table th:first-child,
              .resultados-table td:first-child,
              .resultados-table th:last-child,
              .resultados-table td:last-child {
                text-align: center !important;
              }
              .resultados-table th:last-child {
                position: sticky;
                right: 0;
                z-index: 5;
                background: var(--cl-surface-muted);
                box-shadow: -1px 0 0 var(--cl-border);
              }
              .resultados-table td:last-child {
                position: sticky;
                right: 0;
                z-index: 3;
                box-shadow: -1px 0 0 var(--cl-border);
                vertical-align: middle;
              }
              .resultados-action-cell {
                height: 100%;
                min-height: 52px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: inherit;
              }
              /* Jerarquía editorial: lo operativo se lee primero; la ubicación
                 y las fechas acompañan sin competir con el nombre del proyecto. */
              .resultados-table {
                font-variant-numeric: tabular-nums;
              }
              .resultados-table tbody tr {
                transition: background-color 140ms ease;
              }
              .resultados-table tbody tr:hover td {
                background: var(--cl-hover);
              }
              .resultados-table .resultados-cell {
                color: var(--cl-text);
                font-size: 12px;
                line-height: 1.32;
              }
              .resultados-table .resultados-cell-key .result-cell-text {
                color: var(--cl-text-muted);
                font-size: 11px;
                font-weight: 400;
                letter-spacing: .01em;
              }
              .resultados-table .result-cell-text {
                color: var(--cl-text);
                font-size: 12px;
              }
              .resultados-table .resultados-cell-company .result-cell-text {
                color: var(--cl-text-strong);
                font-weight: 500;
              }
              .resultados-table .resultados-cell-state .result-cell-text {
                color: var(--cl-text-muted);
                font-size: 11px;
                font-weight: 400;
              }
              .resultados-table .resultados-cell-number .result-cell-text {
                color: var(--cl-text-strong);
                font-size: 11px;
                font-weight: 400;
                text-align: right;
              }
              .resultados-table .resultados-cell-emphasis .result-cell-text {
                font-weight: 500;
              }
              .resultados-table .resultados-cell-number.resultados-cell-undefined .result-cell-text {
                color: var(--cl-text-muted);
                font-weight: 400;
              }
              .resultados-table .resultados-cell-date .result-cell-text {
                color: var(--cl-text-muted);
                font-size: 11px;
                font-weight: 400;
              }
              .resultados-table .result-project-cell {
                display: flex;
                flex-direction: column;
                gap: 3px;
                min-width: 0;
              }
              .resultados-table .result-project-title {
                color: var(--cl-text-strong);
                display: -webkit-box;
                font-size: 12px;
                font-weight: 500;
                line-height: 1.28;
                overflow: hidden;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 2;
              }
              .resultados-table .result-project-location {
                color: var(--cl-text-muted);
                font-size: 10px;
                font-weight: 400;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .resultados-table .result-genre-cell {
                display: flex;
                flex-direction: column;
                gap: 3px;
                min-width: 0;
              }
              .resultados-table .result-genre-title {
                color: var(--cl-text-strong);
                font-size: 12px;
                font-weight: 500;
                line-height: 1.2;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .resultados-table .result-subgenre-title {
                color: var(--cl-text-muted);
                font-size: 10px;
                font-weight: 400;
                line-height: 1.2;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .resultados-table thead th:not(:first-child) {
                letter-spacing: .02em;
              }
              @media (max-width: 1180px) {
                .resultados-table .resultados-cell { font-size: 11px; }
                .resultados-table .result-project-title { font-size: 11px; }
              }
            `}
          </style>
          <Box
            className="resultados-scroll"
            h="100%"
            minH="0"
            minW="0"
            overflowX="auto"
            overflowY="scroll"
            overscrollBehavior="contain"
          >
          <table
            className="resultados-table"
            style={{
              minWidth: '1240px',
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              tableLayout: 'fixed',
            }}
          >
          <colgroup>
            <col style={{ width: '2.5%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '19%' }} />
            <col style={{ width: '9.5%' }} />
            <col style={{ width: '10%' }} />
            {/* Fechas: se comportan como un bloque continuo y compacto. */}
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10.5%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9.5%' }} />
            <col style={{ width: '6%' }} />
          </colgroup>
          <thead style={{ background: ui.surfaceMuted }}>
            <tr>
              <th
                style={{
                  padding: '12px 10px',
                  textAlign: 'center',
                  borderBottom: `1px solid ${ui.border}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = partiallySelected;
                  }}
                  onChange={toggleAllFiltered}
                  style={{ accentColor: '#4B5563', width: 14, height: 14 }}
                />
              </th>
              <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderHeaderCell('clave', 'Clave')}
              </th>
              <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderHeaderCell('proyecto', 'Proyecto')}
              </th>
              <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderGenreHeaderCell()}
              </th>
              <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderHeaderCell('tipoobra', 'Tipo de obra')}
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: `1px solid ${ui.border}`, whiteSpace: 'nowrap' }}>
                {renderHeaderCell('publicacion', 'Publicación')}
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: `1px solid ${ui.border}`, whiteSpace: 'nowrap' }}>
                {renderHeaderCell('inicio', 'Inicio')}
              </th>
              <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderHeaderCell('compania', 'Compañía')}
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderHeaderCell('inversion', 'Inversión (MXN)', { compact: true })}
              </th>
              <th style={{ padding: '10px 6px', textAlign: 'left', borderBottom: `1px solid ${ui.border}`, whiteSpace: 'nowrap' }}>
                {renderHeaderCell('superficie', 'Superficie', { compact: true })}
              </th>
              <th
                style={{
                  padding: '12px 6px',
                  textAlign: 'center',
                  fontWeight: 700,
                  color: ui.textMuted,
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  borderBottom: `1px solid ${ui.border}`,
                  background: ui.surfaceMuted,
                }}
              >
                Ficha
              </th>
            </tr>
          </thead>

          <tbody key={`tbody-${obras.length}`}>
            {visibleData.map((row, index) => {
              const rowKey = getRowKey(row);
              const selected = selectedRowsSet.has(rowKey);

              const rowBg = selected
                ? 'var(--cl-selected)'
                : index % 2 === 0 ? ui.surface : ui.surfaceMuted;

              return (
                <tr
                  key={rowKey}
                  style={{
                    background: rowBg,
                  }}
                >
                  <td style={{ padding: '12px 10px', borderTop: `1px solid ${ui.border}`, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleRow(row)}
                      style={{ accentColor: '#4B5563', width: 14, height: 14 }}
                    />
                  </td>
                  <td className="resultados-cell resultados-cell-key" style={{ padding: '9px 8px', borderTop: `1px solid ${ui.border}` }}>{renderCellText(row.clave)}</td>
                  <td className="resultados-cell resultados-cell-project" style={{ padding: '9px 8px', borderTop: `1px solid ${ui.border}` }}>{renderProjectCell(row)}</td>
                  <td className="resultados-cell resultados-cell-genre" style={{ padding: '9px 8px', borderTop: `1px solid ${ui.border}` }}>{renderGenreCell(row)}</td>
                  <td className="resultados-cell" style={{ padding: '9px 8px', borderTop: `1px solid ${ui.border}` }}>{renderCellText(row.tipoobra)}</td>
                  <td className="resultados-cell resultados-cell-date" style={{ padding: '10px 8px', borderTop: `1px solid ${ui.border}` }}>{renderCellText(row.publicacion)}</td>
                  <td className="resultados-cell resultados-cell-date" style={{ padding: '10px 8px', borderTop: `1px solid ${ui.border}` }}>{renderCellText(row.inicio)}</td>
                  <td className="resultados-cell resultados-cell-company" style={{ padding: '9px 8px', borderTop: `1px solid ${ui.border}` }}>{renderCellText(row.compania)}</td>
                  <td className="resultados-cell resultados-cell-number resultados-cell-emphasis" style={{ padding: '10px 12px', borderTop: `1px solid ${ui.border}` }}>{renderCellText(row.inversion)}</td>
                  <td className={`resultados-cell resultados-cell-number resultados-cell-emphasis${row.superficie === 'No definido' ? ' resultados-cell-undefined' : ''}`} style={{ padding: '9px 8px', borderTop: `1px solid ${ui.border}` }}>{renderCellText(row.superficie)}</td>
                  <td style={{ padding: 0, borderTop: `1px solid ${ui.border}`, whiteSpace: 'nowrap', fontSize: '13px', textAlign: 'center', background: rowBg }}>
                    <div className="resultados-action-cell">
                      <Button
                        size="xs"
                        variant="outline"
                        aria-label="Ver proyecto"
                        title="Ver proyecto"
                        w="32px"
                        h="32px"
                        minW="32px"
                        p={0}
                        borderColor={ui.border}
                        color={ui.textStrong}
                        borderRadius="8px"
                        bg={rowBg}
                        _hover={{ bg: ui.surfaceMuted, borderColor: '#FF653F', color: '#FF653F' }}
                        onClick={() => onViewFicha?.(row.source || row)}
                      >
                        <FiEye size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
          </Box>
        </Box>

        {filterMenu && (
          <div
            ref={filterMenuRef}
            style={{
              position: 'absolute',
              top: `${filterPosition.top}px`,
              left: `${filterPosition.left}px`,
              zIndex: 1000,
              background: ui.surface,
              border: `1px solid ${ui.border}`,
              borderRadius: '10px',
              padding: '12px',
              width: DATE_FIELDS.includes(filterMenu) ? '300px' : filterMenu === 'categoria' ? '320px' : filterMenu === 'proyecto' ? '340px' : '280px',
              maxHeight: '340px',
              overflowY: 'auto',
              boxShadow: 'none',
              color: ui.textStrong,
              fontSize: '13px',
            }}
          >
            {DATE_FIELDS.includes(filterMenu)
              ? renderDateFilter(filterMenu)
              : filterMenu === 'categoria'
                ? renderGenreFilter()
                : filterMenu === 'proyecto'
                  ? renderProjectStatusFilter()
                  : renderOptionFilter(filterMenu)}
            <Flex
              position="sticky"
              bottom="-12px"
              mt={3}
              mx="-12px"
              mb="-12px"
              px={3}
              py={2.5}
              justify="space-between"
              align="center"
              bg={ui.surface}
              borderTop={`1px solid ${ui.border}`}
            >
              <Button
                size="xs"
                variant="ghost"
                color={ui.text}
                onClick={() => {
                  setColumnFilters((current) => (
                    filterMenu === 'proyecto'
                      ? { ...current, proyecto: [], estado: [] }
                      : { ...current, [filterMenu]: [] }
                  ));
                  setFilterSearch((current) => (
                    filterMenu === 'proyecto'
                      ? { ...current, proyecto: '' }
                      : { ...current, [filterMenu]: '' }
                  ));
                  setPage(1);
                }}
              >
                Limpiar
              </Button>
              <Button
                size="xs"
                bg="#FF653F"
                color="white"
                _hover={{ bg: '#E85A37' }}
                onClick={() => setFilterMenu(null)}
              >
                Listo
              </Button>
            </Flex>
          </div>
        )}
      </Box>

      {activeFilterChips.length > 0 && (
        <Flex
          flexShrink={0}
          align="center"
          gap={2}
          px={3}
          py={2}
          borderTop={`1px solid ${ui.border}`}
          bg={ui.surface}
          minW={0}
        >
          <Text color={ui.textMuted} fontSize="11px" fontWeight="600" whiteSpace="nowrap">
            Filtros de tabla ({activeFilterChips.length})
          </Text>
          <Flex gap={1.5} overflowX="auto" flex="1" minW={0} pb="1px">
            {activeFilterChips.map((chip) => (
              <Flex
                key={chip.key}
                align="center"
                gap={1}
                px={2}
                h="28px"
                flexShrink={0}
                maxW="280px"
                borderRadius="999px"
                border="1px solid rgba(255, 101, 63, .42)"
                bg="rgba(255, 101, 63, .08)"
                color={ui.text}
              >
                <Text fontSize="11px" color={ui.textMuted} whiteSpace="nowrap">
                  {chip.label}:
                </Text>
                <Text fontSize="11px" fontWeight="600" noOfLines={1} title={chip.value}>
                  {chip.value}
                </Text>
              </Flex>
            ))}
          </Flex>
          <Button
            size="xs"
            h="28px"
            px={3}
            flexShrink={0}
            borderRadius="8px"
            bg="#FF653F"
            color="white"
            _hover={{ bg: '#E85A37' }}
            onClick={clearAllVisibleFilters}
          >
            Limpiar filtros
          </Button>
        </Flex>
      )}

      <Flex
        flexShrink={0}
        justify="space-between"
        align="center"
        px={3}
        borderTop={`1px solid ${ui.border}`}
        bg={ui.surface}
        py={3}
        mt={0}
      >
        <Flex align="center" gap={3} minW={0}>
          <Text color={ui.textMuted} fontSize="13px" whiteSpace="nowrap">
            Mostrando {visibleData.length
              ? `${((currentPage - 1) * RESULTS_PER_PAGE) + 1}-${Math.min(currentPage * RESULTS_PER_PAGE, filteredData.length)}`
              : '0'} de {filteredData.length} resultados
          </Text>
          {totalPages > 1 && (
            <HStack spacing={1}>
              <Button
                size="xs"
                variant="outline"
                aria-label="Página anterior"
                title="Página anterior"
                minW="28px"
                h="28px"
                p={0}
                borderColor={ui.border}
                isDisabled={currentPage === 1}
                onClick={() => setPage(Math.max(1, currentPage - 1))}
              >
                <FiChevronLeft size={14} />
              </Button>
              <Text color={ui.textMuted} fontSize="12px" minW="76px" textAlign="center">
                {currentPage} de {totalPages}
              </Text>
              <Button
                size="xs"
                variant="outline"
                aria-label="Página siguiente"
                title="Página siguiente"
                minW="28px"
                h="28px"
                p={0}
                borderColor={ui.border}
                isDisabled={currentPage === totalPages}
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              >
                <FiChevronRight size={14} />
              </Button>
            </HStack>
          )}
        </Flex>
        <Text color={ui.textMuted} fontSize="13px">
          {selectedRows.length} seleccionados
        </Text>
      </Flex>
    </Box>
  );
}

export default ResultadosView;
