import { useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Flex,
  Grid,
} from '@chakra-ui/react';
import {
  FiBarChart2,
  FiBriefcase,
  FiCalendar,
  FiDollarSign,
  FiMapPin,
  FiMaximize2,
  FiUsers,
} from 'react-icons/fi';
import { getSelectedDateField } from '../../utils/filterObras';

const SUMMARY_METRIC_META = {
  projects: { Icon: FiBriefcase, color: '#2854C5', background: 'rgba(40, 84, 197, .11)' },
  investment: { Icon: FiDollarSign, color: '#E35A2E', background: 'rgba(255, 101, 63, .11)' },
  states: { Icon: FiMapPin, color: '#A7472C', background: 'rgba(255, 101, 63, .11)' },
  surface: { Icon: FiMaximize2, color: '#6747C8', background: 'rgba(103, 71, 200, .11)' },
  companies: { Icon: FiUsers, color: '#16835B', background: 'rgba(22, 131, 91, .11)' },
  date: { Icon: FiCalendar, color: '#536174', background: 'rgba(83, 97, 116, .11)' },
  default: { Icon: FiBarChart2, color: '#2854C5', background: 'rgba(40, 84, 197, .11)' },
};

function getMetricMeta(label = '') {
  const normalized = String(label).toLowerCase();
  if (normalized.includes('inversión')) return SUMMARY_METRIC_META.investment;
  if (normalized.includes('superficie') || normalized.includes('metro')) return SUMMARY_METRIC_META.surface;
  if (normalized.includes('compañ')) return SUMMARY_METRIC_META.companies;
  if (normalized.includes('estado')) return SUMMARY_METRIC_META.states;
  if (normalized.includes('fecha') || normalized.includes('criterio')) return SUMMARY_METRIC_META.date;
  if (normalized.includes('proyecto') || normalized.includes('obra') || normalized.includes('selección')) return SUMMARY_METRIC_META.projects;
  return SUMMARY_METRIC_META.default;
}

export function SummaryMetricCard({
  label,
  value,
  suffix,
  highlighted = false,
  icon: customIcon,
  iconColor,
  iconBackground,
}) {
  const metricMeta = getMetricMeta(label);
  const Icon = customIcon || metricMeta.Icon;
  const color = iconColor || metricMeta.color;
  const background = iconBackground || metricMeta.background;

  return (
    <Box
      minW="132px"
      minH="70px"
      px={3.5}
      py={1.5}
      border={highlighted ? '1px solid rgba(255,101,63,.62)' : '1px solid var(--cl-border)'}
      borderRadius="11px"
      boxShadow="none"
      color="var(--cl-text)"
      bg={highlighted ? 'rgba(255,101,63,.10)' : 'var(--cl-surface)'}
      position="relative"
      overflow="hidden"
      display="flex"
      alignItems="center"
      gap={2.5}
    >
      <Box
        position="absolute"
        left={0}
        top={0}
        bottom={0}
        w="3px"
        bg={highlighted ? '#FF653F' : 'transparent'}
      />
      <Flex
        w="28px"
        h="28px"
        flexShrink={0}
        align="center"
        justify="center"
        borderRadius="8px"
        color={highlighted ? '#D94E2D' : color}
        bg={highlighted ? 'rgba(255,101,63,.14)' : background}
      >
        <Box as={Icon} boxSize="16px" />
      </Flex>
      <Box minW={0} flex="1">
        <Text
          fontSize="9px"
          fontWeight="400"
          color="var(--cl-text-muted)"
          lineHeight="1.15"
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
        >
          {label}
        </Text>
        <HStack mt={1} spacing={1.5} align="baseline" whiteSpace="nowrap">
          <Text
            fontSize="16px"
            fontWeight="400"
            lineHeight="1.1"
            color="var(--cl-text-strong)"
            fontVariantNumeric="tabular-nums"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {value}
          </Text>
          {suffix && (
            <Text fontSize="9px" fontWeight="400" color="var(--cl-text-muted)" whiteSpace="nowrap">
              {suffix}
            </Text>
          )}
        </HStack>
      </Box>
    </Box>
  );
}

