import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FiInfo } from 'react-icons/fi';

import {
  aggregateObrasByMetric,
  filterObrasByFilters,
  formatGraphMetricSuffix,
  formatGraphMetricValue,
  getMetricLabel,
  getMetricValueFromObra,
  getMonthKeyFromObra,
  getMonthLabel,
  getSelectedDateField,
} from '../../../utils/filterObras';

const METRIC_OPTIONS = [
  { value: 'proyectos', label: 'Proyectos' },
  { value: 'inversion', label: 'Inversión' },
  { value: 'superficie', label: 'm² Construidos' },
];

const CHART_COLORS = [
  '#17365E',
  '#FF6600',
  '#4F83F1',
  '#2FB073',
  '#9B6BEE',
  '#12B5B5',
  '#94A3B8',
];

function normalizeText(value) {
  return String(value || '').trim();
}

function getMetricValue(obra, metric) {
  return getMetricValueFromObra(obra, metric);
}

function getDisplayValue(value, metric) {
  return formatGraphMetricValue(value, metric);
}

function getPercentage(value, total) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function MetricToggle({ value, onChange }) {
  return (
    <HStack
      spacing={1}
      p="4px"
      bg="var(--cl-input-bg)"
      border="1px solid var(--cl-border)"
      borderRadius="10px"
      w="fit-content"
    >
      {METRIC_OPTIONS.map((option) => {
        const isActive = value === option.value;

        return (
          <Button
            key={option.value}
            size="sm"
            h="28px"
            px={3}
            minW="unset"
            fontSize="12px"
            fontWeight={isActive ? '600' : '500'}
            bg={isActive ? 'var(--cl-surface)' : 'transparent'}
            color={isActive ? 'var(--cl-text-strong)' : 'var(--cl-text-muted)'}
            borderRadius="8px"
            border="none"
            boxShadow={isActive ? '0 1px 2px rgba(0,0,0,.08)' : 'none'}
            transition="background 160ms ease, color 160ms ease, box-shadow 160ms ease"
            _hover={{
              bg: isActive ? 'var(--cl-surface)' : 'rgba(255, 102, 0, 0.08)',
              color: 'var(--cl-text-strong)',
            }}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </HStack>
  );
}

function SectionHeader({ title, subtitle, rightSlot }) {
  return (
    <Flex align="flex-start" justify="space-between" gap={3} mb={4}>
      <Box minW="0">
        <HStack spacing={2} align="center">
          <Text
            fontSize="20px"
            lineHeight="1.1"
            fontWeight="700"
            color="var(--cl-text-strong)"
          >
            {title}
          </Text>
          <Box
            color="var(--cl-text-muted)"
            fontSize="14px"
            display="flex"
            alignItems="center"
          >
            <FiInfo />
          </Box>
        </HStack>
        {subtitle && (
          <Text
            mt={1}
            fontSize="12px"
            color="var(--cl-text-muted)"
            lineHeight="1.2"
          >
            {subtitle}
          </Text>
        )}
      </Box>

      {rightSlot ? <Box flexShrink={0}>{rightSlot}</Box> : null}
    </Flex>
  );
}

function ChartShell({ title, subtitle, rightSlot, children, footer }) {
  return (
    <Box
      bg="var(--cl-surface)"
      border="1px solid var(--cl-border)"
      borderRadius="16px"
      boxShadow="var(--cl-shadow)"
      position="relative"
      overflow="hidden"
    >
      <Box h="3px" bg="#FF6600" />
      <Box p={5}>
        <SectionHeader title={title} subtitle={subtitle} rightSlot={rightSlot} />
        {children}
        {footer ? <Box mt={4}>{footer}</Box> : null}
      </Box>
    </Box>
  );
}

function BarListChart({
  title,
  subtitle,
  items,
  metric,
  totalValue,
  selectedKey,
  onSelect,
  rightSlot,
  footerLabel,
}) {
  const visibleItems = items.slice(0, 6);
  const maxValue = visibleItems[0]?.value || 1;

  return (
    <ChartShell
      title={title}
      subtitle={subtitle}
      rightSlot={rightSlot}
      footer={(
        <Flex justify="space-between" align="center" pt={3} borderTop="1px solid var(--cl-border)">
          <Text fontSize="12px" fontWeight="600" color="var(--cl-text-muted)">
            Total
          </Text>
          <Text fontSize="14px" fontWeight="700" color="var(--cl-text-strong)">
            {getDisplayValue(totalValue, metric)} {formatGraphMetricSuffix(metric)}
            {footerLabel ? ` ${footerLabel}` : ''}
          </Text>
        </Flex>
      )}
    >
      <VStack align="stretch" spacing={3}>
        {visibleItems.length ? visibleItems.map((item, index) => {
          const isSelected = normalizeText(selectedKey) === normalizeText(item.key);
          const widthPercent = `${Math.max(8, Math.round((item.value / maxValue) * 100))}%`;

          return (
            <Flex
              key={item.key}
              as="button"
              type="button"
              align="center"
              gap={3}
              w="100%"
              px={3}
              py={2.5}
              borderRadius="12px"
              bg={isSelected ? 'rgba(255,102,0,.06)' : 'transparent'}
              border="1px solid"
              borderColor={isSelected ? 'rgba(255,102,0,.16)' : 'transparent'}
              transition="all 160ms ease"
              _hover={{ bg: 'var(--cl-hover)' }}
              onClick={() => onSelect(item.key)}
            >
              <Text
                flex="0 0 160px"
                fontSize="13px"
                fontWeight={isSelected ? '700' : '600'}
                color="var(--cl-text-strong)"
                textAlign="left"
                noOfLines={1}
              >
                {item.label}
              </Text>

              <Box flex="1" minW="0" h="18px" position="relative">
                <Box
                  position="absolute"
                  insetY="0"
                  left="0"
                  right="0"
                  bg="rgba(148, 163, 184, .16)"
                  borderRadius="999px"
                />
                <Box
                  position="absolute"
                  insetY="0"
                  left="0"
                  w={widthPercent}
                  maxW="100%"
                  bg={CHART_COLORS[index % CHART_COLORS.length]}
                  borderRadius="999px"
                />
              </Box>

              <Text
                flex="0 0 64px"
                textAlign="right"
                fontSize="13px"
                fontWeight="700"
                color="var(--cl-text-strong)"
              >
                {getDisplayValue(item.value, metric)}
              </Text>

              <Text
                flex="0 0 48px"
                textAlign="right"
                fontSize="12px"
                fontWeight="600"
                color="var(--cl-text-muted)"
              >
                {getPercentage(item.value, totalValue)}
              </Text>
            </Flex>
          );
        }) : (
          <Box
            border="1px dashed var(--cl-border)"
            borderRadius="12px"
            px={4}
            py={6}
            color="var(--cl-text-muted)"
            fontSize="13px"
          >
            Sin datos para mostrar.
          </Box>
        )}
      </VStack>
    </ChartShell>
  );
}

function RegionTreemap({
  title,
  subtitle,
  items,
  metric,
  totalValue,
  selectedKey,
  onSelect,
  rightSlot,
}) {
  const visibleItems = items.slice(0, 6);
  const tileSpans = [
    { colSpan: 3, rowSpan: 4, tall: true },
    { colSpan: 2, rowSpan: 4, tall: true },
    { colSpan: 1, rowSpan: 2 },
    { colSpan: 1, rowSpan: 2 },
    { colSpan: 1, rowSpan: 2 },
    { colSpan: 1, rowSpan: 2 },
  ];

  return (
    <ChartShell
      title={title}
      subtitle={subtitle}
      rightSlot={rightSlot}
      footer={(
        <Flex justify="space-between" align="center" pt={3} borderTop="1px solid var(--cl-border)">
          <Text fontSize="12px" fontWeight="600" color="var(--cl-text-muted)">
            Total
          </Text>
          <Text fontSize="14px" fontWeight="700" color="var(--cl-text-strong)">
            {getDisplayValue(totalValue, metric)} {formatGraphMetricSuffix(metric)}
          </Text>
        </Flex>
      )}
    >
      {visibleItems.length ? (
        <Grid
          templateColumns="repeat(6, minmax(0, 1fr))"
          autoRows="58px"
          gap={2}
          gridAutoFlow="dense"
        >
          {visibleItems.map((item, index) => {
            const isSelected = normalizeText(selectedKey) === normalizeText(item.key);
            const span = tileSpans[index] || { colSpan: 1, rowSpan: 2 };
            return (
              <Box
                key={item.key}
                gridColumn={`span ${span.colSpan}`}
                gridRow={`span ${span.rowSpan}`}
                borderRadius="12px"
                overflow="hidden"
                position="relative"
                cursor="pointer"
                border="1px solid"
                borderColor={isSelected ? 'rgba(255,102,0,.30)' : 'transparent'}
                boxShadow={isSelected ? '0 8px 20px rgba(255,102,0,.10)' : 'none'}
                transition="transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease"
                _hover={{ transform: 'translateY(-1px)' }}
                onClick={() => onSelect(item.key)}
                bg={CHART_COLORS[index % CHART_COLORS.length]}
              >
                <Box
                  position="absolute"
                  inset="0"
                  bg="linear-gradient(180deg, rgba(255,255,255,.02), rgba(0,0,0,.18))"
                />
                <Flex
                  position="absolute"
                  inset="0"
                  p={3}
                  direction="column"
                  justify="space-between"
                  color="white"
                >
                  <Text fontSize="13px" fontWeight="700" noOfLines={2} lineHeight="1.2">
                    {item.label}
                  </Text>
                  <Box>
                    <Text fontSize="20px" fontWeight="700" lineHeight="1">
                      {getPercentage(item.value, totalValue)}
                    </Text>
                    <Text fontSize="11px" fontWeight="500" opacity={0.92}>
                      {getDisplayValue(item.value, metric)}
                    </Text>
                  </Box>
                </Flex>
              </Box>
            );
          })}
        </Grid>
      ) : (
        <Box
          border="1px dashed var(--cl-border)"
          borderRadius="12px"
          px={4}
          py={6}
          color="var(--cl-text-muted)"
          fontSize="13px"
        >
          Sin datos para mostrar.
        </Box>
      )}
    </ChartShell>
  );
}

function LollipopChart({
  title,
  subtitle,
  items,
  metric,
  totalValue,
  rightSlot,
}) {
  const visibleItems = items.slice(-12);
  const width = 1000;
  const height = 260;
  const topPad = 28;
  const bottomPad = 44;
  const minX = 48;
  const maxX = width - 24;
  const baselineY = height - bottomPad;
  const maxValue = Math.max(1, ...visibleItems.map((item) => item.value));
  const step = visibleItems.length > 1 ? (maxX - minX) / (visibleItems.length - 1) : 0;

  return (
    <ChartShell
      title={title}
      subtitle={subtitle}
      rightSlot={rightSlot}
      footer={(
        <Flex justify="space-between" align="center" pt={3} borderTop="1px solid var(--cl-border)">
          <Text fontSize="12px" fontWeight="600" color="var(--cl-text-muted)">
            Total
          </Text>
          <Text fontSize="14px" fontWeight="700" color="var(--cl-text-strong)">
            {getDisplayValue(totalValue, metric)} {formatGraphMetricSuffix(metric)}
          </Text>
        </Flex>
      )}
    >
      {visibleItems.length ? (
        <Box w="100%" overflowX="auto">
          <Box as="svg" viewBox={`0 0 ${width} ${height}`} w="100%" minW="760px" display="block">
            {[0, 1, 2, 3, 4].map((row) => {
              const y = topPad + (row * (baselineY - topPad)) / 4;
              return (
                <line
                  key={row}
                  x1={minX}
                  x2={maxX}
                  y1={y}
                  y2={y}
                  stroke="rgba(148,163,184,.18)"
                  strokeWidth="1"
                />
              );
            })}
            <line
              x1={minX}
              x2={maxX}
              y1={baselineY}
              y2={baselineY}
              stroke="rgba(148,163,184,.35)"
              strokeWidth="1.2"
            />

            {visibleItems.map((item, index) => {
              const x = minX + index * step;
              const valueHeight = ((item.value / maxValue) * (baselineY - topPad - 18));
              const y = baselineY - valueHeight;
              const isPeak = item.value === maxValue;
              const color = CHART_COLORS[index % CHART_COLORS.length];

              return (
                <g key={item.key}>
                  <line
                    x1={x}
                    x2={x}
                    y1={baselineY}
                    y2={y}
                    stroke={color}
                    strokeWidth="2.2"
                    opacity="0.95"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={isPeak ? 11 : 8}
                    fill={color}
                    stroke="white"
                    strokeWidth="3"
                  />
                  <text
                    x={x}
                    y={Math.max(18, y - 14)}
                    textAnchor="middle"
                    fill="var(--cl-text-strong)"
                    fontSize="14"
                    fontWeight="700"
                  >
                    {getDisplayValue(item.value, metric)}
                  </text>
                  <text
                    x={x}
                    y={height - 16}
                    textAnchor="middle"
                    fill="var(--cl-text-muted)"
                    fontSize="11"
                    fontWeight="500"
                  >
                    {getMonthLabel(item.key)}
                  </text>
                </g>
              );
            })}
          </Box>
        </Box>
      ) : (
        <Box
          border="1px dashed var(--cl-border)"
          borderRadius="12px"
          px={4}
          py={6}
          color="var(--cl-text-muted)"
          fontSize="13px"
        >
          Sin datos para mostrar.
        </Box>
      )}
    </ChartShell>
  );
}

export default function GraficasView({ obras = [], filtros = {} }) {
  const filteredObras = useMemo(
    () => filterObrasByFilters(obras, filtros),
    [obras, filtros]
  );

  const selectedDateField = useMemo(
    () => getSelectedDateField(filtros),
    [filtros]
  );

  const [generoMetric, setGeneroMetric] = useState('proyectos');
  const [subGeneroMetric, setSubGeneroMetric] = useState('proyectos');
  const [regionMetric, setRegionMetric] = useState('proyectos');
  const [estadoMetric, setEstadoMetric] = useState('proyectos');
  const [monthMetric, setMonthMetric] = useState('proyectos');
  const [companiaMetric, setCompaniaMetric] = useState('proyectos');

  const generoData = useMemo(
    () => aggregateObrasByMetric(filteredObras, 'genero', generoMetric)
      .filter((item) => item.key !== 'Sin dato'),
    [filteredObras, generoMetric]
  );

  const [selectedGenero, setSelectedGenero] = useState('');

  useEffect(() => {
    if (!generoData.length) {
      setSelectedGenero('');
      return;
    }

    const hasCurrentGenero = generoData.some(
      (item) => normalizeText(item.key) === normalizeText(selectedGenero)
    );

    if (!selectedGenero || !hasCurrentGenero) {
      setSelectedGenero(generoData[0].key);
    }
  }, [generoData, selectedGenero]);

  const generoSourceForSub = useMemo(() => {
    if (!selectedGenero) return filteredObras;
    return filteredObras.filter((obra) => normalizeText(obra.genero) === normalizeText(selectedGenero));
  }, [filteredObras, selectedGenero]);

  const subGeneroData = useMemo(
    () => aggregateObrasByMetric(generoSourceForSub, 'subgenero', subGeneroMetric)
      .filter((item) => item.key !== 'Sin dato'),
    [generoSourceForSub, subGeneroMetric]
  );

  const regionData = useMemo(
    () => aggregateObrasByMetric(filteredObras, 'region', regionMetric)
      .filter((item) => item.key !== 'Sin dato'),
    [filteredObras, regionMetric]
  );

  const [selectedRegion, setSelectedRegion] = useState('');

  useEffect(() => {
    if (!regionData.length) {
      setSelectedRegion('');
      return;
    }

    const hasCurrentRegion = regionData.some(
      (item) => normalizeText(item.key) === normalizeText(selectedRegion)
    );

    if (!selectedRegion || !hasCurrentRegion) {
      setSelectedRegion(regionData[0].key);
    }
  }, [regionData, selectedRegion]);

  const regionSourceForStates = useMemo(() => {
    if (!selectedRegion) return filteredObras;
    return filteredObras.filter((obra) => normalizeText(obra.region) === normalizeText(selectedRegion));
  }, [filteredObras, selectedRegion]);

  const estadosData = useMemo(
    () => aggregateObrasByMetric(regionSourceForStates, 'estado', estadoMetric)
      .filter((item) => item.key !== 'Sin dato'),
    [regionSourceForStates, estadoMetric]
  );

  const monthData = useMemo(() => {
    const aggregated = aggregateObrasByMetric(
      filteredObras,
      (obra) => getMonthKeyFromObra(obra, selectedDateField),
      monthMetric
    );

    return aggregated
      .filter((item) => item.key !== 'Sin dato')
      .sort((a, b) => {
        if (a.key === 'Sin fecha') return 1;
        if (b.key === 'Sin fecha') return -1;
        return String(a.key).localeCompare(String(b.key));
      });
  }, [filteredObras, monthMetric, selectedDateField]);

  const companiaData = useMemo(
    () => aggregateObrasByMetric(filteredObras, 'compania', companiaMetric)
      .filter((item) => item.key !== 'Sin dato'),
    [filteredObras, companiaMetric]
  );

  const totals = useMemo(() => {
    const totalProyectos = filteredObras.length;
    const totalInversion = filteredObras.reduce((acc, obra) => acc + (Number(obra.inversion) || 0), 0);
    const totalSuperficie = filteredObras.reduce((acc, obra) => acc + (Number(obra.superficie) || 0), 0);

    return {
      totalProyectos,
      totalInversion,
      totalSuperficie,
    };
  }, [filteredObras]);

  return (
    <Box
      flex="1"
      minH="0"
      h="100%"
      overflowY="auto"
      overflowX="hidden"
      pb={{ base: '260px', lg: '220px' }}
      pr={2}
    >
      <Box px={2} pt={2} pb={4}>
        <Flex
          align="flex-start"
          justify="space-between"
          gap={4}
          mb={4}
          wrap="wrap"
        >
          <Box minW="0">
            <Text
              fontSize={{ base: '22px', xl: '26px' }}
              fontWeight="700"
              color="var(--cl-text-strong)"
              lineHeight="1.1"
            >
              Gráficas
            </Text>
            <Text
              mt={1}
              fontSize="13px"
              color="var(--cl-text-muted)"
              lineHeight="1.2"
            >
              Resumen visual de proyectos por género, región, fecha y compañía.
            </Text>
          </Box>

          <HStack
            spacing={3}
            flexWrap="wrap"
            justify="flex-end"
          >
            <Box
              bg="var(--cl-surface)"
              border="1px solid var(--cl-border)"
              borderRadius="12px"
              px={4}
              py={3}
              minW="160px"
            >
              <Text fontSize="11px" color="var(--cl-text-muted)" fontWeight="600">
                Selección actual
              </Text>
              <Text fontSize="24px" fontWeight="700" color="var(--cl-text-strong)" lineHeight="1.1">
                {totals.totalProyectos}
              </Text>
              <Text fontSize="11px" color="var(--cl-text-muted)">
                proyectos
              </Text>
            </Box>

            <Box
              bg="var(--cl-surface)"
              border="1px solid var(--cl-border)"
              borderRadius="12px"
              px={4}
              py={3}
              minW="200px"
            >
              <Text fontSize="11px" color="var(--cl-text-muted)" fontWeight="600">
                Criterio de fecha
              </Text>
              <Text fontSize="14px" color="var(--cl-text-strong)" fontWeight="700" noOfLines={1}>
                {selectedDateField}
              </Text>
            </Box>
          </HStack>
        </Flex>

        <Grid
          templateColumns={{ base: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }}
          gap={4}
          alignItems="stretch"
        >
          <BarListChart
            title="¿Qué?"
            subtitle="Proyectos por género constructivo"
            items={generoData}
            metric={generoMetric}
            totalValue={totals.totalProyectos}
            selectedKey={selectedGenero}
            onSelect={setSelectedGenero}
            rightSlot={<MetricToggle value={generoMetric} onChange={setGeneroMetric} />}
          />

          <BarListChart
            title="¿Qué subgénero?"
            subtitle={`Top subgéneros de ${selectedGenero || 'todas las obras'}`}
            items={subGeneroData}
            metric={subGeneroMetric}
            totalValue={subGeneroData.reduce((acc, item) => acc + item.value, 0)}
            selectedKey={null}
            onSelect={() => {}}
            rightSlot={<MetricToggle value={subGeneroMetric} onChange={setSubGeneroMetric} />}
          />

          <RegionTreemap
            title="¿Dónde?"
            subtitle="Proyectos por región"
            items={regionData}
            metric={regionMetric}
            totalValue={totals.totalProyectos}
            selectedKey={selectedRegion}
            onSelect={setSelectedRegion}
            rightSlot={<MetricToggle value={regionMetric} onChange={setRegionMetric} />}
          />

          <BarListChart
            title={`Estados de la región ${selectedRegion || 'seleccionada'}`}
            subtitle="Top estados por número de proyectos"
            items={estadosData}
            metric={estadoMetric}
            totalValue={estadosData.reduce((acc, item) => acc + item.value, 0)}
            selectedKey={null}
            onSelect={() => {}}
            rightSlot={<MetricToggle value={estadoMetric} onChange={setEstadoMetric} />}
          />

          <Box gridColumn={{ base: 'auto', xl: '1 / -1' }}>
            <LollipopChart
              title="¿Cuándo?"
              subtitle={`Distribución por ${selectedDateField.toLowerCase()}`}
              items={monthData}
              metric={monthMetric}
              totalValue={totals.totalProyectos}
              rightSlot={<MetricToggle value={monthMetric} onChange={setMonthMetric} />}
            />
          </Box>

          <Box gridColumn={{ base: 'auto', xl: '1 / -1' }}>
            <BarListChart
              title="¿Compañía?"
              subtitle="Top compañías por proyectos"
              items={companiaData}
              metric={companiaMetric}
              totalValue={companiaData.reduce((acc, item) => acc + item.value, 0)}
              selectedKey={null}
              onSelect={() => {}}
              rightSlot={<MetricToggle value={companiaMetric} onChange={setCompaniaMetric} />}
            />
          </Box>
        </Grid>
      </Box>
    </Box>
  );
}
