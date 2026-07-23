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
  '#94A3B8',
  '#94A3B8',
  '#94A3B8',
  '#94A3B8',
  '#94A3B8',
  '#94A3B8',
  '#94A3B8',
];

function normalizeText(value) {
  return String(value || '').trim();
}

function buildCrossFilterSources(obras, selections, selectedDateField) {
  const fieldByKey = {
    genero: 'genero', subgenero: 'subgenero', region: 'region',
    estado: 'estado', compania: 'compania',
  };
  const keys = Object.keys(selections);
  const sources = Object.fromEntries(keys.map((key) => [key, []]));
  const selectedObras = [];

  obras.forEach((obra) => {
    const matches = {};
    keys.forEach((key) => {
      const selectedValue = selections[key];
      const obraValue = key === 'month'
        ? getMonthKeyFromObra(obra, selectedDateField)
        : obra[fieldByKey[key]];
      matches[key] = !selectedValue || normalizeText(obraValue) === normalizeText(selectedValue);
    });
    if (keys.every((key) => matches[key])) selectedObras.push(obra);
    keys.forEach((excludedKey) => {
      if (keys.every((key) => key === excludedKey || matches[key])) sources[excludedKey].push(obra);
    });
  });
  return { selectedObras, chartSources: sources };
}

function getDisplayValue(value, metric) {
  return formatGraphMetricValue(value, metric);
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
      <Box h="3px" bg="#FF653F" />
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
              bg={isSelected ? 'rgba(255,102,0,.06)' : 'transparent'}
              border="1px solid"
              borderColor={isSelected ? 'rgba(255,102,0,.16)' : 'transparent'}
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
              return <Flex key={item.key} as="button" type="button" align="center" gap={2.5} px={3} py={2} borderRadius="10px" cursor="pointer" bg={isSelected ? 'rgba(255,102,0,.08)' : 'transparent'} _hover={{ bg: 'var(--cl-hover)' }} onClick={() => onSelect(item.key)}><Box w="20px" h="5px" borderRadius="full" bg={CHART_COLORS[index % CHART_COLORS.length]} /><Text flex="1" noOfLines={1} textAlign="left" fontSize="12px" fontWeight="600" color="var(--cl-text-strong)">{item.label}</Text><Text fontSize="12px" fontWeight="700" color="var(--cl-text-strong)">{getDisplayValue(item.value, metric)}</Text></Flex>;
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
            return <Flex key={item.key} as="button" type="button" flex="1" minW="0" direction="column" align="center" cursor="pointer" opacity={selectedKey && !isSelected ? 0.38 : 1} transition="opacity 160ms ease" onClick={() => onSelect(item.key)}><Text h="28px" fontSize="11px" fontWeight="700" color="var(--cl-text-strong)">{getDisplayValue(item.value, metric)}</Text><Box flex="1" w="100%" maxW="70px" minH="190px" position="relative" borderRadius="10px" bg={isSelected ? 'rgba(255,101,63,.06)' : 'transparent'} _hover={{ bg: 'var(--cl-hover)' }}><Box position="absolute" top="8px" bottom="8px" left="50%" w="4px" borderRadius="full" bg="rgba(148,163,184,.22)" transform="translateX(-50%)" /><Box position="absolute" left="50%" bottom={`${markerBottom}%`} w={isSelected ? '18px' : '14px'} h={isSelected ? '18px' : '14px'} borderRadius="full" bg="#FF653F" border="3px solid var(--cl-surface)" boxShadow={isSelected ? '0 0 0 4px rgba(255,101,63,.20)' : '0 2px 6px rgba(0,0,0,.18)'} transform="translate(-50%, 50%)" /><Box position="absolute" left="50%" bottom="8px" w="4px" h={`calc(${markerBottom}% - 8px)`} borderRadius="full" bg="#FF653F" transform="translateX(-50%)" opacity={0.72} /></Box><Text h="46px" mt={2} px={1} noOfLines={3} textAlign="center" fontSize="9px" fontWeight="600" lineHeight="1.15" color="var(--cl-text-muted)">{item.label}</Text></Flex>;
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
        <Flex minH="300px" h="100%" align="flex-end" gap={2} pt={5} borderBottom="1px solid rgba(148,163,184,.25)">
          {visibleItems.map((item, index) => {
            const isSelected = normalizeText(selectedKey) === normalizeText(item.key);
            const height = `${Math.max(10, (item.value / maxValue) * 100)}%`;
            return <Flex key={item.key} as="button" type="button" flex="1" minW="0" h="100%" direction="column" justify="flex-end" align="stretch" cursor="pointer" opacity={selectedKey && !isSelected ? 0.45 : 1} onClick={() => onSelect(item.key)}><Text mb={2} textAlign="center" fontSize="11px" fontWeight="700" color="var(--cl-text-strong)">{getDisplayValue(item.value, metric)}</Text><Box h={height} minH="30px" mx="auto" w="clamp(34px, 82%, 78px)" bg={CHART_COLORS[index % CHART_COLORS.length]} borderRadius="8px 8px 2px 2px" border={isSelected ? '3px solid #FFB27F' : '3px solid transparent'} transition="height 180ms ease, opacity 160ms ease" _hover={{ filter: 'brightness(1.08)' }} /><Text h="48px" mt={2} px={1} textAlign="center" fontSize="10px" fontWeight="600" lineHeight="1.2" noOfLines={3} color="var(--cl-text-muted)">{item.label}</Text></Flex>;
          })}
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
        borderColor={isSelected ? '#FF653F' : 'var(--cl-surface)'}
        boxShadow={isSelected ? '0 8px 20px rgba(255,102,0,.18)' : 'none'}
        transition="transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease"
        _hover={{ transform: 'translateY(-1px)' }}
        onClick={() => onSelect(item.key)}
        bg={CHART_COLORS[index % CHART_COLORS.length]}
      >
        <Box position="absolute" inset="0" bg="linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.18))" />
        <Flex position="absolute" inset="0" p={3} direction="column" justify="space-between" color="white">
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
                <stop offset="0%" stopColor="#FF8A1F" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#FF653F" stopOpacity="0.025" />
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
              stroke="#FF8A1F"
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
/* eslint-enable react-hooks/set-state-in-effect */

export default function GraficasView({ obras = [], filtros = {} }) {
  const filteredObras = useMemo(() => filterObrasByFilters(obras, filtros), [obras, filtros]);
  const selectedDateField = useMemo(() => getSelectedDateField(filtros), [filtros]);
  const [generoMetric, setGeneroMetric] = useState('proyectos');
  const [subGeneroMetric, setSubGeneroMetric] = useState('proyectos');
  const [regionMetric, setRegionMetric] = useState('proyectos');
  const [estadoMetric, setEstadoMetric] = useState('proyectos');
  const [monthMetric, setMonthMetric] = useState('proyectos');
  const [companiaMetric, setCompaniaMetric] = useState('proyectos');
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [chartSelections, setChartSelections] = useState({
    genero: '', subgenero: '', region: '', estado: '', month: '', compania: '',
  });

  const selectChartValue = (key, value) => setChartSelections((current) => ({
    ...current,
    [key]: normalizeText(current[key]) === normalizeText(value) ? '' : value,
  }));
  const clearChartSelections = () => setChartSelections({
    genero: '', subgenero: '', region: '', estado: '', month: '', compania: '',
  });
  const selectionLabels = {
    genero: 'Género', subgenero: 'Subgénero', region: 'Región',
    estado: 'Estado', month: 'Mes', compania: 'Compañía',
  };
  const appliedSelections = Object.entries(chartSelections)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => ({
      key, value, label: selectionLabels[key],
      displayValue: key === 'month' ? getMonthLabel(value) : value,
    }));

  const { selectedObras, chartSources } = useMemo(
    () => buildCrossFilterSources(filteredObras, chartSelections, selectedDateField),
    [filteredObras, chartSelections, selectedDateField]
  );
  const generoData = useMemo(() => aggregateObrasByMetric(chartSources.genero, 'genero', generoMetric).filter((i) => i.key !== 'Sin dato'), [chartSources.genero, generoMetric]);
  const subGeneroData = useMemo(() => aggregateObrasByMetric(chartSources.subgenero, 'subgenero', subGeneroMetric).filter((i) => i.key !== 'Sin dato'), [chartSources.subgenero, subGeneroMetric]);
  const regionData = useMemo(() => aggregateObrasByMetric(chartSources.region, 'region', regionMetric).filter((i) => i.key !== 'Sin dato'), [chartSources.region, regionMetric]);
  const estadosData = useMemo(() => aggregateObrasByMetric(chartSources.estado, 'estado', estadoMetric).filter((i) => i.key !== 'Sin dato'), [chartSources.estado, estadoMetric]);
  const monthData = useMemo(() => aggregateObrasByMetric(
    chartSources.month,
    (obra) => getMonthKeyFromObra(obra, selectedDateField),
    monthMetric
  ).filter((i) => i.key !== 'Sin dato').sort((a, b) => {
    if (a.key === 'Sin fecha') return 1;
    if (b.key === 'Sin fecha') return -1;
    return String(a.key).localeCompare(String(b.key));
  }), [chartSources.month, monthMetric, selectedDateField]);
  const companiaData = useMemo(() => aggregateObrasByMetric(chartSources.compania, 'compania', companiaMetric).filter((i) => i.key !== 'Sin dato'), [chartSources.compania, companiaMetric]);
  const totalProyectos = selectedObras.length;

  const sumValues = (items) => items.reduce((total, item) => total + item.value, 0);

  return (
    <Box flex="1" minH="0" h="100%" overflowY="auto" overflowX="hidden" pb={{ base: '95px', lg: '72px' }} pr={2}>
      <Box px={2} pt={2} pb={2}>
        <Flex align="flex-start" justify="space-between" gap={4} mb={3} wrap="wrap">
          <Box minW="0">
            <Text fontSize={{ base: '22px', xl: '26px' }} fontWeight="700" color="var(--cl-text-strong)" lineHeight="1.1">Gráficas</Text>
            <Text mt={1} fontSize="13px" color="var(--cl-text-muted)" lineHeight="1.2">
              Resumen visual de proyectos por género, región, fecha y compañía.
            </Text>
          </Box>
          <Box bg="var(--cl-surface)" border="1px solid var(--cl-border)" borderRadius="12px" px={4} py={3} minW="160px">
            <Text fontSize="11px" color="var(--cl-text-muted)" fontWeight="600">Selección actual</Text>
            <HStack spacing={1.5} align="baseline">
              <Text fontSize="22px" fontWeight="400" color="var(--cl-text-strong)" lineHeight="1.1">{totalProyectos}</Text>
              <Text fontSize="12px" fontWeight="400" color="var(--cl-text-muted)">proyectos</Text>
            </HStack>
          </Box>
        </Flex>

        <Flex h="38px" mb={4} gap={2} align="center" flexWrap="nowrap" overflowX="auto" overflowY="hidden" visibility={appliedSelections.length ? 'visible' : 'hidden'}>
          {appliedSelections.map((selection) => (
            <HStack key={selection.key} spacing={1} px={3} py={1.5} flexShrink={0} borderRadius="999px" bg="rgba(255,102,0,.10)" border="1px solid rgba(255,102,0,.28)">
              <Text fontSize="11px" color="var(--cl-text-muted)">{selection.label}:</Text>
              <Text fontSize="11px" color="var(--cl-text-strong)" fontWeight="600">{selection.displayValue}</Text>
              <Button minW="18px" h="18px" p={0} ml={1} border="none" bg="transparent" color="#FF653F" fontSize="15px" onClick={() => selectChartValue(selection.key, selection.value)}>×</Button>
            </HStack>
          ))}
          <Button size="sm" h="30px" px={4} flexShrink={0} borderRadius="999px" bg="#FF653F" color="white" fontSize="12px" _hover={{ bg: '#D94E2D' }} onClick={clearChartSelections}>Quitar selección</Button>
        </Flex>

        <Grid templateColumns={{ base: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }} columnGap={4} rowGap={7} alignItems="stretch">
          <BarListChart title="Género" subtitle="Distribución por género constructivo" items={generoData} metric={generoMetric} totalValue={sumValues(generoData)} selectedKey={chartSelections.genero} onSelect={(v) => selectChartValue('genero', v)} rightSlot={<MetricToggle value={generoMetric} onChange={setGeneroMetric} />} visibleLimit={6} barThickness={30} />
          <ColumnChart title="Subgénero" subtitle={`Principales subgéneros de ${chartSelections.genero || 'todas las obras'}`} items={subGeneroData} metric={subGeneroMetric} totalValue={sumValues(subGeneroData)} selectedKey={chartSelections.subgenero} onSelect={(v) => selectChartValue('subgenero', v)} rightSlot={<MetricToggle value={subGeneroMetric} onChange={setSubGeneroMetric} />} />
          <RegionTreemap title="Regiones" subtitle="Distribución de proyectos por región" items={regionData} metric={regionMetric} totalValue={sumValues(regionData)} selectedKey={chartSelections.region} onSelect={(v) => selectChartValue('region', v)} rightSlot={<MetricToggle value={regionMetric} onChange={setRegionMetric} />} />
          <BarListChart title={chartSelections.region ? `Estados de la región ${chartSelections.region}` : 'Estados por región'} subtitle="Top estados por número de proyectos" items={estadosData} metric={estadoMetric} totalValue={sumValues(estadosData)} selectedKey={chartSelections.estado} onSelect={(v) => selectChartValue('estado', v)} rightSlot={<MetricToggle value={estadoMetric} onChange={setEstadoMetric} />} barThickness={30} />
          <Box minW="0"><LollipopChart title="Distribución temporal" subtitle={`Distribución por ${selectedDateField.toLowerCase()}`} items={monthData} metric={monthMetric} totalValue={sumValues(monthData)} selectedKey={chartSelections.month} onSelect={(v) => selectChartValue('month', v)} rightSlot={<MetricToggle value={monthMetric} onChange={setMonthMetric} />} /></Box>
          <Box minW="0"><ColumnChart title="Compañías" subtitle="Principales compañías por proyectos" items={companiaData} metric={companiaMetric} totalValue={sumValues(companiaData)} selectedKey={chartSelections.compania} onSelect={(v) => selectChartValue('compania', v)} rightSlot={<MetricToggle value={companiaMetric} onChange={setCompaniaMetric} />} visibleLimit={5} bottomAction={companiaData.length > 5 ? <Button size="sm" variant="ghost" color="#FF653F" fontSize="12px" cursor="pointer" onClick={() => setIsCompanyModalOpen(true)}>Ver todas las compañías</Button> : null} /></Box>
        </Grid>
      </Box>

      {isCompanyModalOpen && (
        <Flex position="fixed" inset="0" zIndex={100} bg="rgba(0,0,0,.68)" align="center" justify="center" p={6} onClick={() => setIsCompanyModalOpen(false)}>
          <Box w="min(760px, 100%)" maxH="82vh" bg="var(--cl-surface)" border="1px solid var(--cl-border)" borderRadius="16px" boxShadow="0 24px 70px rgba(0,0,0,.35)" overflow="hidden" onClick={(e) => e.stopPropagation()}>
            <Flex px={5} py={4} align="center" justify="space-between" borderBottom="1px solid var(--cl-border)">
              <Box><Text fontSize="20px" fontWeight="700" color="var(--cl-text-strong)">Todas las compañías</Text><Text fontSize="12px" color="var(--cl-text-muted)">{companiaData.length} compañías en la selección actual</Text></Box>
              <Button minW="34px" h="34px" p={0} borderRadius="full" bg="var(--cl-input-bg)" onClick={() => setIsCompanyModalOpen(false)}>×</Button>
            </Flex>
            <VStack align="stretch" spacing={1} p={4} maxH="calc(82vh - 86px)" overflowY="auto">
              {companiaData.map((item, index) => {
                const selected = normalizeText(chartSelections.compania) === normalizeText(item.key);
                return <Flex key={item.key} as="button" type="button" w="100%" align="center" justify="space-between" gap={4} px={4} py={3} borderRadius="10px" border="1px solid" borderColor={selected ? 'rgba(255,102,0,.35)' : 'transparent'} bg={selected ? 'rgba(255,102,0,.08)' : 'transparent'} color="var(--cl-text-strong)" cursor="pointer" _hover={{ bg: 'var(--cl-hover)' }} onClick={() => { selectChartValue('compania', item.key); setIsCompanyModalOpen(false); }}>
                  <HStack minW="0" spacing={3}><Box w="8px" h="8px" borderRadius="full" bg={CHART_COLORS[index % CHART_COLORS.length]} /><Text fontSize="13px" fontWeight="600" textAlign="left" noOfLines={2}>{item.label}</Text></HStack>
                  <Text flexShrink={0} fontSize="13px" fontWeight="700">{getDisplayValue(item.value, companiaMetric)} {formatGraphMetricSuffix(companiaMetric)}</Text>
                </Flex>;
              })}
            </VStack>
          </Box>
        </Flex>
      )}
    </Box>
  );
}
