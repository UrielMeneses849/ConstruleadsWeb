import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { FiChevronDown, FiChevronUp, FiEye, FiSliders, FiStar } from 'react-icons/fi';
import { formatLicitacionAmount, formatLicitacionDate, getUniqueOptions, normalizeSearchText } from './licitacionesUtils';

const columns = [
  ['clave', 'Clave', 120], ['expediente', 'Expediente', 180], ['descripcion', 'Descripción', 300],
  ['institucion_convocante', 'Institución convocante', 240], ['tipo_de_procedimiento', 'Tipo de procedimiento', 180],
  ['estado', 'Estado', 130], ['monto', 'Monto del contrato (MXN)', 180], ['estatus', 'Estatus', 130],
  ['proveedor_adjudicado', 'Proveedor adjudicado', 220], ['fecha_de_publicacion', 'F. Publicación', 130],
  ['fecha_de_fallo', 'F. Fallo', 130],
];

function statusStyle(status) {
  const value = normalizeSearchText(status);
  if (value.includes('adjudic')) return { bg: '#E9F7EF', color: '#18794E' };
  if (value.includes('cancel')) return { bg: '#FDECEC', color: '#B42318' };
  if (value.includes('desiert')) return { bg: '#FFF3E0', color: '#A15C00' };
  if (value.includes('apertura')) return { bg: '#EEF4FF', color: '#315A9E' };
  return { bg: '#F1F1F1', color: '#555555' };
}

const inputStyle = {
  width: '100%', height: '29px', border: '1px solid var(--cl-border)', borderRadius: '7px',
  background: 'var(--cl-input-bg)', color: 'var(--cl-text)', padding: '0 7px', fontSize: '10px',
};

