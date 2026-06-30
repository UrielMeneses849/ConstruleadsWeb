import {
  Box,
  Flex,
  Heading,
  Button,
  Text,
  HStack,
} from '@chakra-ui/react';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { FiDownload, FiEye } from 'react-icons/fi';

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

function ResultadosView({ obras = [] }) {
  const [filterMenu, setFilterMenu] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [filterSearch, setFilterSearch] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const filterMenuRef = useRef(null);

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

      estado:
        obra.estado ||
        obra.Estado_Proyecto ||
        obra.ESTADO_PROYECTO ||
        obra.estado_proyecto ||
        obra.Estado ||
        obra.ESTADO ||
        '-',

      inicio:
        obra.fechaInicio ||
        obra.Fecha_Inicio ||
        obra.FECHA_INICIO ||
        obra.fecha_inicio ||
        obra.FechaInicio ||
        obra.fechainicio ||
        '-',

      fin:
        obra.fechaTermino ||
        obra.Fecha_Terminacion ||
        obra.FECHA_TERMINACION ||
        obra.fecha_terminacion ||
        obra.FechaTerminacion ||
        obra.fechaterminacion ||
        obra.Fecha_Fin ||
        obra.FECHA_FIN ||
        obra.fecha_fin ||
        '-',

      publicacion:
        obra.fechaPublicacion ||
        obra.Fecha_publicacion ||
        obra.FECHA_PUBLICACION ||
        obra.fecha_publicacion ||
        obra.FechaPublicacion ||
        obra.fechapublicacion ||
        obra.Fecha_Publicacion ||
        '-',

      tipo:
        obra.tipoProyecto ||
        obra.Tipo_Proyecto ||
        obra.TIPO_PROYECTO ||
        obra.tipo_proyecto ||
        obra.TipoProyecto ||
        obra.tipoproyecto ||
        '-',
    }));
  }, [obras]);

  const getRowKey = (row) => String(row.id || row.clave || row.proyecto);

  useEffect(() => {
    const visibleKeys = new Set(tableData.map(getRowKey));
    setSelectedRows((current) => current.filter((key) => visibleKeys.has(key)));
  }, [tableData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(event.target)
      ) {
        setFilterMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredData = useMemo(() => tableData.filter((row) => {
    return Object.entries(columnFilters).every(([field, values]) => {
      if (!values || values.length === 0) return true;
      return values.includes(String(row[field] ?? ''));
    });
  }), [tableData, columnFilters]);

  const selectedRowsSet = useMemo(
    () => new Set(selectedRows),
    [selectedRows]
  );

  const uniqueValuesByField = useMemo(() => {
    const fields = [
      'clave',
      'proyecto',
      'genero',
      'estado',
      'inicio',
      'fin',
      'publicacion',
      'tipo',
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
    const rect = target.getBoundingClientRect();

    setFilterPosition({
      top: rect.bottom + 8,
      left: rect.left,
    });

    setFilterMenu((current) => (current === field ? null : field));
  };

  const getUniqueValues = (field) => {
    return uniqueValuesByField[field] || [];
  };

  const toggleFilterValue = (field, value) => {
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

  const renderFilterButton = (field, label) => (
    <Button
      variant="ghost"
      size="xs"
      h="28px"
      px={2}
      justifyContent="flex-start"
      color={ui.textMuted}
      fontWeight="700"
      borderRadius="8px"
      _hover={{ bg: ui.hover, color: ui.textStrong }}
      onClick={(event) => openFilterMenu(field, event.currentTarget)}
    >
      <Flex align="center" gap={2}>
        <span>{label}</span>
        <span style={{ fontSize: '11px' }}>▾</span>
      </Flex>
    </Button>
  );

  const dateFields = ['inicio', 'fin', 'publicacion'];

  const renderDateFilter = (field) => {
    const values = getUniqueValues(field).filter((value) => parseTableDate(value));
    const grouped = values.reduce((acc, value) => {
      const key = getMonthKey(value);
      acc[key] = acc[key] || [];
      acc[key].push(value);
      return acc;
    }, {});

    return (
      <Box>
        <Text fontSize="12px" fontWeight="700" color={ui.textStrong} mb={2}>
          Fechas disponibles
        </Text>
        {Object.entries(grouped).map(([month, dates]) => (
          <Box key={month} mb={3}>
            <Text
              fontSize="11px"
              fontWeight="700"
              color={ui.textMuted}
              textTransform="capitalize"
              mb={2}
            >
              {month}
            </Text>
            <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap="6px">
              {dates.map((value) => {
                const selected = (columnFilters[field] || []).includes(value);
                return (
                  <Button
                    key={value}
                    size="xs"
                    h="28px"
                    minW="0"
                    borderRadius="8px"
                    bg={selected ? '#FF6600' : ui.surfaceMuted}
                    color={selected ? 'white' : ui.text}
                    border={`1px solid ${selected ? '#FF6600' : ui.border}`}
                    _hover={{
                      bg: selected ? '#FF6600' : ui.hover,
                      borderColor: selected ? '#FF6600' : ui.textMuted,
                    }}
                    onClick={() => toggleFilterValue(field, value)}
                    title={value}
                  >
                    {getDayLabel(value)}
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
    const values = getUniqueValues(field).filter((value) =>
      String(value).toLowerCase().includes(search.toLowerCase())
    );
    const visibleValues = field === 'proyecto' && !search
      ? values.slice(0, 80)
      : values;

    return (
      <Box>
        {field === 'proyecto' && (
          <input
            value={search}
            onChange={(event) =>
              setFilterSearch((current) => ({
                ...current,
                [field]: event.target.value,
              }))
            }
            placeholder="Buscar proyecto..."
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

        {field === 'proyecto' && !search && values.length > visibleValues.length && (
          <Text fontSize="11px" color={ui.textMuted} mb={2}>
            Escribe para buscar entre {values.length} proyectos.
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
      height="calc(100vh - 116px)"
      mt={5}
      display="flex"
      flexDirection="column"
      bg={ui.surface}
      border={`1px solid ${ui.border}`}
      borderRadius="12px"
      p={3}
      color={ui.text}
    >
      <Flex justify="space-between" align="center" mb={3} pr="384px">
        <Heading size="md" color={ui.textStrong}>Tabla</Heading>
        <Text fontSize="13px" color={ui.textMuted}>
          {selectedRows.length > 0
            ? `${selectedRows.length} seleccionados`
            : 'Selecciona registros para descarga'}
        </Text>
      </Flex>

      <Box
        bg={ui.surface}
        border={`1px solid ${ui.border}`}
        borderRadius="8px"
        overflow="hidden"
        flex="1"
        minH="0"
        display="flex"
        flexDirection="column"
        height="100%"
        position="relative"
      >
        <table
          style={{
            width: '100%',
            height: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
            tableLayout: 'fixed',
          }}
        >
          <thead style={{ background: ui.surfaceMuted }}>
            <tr>
              <th
                style={{
                  padding: '12px 10px',
                  textAlign: 'left',
                  width: '4%',
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
              <th style={{ padding: '12px 8px', textAlign: 'left', width: '9%', borderBottom: `1px solid ${ui.border}` }}>
                {renderFilterButton('clave', 'Clave')}
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', width: '23%', borderBottom: `1px solid ${ui.border}` }}>
                {renderFilterButton('proyecto', 'Proyecto')}
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', width: '9%', borderBottom: `1px solid ${ui.border}` }}>
                {renderFilterButton('genero', 'Género')}
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', width: '10%', borderBottom: `1px solid ${ui.border}` }}>
                {renderFilterButton('estado', 'Estado')}
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', width: '10%', borderBottom: `1px solid ${ui.border}` }}>
                {renderFilterButton('inicio', 'Inicio')}
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', width: '10%', borderBottom: `1px solid ${ui.border}` }}>
                {renderFilterButton('fin', 'Fin')}
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', width: '11%', borderBottom: `1px solid ${ui.border}` }}>
                {renderFilterButton('publicacion', 'Publicación')}
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', width: '9%', borderBottom: `1px solid ${ui.border}` }}>
                {renderFilterButton('tipo', 'Tipo')}
              </th>
              <th
                style={{
                  padding: '12px 12px',
                  textAlign: 'center',
                  fontWeight: 700,
                  color: ui.textMuted,
                  width: '12%',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  borderBottom: `1px solid ${ui.border}`,
                }}
              >
                Acciones
              </th>
            </tr>
          </thead>

          <style>
            {`
              thead, tbody tr {
                display: table;
                width: 100%;
                table-layout: fixed;
              }
            `}
          </style>

          <tbody
            key={`tbody-${obras.length}`}
            style={{
              display: 'block',
              overflowY: 'auto',
              height: 'calc(100vh - 278px)',
            }}
          >
            {filteredData.map((row, index) => {
              const rowKey = getRowKey(row);
              const selected = selectedRowsSet.has(rowKey);

              return (
                <tr
                  key={rowKey}
                  style={{
                    background: selected
                      ? 'var(--cl-selected)'
                      : index % 2 === 0 ? ui.surface : ui.surfaceMuted,
                    display: 'table',
                    width: '100%',
                    tableLayout: 'fixed',
                  }}
                >
                  <td style={{ padding: '12px 10px', borderTop: `1px solid ${ui.border}`, width: '4%' }}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleRow(row)}
                      style={{ accentColor: '#4B5563', width: 14, height: 14 }}
                    />
                  </td>
                  <td style={{ padding: '12px 8px', borderTop: `1px solid ${ui.border}`, width: '9%', whiteSpace: 'nowrap', fontSize: '13px' }}>{row.clave}</td>
                  <td
                    style={{
                      padding: '12px 8px',
                      borderTop: `1px solid ${ui.border}`,
                      width: '23%',
                      wordBreak: 'break-word',
                      whiteSpace: 'normal',
                      lineHeight: '1.5',
                      fontSize: '13px',
                    }}
                  >
                    {row.proyecto}
                  </td>
                  <td style={{ padding: '12px 8px', borderTop: `1px solid ${ui.border}`, width: '9%', whiteSpace: 'nowrap', fontSize: '13px' }}>{row.genero}</td>
                  <td style={{ padding: '12px 8px', borderTop: `1px solid ${ui.border}`, width: '10%', whiteSpace: 'nowrap', fontSize: '13px' }}>{row.estado}</td>
                  <td style={{ padding: '12px 8px', borderTop: `1px solid ${ui.border}`, width: '10%', whiteSpace: 'nowrap', fontSize: '13px' }}>{row.inicio}</td>
                  <td style={{ padding: '12px 8px', borderTop: `1px solid ${ui.border}`, width: '10%', whiteSpace: 'nowrap', fontSize: '13px' }}>{row.fin}</td>
                  <td style={{ padding: '12px 8px', borderTop: `1px solid ${ui.border}`, width: '11%', whiteSpace: 'nowrap', fontSize: '13px' }}>{row.publicacion}</td>
                  <td style={{ padding: '12px 8px', borderTop: `1px solid ${ui.border}`, width: '9%', whiteSpace: 'nowrap', fontSize: '13px' }}>{row.tipo}</td>
                  <td style={{ padding: '12px 12px', borderTop: `1px solid ${ui.border}`, width: '12%', whiteSpace: 'nowrap', fontSize: '13px', textAlign: 'center' }}>
                    <HStack spacing={2} justify="center">
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
                        _hover={{ bg: ui.surfaceMuted, borderColor: '#FF6600', color: '#FF6600' }}
                      >
                        <FiEye size={15} />
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        aria-label="Descargar proyecto"
                        title="Descargar proyecto"
                        w="32px"
                        h="32px"
                        minW="32px"
                        p={0}
                        borderColor={ui.border}
                        color="#FF6600"
                        borderRadius="8px"
                        _hover={{ bg: ui.surfaceMuted, borderColor: '#FF6600' }}
                      >
                        <FiDownload size={15} />
                      </Button>
                    </HStack>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filterMenu && (
          <div
            ref={filterMenuRef}
            style={{
              position: 'fixed',
              top: `${filterPosition.top}px`,
              left: `${Math.max(filterPosition.left - 20, 16)}px`,
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

      <Flex
        justify="space-between"
        align="center"
        px={3}
        borderTop={`1px solid ${ui.border}`}
        bg={ui.surface}
        py={3}
        mt={0}
      >
        <Text color={ui.textMuted} fontSize="13px">
          Mostrando {filteredData.length} resultados
        </Text>
        <Text color={ui.textMuted} fontSize="13px">
          {selectedRows.length} seleccionados
        </Text>
      </Flex>
    </Box>
  );
}

export default React.memo(ResultadosView);
