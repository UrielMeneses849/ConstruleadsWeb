import {
  Box,
  Flex,
  Button,
  Text,
  HStack,
} from '@chakra-ui/react';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  FiEye,
  FiChevronUp,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiSliders,
} from 'react-icons/fi';

const RESULTS_PER_PAGE = 100;

function parseTableDate(value) {
  if (!value || value === '-') return null;

  const normalized = String(value).trim();
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

const tableDateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatTableDateDisplay(value) {
  if (!value || value === '-') return '-';

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? '-'
      : tableDateFormatter.format(value);
  }

  const parsed = parseTableDate(value);
  return parsed ? tableDateFormatter.format(parsed) : String(value);
}

function getMonthGroupKey(value) {
  const date = parseTableDate(value);
  if (!date) return 'Sin fecha';

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthGroupLabel(value) {
  if (value === 'Sin fecha') return 'Sin fecha';

  const [year, month] = String(value).split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);

  return new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getMonthKey(value) {
  const date = parseTableDate(value);
  if (!date) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getDayLabel(value) {
  const date = parseTableDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
  }).format(date);
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

function ResultadosView({
  obras = [],
  onSelectionChange,
  selectionResetToken = 0,
  onGoToMap,
}) {
  const [filterMenu, setFilterMenu] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [filterSearch, setFilterSearch] = useState({});
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

useEffect(() => {
  // Debug temporal. Cambiar a true solo cuando se necesite revisar data en consola.
  const DEBUG_RESULTADOS = false;
  if (DEBUG_RESULTADOS) {
    console.log('[ResultadosView] obras:', obras?.length, obras?.[0]);
  }
}, [obras]);



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
        ) !== null
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
          : '0 m²',

      estado:
        obra.estado ||
        obra.Estado_Proyecto ||
        obra.ESTADO_PROYECTO ||
        obra.estado_proyecto ||
        obra.Estado ||
        obra.ESTADO ||
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

      tipo:
        obra.tipoProyecto ||
        obra.Tipo_Proyecto ||
        obra.TIPO_PROYECTO ||
        obra.tipo_proyecto ||
        obra.TipoProyecto ||
        obra.tipoproyecto ||
        '-',

      compania:
        obra.compania ||
        obra.Compania ||
        obra.COMPANIA ||
        '-',

      source: obra,
    }));
  }, [obras]);