export default function PanelResumen({
  obras = [],
  filtros = {},
  variant = 'sidebar',
  showCurrentSelection = false,
  currentSelectionCount = 0,
  leadingMetric = null,
  metricLabels = {},
}) {
const selectedDateField = useMemo(
  () => getSelectedDateField(filtros),
  [filtros]
);
const selectedDateLabel = {
  'Fecha de publicación': 'Publicación',
  'Fecha de inicio probable': 'Inicio',
  'Fecha de término probable': 'Término',
}[selectedDateField] || selectedDateField;
const numberFormatter = new Intl.NumberFormat('es-MX');
const compactFormatter = new Intl.NumberFormat('es-MX', {
  maximumFractionDigits: 0,
});

const totalProyectos = obras.length;
const inversionTotal = obras.reduce(
  (acc, o) => acc + (Number(o.inversion) || 0),
  0
);
const superficieTotal = obras.reduce(
  (acc, o) => acc + (Number(o.superficie) || 0),
  0
);

const estadosMap = {};
obras.forEach((o) => {
  const estado = o.estado;
  if (!estado) return;
  estadosMap[estado] = (estadosMap[estado] || 0) + 1;
});

const estadosConProyectos = Object.keys(estadosMap).length;
const companiasUnicas = new Set(
  obras
    .map((obra) => String(obra?.compania || '').trim())
    .filter(Boolean),
).size;

const metricasDinamicas = [
  ...(leadingMetric ? [{
    valor: leadingMetric.value,
    suffix: leadingMetric.suffix,
    label: leadingMetric.label,
  }] : []),
  ...(showCurrentSelection ? [{
    valor: numberFormatter.format(currentSelectionCount),
    label: 'Selección actual',
    highlighted: true,
  }] : []),
  {
    valor: numberFormatter.format(totalProyectos),
    label: metricLabels.projects || 'Proyectos'
  },
  {
    valor: `$${compactFormatter.format(inversionTotal / 1000000)}`,
    suffix: 'MDP',
    label: metricLabels.investment || 'Inversión total'
  },
  {
    valor: numberFormatter.format(estadosConProyectos),
    label: metricLabels.states || 'Estados',
  },
  {
    valor: numberFormatter.format(superficieTotal),
    suffix: 'm²',
    label: metricLabels.surface || 'Superficie construida',
  },
  {
    valor: numberFormatter.format(companiasUnicas),
    label: metricLabels.companies || 'Compañías únicas',
  },
];

if (variant === 'map') {
  return (
    <Grid
      alignItems="stretch"
      gap={2}
      w="100%"
      minW="0"
      templateColumns={`repeat(${metricasDinamicas.length + 1}, minmax(132px, 1fr))`}
      overflowX="auto"
      pb={0}
    >
      {metricasDinamicas.map((item) => (
        <SummaryMetricCard
          key={item.label}
          label={item.label}
          value={item.valor}
          suffix={item.suffix}
          highlighted={item.highlighted}
        />
      ))}
      <SummaryMetricCard label="Criterio de fecha" value={selectedDateLabel} />
    </Grid>
  );
}

if (variant === 'floating') {
  return (
    <Flex
      align="stretch"
      gap={3}
      w="100%"
    >
      <Box
        flex="2.2"
        minW="0"
        p={4}
        borderRadius="12px"
        boxShadow="var(--cl-shadow)"
        border="1px solid var(--cl-border)"
        bg="var(--cl-surface)"
        color="var(--cl-text)"
      >
        <Heading size="sm" mb={3} px={3}>
          Resumen de proyectos
        </Heading>

        <Flex gap={2} w="100%" px={3} align="stretch">
          {metricasDinamicas.map((item) => (
            <Box
              key={item.label}
              flex="1 1 0"
              minW="0"

              borderRadius="16px"
              px={3}
              py={2}
            >
              <HStack spacing={1} align="baseline" mb={1}>
                <Text fontSize="18px" fontWeight="400" lineHeight="1.1" color="var(--cl-text-strong)" fontVariantNumeric="tabular-nums">
                  {item.valor}
                </Text>
                {item.suffix && (
                  <Text fontSize="10px" fontWeight="400" color="var(--cl-text-muted)">{item.suffix}</Text>
                )}
              </HStack>

              <Text
                w="100%"
                fontSize="10px"
                fontWeight="400"
                color="var(--cl-text-muted)"
                whiteSpace="nowrap"
                overflow="visible"
              >
                {item.label}
              </Text>
            </Box>
          ))}
        </Flex>
      </Box>

    </Flex>
  );
}

  return (
    <VStack
      w="100%"
      gap={2}
      align="stretch"
      flexFlow="row"
    >

      <Box
        bg="var(--cl-surface)"
        p={1}
        pl={4}
        pr={4}
        borderRadius="22px"
        border="1px solid var(--cl-border)"
        color="var(--cl-text)"
        width="100%"
      >
        <Heading size="sm" mb={2} >
          Resumen de proyectos
        </Heading>

        <Flex wrap="wrap" gap={2}>
          {metricasDinamicas.map((item) => (
            <Flex
              key={item.label}
              flex="1"
              minW="125px"
              borderRadius="22px"
              p={3}
              flexDirection="column"
              align="flex-start"
              gap={1}
            >
              
              <Box>
                <HStack spacing={1} align="baseline">
                  <Text fontSize="18px" fontWeight="400" lineHeight="1.1" color="var(--cl-text-strong)" fontVariantNumeric="tabular-nums">
                    {item.valor}
                  </Text>
                  {item.suffix && (
                    <Text fontSize="10px" fontWeight="400" color="var(--cl-text-muted)">{item.suffix}</Text>
                  )}
                </HStack>
                <Text
                  mt={1}
                  fontSize="10px"
                  fontWeight="400"
                  color="var(--cl-text-muted)"
                  maxW="90px"
                  lineHeight="1.2"
                >
                  {item.label}
                </Text>
              </Box>
            </Flex>
          ))}
        </Flex>
      </Box>

    </VStack>
  );
}