export default function LicitacionesTable({
  allData, pageData, filteredIds, selectedIds, setSelectedIds, favorites, toggleFavorite,
  onOpenDetail, tableFilters, setTableFilters, sortConfig, setSortConfig,
}) {
  const [filterMenu, setFilterMenu] = useState(null);
  const [filterSearch, setFilterSearch] = useState({});
  const filterMenuRef = useRef(null);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const toggleAll = () => setSelectedIds((current) => {
    const next = new Set(current);
    if (allSelected) filteredIds.forEach((id) => next.delete(id));
    else filteredIds.forEach((id) => next.add(id));
    return next;
  });
  const setFilter = (key, value) => setTableFilters((current) => ({ ...current, [key]: value }));
  const uniqueValues = useMemo(() => columns.reduce((result, [key]) => {
    if (key === 'monto') {
      result[key] = [...new Set(allData.map((item) => item.monto_del_contrato_MXN))]
        .sort((a, b) => (b ?? -Infinity) - (a ?? -Infinity));
    } else result[key] = getUniqueOptions(allData, key);
    return result;
  }, {}), [allData]);

  useEffect(() => {
    if (!filterMenu) return undefined;
    const closeOnOutsideClick = (event) => {
      if (event.target.closest?.('[data-licitacion-filter-trigger]')) return;
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) setFilterMenu(null);
    };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setFilterMenu(null); };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [filterMenu]);
  const toggleSort = (field) => setSortConfig((current) => ({
    field,
    direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
  }));
  const renderFilter = (key, label) => {
    const search = filterSearch[key] || '';
    const selected = Array.isArray(tableFilters[key]) ? tableFilters[key] : [];
    const displayValue = (value) => key === 'monto'
      ? formatLicitacionAmount(value)
      : key.startsWith('fecha_') ? formatLicitacionDate(value) : String(value);
    const values = (uniqueValues[key] || []).filter((value) => (
      normalizeSearchText(displayValue(value)).includes(normalizeSearchText(search))
    ));
    const visibleValues = search ? values : values.slice(0, 80);
    const toggleValue = (value) => setTableFilters((current) => {
      const currentValues = Array.isArray(current[key]) ? current[key] : [];
      return { ...current, [key]: currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value] };
    });
    return <Box>
      <input autoFocus placeholder={`Buscar ${label.toLowerCase()}...`} value={search}
        onChange={(event) => setFilterSearch((current) => ({ ...current, [key]: event.target.value }))} style={{ ...inputStyle, height: '34px', fontSize: '12px' }} />
      {!search && values.length > visibleValues.length && <Text fontSize="10px" color="var(--cl-text-muted)" mt={2}>Escribe para buscar entre {values.length} opciones.</Text>}
      <Box maxH="230px" overflowY="auto" mt={2}>
        {visibleValues.map((value) => <Flex as="label" key={`${key}-${String(value)}`} gap={2} align="flex-start" py={1.5} cursor="pointer">
          <input type="checkbox" checked={selected.includes(value)} onChange={() => toggleValue(value)} />
          <Text fontSize="11px" lineHeight="1.35" color="var(--cl-text)" lineClamp={2}>{displayValue(value)}</Text>
        </Flex>)}
        {!visibleValues.length && <Text py={3} fontSize="11px" color="var(--cl-text-muted)">Sin opciones coincidentes.</Text>}
      </Box>
    </Box>;
  };
  return <Box flex="1" minH="0" overflow="auto" border="1px solid var(--cl-border)" borderRadius="12px" bg="var(--cl-surface)">
    <style>{`
      .licitaciones-table th, .licitaciones-table td { box-sizing: border-box; }
      .licitaciones-table td { overflow: hidden; }
      .licitaciones-table th:last-child, .licitaciones-table td:last-child { position: sticky; right: 0; z-index: 4; box-shadow: -1px 0 0 var(--cl-border); overflow: hidden; }
      .licitaciones-table th:last-child { background: var(--cl-surface-muted); z-index: 8; }
    `}</style>
    <Box as="table" className="licitaciones-table" borderCollapse="separate" borderSpacing={0} tableLayout="fixed" minW="2280px" w="100%" fontSize="11px">
      <Box as="thead" position="sticky" top={0} zIndex={3} bg="var(--cl-surface-muted)">
        <Box as="tr">
          <Box as="th" w="42px" p={2} borderBottom="1px solid var(--cl-border)"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Seleccionar todos los resultados filtrados" /></Box>
          <Box as="th" w="44px" p={2} borderBottom="1px solid var(--cl-border)">★</Box>
          {columns.map(([key, label, width]) => <Box as="th" key={label} w={`${width}px`} minW={`${width}px`} p={2.5} textAlign="left" fontSize="10px" color="var(--cl-text-muted)" borderBottom="1px solid var(--cl-border)" position="relative">
            <Flex align="center" justify="flex-start" gap={1}>
              <Text fontSize="10px" fontWeight="700" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">{label}</Text>
              <Button data-licitacion-filter-trigger size="xs" variant="ghost" minW="20px" w="20px" h="20px" p={0} onClick={(event) => { event.stopPropagation(); setFilterMenu((current) => current === key ? null : key); }} aria-label={`Filtrar ${label}`}><FiSliders size={11} /></Button>
              <Button size="xs" variant="ghost" minW="20px" w="20px" h="20px" p={0} onClick={() => toggleSort(key)} aria-label={`Ordenar ${label}`}>
                <Flex direction="column"><FiChevronUp size={9} color={sortConfig.field === key && sortConfig.direction === 'asc' ? '#FF653F' : 'currentColor'} /><FiChevronDown size={9} color={sortConfig.field === key && sortConfig.direction === 'desc' ? '#FF653F' : 'currentColor'} /></Flex>
              </Button>
            </Flex>
            {filterMenu === key && <Box ref={filterMenuRef} position="absolute" top="39px" left="6px" zIndex={30} w="280px" p={3} bg="var(--cl-surface)" border="1px solid var(--cl-border)" borderRadius="10px" boxShadow="var(--cl-shadow)" onClick={(event) => event.stopPropagation()}>
              <Text mb={2} fontSize="10px" fontWeight="700" color="var(--cl-text-strong)">Filtrar {label}</Text>
              {renderFilter(key, label)}
              <Flex justify="space-between" mt={2}><Button size="xs" variant="ghost" onClick={() => {
                setFilter(key, []);
              }}>Limpiar</Button><Button size="xs" bg="#FF653F" color="white" onClick={() => setFilterMenu(null)}>Listo</Button></Flex>
            </Box>}
          </Box>)}
          <Box as="th" w="84px" minW="84px" p={2} textAlign="center" borderBottom="1px solid var(--cl-border)">Acciones</Box>
        </Box>
      </Box>
      <Box as="tbody">
        {pageData.map((item) => {
          const favorite = favorites.has(item.id);
          const rowBg = favorite ? 'color-mix(in srgb, var(--cl-surface) 86%, #D9A514 14%)' : 'var(--cl-surface)';
          return <Box as="tr" key={item.id} bg={rowBg} color="var(--cl-text)"
            outline={favorite ? '1px solid #D9A514' : 'none'} outlineOffset="-1px" transition="background .18s ease">
            <Box as="td" p={2} textAlign="center" borderBottom="1px solid var(--cl-border)"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => setSelectedIds((current) => {
              const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next;
            })} /></Box>
            <Box as="td" p={2} textAlign="center" borderBottom="1px solid var(--cl-border)" borderLeft={favorite ? '2px solid #D9A514' : '2px solid transparent'}>
              <Button size="xs" variant="ghost" color={favorite ? '#C58A00' : 'var(--cl-text-muted)'} onClick={() => toggleFavorite(item.id)} aria-label={favorite ? 'Dejar de seguir' : 'Seguir'}><FiStar fill={favorite ? 'currentColor' : 'none'} /></Button></Box>
            <Box as="td" p={2.5} fontWeight="700" borderBottom="1px solid var(--cl-border)">{item.clave}</Box>
            <Box as="td" p={2.5} borderBottom="1px solid var(--cl-border)" title={item.expediente}><Text lineClamp={2}>{item.expediente}</Text></Box>
            <Box as="td" p={2.5} borderBottom="1px solid var(--cl-border)" title={item.descripcion}><Text lineClamp={2}>{item.descripcion}</Text></Box>
            <Box as="td" p={2.5} borderBottom="1px solid var(--cl-border)" title={item.institucion_convocante}><Text lineClamp={2}>{item.institucion_convocante}</Text></Box>
            <Box as="td" p={2.5} borderBottom="1px solid var(--cl-border)">{item.tipo_de_procedimiento}</Box>
            <Box as="td" p={2.5} borderBottom="1px solid var(--cl-border)">{item.estado}</Box>
            <Box as="td" p={2.5} fontWeight="700" borderBottom="1px solid var(--cl-border)">{formatLicitacionAmount(item.monto_del_contrato_MXN)}</Box>
            <Box as="td" p={2.5} borderBottom="1px solid var(--cl-border)"><Text display="inline-block" px={2} py={1} borderRadius="full" {...statusStyle(item.estatus)}>{item.estatus}</Text></Box>
            <Box as="td" p={2.5} borderBottom="1px solid var(--cl-border)" title={item.proveedor_adjudicado}><Text lineClamp={2}>{item.proveedor_adjudicado}</Text></Box>
            <Box as="td" p={2.5} borderBottom="1px solid var(--cl-border)">{formatLicitacionDate(item.fecha_de_publicacion)}</Box>
            <Box as="td" p={2.5} borderBottom="1px solid var(--cl-border)">{formatLicitacionDate(item.fecha_de_fallo)}</Box>
            <Box as="td" p={0} textAlign="center" borderBottom="1px solid var(--cl-border)" bg={rowBg}>
              <Flex minH="52px" align="center" justify="center">
                <Button size="xs" variant="outline" w="32px" h="32px" minW="32px" p={0} borderColor="var(--cl-border)" color="var(--cl-text-strong)" borderRadius="8px" bg={rowBg}
                  _hover={{ bg: 'var(--cl-surface-muted)', borderColor: '#FF653F', color: '#FF653F' }} onClick={() => onOpenDetail(item)} aria-label="Ver licitación" title="Ver licitación"><FiEye size={15} /></Button>
              </Flex>
            </Box>
          </Box>;
        })}
      </Box>
    </Box>
  </Box>;
}
