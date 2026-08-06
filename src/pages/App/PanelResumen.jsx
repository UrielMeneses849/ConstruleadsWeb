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
import { getSelectedDateField } from '../../utils/filterObras';

export default function PanelResumen({
  obras = [],
  filtros = {},
  variant = 'sidebar',
  showCurrentSelection = false,
  currentSelectionCount = 0,
}) {
const selectedDateField = useMemo(
  () => getSelectedDateField(filtros),
  [filtros]
);
const selectedDateLabel = selectedDateField
  .replace('Fecha de inicio probable', 'Fecha de inicio')
  .replace('Fecha de término probable', 'Fecha de término');
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

const metricasDinamicas = [
  ...(showCurrentSelection ? [{
    valor: numberFormatter.format(currentSelectionCount),
    label: 'Selección actual',
    highlighted: true,
  }] : []),
  {
    valor: numberFormatter.format(totalProyectos),
    label: 'Proyectos'
  },
  {
    valor: `$${compactFormatter.format(inversionTotal / 1000000)}`,
    suffix: 'MDP',
    label: 'Inversión total'
  },
  {
    valor: numberFormatter.format(estadosConProyectos),
    label: 'Estados',
  },
  {
    valor: numberFormatter.format(superficieTotal),
    suffix: 'm²',
    label: 'Superficie',
  },
];

if (variant === 'map') {
  return (
    <Grid
      alignItems="stretch"
      gap={1.5}
      w="max-content"
      maxW="100%"
      templateColumns={showCurrentSelection
        ? '110px 132px 190px 132px 160px 190px'
        : 'var(--cl-summary-columns)'}
      overflowX="hidden"
    >
      {metricasDinamicas.map((item) => (
        <Box
          key={item.label}
          minW="0"
          border={item.highlighted ? '1px solid rgba(255,101,63,.62)' : '1px solid var(--cl-border)'}
          borderRadius="10px"
          boxShadow="var(--cl-shadow)"
          color="var(--cl-text)"
          bg={item.highlighted ? 'rgba(255,101,63,.10)' : 'var(--cl-surface)'}
          minH="60px"
          px={3}
          py={1.5}
          position="relative"
          overflow="hidden"
          display="flex"
          flexDirection="column"
          justifyContent="center"
        >
          <Box
            position="absolute"
            left={0}
            top={0}
            bottom={0}
            w="3px"
            bg={item.highlighted ? '#FF653F' : 'transparent'}
          />

          <Flex align="center" gap={2} mb={1}>
            <Text
              fontSize="10px"
              fontWeight="700"
              color="var(--cl-text-muted)"
              lineHeight="1"
              whiteSpace="nowrap"
            >
              {item.label}
            </Text>
          </Flex>

          <HStack spacing={1.5} align="baseline" whiteSpace="nowrap">
            <Text
              fontSize="14px"
              fontWeight="600"
              lineHeight="1.1"
              color="var(--cl-text-strong)"
              whiteSpace="nowrap"
            >
              {item.valor}
            </Text>
            {item.suffix && (
              <Text
                fontSize="10px"
                fontWeight="500"
                color="var(--cl-text-muted)"
                whiteSpace="nowrap"
              >
                {item.suffix}
              </Text>
            )}
          </HStack>
        </Box>
      ))}
      <Box
        minW="0"
        bg="var(--cl-surface)"
        border="1px solid var(--cl-border)"
        borderRadius="10px"
        boxShadow="var(--cl-shadow)"
        minH="60px"
        px={3}
        py={1.5}
        display="flex"
        flexDirection="column"
        justifyContent="center"
      >
        <Text
          fontSize="10px"
          color="var(--cl-text-muted)"
          fontWeight="700"
          lineHeight="1"
          whiteSpace="nowrap"
        >
          Criterio de fecha
        </Text>
        <Text
          mt={1}
          fontSize="14px"
          lineHeight="1.1"
          color="var(--cl-text-strong)"
          fontWeight="600"
          whiteSpace="nowrap"
        >
          {selectedDateLabel}
        </Text>
      </Box>
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
                <Text fontSize="22px" fontWeight="400">
                  {item.valor}
                </Text>
                {item.suffix && (
                  <Text fontWeight="400">{item.suffix}</Text>
                )}
              </HStack>

              <Text
                w="100%"
                fontSize="11px"
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
                  <Text fontSize="18px" fontWeight="400">
                    {item.valor}
                  </Text>
                  {item.suffix && (
                    <Text fontWeight="100">{item.suffix}</Text>
                  )}
                </HStack>
                <Text
                  mt={1}
                  fontSize="12px"
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
