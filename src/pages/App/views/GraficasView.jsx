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
import {
  FiInfo,
} from 'react-icons/fi';

import {
  aggregateObrasByMetric,
  filterObrasByFilters,
  formatGraphMetricSuffix,
  formatGraphMetricValue,
  getMonthKeyFromObra,
  getMonthLabel,
  getSelectedDateField,
} from '../../../utils/filterObras';
import { OBRA_SOURCES } from '../../../utils/obrasSources';

const METRIC_OPTIONS = [
  { value: 'proyectos', label: 'Número de obras' },
  { value: 'inversion', label: 'Inversión' },
  { value: 'superficie', label: 'Metros cuadrados' },
];

const CHART_COLORS = [
  '#475569',
  '#475569',
  '#475569',
  '#475569',
  '#475569',
  '#475569',
  '#475569',
];

const REGION_COLORS = ['#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'];

function normalizeText(value) {
  return String(value || '').trim();
}

function isSameSelectionValue(first, second) {
  return normalizeText(first).localeCompare(normalizeText(second), 'es-MX', {
    sensitivity: 'base',
  }) === 0;
}

function getObraSelectionValue(obra, key) {
  if (key === 'month') {
    return getMonthKeyFromObra(obra, START_DATE_FIELD);
  }

  return obra?.[key];
}

function filterObrasByChartSelection(obras, key, value) {
  if (!normalizeText(value)) return obras;

  return obras.filter((obra) => isSameSelectionValue(getObraSelectionValue(obra, key), value));
}

function getDisplayValue(value, metric) {
  return formatGraphMetricValue(value, metric);
}

function getDisplayValueWithUnit(value, metric) {
  const formatted = getDisplayValue(value, metric);

  if (metric === 'inversion') return `$${formatted} MDP`;
  if (metric === 'superficie') return `${formatted} m²`;

  return formatted;
}

function getDisplayPercentage(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

function getMetricValueWidth(metric) {
  if (metric === 'superficie') return '104px';
  if (metric === 'inversion') return '92px';

  return '52px';
}

function getCompactMonthLabel(monthKey) {
  if (monthKey === 'Sin fecha') return 'Sin fecha';

  const [year, month] = String(monthKey).split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);

  return new Intl.DateTimeFormat('es-MX', {
    month: 'short',
    year: '2-digit',
  }).format(date).replace('.', '');
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
              bg: isActive ? 'var(--cl-surface)' : 'rgba(217, 91, 39, 0.08)',
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
    <Flex align="flex-start" justify="space-between" gap={3} mb={4} flexWrap="wrap">
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
      h="100%"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '500px' }}
    >
      <Box h="3px" bg="#D95B27" />
      <Box p={5} h="calc(100% - 3px)" display="flex" flexDirection="column">
        <SectionHeader title={title} subtitle={subtitle} rightSlot={rightSlot} />
        <Box flex="1" minH="0">{children}</Box>
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
  visibleLimit = 6,
  bottomAction,
  barThickness = 18,
}) {
  const visibleItems = items.slice(0, visibleLimit);
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
      <VStack
        align="stretch"
        spacing={3}
        minH={visibleItems.length < visibleLimit ? "300px" : "auto"}
        justify={visibleItems.length < visibleLimit ? "space-evenly" : "flex-start"}
      >
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
              bg={isSelected ? 'rgba(217, 91, 39,.06)' : 'transparent'}
              border="1px solid"
              borderColor={isSelected ? 'rgba(217, 91, 39,.16)' : 'transparent'}
              transition="all 160ms ease"
              cursor="pointer"
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

              <Box flex="1" minW="0" h={`${barThickness}px`} position="relative">
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
      {bottomAction ? <Flex justify="center" mt={3}>{bottomAction}</Flex> : null}
    </ChartShell>
  );
}

