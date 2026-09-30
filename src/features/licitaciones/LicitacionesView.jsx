import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Flex, Heading, Spinner, Text } from '@chakra-ui/react';
import { FiChevronLeft, FiChevronRight, FiRefreshCw, FiStar } from 'react-icons/fi';
import {
  guardarSeguimientoLicitacion,
  leerLicitacionesCache,
  obtenerLicitaciones,
  obtenerLicitacionesSeguidas,
} from './licitacionesApi';
import LicitacionesSidebar from './LicitacionesSidebar';
import LicitacionesTable from './LicitacionesTable';
import LicitacionDrawer from './LicitacionDrawer';
import LicitacionesSummary from './LicitacionesSummary';
import LicitacionesDownloadPanel from './LicitacionesDownloadPanel';
import { readCachedLicitaciones, writeCachedLicitaciones } from '../../utils/licitacionesCache';
import { measurePerformance } from '../../utils/performanceMonitor';
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
  periodIndex: -1,
  statuses: [],
  substatuses: [],
  procedures: [],
  sectors: [],
  activeStatuses: [],
  developments: [],
  orders: [],
  states: [],
};

function normalizeLoadedLicitaciones(items = []) {
  return items.map((item) => ({
    ...item,
    estado: formatLicitacionState(item.estado),
    proveedor_adjudicado: formatLicitacionProvider(item.proveedor_adjudicado),
    // Las fechas se usan para filtros y ordenamiento. Dejarlas listas al
    // entrar evita volver a parsear las mismas cadenas en cada interacción.
    __fechaPublicacionTimestamp: parseLicitacionDate(item.fecha_de_publicacion)?.getTime() ?? null,
    __fechaFalloTimestamp: parseLicitacionDate(item.fecha_de_fallo)?.getTime() ?? null,
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

function createDateRange(from, to) {
  return {
    from: from ? new Date(`${from}T00:00:00`).getTime() : null,
    to: to ? new Date(`${to}T23:59:59`).getTime() : null,
  };
}

function matchesDateRange(timestamp, range) {
  if (!range?.from && !range?.to) return true;
  if (!Number.isFinite(timestamp)) return false;
  if (range.from && timestamp < range.from) return false;
  if (range.to && timestamp > range.to) return false;
  return true;
}

function getAmountRange(tableFilters = {}) {
  const min = parseLicitacionAmount(tableFilters.montoMin);
  const max = parseLicitacionAmount(tableFilters.montoMax);
  return { min, max };
}

function matchesTableFilters(item, tableFilters = {}, amountRange, dateRanges) {
  const textKeys = [
    'clave',
    'codigo_del_expediente',
    'numero_de_procedimiento',
    'descripcion',
    'institucion_convocante',
    'tipo_de_contratacion',
    'proveedor_adjudicado',
  ];
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
    const hasFallo = Number.isFinite(item.__fechaFalloTimestamp);
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

  if (!matchesDateRange(item.__fechaPublicacionTimestamp, dateRanges?.publication)) return false;
  if (!matchesDateRange(item.__fechaFalloTimestamp, dateRanges?.failure)) return false;
  return true;
}

function createSidebarFilterLookup(filters) {
  const periodIndex = filters.periodIndex;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  let periodStart = null;
  let periodEnd = null;

  if (periodIndex >= 0 && periodIndex <= 4) {
    periodStart = new Date(todayStart);
    if (periodIndex === 0) periodStart.setDate(periodStart.getDate());
    if (periodIndex === 1) periodStart.setDate(periodStart.getDate() - 6);
    if (periodIndex === 2) periodStart.setMonth(periodStart.getMonth() - 1);
    if (periodIndex === 3) periodStart.setMonth(periodStart.getMonth() - 3);
    if (periodIndex === 4) periodStart.setMonth(periodStart.getMonth() - 6);
    periodEnd = todayEnd;
  } else if (periodIndex === 5) {
    periodEnd = new Date(todayStart);
    periodEnd.setMonth(periodEnd.getMonth() - 6);
    periodEnd.setMilliseconds(-1);
  }

  const selected = (values) => new Set((values || []).map(normalizeSearchText));
  return {
    statuses: selected(filters.statuses),
    substatuses: selected(filters.substatuses),
    procedures: selected(filters.procedures),
    sectors: selected(filters.sectors),
    activeStatuses: selected(filters.activeStatuses),
    developments: selected(filters.developments),
    orders: selected(filters.orders),
    states: selected(filters.states),
    periodStart: periodStart?.getTime() ?? null,
    periodEnd: periodEnd?.getTime() ?? null,
  };
}

function matchesLookup(values, value) {
  return !values.size || values.has(normalizeSearchText(value));
}

function migrateFavoriteKeys(current, items = [], pruneLegacyIds = false) {
  const legacyToKey = new Map(items.map((item) => [String(item.id), String(item.clave)]));
  const next = new Set();
  let changed = false;
  current.forEach((value) => {
    const normalized = String(value);
    const migrated = legacyToKey.get(normalized);
    if (migrated) {
      next.add(migrated);
      changed ||= migrated !== normalized;
    } else if (!pruneLegacyIds || !/^\d+$/.test(normalized)) {
      next.add(normalized);
    } else {
      changed = true;
    }
  });
  return changed ? next : current;
}

export default function LicitacionesView({ user }) {
  const [initialCache] = useState(() => {
    const rawInitialCache = leerLicitacionesCache(user.idUsuario, user.idSession);
    return rawInitialCache ? normalizeLoadedLicitaciones(rawInitialCache) : null;
  });
  const [data, setData] = useState(() => initialCache || []);
  const [loading, setLoading] = useState(() => !initialCache);
  const [error, setError] = useState('');
  const [followError, setFollowError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const [filters, setFilters] = useState(initialSidebarFilters);
  const [tableFilters, setTableFilters] = useState({});
  const debouncedTableFilters = useDebouncedValue(tableFilters);
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detail, setDetail] = useState(null);
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const progressiveDataRef = useRef([]);
  const progressiveFrameRef = useRef(null);
  const favoritesKey = `construleads-licitaciones-favoritos-${user.idUsuario}`;
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = new Set(JSON.parse(localStorage.getItem(favoritesKey) || '[]'));
      return initialCache ? migrateFavoriteKeys(stored, initialCache) : stored;
    } catch {
      return new Set();
    }
  });
  const favoritesRef = useRef(favorites);

  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    obtenerLicitacionesSeguidas({ userId: user.idUsuario, signal: controller.signal })
      .then(({ claves }) => {
        if (!isActive) return;
        const synchronized = new Set(claves.map((clave) => String(clave).trim()).filter(Boolean));
        favoritesRef.current = synchronized;
        setFavorites(synchronized);
        setFollowError('');
      })
      .catch((requestError) => {
        if (!isActive || requestError?.name === 'AbortError') return;
        console.warn('[BIMSA] No se pudieron consultar las licitaciones seguidas.', requestError);
        setFollowError('No se pudo sincronizar el seguimiento; se muestran los datos guardados en este navegador.');
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [user.idUsuario]);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;
    let hasPersistentCache = false;
    let hasVisibleData = false;
    let wrotePreviewCache = false;
    let networkCompleted = false;
    progressiveDataRef.current = [];

    const cancelProgressiveCommit = () => {
      if (progressiveFrameRef.current !== null) {
        window.cancelAnimationFrame(progressiveFrameRef.current);
        progressiveFrameRef.current = null;
      }
    };
    const scheduleProgressiveCommit = () => {
      if (progressiveFrameRef.current !== null) return;
      progressiveFrameRef.current = window.requestAnimationFrame(() => {
        progressiveFrameRef.current = null;
        if (!isActive || hasPersistentCache) return;
        setData([...progressiveDataRef.current]);
      });
    };

    // IndexedDB y la petición corren en paralelo: la primera visita no espera
    // al disco y las siguientes pintan la última respuesta inmediatamente.
    const persistentCache = readCachedLicitaciones(user.idUsuario).then((cached) => {
      if (!isActive || networkCompleted || !cached?.length) return null;
      hasPersistentCache = true;
      hasVisibleData = true;
      cancelProgressiveCommit();
      progressiveDataRef.current = [];
      setData(normalizeLoadedLicitaciones(cached));
      setFavorites((current) => migrateFavoriteKeys(current, cached));
      setError('');
      setLoading(false);
      return cached;
    });

    obtenerLicitaciones({
      userId: user.idUsuario,
      sessionId: user.idSession,
      signal: controller.signal,
      caller: 'LicitacionesView',
      reason: 'view-mount',
      forceRefresh: true,
      onBatch: (batch) => {
        if (!isActive || !batch.length || hasPersistentCache) return;
        hasVisibleData = true;
        const normalizedBatch = normalizeLoadedLicitaciones(batch);
        const hasPreview = progressiveDataRef.current.length > 0;
        progressiveDataRef.current.push(...normalizedBatch);
        // La primera tanda continúa siendo inmediata. Las siguientes se
        // consolidan por frame para no forzar un render por paquete de red.
        if (hasPreview) scheduleProgressiveCommit();
        else setData(normalizedBatch);
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
        cancelProgressiveCommit();
        const normalizedItems = normalizeLoadedLicitaciones(items);
        progressiveDataRef.current = normalizedItems;
        setData(normalizedItems);
        setFavorites((current) => migrateFavoriteKeys(current, items, true));
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
      cancelProgressiveCommit();
      controller.abort();
    };
  }, [retryToken, user.idSession, user.idUsuario]);

  useEffect(() => {
    localStorage.setItem(favoritesKey, JSON.stringify([...favorites]));
  }, [favorites, favoritesKey]);

  const toggleFavorite = useCallback((item) => {
    const clave = String(item?.clave || '').trim();
    if (!clave) return;
    const previous = favoritesRef.current;
    const shouldFollow = !previous.has(clave);
    const next = new Set(previous);
    if (shouldFollow) next.add(clave); else next.delete(clave);
    favoritesRef.current = next;
    setFavorites(next);
    setFollowError('');

    void guardarSeguimientoLicitacion({
      userId: user.idUsuario,
      clave,
      followed: shouldFollow,
    }).catch((requestError) => {
      console.warn('[BIMSA] No se pudo sincronizar el seguimiento de licitación.', requestError);
      // Solo revierte si el usuario no volvió a cambiar esta licitación
      // mientras la petición estaba en curso.
      if (favoritesRef.current.has(clave) === shouldFollow) {
        const rollback = new Set(favoritesRef.current);
        if (shouldFollow) rollback.delete(clave); else rollback.add(clave);
        favoritesRef.current = rollback;
        setFavorites(rollback);
      }
      setFollowError(requestError?.message || 'No fue posible actualizar el seguimiento.');
    });
  }, [user.idUsuario]);

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

  const sidebarFilterLookup = useMemo(
    () => createSidebarFilterLookup(filters),
    [filters],
  );
  const matchesSidebarFilters = useCallback((item, { ignoreStates = false } = {}) => {
    if (onlyFollowed) return favorites.has(item.clave);
    if (!matchesLookup(sidebarFilterLookup.statuses, item.estatus)) return false;
    if (!matchesLookup(sidebarFilterLookup.substatuses, item.subestatus)) return false;
    if (!matchesLookup(sidebarFilterLookup.procedures, item.tipo_de_procedimiento)) return false;
    if (!matchesLookup(sidebarFilterLookup.sectors, item.sector)) return false;
    if (!matchesLookup(sidebarFilterLookup.activeStatuses, item.activo)) return false;
    if (!matchesLookup(sidebarFilterLookup.developments, item.desarrollo)) return false;
    if (!matchesLookup(sidebarFilterLookup.orders, item.orden_de_gobierno)) return false;
    if (!ignoreStates && !matchesLookup(sidebarFilterLookup.states, item.estado)) return false;
    if (sidebarFilterLookup.periodStart !== null || sidebarFilterLookup.periodEnd !== null) {
      const timestamp = item.__fechaPublicacionTimestamp;
      if (!Number.isFinite(timestamp)) return false;
      if (sidebarFilterLookup.periodStart !== null && timestamp < sidebarFilterLookup.periodStart) return false;
      if (sidebarFilterLookup.periodEnd !== null && timestamp > sidebarFilterLookup.periodEnd) return false;
    }
    return true;
  }, [favorites, onlyFollowed, sidebarFilterLookup]);

  const dataWithUnavailableFollowed = useMemo(() => {
    if (!onlyFollowed || !favorites.size) return data;
    const availableKeys = new Set(data.map((item) => String(item.clave)));
    const missing = [...favorites]
      .map(String)
      .filter((clave) => clave && !/^\d+$/.test(clave) && !availableKeys.has(clave))
      .map((clave) => ({
        id: `unavailable:${clave}`,
        clave,
        codigo_del_expediente: 'Sin información',
        numero_de_procedimiento: 'Sin información',
        expediente: 'Folio no disponible',
        descripcion: 'Esta licitación seguida ya no forma parte de la información entregada por la fuente.',
        institucion_convocante: 'Sin información',
        tipo_de_procedimiento: 'Sin información',
        tipo_de_contratacion: '',
        desarrollo: '',
        sector: '',
        estado: 'Sin asignación',
        monto_del_contrato_MXN: null,
        estatus: 'No disponible',
        proveedor_adjudicado: 'Sin asignación',
        fecha_de_publicacion: '',
        fecha_de_fallo: '',
        direccion_del_anuncio: '',
        activo: '0',
        isUnavailable: true,
        __fechaPublicacionTimestamp: null,
        __fechaFalloTimestamp: null,
      }));
    return missing.length ? [...data, ...missing] : data;
  }, [data, favorites, onlyFollowed]);

  const sidebarContext = useMemo(
    () => measurePerformance(
      'licitaciones.sidebar-filters',
      { records: dataWithUnavailableFollowed.length },
      () => dataWithUnavailableFollowed.filter((item) => matchesSidebarFilters(item))
    ),
    [dataWithUnavailableFollowed, matchesSidebarFilters],
  );

  const sidebarFiltered = sidebarContext;

  const amountRange = useMemo(
    () => getAmountRange(debouncedTableFilters),
    [debouncedTableFilters],
  );
  const tableDateRanges = useMemo(() => ({
    publication: createDateRange(
      debouncedTableFilters.fecha_de_publicacionDesde,
      debouncedTableFilters.fecha_de_publicacionHasta,
    ),
    failure: createDateRange(
      debouncedTableFilters.fecha_de_falloDesde,
      debouncedTableFilters.fecha_de_falloHasta,
    ),
  }), [debouncedTableFilters]);
  const availableStates = useMemo(() => {
    const tableFiltersWithoutState = { ...debouncedTableFilters };
    delete tableFiltersWithoutState.estado;
    return data
      .filter((item) => matchesSidebarFilters(item, { ignoreStates: true }))
      .filter((item) => matchesTableFilters(item, tableFiltersWithoutState, amountRange, tableDateRanges));
  }, [amountRange, data, debouncedTableFilters, matchesSidebarFilters, tableDateRanges]);
  const filtered = useMemo(
    () => measurePerformance(
      'licitaciones.apply-filters',
      { records: sidebarFiltered.length },
      () => sidebarFiltered.filter((item) => matchesTableFilters(item, debouncedTableFilters, amountRange, tableDateRanges))
    ),
    [amountRange, debouncedTableFilters, sidebarFiltered, tableDateRanges],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const sortedData = useMemo(() => {
    return measurePerformance('licitaciones.sort', { records: filtered.length, field: sortConfig.field || 'none' }, () => {
      if (!sortConfig.field) return filtered;
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      return [...filtered].sort((a, b) => {
        const field = sortConfig.field;
        if (field === 'monto') return ((a.monto_del_contrato_MXN ?? -Infinity) - (b.monto_del_contrato_MXN ?? -Infinity)) * direction;
        if (field === 'fecha_de_publicacion' || field === 'fecha_de_fallo') {
          const timestampField = field === 'fecha_de_publicacion' ? '__fechaPublicacionTimestamp' : '__fechaFalloTimestamp';
          return ((a[timestampField] ?? 0) - (b[timestampField] ?? 0)) * direction;
        }
        return String(a[field] || '').localeCompare(String(b[field] || ''), 'es', { sensitivity: 'base' }) * direction;
      });
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
  const dateLabel = 'Publicación';

  if (loading) return <Flex h="100%" align="center" justify="center" direction="column" gap={3}><Spinner color="#D95B27" thickness="3px" /><Text color="var(--cl-text-muted)">Cargando licitaciones...</Text></Flex>;
  if (error) return <Flex h="100%" align="center" justify="center" direction="column" gap={3}><Text fontWeight="700" color="var(--cl-text-strong)">{error}</Text><Button onClick={retry}><FiRefreshCw /> Reintentar</Button></Flex>;

  return <Flex h="100%" minH="0" gap={3}>
    <LicitacionesSidebar data={data} filters={filters} setFilters={updateSidebarFilters} onClear={clearAllFilters}
      availableStates={availableStates} />
    <Flex flex="1" minW={0} minH={0} direction="column">
      <Flex justify="space-between" align="center" mb={3} gap={4} wrap="wrap">
        <Box><Heading fontSize="22px" color="var(--cl-text-strong)">Licitaciones</Heading><Text fontSize="11px" color="var(--cl-text-muted)">{filtered.length.toLocaleString('es-MX')} registros · {metrics.verified.toLocaleString('es-MX')} contratos verificados</Text></Box>
        <Flex align="center" gap={2}>
          {followError && <Text role="alert" maxW="360px" fontSize="10px" color="#B9471E">{followError}</Text>}
          <Button size="sm" variant={onlyFollowed ? 'solid' : 'outline'} bg={onlyFollowed ? '#FFF4D6' : 'var(--cl-surface)'} color={onlyFollowed ? '#946200' : 'var(--cl-text)'} onClick={toggleOnlyFollowed}><FiStar /> Ver solo seguidas ({favorites.size})</Button>
        </Flex>
      </Flex>
      <Flex align="stretch" gap={2} mb={2} minW={0} flexShrink={0}>
        <Box flex="1" minW={0}>
          <LicitacionesSummary metrics={metrics} dateLabel={dateLabel} />
        </Box>
        <Box flexShrink={0} display="flex" alignItems="stretch">
          <LicitacionesDownloadPanel
            user={user}
            filteredLicitaciones={filtered}
            selectedLicitaciones={filtered.filter((item) => selectedIds.has(item.id))}
          />
        </Box>
      </Flex>
      {!sidebarFiltered.length ? <Flex flex="1" border="1px solid var(--cl-border)" borderRadius="12px" align="center" justify="center" direction="column" color="var(--cl-text-muted)">
        <FiStar size={25} /><Text mt={3} fontWeight="700" color="var(--cl-text-strong)">{onlyFollowed ? 'Aún no sigues ninguna licitación.' : 'No encontramos licitaciones con los filtros seleccionados.'}</Text>
        {onlyFollowed && <Text fontSize="11px">Marca la estrella de una fila para darle seguimiento.</Text>}
      </Flex> : <LicitacionesTable allData={dataWithUnavailableFollowed} amountData={sidebarContext} pageData={pageData} filteredIds={filtered.filter((item) => !item.isUnavailable).map((item) => item.id)} {...{
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
    </Flex>
    <LicitacionDrawer item={detail} followed={detail ? favorites.has(detail.clave) : false} onToggleFollow={() => detail && toggleFavorite(detail)} onClose={() => setDetail(null)} />
  </Flex>;
}
