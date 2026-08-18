import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Flex, Heading, Spinner, Text } from '@chakra-ui/react';
import { FiChevronLeft, FiChevronRight, FiRefreshCw, FiStar } from 'react-icons/fi';
import { leerLicitacionesCache, obtenerLicitaciones } from './licitacionesApi';
import LicitacionesSidebar from './LicitacionesSidebar';
import LicitacionesTable from './LicitacionesTable';
import LicitacionDrawer from './LicitacionDrawer';
import LicitacionesSummary from './LicitacionesSummary';
import LicitacionesDownloadPanel from './LicitacionesDownloadPanel';
import { readCachedLicitaciones, writeCachedLicitaciones } from '../../utils/licitacionesCache';
import {
  formatLicitacionProvider,
  formatLicitacionState,
  LICITACION_MISSING_FALLO_VALUE,
  normalizeSearchText,
  parseLicitacionAmount,
  parseLicitacionDate,
} from './licitacionesUtils';

const PAGE_SIZE = 50;
const initialSidebarFilters = {
  dateField: 'fecha_de_publicacion', periodIndex: -1, states: [], orders: [],
  procedures: [], statuses: [], sources: [], amountMin: null, amountMax: null, amountMissing: false,
};

function normalizeLoadedLicitaciones(items = []) {
  return items.map((item) => ({
    ...item,
    estado: formatLicitacionState(item.estado),
    proveedor_adjudicado: formatLicitacionProvider(item.proveedor_adjudicado),
  }));
}

function useDebouncedValue(value, delay = 260) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

function selectedIncludes(selected, value) {
  if (!selected?.length) return true;
  const normalized = normalizeSearchText(value);
  return selected.some((item) => normalizeSearchText(item) === normalized);
}

function matchesDateRange(value, from, to) {
  if (!from && !to) return true;
  const date = parseLicitacionDate(value);
  if (!date) return false;
  if (from && date < new Date(`${from}T00:00:00`)) return false;
  if (to && date > new Date(`${to}T23:59:59`)) return false;
  return true;
}

function getAmountRange(tableFilters = {}) {
  const min = parseLicitacionAmount(tableFilters.montoMin);
  const max = parseLicitacionAmount(tableFilters.montoMax);
  return { min, max };
}

function matchesTableFilters(item, tableFilters = {}, amountRange) {
  const textKeys = ['clave', 'expediente', 'descripcion', 'institucion_convocante', 'proveedor_adjudicado'];
  if (textKeys.some((key) => {
    const filter = tableFilters[key];
    if (Array.isArray(filter)) return filter.length > 0 && !selectedIncludes(filter, item[key]);
    return filter && !normalizeSearchText(item[key]).includes(normalizeSearchText(filter));
  })) return false;

  if (['tipo_de_procedimiento', 'estado', 'estatus'].some((key) => {
    const filter = tableFilters[key];
    const selected = Array.isArray(filter) ? filter : filter ? [filter] : [];
    return selected.length > 0 && !selectedIncludes(selected, item[key]);
  })) return false;

  if (Array.isArray(tableFilters.fecha_de_publicacion) && tableFilters.fecha_de_publicacion.length &&
    !tableFilters.fecha_de_publicacion.includes(item.fecha_de_publicacion)) return false;

  const selectedFallos = Array.isArray(tableFilters.fecha_de_fallo) ? tableFilters.fecha_de_fallo : [];
  if (selectedFallos.length) {
    const hasFallo = Boolean(parseLicitacionDate(item.fecha_de_fallo));
    const matchesFallo = selectedFallos.some((value) => (
      value === LICITACION_MISSING_FALLO_VALUE ? !hasFallo : value === item.fecha_de_fallo
    ));
    if (!matchesFallo) return false;
  }

  const hasAmountRange = amountRange.min !== null || amountRange.max !== null;
  const isAmountMissing = !Number.isFinite(item.monto_del_contrato_MXN);
  if (hasAmountRange || tableFilters.montoMissing) {
    const isWithinAmountRange = !isAmountMissing &&
      (amountRange.min === null || item.monto_del_contrato_MXN >= amountRange.min) &&
      (amountRange.max === null || item.monto_del_contrato_MXN <= amountRange.max);
    if (!isWithinAmountRange && !(tableFilters.montoMissing && isAmountMissing)) return false;
  }

  if (!matchesDateRange(item.fecha_de_publicacion, tableFilters.fecha_de_publicacionDesde, tableFilters.fecha_de_publicacionHasta)) return false;
  if (!matchesDateRange(item.fecha_de_fallo, tableFilters.fecha_de_falloDesde, tableFilters.fecha_de_falloHasta)) return false;
  return true;
}

