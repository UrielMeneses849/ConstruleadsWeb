import { Box, Flex, Text } from '@chakra-ui/react';

export default function LicitacionesSummary({ metrics, dateLabel }) {
  const cards = [
    ['Registros', new Intl.NumberFormat('es-MX').format(metrics.records)],
    ['Monto contratado', new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(metrics.amount)],
    ['Instituciones', new Intl.NumberFormat('es-MX').format(metrics.institutions)],
    ['Contrato verificado', `${metrics.verifiedPercent}%`], ['Criterio de fecha', dateLabel],
    ['Seguidas', new Intl.NumberFormat('es-MX').format(metrics.followed)],
  ];
  return <Flex
    display="grid"
    gridTemplateColumns="var(--cl-summary-columns)"
    gap={1.5}
    w="max-content"
    maxW="100%"
    overflowX="auto"
    bg="transparent"
    flexShrink={0}
  >
    {cards.map(([label, value]) => <Box key={label} bg="var(--cl-surface)" border="1px solid var(--cl-border)" borderRadius="10px" boxShadow="var(--cl-shadow)" px={3} py={1.5} minH="60px" minW={0} display="flex" flexDirection="column" justifyContent="center">
      <Text fontSize="10px" lineHeight="1" fontWeight="700" color="var(--cl-text-muted)" whiteSpace="nowrap">{label}</Text>
      <Text mt={1} fontSize="14px" lineHeight="1.1" fontWeight="600" color="var(--cl-text-strong)" whiteSpace="nowrap">{value}</Text>
    </Box>)}
  </Flex>;
}