function PieChart({ title, subtitle, items, metric, totalValue, selectedKey, onSelect, rightSlot }) {
  const visibleItems = items.slice(0, 6);
  const chartTotal = Math.max(1, visibleItems.reduce((total, item) => total + item.value, 0));
  const polarPoint = (angle, radius = 92) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return { x: 115 + radius * Math.cos(radians), y: 115 + radius * Math.sin(radians) };
  };

  return (
    <ChartShell
      title={title}
      subtitle={subtitle}
      rightSlot={rightSlot}
      footer={<Flex justify="space-between" align="center" pt={3} borderTop="1px solid var(--cl-border)"><Text fontSize="12px" fontWeight="600" color="var(--cl-text-muted)">Total</Text><Text fontSize="14px" fontWeight="700" color="var(--cl-text-strong)">{getDisplayValue(totalValue, metric)} {formatGraphMetricSuffix(metric)}</Text></Flex>}
    >
      {visibleItems.length ? (
        <Flex minH="300px" align="center" justify="center" gap={{ base: 4, xl: 8 }} wrap="wrap">
          <Box as="svg" viewBox="0 0 230 230" w="230px" h="230px" flexShrink={0}>
            {visibleItems.map((item, index) => {
              const previousValue = visibleItems.slice(0, index).reduce((total, previous) => total + previous.value, 0);
              const startAngle = (previousValue / chartTotal) * 360;
              const endAngle = ((previousValue + item.value) / chartTotal) * 360;
              const start = polarPoint(startAngle);
              const end = polarPoint(endAngle);
              const largeArc = endAngle - startAngle > 180 ? 1 : 0;
              const isSelected = normalizeText(selectedKey) === normalizeText(item.key);
              const path = visibleItems.length === 1 ? null : `M 115 115 L ${start.x} ${start.y} A 92 92 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
              return <g key={item.key} cursor="pointer" opacity={selectedKey && !isSelected ? 0.35 : 1} transform={isSelected ? 'translate(0 -2)' : undefined} onClick={() => onSelect(item.key)}>{path ? <path d={path} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="var(--cl-surface)" strokeWidth="3" /> : <circle cx="115" cy="115" r="92" fill={CHART_COLORS[0]} />}</g>;
            })}
            <circle cx="115" cy="115" r="50" fill="var(--cl-surface)" />
          </Box>
          <VStack flex="1" minW="220px" align="stretch" spacing={1.5}>
            {visibleItems.map((item, index) => {
              const isSelected = normalizeText(selectedKey) === normalizeText(item.key);
              return <Flex key={item.key} as="button" type="button" align="center" gap={2.5} px={3} py={2} borderRadius="10px" cursor="pointer" bg={isSelected ? 'rgba(217, 91, 39,.08)' : 'transparent'} _hover={{ bg: 'var(--cl-hover)' }} onClick={() => onSelect(item.key)}><Box w="20px" h="5px" borderRadius="full" bg={CHART_COLORS[index % CHART_COLORS.length]} /><Text flex="1" noOfLines={1} textAlign="left" fontSize="12px" fontWeight="600" color="var(--cl-text-strong)">{item.label}</Text><Text fontSize="12px" fontWeight="700" color="var(--cl-text-strong)">{getDisplayValue(item.value, metric)}</Text></Flex>;
            })}
          </VStack>
        </Flex>
      ) : <Box border="1px dashed var(--cl-border)" borderRadius="12px" px={4} py={6} color="var(--cl-text-muted)" fontSize="13px">Sin datos para mostrar.</Box>}
    </ChartShell>
  );
}

function CompanyMarkerChart({ title, subtitle, items, metric, totalValue, selectedKey, onSelect, rightSlot, visibleLimit = 5, bottomAction }) {
  const visibleItems = items.slice(0, visibleLimit);
  const maxValue = Math.max(1, ...visibleItems.map((item) => item.value));
  return (
    <ChartShell title={title} subtitle={subtitle} rightSlot={rightSlot} footer={<Flex justify="space-between" align="center" pt={3} borderTop="1px solid var(--cl-border)"><Text fontSize="12px" fontWeight="600" color="var(--cl-text-muted)">Total</Text><Text fontSize="14px" fontWeight="700" color="var(--cl-text-strong)">{getDisplayValue(totalValue, metric)} {formatGraphMetricSuffix(metric)}</Text></Flex>}>
      {visibleItems.length ? <Flex minH="300px" align="stretch" justify="center" gap={2} pt={4}>
          {visibleItems.map((item) => {
            const isSelected = normalizeText(selectedKey) === normalizeText(item.key);
            const markerBottom = Math.max(8, (item.value / maxValue) * 88);
            return <Flex key={item.key} as="button" type="button" flex="1" minW="0" direction="column" align="center" cursor="pointer" opacity={selectedKey && !isSelected ? 0.38 : 1} transition="opacity 160ms ease" onClick={() => onSelect(item.key)}><Text h="28px" fontSize="11px" fontWeight="700" color="var(--cl-text-strong)">{getDisplayValue(item.value, metric)}</Text><Box flex="1" w="100%" maxW="70px" minH="190px" position="relative" borderRadius="10px" bg={isSelected ? 'rgba(217, 91, 39,.06)' : 'transparent'} _hover={{ bg: 'var(--cl-hover)' }}><Box position="absolute" top="8px" bottom="8px" left="50%" w="4px" borderRadius="full" bg="rgba(148,163,184,.22)" transform="translateX(-50%)" /><Box position="absolute" left="50%" bottom={`${markerBottom}%`} w={isSelected ? '18px' : '14px'} h={isSelected ? '18px' : '14px'} borderRadius="full" bg="#D95B27" border="3px solid var(--cl-surface)" boxShadow={isSelected ? '0 0 0 4px rgba(217, 91, 39,.20)' : '0 2px 6px rgba(0,0,0,.18)'} transform="translate(-50%, 50%)" /><Box position="absolute" left="50%" bottom="8px" w="4px" h={`calc(${markerBottom}% - 8px)`} borderRadius="full" bg="#D95B27" transform="translateX(-50%)" opacity={0.72} /></Box><Text h="46px" mt={2} px={1} noOfLines={3} textAlign="center" fontSize="9px" fontWeight="600" lineHeight="1.15" color="var(--cl-text-muted)">{item.label}</Text></Flex>;
          })}
      </Flex> : <Box border="1px dashed var(--cl-border)" borderRadius="12px" px={4} py={6} color="var(--cl-text-muted)" fontSize="13px">Sin datos para mostrar.</Box>}
      {bottomAction ? <Flex justify="center" mt={3}>{bottomAction}</Flex> : null}
    </ChartShell>
  );
}

function ColumnChart({
  title,
  subtitle,
  items,
  metric,
  totalValue,
  selectedKey,
  onSelect,
  rightSlot,
  visibleLimit = 6,
  bottomAction,
}) {
  const visibleItems = items.slice(0, visibleLimit);
  const maxValue = Math.max(1, ...visibleItems.map((item) => item.value));

  return (
    <ChartShell
      title={title}
      subtitle={subtitle}
      rightSlot={rightSlot}
      footer={<Flex justify="space-between" align="center" pt={3} borderTop="1px solid var(--cl-border)"><Text fontSize="12px" fontWeight="600" color="var(--cl-text-muted)">Total</Text><Text fontSize="14px" fontWeight="700" color="var(--cl-text-strong)">{getDisplayValue(totalValue, metric)} {formatGraphMetricSuffix(metric)}</Text></Flex>}
    >
      {visibleItems.length ? (
        <Flex minH="300px" h="100%" direction="column" pt={5}>
          <Flex flex="1" minH="0" align="flex-end" gap={2} borderBottom="1px solid rgba(148,163,184,.25)">
            {visibleItems.map((item, index) => {
              const isSelected = normalizeText(selectedKey) === normalizeText(item.key);
              const height = `${Math.max(10, (item.value / maxValue) * 100)}%`;
              return <Flex key={item.key} as="button" type="button" flex="1" minW="0" h="100%" p={0} border="none" bg="transparent" direction="column" justify="flex-end" align="stretch" cursor="pointer" opacity={selectedKey && !isSelected ? 0.45 : 1} onClick={() => onSelect(item.key)}><Text mb={2} textAlign="center" fontSize="11px" fontWeight="700" color="var(--cl-text-strong)">{getDisplayValue(item.value, metric)}</Text><Box h={height} minH="30px" mx="auto" w="clamp(34px, 82%, 78px)" bg={CHART_COLORS[index % CHART_COLORS.length]} borderRadius="8px 8px 2px 2px" border={isSelected ? '3px solid #EDAE8D' : '3px solid transparent'} transition="height 180ms ease, opacity 160ms ease" _hover={{ filter: 'brightness(1.08)' }} /></Flex>;
            })}
          </Flex>
          <Flex flex="0 0 48px" gap={2} pt={2}>
            {visibleItems.map((item) => {
              const isSelected = normalizeText(selectedKey) === normalizeText(item.key);
              return <Box key={item.key} as="button" type="button" flex="1" minW="0" p={0} border="none" bg="transparent" cursor="pointer" opacity={selectedKey && !isSelected ? 0.45 : 1} onClick={() => onSelect(item.key)}><Text px={1} textAlign="center" fontSize="10px" fontWeight="600" lineHeight="1.2" noOfLines={3} color="var(--cl-text-muted)">{item.label}</Text></Box>;
            })}
          </Flex>
        </Flex>
      ) : <Box border="1px dashed var(--cl-border)" borderRadius="12px" px={4} py={6} color="var(--cl-text-muted)" fontSize="13px">Sin datos para mostrar.</Box>}
      {bottomAction ? <Flex justify="center" mt={3}>{bottomAction}</Flex> : null}
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
  const visibleItems = items.slice(0, 5);
  const weight = (item) => Math.max(1, Math.sqrt(Math.max(0, item?.value || 0)));
  const rightItems = visibleItems.slice(2);
  const mainColumns = `${weight(visibleItems[0])}fr ${weight(visibleItems[1])}fr ${weight({
    value: rightItems.reduce((total, item) => total + item.value, 0),
  })}fr`;

  const renderTile = (item, index) => {
    if (!item) return null;
    const isSelected = normalizeText(selectedKey) === normalizeText(item.key);
    const percentage = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
    return (
      <Box
        key={item.key}
        minW="0"
        h="100%"
        overflow="hidden"
        position="relative"
        cursor="pointer"
        border="2px solid"
        borderColor={isSelected ? '#D95B27' : 'var(--cl-surface)'}
        boxShadow={isSelected ? '0 8px 20px rgba(217, 91, 39,.18)' : 'none'}
        transition="transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease"
        _hover={{ transform: 'translateY(-1px)' }}
        onClick={() => onSelect(item.key)}
        bg={REGION_COLORS[index % REGION_COLORS.length]}
      >
        <Box position="absolute" inset="0" bg="linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.18))" />
        <Flex
          position="absolute"
          inset="0"
          p={3}
          direction="column"
          justify="space-between"
          color={index >= 3 ? '#1F2937' : 'white'}
        >
          <Text fontSize="14px" fontWeight="700" noOfLines={2} lineHeight="1.2">{item.label}</Text>
          <Box>
            <Text fontSize="18px" fontWeight="700" lineHeight="1.1">{percentage}%</Text>
            <Text mt={1} fontSize="13px" fontWeight="600" lineHeight="1.15">
              {getDisplayValue(item.value, metric)}
              <Text as="span" ml={1} fontSize="10px" fontWeight="500">
                {formatGraphMetricSuffix(metric) || 'proyectos'}
              </Text>
            </Text>
          </Box>
        </Flex>
      </Box>
    );
  };

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
          templateColumns={visibleItems.length >= 3 ? mainColumns : `repeat(${visibleItems.length}, 1fr)`}
          h="290px"
          gap="2px"
          overflow="hidden"
          borderRadius="4px"
        >
          {renderTile(visibleItems[0], 0)}
          {renderTile(visibleItems[1], 1)}
          {visibleItems.length >= 3 && (
            <Grid templateRows="1fr 1fr" minW="0" gap="2px">
              {renderTile(visibleItems[2], 2)}
              <Grid
                templateColumns={visibleItems[4] ? `${weight(visibleItems[3])}fr ${weight(visibleItems[4])}fr` : '1fr'}
                minW="0"
                gap="2px"
              >
                {renderTile(visibleItems[3], 3)}
                {renderTile(visibleItems[4], 4)}
              </Grid>
            </Grid>
          )}
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
      <Text mt={3} fontSize="11px" color="var(--cl-text-muted)">
        Haz clic en una región para filtrar todas las gráficas.
      </Text>
    </ChartShell>
  );
}

function LollipopChart({
  title,
  subtitle,
  items,
  metric,
  totalValue,
  selectedKey,
  onSelect,
  rightSlot,
}) {
  const visibleItems = items.slice(-12);
  const width = 1000;
  const height = 390;
  const topPad = 34;
  const bottomPad = 52;
  const minX = 48;
  const maxX = width - 24;
  const baselineY = height - bottomPad;
  const maxValue = Math.max(1, ...visibleItems.map((item) => item.value));
  const step = visibleItems.length > 1 ? (maxX - minX) / (visibleItems.length - 1) : 0;
  const points = visibleItems.map((item, index) => ({
    x: minX + index * step,
    y: baselineY - ((item.value / maxValue) * (baselineY - topPad - 18)),
  }));
  const curvePath = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
  const areaPath = points.length
    ? `${curvePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
    : '';

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
        <Box w="100%" h="100%" minH="350px" overflowX="auto" display="flex" alignItems="center">
          <Box as="svg" viewBox={`0 0 ${width} ${height}`} w="100%" minW="760px" display="block">
            <defs>
              <linearGradient id="when-area-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D95B27" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#D95B27" stopOpacity="0.025" />
              </linearGradient>
            </defs>
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

            <path d={areaPath} fill="url(#when-area-gradient)" pointerEvents="none" />

            {visibleItems.map((item, index) => {
              const { x, y } = points[index];
              const isPeak = item.value === maxValue;
              const color = CHART_COLORS[index % CHART_COLORS.length];
              const isSelected = normalizeText(selectedKey) === normalizeText(item.key);

              return (
                <g
                  key={item.key}
                  onClick={() => onSelect(item.key)}
                  style={{ cursor: 'pointer', opacity: selectedKey && !isSelected ? 0.45 : 1 }}
                >
                  <line
                    x1={x}
                    x2={x}
                    y1={baselineY}
                    y2={y}
                    stroke={color}
                    strokeWidth="2.2"
                    opacity="0.48"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 12 : (isPeak ? 11 : 8)}
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
            <path
              d={curvePath}
              fill="none"
              stroke="#D95B27"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
            {visibleItems.map((item, index) => {
              const { x, y } = points[index];
              const color = CHART_COLORS[index % CHART_COLORS.length];
              const isSelected = normalizeText(selectedKey) === normalizeText(item.key);
              return (
                <circle
                  key={`curve-point-${item.key}`}
                  cx={x}
                  cy={y}
                  r={isSelected ? 8 : 5}
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                  pointerEvents="none"
                />
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

/* eslint-disable react-hooks/set-state-in-effect -- Copia histórica no renderizada; se conserva temporalmente para recuperar el archivo sobrescrito. */
function LegacyGraficasView({ obras = [], filtros = {} }) {
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

void LegacyGraficasView;
void PieChart;
void CompanyMarkerChart;
void ColumnChart;
/* eslint-enable react-hooks/set-state-in-effect */

const GRAPH_BLUE = 'var(--cl-graph-accent)';
const GRAPH_BLUE_STRONG = 'var(--cl-graph-accent-strong)';
const GRAPH_BLUE_SOFT = 'var(--cl-graph-soft)';
const GRAPH_BLUE_TRACK = 'var(--cl-graph-track)';
const GRAPH_ORANGE = '#D95B27';
const START_DATE_FIELD = 'Fecha de inicio probable';

function GraphMetricSelector({ value, onChange }) {
  return (
    <Flex
      align="center"
      gap={1}
      p="3px"
      bg="var(--cl-surface)"
      border="1px solid #F6D2C7"
      borderRadius="11px"
      flexShrink={0}
    >
      <Text px={2} fontSize="10px" fontWeight="600" color="#A43F1B">Métrica:</Text>
      {METRIC_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Button
            key={option.value}
            h="32px"
            minW="unset"
            px={{ base: 2, xl: 3 }}
            borderRadius="7px"
            fontSize="11px"
            fontWeight="600"
            bg={active ? GRAPH_ORANGE : '#FDF4F1'}
            color={active ? 'white' : '#A43F1B'}
            _hover={{ bg: active ? '#B9471E' : '#FBE7DF' }}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </Flex>
  );
}

function MexicoRepublicIllustration() {
  return (
    <Box position="absolute" right={3} bottom={3} w="106px" h="56px" opacity={0.72} pointerEvents="none" aria-hidden="true">
      <Box as="svg" viewBox="0 0 240 120" w="100%" h="100%" overflow="visible">
        <path
          d="M16 19c9 2 16 9 19 18l7 31 10 24 7 13-8 7-12-14-9-24-12-18-7-23 5-14Zm52 42 12-15 18-5 14 4 11-9 21 2 17 8 14-1 14 9 12-1 14 10 17 3 6 8-15 7-16-3-12 8-18 1-9 8-17 1-11 8-16-3-12 7-17-5-15 2-12-10-14 2-11-12 5-10Z"
          fill="var(--cl-graph-soft)"
          stroke="var(--cl-graph-accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M93 48 97 78M124 41l-2 39M152 47l-8 40M181 57l-10 32" stroke="var(--cl-graph-accent)" opacity=".36" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="116" cy="61" r="4.3" fill="#D95B27" />
        <circle cx="152" cy="65" r="3.4" fill="var(--cl-graph-accent-strong)" />
        <circle cx="187" cy="72" r="3.4" fill="var(--cl-graph-accent-strong)" />
      </Box>
    </Box>
  );
}

function SnapshotCard({ title, children, action, decoration }) {
  return (
    <Box
      minW="0"
      minH="0"
      h="100%"
      p={{ base: 3, xl: 3.5 }}
      bg="var(--cl-surface)"
      border="1px solid var(--cl-border)"
      borderRadius="11px"
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      {decoration}
      <Flex position="relative" zIndex={1} align="center" justify="space-between" gap={2} mb={2.5} flexShrink={0}>
        <Text fontSize="13px" fontWeight="800" color="var(--cl-text-strong)" noOfLines={1}>{title}</Text>
        {action}
      </Flex>
      <Box position="relative" zIndex={1} flex="1" minH="0">{children}</Box>
    </Box>
  );
}

function MiniBarList({
  items,
  metric,
  selectedKey,
  onSelect,
  labelWidth = '34%',
  limit = 6,
  showPercentage = false,
  barThickness = '10px',
}) {
  const visibleItems = items.slice(0, limit);
  const maxValue = Math.max(1, ...visibleItems.map((item) => item.value));
  const total = visibleItems.reduce((sum, item) => sum + item.value, 0);
  const valueWidth = getMetricValueWidth(metric);

  if (!visibleItems.length) {
    return <Flex h="100%" align="center" justify="center"><Text fontSize="12px" color="var(--cl-text-muted)">Sin datos para mostrar.</Text></Flex>;
  }

  return (
    <VStack h="100%" align="stretch" justify="space-evenly" gap={1.5}>
      {visibleItems.map((item) => {
        const selected = normalizeText(selectedKey) === normalizeText(item.key);
        const percentage = getDisplayPercentage(item.value, total);
        return (
          <Flex
            key={item.key}
            as="button"
            type="button"
            w="100%"
            minW="0"
            align="center"
            gap={2}
            px={1}
            py={1}
            borderRadius="6px"
            bg={selected ? 'rgba(217, 91, 39,.08)' : 'transparent'}
            cursor="pointer"
            aria-pressed={selected}
            _hover={{ bg: selected ? 'rgba(217, 91, 39,.10)' : GRAPH_BLUE_SOFT }}
            onClick={() => onSelect(item.key)}
          >
            <Text flex={`0 0 ${labelWidth}`} minW="0" textAlign="left" fontSize="11px" fontWeight={selected ? '700' : '600'} color="var(--cl-text-strong)" noOfLines={1}>{item.label}</Text>
            <Box flex="1" minW="0" h={barThickness} bg={GRAPH_BLUE_TRACK} borderRadius="full" overflow="hidden">
              <Box h="100%" w={`${Math.max(5, (item.value / maxValue) * 100)}%`} bg={selected ? GRAPH_ORANGE : GRAPH_BLUE} borderRadius="full" transition="width 180ms ease, background 160ms ease" />
            </Box>
            <Text flex={`0 0 ${valueWidth}`} textAlign="right" fontSize="10px" fontWeight="800" color="var(--cl-text-strong)" noOfLines={1}>{getDisplayValueWithUnit(item.value, metric)}</Text>
            {showPercentage && <Text flex="0 0 34px" textAlign="right" fontSize="10px" fontWeight="700" color={GRAPH_BLUE}>{percentage}%</Text>}
          </Flex>
        );
      })}
    </VStack>
  );
}

function StateDotPlot({ items, metric, selectedKey, onSelect, limit = 7 }) {
  const visibleItems = items.slice(0, limit);
  const maxValue = Math.max(1, ...visibleItems.map((item) => item.value));
  const total = visibleItems.reduce((sum, item) => sum + item.value, 0);
  const valueWidth = getMetricValueWidth(metric);

  if (!visibleItems.length) {
    return <Flex h="100%" align="center" justify="center"><Text fontSize="12px" color="var(--cl-text-muted)">Sin datos para mostrar.</Text></Flex>;
  }

  return (
    <VStack h="100%" align="stretch" justify="space-evenly" gap={1}>
      {visibleItems.map((item, index) => {
        const selected = normalizeText(selectedKey) === normalizeText(item.key);
        const percentage = getDisplayPercentage(item.value, total);
        const position = Math.max(8, Math.min(94, (item.value / maxValue) * 94));

        return (
          <Flex
            key={item.key}
            as="button"
            type="button"
            w="100%"
            minW="0"
            h="28px"
            align="center"
            gap={1.5}
            px={1}
            borderRadius="6px"
            bg={selected ? 'rgba(217, 91, 39,.08)' : 'transparent'}
            cursor="pointer"
            aria-pressed={selected}
            _hover={{ bg: selected ? 'rgba(217, 91, 39,.10)' : GRAPH_BLUE_SOFT }}
            onClick={() => onSelect(item.key)}
          >
            <Flex flex="0 0 34%" minW="0" align="center" gap={1.5}>
              <Text flex="0 0 16px" textAlign="left" fontSize="9px" fontWeight="700" color={selected ? GRAPH_ORANGE : 'var(--cl-text-muted)'}>{String(index + 1).padStart(2, '0')}</Text>
              <Text flex="1" minW="0" textAlign="left" fontSize="11px" fontWeight={selected ? '700' : '600'} color="var(--cl-text-strong)" noOfLines={1}>{item.label}</Text>
            </Flex>
            <Box flex="1" minW="50px" h="20px" position="relative" aria-hidden="true">
              <Box position="absolute" left={0} right={0} top="50%" h="4px" bg={GRAPH_BLUE_TRACK} borderRadius="full" transform="translateY(-50%)" />
              <Box
                position="absolute"
                left={0}
                top="50%"
                w={`${position}%`}
                h="4px"
                bg={selected ? GRAPH_ORANGE : GRAPH_BLUE}
                borderRadius="full"
                transform="translateY(-50%)"
                transition="width 180ms ease, background 160ms ease"
              />
              <Box
                position="absolute"
                left={`${position}%`}
                top="50%"
                w={selected ? '18px' : '16px'}
                h={selected ? '18px' : '16px'}
                transform="translate(-50%, -50%)"
                borderRadius="full"
                bg={selected ? GRAPH_ORANGE : GRAPH_BLUE_STRONG}
                border="2px solid var(--cl-surface)"
                boxShadow={selected ? '0 0 0 3px rgba(217, 91, 39,.18)' : '0 2px 6px rgba(16,40,93,.28)'}
                transition="left 180ms ease, width 160ms ease, height 160ms ease, background 160ms ease"
              />
            </Box>
            <Text flex={`0 0 ${valueWidth}`} textAlign="right" fontSize="10px" fontWeight="800" color="var(--cl-text-strong)" noOfLines={1}>{getDisplayValueWithUnit(item.value, metric)}</Text>
            <Text flex="0 0 31px" textAlign="right" fontSize="10px" fontWeight="700" color={selected ? GRAPH_ORANGE : GRAPH_BLUE} noOfLines={1}>{percentage}%</Text>
          </Flex>
        );
      })}
    </VStack>
  );
}

function CompanyTreemap({ items, metric, selectedKey, onSelect, onOpenCompany, limit = 5 }) {
  const visibleItems = items.slice(0, limit);
  const total = visibleItems.reduce((sum, item) => sum + item.value, 0) || 1;
  const tilePositions = [
    { gridColumn: '1', gridRow: '1 / span 2' },
    { gridColumn: '2', gridRow: '1' },
    { gridColumn: '2', gridRow: '2' },
    { gridColumn: '3', gridRow: '1' },
    { gridColumn: '3', gridRow: '2' },
  ];
  // Todos los mosaicos se mantienen en tonos suficientemente profundos para
  // que el texto blanco conserve contraste tanto en tema claro como oscuro.
  const tileColors = ['#334155', '#3F4D60', '#475569', '#58677A', '#64748B'];

  if (!visibleItems.length) {
    return <Flex h="100%" align="center" justify="center"><Text fontSize="12px" color="var(--cl-text-muted)">Sin datos para mostrar.</Text></Flex>;
  }

  return (
    <Grid h="100%" minH="0" templateColumns="1.32fr 1fr 1fr" templateRows="repeat(2, minmax(0, 1fr))" gap={1.5}>
      {visibleItems.map((item, index) => {
        const selected = normalizeText(selectedKey) === normalizeText(item.key);
        const percentage = getDisplayPercentage(item.value, total);
        return (
          <Box
            key={item.key}
            as="button"
            type="button"
            minW="0"
            minH="0"
            {...tilePositions[index]}
            p={{ base: 2, xl: 2.5 }}
            borderRadius="9px"
            bg={selected ? GRAPH_ORANGE : tileColors[index]}
            color="white"
            cursor="pointer"
            textAlign="left"
            aria-pressed={selected}
            boxShadow={selected ? '0 0 0 2px rgba(217, 91, 39,.20)' : 'none'}
            transition="transform 160ms ease, background 160ms ease, box-shadow 160ms ease"
            _hover={{ transform: 'translateY(-1px)', boxShadow: '0 5px 14px rgba(51,65,85,.30)' }}
            _focusVisible={{ outline: '2px solid #334155', outlineOffset: '2px' }}
            aria-label={`${onOpenCompany ? 'Abrir perfil de' : 'Filtrar por'} ${item.label}`}
            title={onOpenCompany ? `Ver perfil de ${item.label}` : `Filtrar por ${item.label}`}
            onClick={() => {
              if (onOpenCompany) {
                onOpenCompany(item.key);
                return;
              }
              onSelect?.(item.key);
            }}
          >
            <Flex h="100%" minH="0" direction="column" justify="space-between" gap={1}>
              <Text
                minW="0"
                fontSize={{ base: '11px', xl: '12px' }}
                lineHeight="1.3"
                fontWeight="700"
                noOfLines={index === 0 ? 4 : 3}
              >
                {item.label}
              </Text>
              <Box>
                <Text
                  fontSize={{ base: index === 0 ? '15px' : '13px', xl: index === 0 ? '17px' : '14px' }}
                  lineHeight="1.1"
                  fontWeight="800"
                  noOfLines={1}
                >
                  {getDisplayValueWithUnit(item.value, metric)}
                </Text>
                <Text mt={1} fontSize={{ base: '10px', xl: '11px' }} lineHeight="1.1" fontWeight="600" color="rgba(255,255,255,.82)">{percentage}% del Top 5</Text>
              </Box>
            </Flex>
          </Box>
        );
      })}
    </Grid>
  );
}

function GenreDonut({ items, metric, selectedKey, onSelect }) {
  const visibleItems = items.slice(0, 5);
  const total = visibleItems.reduce((sum, item) => sum + item.value, 0) || 1;
  const colors = ['#334155', '#475569', '#64748B', '#94A3B8', '#CBD5E1'];
  const chartCenter = { x: 120, y: 120 };
  const outerRadius = 106;
  const innerRadius = 63;
  const totalValue = getDisplayValueWithUnit(total, metric);
  const polarPoint = (angle, radius) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return {
      x: chartCenter.x + radius * Math.cos(radians),
      y: chartCenter.y + radius * Math.sin(radians),
    };
  };
  const getDonutPath = (startAngle, endAngle) => {
    const startOuter = polarPoint(startAngle, outerRadius);
    const endOuter = polarPoint(endAngle, outerRadius);
    const startInner = polarPoint(startAngle, innerRadius);
    const endInner = polarPoint(endAngle, innerRadius);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${startOuter.x} ${startOuter.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y} L ${endInner.x} ${endInner.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${startInner.x} ${startInner.y} Z`;
  };
  const slices = visibleItems.map((item, index) => {
    const start = visibleItems
      .slice(0, index)
      .reduce((sum, previous) => sum + ((previous.value / total) * 360), 0);
    const end = start + ((item.value / total) * 360);
    const selected = normalizeText(selectedKey) === normalizeText(item.key);
    return {
      ...item,
      color: selected ? GRAPH_ORANGE : colors[index],
      selected,
      path: getDonutPath(start, end),
    };
  });

  return (
    <Flex h="100%" minH="0" direction="column" align="stretch" gap={2}>
      <Flex flex="1" minH="0" align="flex-start" justify="center">
        <Box w="clamp(196px, 18vw, 332px)" maxW="100%" h="100%" maxH="332px" mt={-2} flexShrink={0} position="relative">
          <Box as="svg" viewBox="0 0 240 240" w="100%" h="100%" display="block" aria-label="Distribución por género">
          {slices.map((slice) => (
            <path
              key={slice.key}
              d={slice.path}
              fill={slice.color}
              stroke="var(--cl-surface)"
              strokeWidth="2"
              cursor="pointer"
              transform={slice.selected ? 'scale(1.035)' : undefined}
              transformOrigin="120px 120px"
              onClick={() => onSelect(slice.key)}
            />
          ))}
            <circle cx={chartCenter.x} cy={chartCenter.y} r={innerRadius} fill="var(--cl-surface)" />
            <text
              x={chartCenter.x}
              y={chartCenter.y - 4}
              textAnchor="middle"
              fill="var(--cl-text-strong)"
              fontSize={metric === 'proyectos' ? '26' : '15'}
              fontWeight="800"
            >
              {totalValue}
            </text>
            <text x={chartCenter.x} y={chartCenter.y + 19} textAnchor="middle" fill="var(--cl-text-muted)" fontSize="13" fontWeight="600">total</text>
          </Box>
        </Box>
      </Flex>
      <Grid
        flexShrink={0}
        templateColumns="repeat(2, minmax(0, 1fr))"
        gap={1}
        alignItems="stretch"
      >
        {slices.map((item) => {
          const percentage = getDisplayPercentage(item.value, total);
          return (
            <Grid
              key={item.key}
              as="button"
              type="button"
              templateColumns="10px minmax(0, 1fr) auto"
              columnGap={2}
              alignItems="center"
              minW="0"
              h="40px"
              px={2}
              borderRadius="6px"
              bg={item.selected ? 'rgba(217, 91, 39,.08)' : 'transparent'}
              cursor="pointer"
              aria-pressed={item.selected}
              _hover={{ bg: item.selected ? 'rgba(217, 91, 39,.10)' : GRAPH_BLUE_SOFT }}
              onClick={() => onSelect(item.key)}
              title={`${item.label}: ${getDisplayValueWithUnit(item.value, metric)} (${percentage}%)`}
            >
              <Box w="8px" h="8px" borderRadius="full" bg={item.color} />
              <VStack minW="0" align="start" justify="center" gap={0}>
                <Text minW="0" w="100%" textAlign="left" fontSize="11px" lineHeight="1.15" fontWeight={item.selected ? '700' : '600'} color="var(--cl-text-strong)" noOfLines={1}>{item.label}</Text>
                <Text minW="0" w="100%" textAlign="left" fontSize="10.5px" lineHeight="1.1" fontWeight="800" color="var(--cl-text-muted)" noOfLines={1}>{getDisplayValueWithUnit(item.value, metric)}</Text>
              </VStack>
              <Text justifySelf="end" fontSize="12.5px" lineHeight="1" fontWeight="800" color={item.selected ? GRAPH_ORANGE : GRAPH_BLUE}>{percentage}%</Text>
            </Grid>
          );
        })}
      </Grid>
    </Flex>
  );
}

function TimelineCurve({ items, metric, selectedKey, onSelect }) {
  const visibleItems = items.filter((item) => item.key !== 'Sin fecha').slice(-8);
  const maxValue = Math.max(1, ...visibleItems.map((item) => item.value));
  const width = 900;
  const height = 220;
  const topPad = 28;
  const bottomPad = 48;
  const leftPad = 34;
  const rightPad = 34;
  const baselineY = height - bottomPad;
  const step = visibleItems.length > 1 ? (width - leftPad - rightPad) / (visibleItems.length - 1) : 0;
  const points = visibleItems.map((item, index) => ({
    x: leftPad + (index * step),
    y: baselineY - ((item.value / maxValue) * (baselineY - topPad)),
  }));
  const curvePath = points.reduce((path, point, index) => {
    if (!index) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
  const areaPath = points.length ? `${curvePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z` : '';

  if (!visibleItems.length) {
    return <Flex h="100%" align="center" justify="center"><Text fontSize="12px" color="var(--cl-text-muted)">Sin fechas de inicio para mostrar.</Text></Flex>;
  }

  return (
    <Box h="100%" minH="0">
      <Box as="svg" viewBox={`0 0 ${width} ${height}`} w="100%" h="100%" display="block" preserveAspectRatio="xMidYMid meet" aria-label="Línea del tiempo de inicios estimados de obra">
        {[0, 1, 2].map((index) => {
          const y = topPad + (index * (baselineY - topPad)) / 2;
          return <line key={index} x1={leftPad} x2={width - rightPad} y1={y} y2={y} stroke="rgba(71,85,105,.14)" strokeWidth="1" />;
        })}
        <path d={areaPath} fill="rgba(71,85,105,.10)" pointerEvents="none" />
        <path d={curvePath} fill="none" stroke={GRAPH_BLUE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
        {visibleItems.map((item, index) => {
          const point = points[index];
          const selected = isSameSelectionValue(selectedKey, item.key);

          return (
            <g
              key={item.key}
              role="button"
              tabIndex="0"
              aria-pressed={selected}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelect(item.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(item.key);
                }
              }}
            >
              <circle cx={point.x} cy={point.y} r={selected ? '11' : '9'} fill="transparent" />
              <circle cx={point.x} cy={point.y} r={selected ? '5.5' : '3.5'} fill={selected ? GRAPH_ORANGE : GRAPH_BLUE} stroke="var(--cl-surface)" strokeWidth={selected ? '2.5' : '1.5'} />
              <text x={point.x} y={Math.max(11, point.y - 7)} textAnchor="middle" fill={selected ? GRAPH_ORANGE : 'var(--cl-text-strong)'} fontSize={metric === 'proyectos' ? '5.2' : '4.25'} fontWeight="700">{getDisplayValueWithUnit(item.value, metric)}</text>
              <text x={point.x} y={height - 10} textAnchor="middle" fill={selected ? GRAPH_ORANGE : 'var(--cl-text-muted)'} fontSize="4.1" fontWeight={selected ? '700' : '500'}>{getCompactMonthLabel(item.key)}</text>
            </g>
          );
        })}
      </Box>
    </Box>
  );
}

export default function GraficasView({ obras = [], filtros = {}, onSelectionCountChange, onOpenCompany }) {
  // Explorer sigue disponible en mapa y resultados, pero sus campos todavía
  // no forman parte del contrato analítico. Las gráficas conservan la fuente
  // histórica aunque el usuario cambie el switch lateral.
  const graphFilters = useMemo(() => ({
    ...filtros,
    fuentes: [OBRA_SOURCES.CONSTRULEADS],
  }), [filtros]);
  const filteredObras = useMemo(
    () => filterObrasByFilters(obras, graphFilters),
    [obras, graphFilters]
  );
  const [metric, setMetric] = useState('proyectos');
  const [chartSelections, setChartSelections] = useState({
    genero: '', subgenero: '', region: '', estado: '', month: '', compania: '',
  });

  const downstreamSelectionKeys = {
    genero: ['subgenero', 'region', 'estado', 'month', 'compania'],
    subgenero: ['region', 'estado', 'month', 'compania'],
    region: ['estado', 'month', 'compania'],
    estado: ['month', 'compania'],
    month: ['compania'],
    compania: [],
  };

  const selectChartValue = (key, value) => setChartSelections((current) => {
    const next = {
      ...current,
      [key]: isSameSelectionValue(current[key], value) ? '' : value,
    };

    downstreamSelectionKeys[key].forEach((downstreamKey) => {
      next[downstreamKey] = '';
    });

    return next;
  });

  const clearChartSelections = () => setChartSelections({
    genero: '', subgenero: '', region: '', estado: '', month: '', compania: '',
  });

  const activeGlobalFilters = useMemo(() => {
    const filterGroups = [
      { key: 'regiones', fallback: 'selectedRegiones', label: 'Región', plural: 'regiones' },
      { key: 'estados', fallback: 'selectedEstados', label: 'Estado', plural: 'estados' },
      { key: 'generos', fallback: 'selectedGeneros', label: 'Género', plural: 'géneros' },
      { key: 'subgeneros', fallback: 'selectedSubgeneros', label: 'Subgénero', plural: 'subgéneros' },
      { key: 'sectores', fallback: 'selectedSectores', label: 'Sector', plural: 'sectores' },
      { key: 'tiposProyecto', fallback: 'selectedTiposProyecto', label: 'Tipo de proyecto', plural: 'tipos' },
      { key: 'tipoObra', fallback: 'selectedTipoObra', label: 'Tipo de obra', plural: 'tipos' },
    ];

    return filterGroups.flatMap((group) => {
      const rawValue = filtros[group.key] ?? filtros[group.fallback];
      const values = Array.isArray(rawValue)
        ? rawValue.filter(Boolean)
        : rawValue ? [rawValue] : [];

      if (!values.length) return [];

      return [{
        key: group.key,
        text: values.length === 1 ? `${group.label}: ${values[0]}` : `${values.length} ${group.plural}`,
      }];
    });
  }, [filtros]);

  // Estas selecciones existen sólo dentro de Gráficas. Cada tarjeta entrega su
  // subconjunto a la siguiente para que la exploración avance hasta compañías.
  const generoSource = filteredObras;
  const subGeneroSource = useMemo(
    () => filterObrasByChartSelection(generoSource, 'genero', chartSelections.genero),
    [generoSource, chartSelections.genero]
  );
  const regionSource = useMemo(
    () => filterObrasByChartSelection(subGeneroSource, 'subgenero', chartSelections.subgenero),
    [subGeneroSource, chartSelections.subgenero]
  );
  const estadosSource = useMemo(
    () => filterObrasByChartSelection(regionSource, 'region', chartSelections.region),
    [regionSource, chartSelections.region]
  );
  const timelineSource = useMemo(
    () => filterObrasByChartSelection(estadosSource, 'estado', chartSelections.estado),
    [estadosSource, chartSelections.estado]
  );
  const companiesSource = useMemo(
    () => filterObrasByChartSelection(timelineSource, 'month', chartSelections.month),
    [timelineSource, chartSelections.month]
  );
  const selectedObras = useMemo(
    () => filterObrasByChartSelection(companiesSource, 'compania', chartSelections.compania),
    [companiesSource, chartSelections.compania]
  );

  const generoData = useMemo(() => aggregateObrasByMetric(generoSource, 'genero', metric).filter((item) => item.key !== 'Sin dato'), [generoSource, metric]);
  const subGeneroData = useMemo(() => aggregateObrasByMetric(subGeneroSource, 'subgenero', metric).filter((item) => item.key !== 'Sin dato'), [subGeneroSource, metric]);
  const regionData = useMemo(() => aggregateObrasByMetric(regionSource, 'region', metric).filter((item) => item.key !== 'Sin dato'), [regionSource, metric]);
  const estadosData = useMemo(() => aggregateObrasByMetric(estadosSource, 'estado', metric).filter((item) => item.key !== 'Sin dato'), [estadosSource, metric]);
  const monthData = useMemo(() => aggregateObrasByMetric(
    timelineSource,
    (obra) => getMonthKeyFromObra(obra, START_DATE_FIELD),
    metric
  ).filter((item) => item.key !== 'Sin dato').sort((first, second) => {
    if (first.key === 'Sin fecha') return 1;
    if (second.key === 'Sin fecha') return -1;
    return String(first.key).localeCompare(String(second.key));
  }), [timelineSource, metric]);
  const companiaData = useMemo(() => aggregateObrasByMetric(companiesSource, 'compania', metric).filter((item) => item.key !== 'Sin dato'), [companiesSource, metric]);

  const activeChartFilters = useMemo(() => [
    { key: 'genero', label: 'Género', value: chartSelections.genero },
    { key: 'subgenero', label: 'Subgénero', value: chartSelections.subgenero },
    { key: 'region', label: 'Región', value: chartSelections.region },
    { key: 'estado', label: 'Estado', value: chartSelections.estado },
    { key: 'month', label: 'Inicio', value: chartSelections.month ? getCompactMonthLabel(chartSelections.month) : '' },
    { key: 'compania', label: 'Compañía', value: chartSelections.compania },
  ].filter((filter) => normalizeText(filter.value)), [chartSelections]);

  useEffect(() => {
    onSelectionCountChange?.(selectedObras.length);
  }, [onSelectionCountChange, selectedObras.length]);

  return (
    <Box className="graphs-snapshot" flex="1" minH="0" h="100%" overflow={{ base: 'auto', lg: 'hidden' }}>
      <style>{`
        .graphs-snapshot .graphs-layout { grid-template-rows: auto minmax(0, 1fr); }
        .graphs-snapshot .graphs-chart-grid { grid-template-columns: minmax(220px, .94fr) minmax(260px, 1.08fr) minmax(320px, 1.38fr); grid-template-rows: minmax(196px, 1fr) minmax(188px, .92fr); }
        .graphs-snapshot .graphs-timeline { grid-column: 1 / span 2; }
        .graphs-snapshot .graphs-companies { grid-column: 3; }
        @media (max-width: 1180px) {
          .graphs-snapshot { overflow: auto !important; }
          .graphs-snapshot .graphs-chart-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: auto; }
          .graphs-snapshot .graphs-companies, .graphs-snapshot .graphs-timeline { grid-column: auto; min-height: 230px; }
        }
        @media (max-height: 840px) and (min-width: 1181px) {
          .graphs-snapshot .graphs-chart-grid { grid-template-rows: minmax(168px, 1fr) minmax(158px, .92fr); }
        }
      `}</style>
      <Grid className="graphs-layout" h="100%" minH="0" gap={2.5} px={0} pt={0} pb={1}>
        <Flex align="center" justify="space-between" gap={3} wrap="wrap">
          <Flex align="center" justify="flex-start" gap={2} wrap="wrap" minW="0">
            <Text fontSize="11px" fontWeight="700" color="var(--cl-text-strong)">Filtros globales:</Text>
            {activeGlobalFilters.length ? activeGlobalFilters.map((filter) => (
              <Flex key={filter.key} align="center" h="30px" px={2.5} borderRadius="7px" bg={GRAPH_BLUE_SOFT} color="var(--cl-text-strong)">
                <Text fontSize="11px" fontWeight="600" noOfLines={1}>{filter.text}</Text>
              </Flex>
            )) : <Flex h="30px" px={2.5} align="center" borderRadius="7px" bg={GRAPH_BLUE_SOFT}><Text fontSize="11px" fontWeight="600" color="var(--cl-text-strong)">Todo México</Text></Flex>}
            {activeChartFilters.length > 0 && (
              <>
                <Box w="1px" h="18px" bg="var(--cl-border)" mx={0.5} />
                <Text fontSize="11px" fontWeight="700" color="var(--cl-text-strong)">En gráficas:</Text>
                {activeChartFilters.map((filter) => (
                  <Button
                    key={filter.key}
                    h="30px"
                    minW="unset"
                    px={2.5}
                    borderRadius="7px"
                    fontSize="11px"
                    fontWeight="600"
                    bg="rgba(217, 91, 39,.10)"
                    color="#A43F1B"
                    _hover={{ bg: 'rgba(217, 91, 39,.16)' }}
                    onClick={() => selectChartValue(filter.key, chartSelections[filter.key])}
                  >
                    {filter.label}: {filter.value} ×
                  </Button>
                ))}
                <Button
                  h="30px"
                  minW="unset"
                  px={2}
                  variant="ghost"
                  borderRadius="7px"
                  fontSize="11px"
                  fontWeight="600"
                  color="var(--cl-text-muted)"
                  _hover={{ bg: 'var(--cl-hover)', color: 'var(--cl-text-strong)' }}
                  onClick={clearChartSelections}
                >
                  Limpiar selección
                </Button>
              </>
            )}
          </Flex>
          <GraphMetricSelector value={metric} onChange={setMetric} />
        </Flex>

        <Grid className="graphs-chart-grid" minH="0" gap={2.5}>
          <SnapshotCard title="Género">
            <GenreDonut items={generoData} metric={metric} selectedKey={chartSelections.genero} onSelect={(value) => selectChartValue('genero', value)} />
          </SnapshotCard>

          <SnapshotCard title="Subgénero" action={<Text fontSize="10px" fontWeight="700" color={GRAPH_BLUE} noOfLines={1}>Principales</Text>}>
            <MiniBarList items={subGeneroData} metric={metric} selectedKey={chartSelections.subgenero} onSelect={(value) => selectChartValue('subgenero', value)} labelWidth="32%" limit={6} showPercentage barThickness="16px" />
          </SnapshotCard>

          <SnapshotCard
            title="Estados"
            action={<Text fontSize="10px" fontWeight="700" color={GRAPH_BLUE} noOfLines={1}>{chartSelections.region || 'Por región'}</Text>}
            decoration={<MexicoRepublicIllustration />}
          >
            <Flex gap={1.5} mb={2} overflowX="auto" pb={0.5}>
              <Button h="25px" minW="unset" px={2} borderRadius="6px" fontSize="10px" fontWeight="700" bg={!chartSelections.region ? GRAPH_ORANGE : GRAPH_BLUE_SOFT} color={!chartSelections.region ? 'white' : 'var(--cl-text-strong)'} _hover={{ bg: !chartSelections.region ? '#B9471E' : 'rgba(71,85,105,.16)' }} onClick={() => chartSelections.region && selectChartValue('region', chartSelections.region)}>Todo México</Button>
              {regionData.slice(0, 5).map((region) => {
                const selected = normalizeText(chartSelections.region) === normalizeText(region.key);
                return <Button key={region.key} h="25px" minW="unset" px={2} borderRadius="6px" fontSize="10px" fontWeight="700" bg={selected ? GRAPH_ORANGE : GRAPH_BLUE_SOFT} color={selected ? 'white' : 'var(--cl-text-strong)'} _hover={{ bg: selected ? '#B9471E' : 'rgba(71,85,105,.16)' }} onClick={() => selectChartValue('region', region.key)}>{region.label}</Button>;
              })}
            </Flex>
            <Box h="calc(100% - 32px)">
              <StateDotPlot items={estadosData} metric={metric} selectedKey={chartSelections.estado} onSelect={(value) => selectChartValue('estado', value)} limit={7} />
            </Box>
          </SnapshotCard>

          <Box className="graphs-timeline" minW="0" minH="0">
            <SnapshotCard title="Inicios estimados de obra" action={<Text fontSize="10px" fontWeight="600" color="var(--cl-text-muted)">Fecha de inicio probable</Text>}>
              <TimelineCurve items={monthData} metric={metric} selectedKey={chartSelections.month} onSelect={(value) => selectChartValue('month', value)} />
            </SnapshotCard>
          </Box>

          <Box className="graphs-companies" minW="0" minH="0">
            <SnapshotCard title="Principales compañías" action={<Text fontSize="10px" fontWeight="700" color={GRAPH_BLUE}>Top 5</Text>}>
              <CompanyTreemap items={companiaData} metric={metric} selectedKey={chartSelections.compania} onSelect={(value) => selectChartValue('compania', value)} onOpenCompany={onOpenCompany} />
            </SnapshotCard>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