export default function LicitacionesView({ user }) {
  const rawInitialCache = leerLicitacionesCache(user.idUsuario, user.idSession);
  const initialCache = rawInitialCache ? normalizeLoadedLicitaciones(rawInitialCache) : null;
  const [data, setData] = useState(() => initialCache || []);
  const [loading, setLoading] = useState(() => !initialCache);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const [filters, setFilters] = useState(initialSidebarFilters);
  const [tableFilters, setTableFilters] = useState({});
  const debouncedTableFilters = useDebouncedValue(tableFilters);
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detail, setDetail] = useState(null);
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const favoritesKey = `construleads-licitaciones-favoritos-${user.idUsuario}`;
  const [favorites, setFavorites] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(favoritesKey) || '[]')); } catch { return new Set(); }
  });

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;
    let hasPersistentCache = false;
    let hasVisibleData = false;
    let wrotePreviewCache = false;
    let networkCompleted = false;

    // IndexedDB y la petición corren en paralelo: la primera visita no espera
    // al disco y las siguientes pintan la última respuesta inmediatamente.
    const persistentCache = readCachedLicitaciones(user.idUsuario).then((cached) => {
      if (!isActive || networkCompleted || !cached?.length) return null;
      hasPersistentCache = true;
      hasVisibleData = true;
      setData(normalizeLoadedLicitaciones(cached));
      setError('');
      setLoading(false);
      return cached;
    });

    obtenerLicitaciones({
      userId: user.idUsuario,
      sessionId: user.idSession,
      signal: controller.signal,
      onBatch: (batch) => {
        if (!isActive || !batch.length || hasPersistentCache) return;
        hasVisibleData = true;
        setData((current) => current.length ? [...current, ...normalizeLoadedLicitaciones(batch)] : normalizeLoadedLicitaciones(batch));
        setLoading(false);

        // Incluso si la respuesta tarda en terminar, la próxima recarga ya
        // puede mostrar la primera página sin depender de la red.
        if (!wrotePreviewCache) {
          wrotePreviewCache = true;
          void writeCachedLicitaciones(user.idUsuario, batch);
        }
      },
    })
      .then((items) => {
        if (!isActive) return;
        networkCompleted = true;
        hasVisibleData = Boolean(items?.length);
        setData(normalizeLoadedLicitaciones(items));
        setError('');
        if (items?.length) void writeCachedLicitaciones(user.idUsuario, items);
      })
      .catch(async (requestError) => {
        if (requestError?.name === 'AbortError') return;
        const cached = await persistentCache;
        if (isActive && !cached?.length && !hasVisibleData) {
          setError('No pudimos cargar las licitaciones.');
        }
      })
      .finally(() => { if (isActive) setLoading(false); });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [retryToken, user.idSession, user.idUsuario]);

  useEffect(() => {
    localStorage.setItem(favoritesKey, JSON.stringify([...favorites]));
  }, [favorites, favoritesKey]);

  const toggleFavorite = useCallback((id) => setFavorites((current) => {
    const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next;
  }), []);

  const updateSidebarFilters = useCallback((nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(initialSidebarFilters);
    setTableFilters({});
    setOnlyFollowed(false);
    setSelectedIds(new Set());
    setPage(1);
  }, []);

  const updateTableFilters = useCallback((nextFilters) => {
    setTableFilters(nextFilters);
    setPage(1);
  }, []);

  const toggleOnlyFollowed = useCallback(() => {
    setOnlyFollowed((value) => !value);
    setPage(1);
  }, []);

  const retry = useCallback(() => {
    setLoading(true);
    setError('');
    setRetryToken((value) => value + 1);
  }, []);

  const matchesSidebarFilters = useCallback((item, activeFilters, { ignoreStates = false } = {}) => {
    if (onlyFollowed) return favorites.has(item.id);
    if (!ignoreStates && !selectedIncludes(activeFilters.states, item.estado)) return false;
    if (!selectedIncludes(activeFilters.orders, item.orden_de_gobierno)) return false;
    if (!selectedIncludes(activeFilters.procedures, item.tipo_de_procedimiento)) return false;
    if (!selectedIncludes(activeFilters.statuses, item.estatus)) return false;
    if (!selectedIncludes(activeFilters.sources, item.fuente_del_registro)) return false;
    if (activeFilters.periodIndex >= 0) {
      const days = [0, 1, 7, 30, 90, 180][activeFilters.periodIndex];
      const value = parseLicitacionDate(item[activeFilters.dateField]);
      if (!value) return false;
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - days);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      if (value < start || value > end) return false;
    }
    return true;
  }, [favorites, onlyFollowed]);

  const sidebarContext = useMemo(
    () => data.filter((item) => matchesSidebarFilters(item, filters)),
    [data, filters, matchesSidebarFilters],
  );

  const sidebarAmountBounds = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    sidebarContext.forEach((item) => {
      const amount = item.monto_del_contrato_MXN;
      if (!Number.isFinite(amount)) return;
      min = Math.min(min, amount);
      max = Math.max(max, amount);
    });
    return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
  }, [sidebarContext]);

  const sidebarAmountRange = useMemo(() => {
    if (!sidebarAmountBounds) return { min: null, max: null, active: false, includeMissing: Boolean(filters.amountMissing) };
    const { min: lowerBound, max: upperBound } = sidebarAmountBounds;
    const active = filters.amountMin !== null || filters.amountMax !== null;
    const min = Math.min(Math.max(Number(filters.amountMin ?? lowerBound), lowerBound), upperBound);
    const max = Math.max(min, Math.min(Number(filters.amountMax ?? upperBound), upperBound));
    return { min, max, active, includeMissing: Boolean(filters.amountMissing) };
  }, [filters.amountMax, filters.amountMin, filters.amountMissing, sidebarAmountBounds]);

  const matchesSidebarAmount = useCallback((item, range) => {
    if (!range.active && !range.includeMissing) return true;
    const isMissing = !Number.isFinite(item.monto_del_contrato_MXN);
    const isWithinRange = range.active && !isMissing &&
      item.monto_del_contrato_MXN >= range.min &&
      item.monto_del_contrato_MXN <= range.max;
    return isWithinRange || (range.includeMissing && isMissing);
  }, []);

  const sidebarFiltered = useMemo(() => {
    return sidebarContext.filter((item) => matchesSidebarAmount(item, sidebarAmountRange));
  }, [matchesSidebarAmount, sidebarAmountRange, sidebarContext]);

  const amountRange = useMemo(
    () => getAmountRange(debouncedTableFilters),
    [debouncedTableFilters],
  );
  const availableStates = useMemo(() => {
    const tableFiltersWithoutState = { ...debouncedTableFilters };
    delete tableFiltersWithoutState.estado;
    return data
      .filter((item) => matchesSidebarFilters(item, filters, { ignoreStates: true }))
      .filter((item) => matchesSidebarAmount(item, sidebarAmountRange))
      .filter((item) => matchesTableFilters(item, tableFiltersWithoutState, amountRange));
  }, [amountRange, data, debouncedTableFilters, filters, matchesSidebarAmount, matchesSidebarFilters, sidebarAmountRange]);
  const filtered = useMemo(
    () => sidebarFiltered.filter((item) => matchesTableFilters(item, debouncedTableFilters, amountRange)),
    [amountRange, debouncedTableFilters, sidebarFiltered],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const sortedData = useMemo(() => {
    if (!sortConfig.field) return filtered;
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const field = sortConfig.field;
      if (field === 'monto') return ((a.monto_del_contrato_MXN ?? -Infinity) - (b.monto_del_contrato_MXN ?? -Infinity)) * direction;
      if (field === 'fecha_de_publicacion' || field === 'fecha_de_fallo') {
        return ((parseLicitacionDate(a[field])?.getTime() ?? 0) - (parseLicitacionDate(b[field])?.getTime() ?? 0)) * direction;
      }
      return String(a[field] || '').localeCompare(String(b[field] || ''), 'es', { sensitivity: 'base' }) * direction;
    });
  }, [filtered, sortConfig]);
  const pageData = sortedData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const metrics = useMemo(() => {
    const amount = filtered.reduce((sum, item) => sum + (item.monto_del_contrato_MXN || 0), 0);
    const institutions = new Set(filtered.map((item) => normalizeSearchText(item.institucion_convocante))
      .filter((value) => value && value !== 'sin informacion')).size;
    const verified = filtered.filter((item) => normalizeSearchText(item.fuente_del_registro).includes('fallo')).length;
    return { records: filtered.length, amount, institutions, verified, verifiedPercent: filtered.length ? Math.round((verified / filtered.length) * 100) : 0, followed: favorites.size };
  }, [favorites.size, filtered]);
  const dateLabel = ({ fecha_de_publicacion: 'Publicación', fecha_de_apertura: 'Apertura', fecha_de_fallo: 'Fallo' })[filters.dateField];

  if (loading) return <Flex h="100%" align="center" justify="center" direction="column" gap={3}><Spinner color="#FF653F" thickness="3px" /><Text color="var(--cl-text-muted)">Cargando licitaciones...</Text></Flex>;
  if (error) return <Flex h="100%" align="center" justify="center" direction="column" gap={3}><Text fontWeight="700" color="var(--cl-text-strong)">{error}</Text><Button onClick={retry}><FiRefreshCw /> Reintentar</Button></Flex>;

  return <Flex h="100%" minH="0" gap={3}>
    <LicitacionesSidebar data={data} filters={filters} setFilters={updateSidebarFilters} onClear={clearAllFilters}
      availableStates={availableStates} amountBounds={sidebarAmountBounds} amountRange={sidebarAmountRange} />
    <Flex flex="1" minW={0} minH={0} direction="column" pb="68px">
      <Flex justify="space-between" align="center" mb={3} gap={4} wrap="wrap">
        <Box><Heading fontSize="22px" color="var(--cl-text-strong)">Licitaciones</Heading><Text fontSize="11px" color="var(--cl-text-muted)">{filtered.length.toLocaleString('es-MX')} registros · {metrics.verified.toLocaleString('es-MX')} contratos verificados</Text></Box>
        <Flex align="center" gap={2}>
          <Button size="sm" variant={onlyFollowed ? 'solid' : 'outline'} bg={onlyFollowed ? '#FFF4D6' : 'var(--cl-surface)'} color={onlyFollowed ? '#946200' : 'var(--cl-text)'} onClick={toggleOnlyFollowed}><FiStar /> Ver solo seguidas ({favorites.size})</Button>
        </Flex>
      </Flex>
      {!sidebarFiltered.length ? <Flex flex="1" border="1px solid var(--cl-border)" borderRadius="12px" align="center" justify="center" direction="column" color="var(--cl-text-muted)">
        <FiStar size={25} /><Text mt={3} fontWeight="700" color="var(--cl-text-strong)">{onlyFollowed ? 'Aún no sigues ninguna licitación.' : 'No encontramos licitaciones con los filtros seleccionados.'}</Text>
        {onlyFollowed && <Text fontSize="11px">Marca la estrella de una fila para darle seguimiento.</Text>}
      </Flex> : <LicitacionesTable allData={data} amountData={sidebarContext} pageData={pageData} filteredIds={filtered.map((item) => item.id)} {...{
        selectedIds, setSelectedIds, favorites, toggleFavorite, tableFilters,
      }} setTableFilters={updateTableFilters} sortConfig={sortConfig} setSortConfig={setSortConfig} onOpenDetail={setDetail} />}
      <Flex flexShrink={0} justify="space-between" align="center" px={3} py={2.5} bg="var(--cl-surface)" borderX="1px solid var(--cl-border)" borderBottom="1px solid var(--cl-border)" borderRadius="0 0 10px 10px">
        <Flex align="center" gap={3}>
          <Text color="var(--cl-text-muted)" fontSize="11px" whiteSpace="nowrap">
            Mostrando {pageData.length ? `${((currentPage - 1) * PAGE_SIZE) + 1}-${Math.min(currentPage * PAGE_SIZE, filtered.length)}` : '0'} de {filtered.length.toLocaleString('es-MX')} resultados
          </Text>
          <Button size="xs" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Página anterior"><FiChevronLeft /></Button>
          <Text fontSize="11px" minW="52px" textAlign="center" color="var(--cl-text-muted)">{currentPage} de {totalPages}</Text>
          <Button size="xs" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} aria-label="Página siguiente"><FiChevronRight /></Button>
        </Flex>
        <Text color="var(--cl-text-muted)" fontSize="11px">{selectedIds.size.toLocaleString('es-MX')} seleccionados</Text>
      </Flex>
      <Box
        position="absolute"
        left="calc(var(--cl-sidebar-width) + 12px)"
        bottom="0"
        zIndex={40}
        pointerEvents="none"
      >
        <Box pointerEvents="auto">
          <LicitacionesSummary metrics={metrics} dateLabel={dateLabel} />
        </Box>
      </Box>
      <LicitacionesDownloadPanel user={user} filteredLicitaciones={filtered}
        selectedLicitaciones={filtered.filter((item) => selectedIds.has(item.id))} />
    </Flex>
    <LicitacionDrawer item={detail} followed={detail ? favorites.has(detail.id) : false} onToggleFollow={() => detail && toggleFavorite(detail.id)} onClose={() => setDetail(null)} />
  </Flex>;
}
