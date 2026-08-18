import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { FiAlertCircle, FiChevronDown, FiChevronUp, FiEye, FiSliders, FiStar } from 'react-icons/fi';
import {
  formatLicitacionAmount,
  formatLicitacionDate,
  getUniqueOptions,
  LICITACION_MISSING_FALLO_LABEL,
  LICITACION_MISSING_FALLO_VALUE,
  LICITACION_UNASSIGNED_LABEL,
  normalizeSearchText,
  parseLicitacionAmount,
} from './licitacionesUtils';

const columns = [
  ['clave', 'Clave', 300], ['expediente', 'Expediente', 180], ['descripcion', 'Descripción', 300],
  ['institucion_convocante', 'Institución convocante', 240], ['tipo_de_procedimiento', 'Tipo de procedimiento', 190],
  ['estado', 'Estado', 130], ['monto', 'Monto del contrato (MXN)', 250], ['estatus', 'Estatus', 130],
  ['proveedor_adjudicado', 'Proveedor adjudicado', 240], ['fecha_de_publicacion', 'Fecha de publicación', 190],
  ['fecha_de_fallo', 'Fecha de fallo', 160],
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
const amountInputFormatter = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

function clampAmount(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getAmountStep(min, max) {
  const span = Math.max(max - min, 0);
  if (span <= 100) return 1;
  return Math.max(1, 10 ** Math.max(0, Math.floor(Math.log10(span)) - 2));
}

function formatAmountInput(value) {
  return amountInputFormatter.format(value);
}

export default function LicitacionesTable({
  allData, amountData, pageData, filteredIds, selectedIds, setSelectedIds, favorites, toggleFavorite,
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
  const uniqueValues = useMemo(() => (
    filterMenu && filterMenu !== 'monto' ? getUniqueOptions(allData, filterMenu) : []
  ), [allData, filterMenu]);
  const amountBounds = useMemo(() => {
    if (filterMenu !== 'monto') return null;
    let min = Infinity;
    let max = -Infinity;
    amountData.forEach((item) => {
      const amount = item.monto_del_contrato_MXN;
      if (!Number.isFinite(amount)) return;
      min = Math.min(min, amount);
      max = Math.max(max, amount);
    });
    return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
  }, [amountData, filterMenu]);

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

  const renderAmountFilter = () => {
    const missingOption = <Flex as="label" gap={2} align="center" mt={3} px={2.5} py={2} cursor="pointer"
      border="1px solid" borderColor={tableFilters.montoMissing ? '#FFB39F' : 'var(--cl-border)'} borderRadius="8px"
      bg={tableFilters.montoMissing ? 'var(--cl-orange-soft)' : 'var(--cl-surface-muted)'}>
      <input type="checkbox" checked={Boolean(tableFilters.montoMissing)} onChange={() => setTableFilters((current) => {
        const nextMissing = !current.montoMissing;
        if (!nextMissing) return { ...current, montoMissing: false };
        return { ...current, montoMin: undefined, montoMax: undefined, montoMissing: true };
      })} />
      <Box><Text fontSize="11px" fontWeight="700">Sin información</Text><Text fontSize="10px" color="var(--cl-text-muted)">Solo registros sin fallo emitido o monto reportado.</Text></Box>
    </Flex>;
    if (!amountBounds) return <Box>{missingOption}<Text pt={3} fontSize="11px" color="var(--cl-text-muted)">No hay montos disponibles con los filtros actuales.</Text></Box>;
    const minBound = amountBounds.min;
    const maxBound = amountBounds.max;
    const rawMin = parseLicitacionAmount(tableFilters.montoMin);
    const rawMax = parseLicitacionAmount(tableFilters.montoMax);
    const amountMin = clampAmount(rawMin ?? minBound, minBound, maxBound);
    const amountMax = Math.max(amountMin, clampAmount(rawMax ?? maxBound, minBound, maxBound));
    const span = Math.max(maxBound - minBound, 1);
    const minPercent = ((amountMin - minBound) / span) * 100;
    const maxPercent = ((amountMax - minBound) / span) * 100;
    const step = getAmountStep(minBound, maxBound);
    const updateRange = (nextMin, nextMax) => setTableFilters((current) => ({
      ...current,
      montoMin: clampAmount(nextMin, minBound, maxBound),
      montoMax: clampAmount(Math.max(nextMin, nextMax), minBound, maxBound),
      montoMissing: false,
    }));
    const readInput = (value, fallback) => {
      const parsed = parseLicitacionAmount(value);
      return parsed === null ? fallback : parsed;
    };

    return <Box>
      <Flex gap={2} mb={3}>
        <Box flex="1" minW={0}>
          <Text fontSize="10px" fontWeight="700" color="var(--cl-text-muted)" mb={1}>Desde</Text>
          <Flex align="center" h="34px" px={2} border="1px solid var(--cl-border)" borderRadius="7px" bg="var(--cl-input-bg)">
            <Text fontSize="11px" color="var(--cl-text-muted)" mr={1}>$</Text>
            <input aria-label="Monto mínimo" inputMode="numeric" value={formatAmountInput(amountMin)}
              onChange={(event) => updateRange(Math.min(readInput(event.target.value, minBound), amountMax), amountMax)} style={{ ...inputStyle, border: 0, padding: 0, height: '30px', fontWeight: 700 }} />
          </Flex>
        </Box>
        <Box flex="1" minW={0}>
          <Text fontSize="10px" fontWeight="700" color="var(--cl-text-muted)" mb={1}>Hasta</Text>
          <Flex align="center" h="34px" px={2} border="1px solid var(--cl-border)" borderRadius="7px" bg="var(--cl-input-bg)">
            <Text fontSize="11px" color="var(--cl-text-muted)" mr={1}>$</Text>
            <input aria-label="Monto máximo" inputMode="numeric" value={formatAmountInput(amountMax)}
              onChange={(event) => updateRange(amountMin, Math.max(readInput(event.target.value, maxBound), amountMin))} style={{ ...inputStyle, border: 0, padding: 0, height: '30px', fontWeight: 700 }} />
          </Flex>
        </Box>
      </Flex>
      <Box position="relative" h="30px" mt={1}>
        <Box position="absolute" left={0} right={0} top="13px" h="4px" bg="var(--cl-border)" borderRadius="999px" />
        <Box position="absolute" top="13px" h="4px" bg="#4B5563" borderRadius="999px" left={`${minPercent}%`} width={`${Math.max(maxPercent - minPercent, 0)}%`} />
        <input type="range" min={minBound} max={maxBound} step={step} value={amountMin}
          onChange={(event) => updateRange(Math.min(Number(event.target.value), amountMax), amountMax)} className="licitaciones-amount-min" />
        <input type="range" min={minBound} max={maxBound} step={step} value={amountMax}
          onChange={(event) => updateRange(amountMin, Math.max(Number(event.target.value), amountMin))} className="licitaciones-amount-max" />
      </Box>
      <Text mt={2} fontSize="10px" color="var(--cl-text-muted)">Límites calculados con los filtros activos.</Text>
      {missingOption}
    </Box>;
  };

  const renderFilter = (key, label) => {
    const search = filterSearch[key] || '';
    const selected = Array.isArray(tableFilters[key]) ? tableFilters[key] : [];
    if (key === 'monto') return renderAmountFilter();
    const displayValue = (value) => value === LICITACION_MISSING_FALLO_VALUE
      ? LICITACION_MISSING_FALLO_LABEL
      : key.startsWith('fecha_') ? formatLicitacionDate(value) : String(value);
    const specialValue = ['estado', 'proveedor_adjudicado'].includes(key) && uniqueValues.includes(LICITACION_UNASSIGNED_LABEL)
      ? LICITACION_UNASSIGNED_LABEL
      : null;
    const availableValues = key === 'fecha_de_fallo'
      ? [LICITACION_MISSING_FALLO_VALUE, ...uniqueValues]
      : specialValue
        ? [specialValue, ...uniqueValues.filter((value) => value !== specialValue)]
        : uniqueValues;
    const values = availableValues.filter((value) => (
      normalizeSearchText(displayValue(value)).includes(normalizeSearchText(search))
    ));
    const visibleValues = search ? values : values.slice(0, 80);
    const toggleValue = (value) => setTableFilters((current) => {
      const currentValues = Array.isArray(current[key]) ? current[key] : [];
      const isExclusiveSpecial = value === LICITACION_UNASSIGNED_LABEL && ['estado', 'proveedor_adjudicado'].includes(key);
      if (isExclusiveSpecial) {
        return { ...current, [key]: currentValues.includes(value) ? [] : [value] };
      }
      const supportsExclusiveSpecial = ['estado', 'proveedor_adjudicado'].includes(key);
      const withoutSpecial = supportsExclusiveSpecial
        ? currentValues.filter((item) => item !== LICITACION_UNASSIGNED_LABEL)
        : currentValues;
      return { ...current, [key]: withoutSpecial.includes(value)
        ? withoutSpecial.filter((item) => item !== value)
        : [...withoutSpecial, value] };
    });
    return <Box>
      <input autoFocus placeholder={`Buscar ${label.toLowerCase()}...`} value={search}
        onChange={(event) => setFilterSearch((current) => ({ ...current, [key]: event.target.value }))} style={{ ...inputStyle, height: '34px', fontSize: '12px' }} />
      {!search && values.length > visibleValues.length && <Text fontSize="10px" color="var(--cl-text-muted)" mt={2}>Escribe para buscar entre {values.length} opciones.</Text>}
      <Box maxH="230px" overflowY="auto" mt={2}>
        {visibleValues.map((value) => {
          const isUnassigned = value === LICITACION_UNASSIGNED_LABEL && ['estado', 'proveedor_adjudicado'].includes(key);
          return <Flex as="label" key={`${key}-${String(value)}`} gap={2} align="flex-start" py={isUnassigned ? 2 : 1.5} px={isUnassigned ? 2 : 0} cursor="pointer"
            border={isUnassigned ? '1px solid' : '1px solid transparent'} borderColor={isUnassigned && selected.includes(value) ? '#FFB39F' : 'transparent'}
            bg={isUnassigned && selected.includes(value) ? 'var(--cl-orange-soft)' : 'transparent'} borderRadius="8px">
          <input type="checkbox" checked={selected.includes(value)} onChange={() => toggleValue(value)} />
          {isUnassigned && <FiAlertCircle size={14} color="#D94E2D" style={{ marginTop: '1px', flexShrink: 0 }} />}
          <Box><Text fontSize="11px" fontWeight={isUnassigned ? '700' : '400'} lineHeight="1.35" color="var(--cl-text)" lineClamp={2}>{displayValue(value)}</Text>
            {isUnassigned && <Text fontSize="9px" color="var(--cl-text-muted)">{key === 'estado' ? 'Estado no reportado' : 'Proveedor no reportado'}</Text>}</Box>
        </Flex>;
        })}
        {!visibleValues.length && <Text py={3} fontSize="11px" color="var(--cl-text-muted)">Sin opciones coincidentes.</Text>}
      </Box>
    </Box>;
  };
  return <Box flex="1" minH="0" overflow="auto" border="1px solid var(--cl-border)" borderRadius="12px" bg="var(--cl-surface)">
    <style>{`
      .licitaciones-table th, .licitaciones-table td { box-sizing: border-box; }
      .licitaciones-table td { overflow: hidden; }
      .licitaciones-table tbody td:last-child { position: sticky; right: 0; z-index: 4; box-shadow: -1px 0 0 var(--cl-border); overflow: hidden; }
      .licitaciones-table thead { position: sticky; top: 0; z-index: 40; isolation: isolate; }
      .licitaciones-table thead th { background: var(--cl-surface-muted); }
      .licitaciones-table thead th:last-child { position: sticky; right: 0; background: var(--cl-surface-muted); z-index: 60; box-shadow: -1px 0 0 var(--cl-border); }
      .licitaciones-amount-min, .licitaciones-amount-max { position: absolute; left: 0; top: -2px; width: 100%; appearance: none; background: transparent; pointer-events: none; height: 30px; }
      .licitaciones-amount-min { z-index: 3; }
      .licitaciones-amount-max { z-index: 4; }
      .licitaciones-amount-min::-webkit-slider-thumb, .licitaciones-amount-max::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #4B5563; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,.16); cursor: pointer; pointer-events: auto; }
      .licitaciones-amount-min::-webkit-slider-runnable-track, .licitaciones-amount-max::-webkit-slider-runnable-track { height: 4px; background: transparent; }
      .licitaciones-amount-min::-moz-range-thumb, .licitaciones-amount-max::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #4B5563; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,.16); cursor: pointer; pointer-events: auto; }
      .licitaciones-amount-min::-moz-range-track, .licitaciones-amount-max::-moz-range-track { height: 4px; background: transparent; }
    `}</style>
    <Box as="table" className="licitaciones-table" borderCollapse="separate" borderSpacing={0} tableLayout="fixed" minW="2610px" w="100%" fontSize="11px">
      <Box as="thead" position="sticky" top={0} zIndex={40} bg="var(--cl-surface-muted)">
        <Box as="tr">
          <Box as="th" w="42px" p={2} borderBottom="1px solid var(--cl-border)"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Seleccionar todos los resultados filtrados" /></Box>
          <Box as="th" w="44px" p={2} borderBottom="1px solid var(--cl-border)">★</Box>
          {columns.map(([key, label, width]) => <Box as="th" key={label} w={`${width}px`} minW={`${width}px`} p={2.5} textAlign="left" fontSize="10px" color="var(--cl-text-muted)" borderBottom="1px solid var(--cl-border)" position="relative">
            <Flex align="flex-start" justify="flex-start" gap={1}>
              <Text flex="1" minW={0} fontSize="10px" fontWeight="700" lineHeight="1.3">{label}</Text>
              <Button data-licitacion-filter-trigger size="xs" variant="ghost" minW="20px" w="20px" h="20px" p={0} onClick={(event) => { event.stopPropagation(); setFilterMenu((current) => current === key ? null : key); }} aria-label={`Filtrar ${label}`}><FiSliders size={11} /></Button>
              <Button size="xs" variant="ghost" minW="20px" w="20px" h="20px" p={0} onClick={() => toggleSort(key)} aria-label={`Ordenar ${label}`}>
                <Flex direction="column"><FiChevronUp size={9} color={sortConfig.field === key && sortConfig.direction === 'asc' ? '#FF653F' : 'currentColor'} /><FiChevronDown size={9} color={sortConfig.field === key && sortConfig.direction === 'desc' ? '#FF653F' : 'currentColor'} /></Flex>
              </Button>
            </Flex>
            {filterMenu === key && <Box ref={filterMenuRef} position="absolute" top="39px" left="6px" zIndex={30} w={key === 'monto' ? '320px' : '280px'} p={3} bg="var(--cl-surface)" border="1px solid var(--cl-border)" borderRadius="10px" boxShadow="var(--cl-shadow)" onClick={(event) => event.stopPropagation()}>
              <Text mb={2} fontSize="10px" fontWeight="700" color="var(--cl-text-strong)">Filtrar {label}</Text>
              {renderFilter(key, label)}
              <Flex justify="space-between" mt={2}><Button size="xs" variant="ghost" onClick={() => {
                if (key === 'monto') {
                  setTableFilters((current) => Object.fromEntries(
                    Object.entries(current).filter(([filterKey]) => !['monto', 'montoMin', 'montoMax', 'montoMissing'].includes(filterKey)),
                  ));
                } else setFilter(key, []);
              }}>Limpiar</Button><Button size="xs" bg="#FF653F" color="white" onClick={() => setFilterMenu(null)}>Listo</Button></Flex>
            </Box>}
          </Box>)}
          <Box as="th" w="104px" minW="104px" p={2} textAlign="center" borderBottom="1px solid var(--cl-border)">Ver detalle</Box>
        </Box>
      </Box>
      <Box as="tbody">
        {!pageData.length && <Box as="tr"><Box as="td" colSpan={columns.length + 3} p={8} textAlign="center" color="var(--cl-text-muted)">No hay licitaciones que coincidan con los filtros de la tabla.</Box></Box>}
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
            <Box as="td" p={2.5} fontWeight="700" borderBottom="1px solid var(--cl-border)" title={item.clave}><Text whiteSpace="nowrap">{item.clave}</Text></Box>
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