useEffect(() => {
  // Debug temporal. Cambiar a true solo cuando se necesite revisar data en consola.
  const DEBUG_RESULTADOS = false;
  if (DEBUG_RESULTADOS) {
    console.log('[ResultadosView] tableData:', tableData.length, tableData[0]);
  }
}, [tableData]);

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
    textAlign: 'center',
  };

  const renderCellText = (value) => (
    <div style={cellTextStyle} title={typeof value === 'string' ? value : undefined}>
      {value ?? '-'}
    </div>
  );

  useEffect(() => {
    if (lastSelectionResetToken.current === selectionResetToken) return;

    lastSelectionResetToken.current = selectionResetToken;
    setSelectedRows([]);
  }, [selectionResetToken]);

  useEffect(() => {
    const visibleKeys = new Set(tableData.map(getRowKey));
    setSelectedRows((current) => current.filter((key) => visibleKeys.has(key)));
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

  const dateFields = ['inicio', 'fin', 'publicacion'];

  const filteredData = useMemo(() => tableData.filter((row) => {
    return Object.entries(columnFilters).every(([field, values]) => {
      if (!values || values.length === 0) return true;

      if (dateFields.includes(field)) {
        const monthGroup = getMonthGroupKey(row[field]);
        return values.includes(monthGroup);
      }

      return values.includes(String(row[field] ?? ''));
    });
  }), [tableData, columnFilters]);

  const sortedData = useMemo(() => {
    if (!sortConfig.field) return filteredData;

    const sorted = [...filteredData];
    const { field, direction } = sortConfig;

    sorted.sort((a, b) => {
      const aValue = String(a[field] ?? '').trim();
      const bValue = String(b[field] ?? '').trim();

      if (dateFields.includes(field)) {
        const aDate = parseTableDate(aValue);
        const bDate = parseTableDate(bValue);
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
      inversion: 'Inversión', superficie: 'Superficie', inicio: 'Inicio',
      fin: 'Término', publicacion: 'Publicación', tipo: 'Tipo',
    };
    Object.entries(columnFilters).forEach(([field, values]) => {
      if (!Array.isArray(values) || !values.length) return;
      chips.push({
        key: `column-${field}`,
        label: columnLabels[field] || field,
        value: values.length === 1 ? values[0] : `${values.length} seleccionados`,
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

  const uniqueValuesByField = useMemo(() => {
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
      'tipo',
      'tipoobra',
      'compania',
    ];

    return fields.reduce((acc, field) => {
      acc[field] = [
        ...new Set(
          tableData
            .map((row) => String(row[field] ?? ''))
            .filter(Boolean)
        ),
      ].sort((a, b) => {
        const dateA = parseTableDate(a);
        const dateB = parseTableDate(b);
        if (dateA && dateB) return dateA.getTime() - dateB.getTime();
        return a.localeCompare(b, 'es');
      });

      return acc;
    }, {});
  }, [tableData]);

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
    const menuWidth = dateFields.includes(field) ? 300 : 280;
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

  const renderHeaderCell = (field, label) => (
    <Flex align="center" justify="center" gap={1}>
      <Text
        fontSize="12px"
        fontWeight="700"
        color={ui.textMuted}
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
      >
        {label}
      </Text>
      <HStack spacing={0}>
        <Button
          variant="ghost"
          size="xs"
          minW="20px"
          w="20px"
          h="20px"
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
          <FiSliders size={11} color={ui.textMuted} />
        </Button>
        <Button
          variant="ghost"
          size="xs"
          minW="20px"
          w="20px"
          h="20px"
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
            <FiChevronUp size={9} color={getSortIconColor(field, 'asc')} />
            <FiChevronDown size={9} color={getSortIconColor(field, 'desc')} />
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
                text-align: center !important;
                vertical-align: middle;
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
              minWidth: '2380px',
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              tableLayout: 'fixed',
            }}
          >
          <colgroup>
            <col style={{ width: '50px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '220px' }} />
            <col style={{ width: '180px' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '165px' }} />
            <col style={{ width: '140px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '125px' }} />
            <col style={{ width: '125px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '135px' }} />
            <col style={{ width: '92px' }} />
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
              <th style={{ padding: '14px 14px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderHeaderCell('clave', 'Clave')}
              </th>
              <th style={{ padding: '14px 14px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderHeaderCell('proyecto', 'Proyecto')}
              </th>
              <th style={{ padding: '14px 14px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderHeaderCell('compania', 'Compañía')}
              </th>
              <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderHeaderCell('genero', 'Género')}
              </th>
              <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: `1px solid ${ui.border}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {renderHeaderCell('subgenero', 'Subgénero')}
              </th>
              <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderHeaderCell('tipoobra', 'Tipo de obra')}
              </th>
              <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderHeaderCell('estado', 'Estado')}
              </th>
              <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderHeaderCell('inversion', 'Inversión (MXN)')}
              </th>
              <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: `1px solid ${ui.border}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {renderHeaderCell('superficie', 'Superficie')}
              </th>
              <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderHeaderCell('inicio', 'Inicio')}
              </th>
              <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: `1px solid ${ui.border}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {renderHeaderCell('fin', 'Término')}
              </th>
              <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderHeaderCell('publicacion', 'Publicación')}
              </th>
              <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: `1px solid ${ui.border}` }}>
                {renderHeaderCell('tipo', 'Tipo')}
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
                Acciones
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
                  <td style={{ padding: '12px 10px', borderTop: `1px solid ${ui.border}`, fontSize: '13px', height: '2.6em' }}>{renderCellText(row.clave)}</td>
                  <td style={{ padding: '12px 10px', borderTop: `1px solid ${ui.border}`, fontSize: '13px', height: '2.6em' }}>{renderCellText(row.proyecto)}</td>
                  <td style={{ padding: '12px 10px', borderTop: `1px solid ${ui.border}`, fontSize: '13px', height: '2.6em' }}>{renderCellText(row.compania)}</td>
                  <td style={{ padding: '12px 10px', borderTop: `1px solid ${ui.border}`, fontSize: '13px', height: '2.6em' }}>{renderCellText(row.genero)}</td>
                  <td style={{ padding: '12px 10px', borderTop: `1px solid ${ui.border}`, fontSize: '13px', height: '2.6em' }}>{renderCellText(row.subgenero)}</td>
                  <td style={{ padding: '12px 10px', borderTop: `1px solid ${ui.border}`, fontSize: '13px', height: '2.6em' }}>{renderCellText(row.tipoobra)}</td>
                  <td style={{ padding: '12px 10px', borderTop: `1px solid ${ui.border}`, fontSize: '13px', height: '2.6em' }}>{renderCellText(row.estado)}</td>
                  <td style={{ padding: '12px 10px', borderTop: `1px solid ${ui.border}`, fontSize: '13px', height: '2.6em' }}>{renderCellText(row.inversion)}</td>
                  <td style={{ padding: '12px 10px', borderTop: `1px solid ${ui.border}`, fontSize: '13px', height: '2.6em' }}>{renderCellText(row.superficie)}</td>
                  <td style={{ padding: '12px 10px', borderTop: `1px solid ${ui.border}`, fontSize: '13px', height: '2.6em' }}>{renderCellText(row.inicio)}</td>
                  <td style={{ padding: '12px 10px', borderTop: `1px solid ${ui.border}`, fontSize: '13px', height: '2.6em' }}>{renderCellText(row.fin)}</td>
                  <td style={{ padding: '12px 10px', borderTop: `1px solid ${ui.border}`, fontSize: '13px', height: '2.6em' }}>{renderCellText(row.publicacion)}</td>
                  <td style={{ padding: '12px 10px', borderTop: `1px solid ${ui.border}`, fontSize: '13px', height: '2.6em' }}>{renderCellText(row.tipo)}</td>
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
              width: dateFields.includes(filterMenu) ? '300px' : '280px',
              maxHeight: '340px',
              overflowY: 'auto',
              boxShadow: 'none',
              color: ui.textStrong,
              fontSize: '13px',
            }}
          >
            {dateFields.includes(filterMenu)
              ? renderDateFilter(filterMenu)
              : renderOptionFilter(filterMenu)}
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
