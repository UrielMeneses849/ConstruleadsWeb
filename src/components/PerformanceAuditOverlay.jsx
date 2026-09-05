import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import {
  getPerformanceSnapshot,
  isPerformanceAuditEnabled,
  startPerformanceMonitoring,
  subscribeToPerformanceSnapshot,
} from '../utils/performanceMonitor';

const TRACKED_OPERATIONS = [
  ['map.refresh', 'Mapa'],
  ['filters.obras', 'Filtros'],
  ['obras.request', 'WS obras'],
  ['map.light-request', 'WS mapa ligero'],
  ['obras.load', 'Carga obras'],
  ['obras.parse', 'Parseo obras'],
  ['licitaciones.load', 'Licitaciones'],
  ['companies.request-and-parse', 'WS compañías'],
  ['companies.build-rows', 'Compañías'],
  ['results.table-data', 'Resultados'],
];

function formatMetadata(metadata = {}) {
  const details = [];
  if (Number.isFinite(metadata.records)) details.push(`${metadata.records.toLocaleString('es-MX')} registros`);
  if (Number.isFinite(metadata.relationships)) details.push(`${metadata.relationships.toLocaleString('es-MX')} relaciones`);
  if (Number.isFinite(metadata.firstPreviewMs)) details.push(`1er punto ${metadata.firstPreviewMs} ms`);
  return details.join(' · ');
}

export default function PerformanceAuditOverlay() {
  const enabled = isPerformanceAuditEnabled();
  const [snapshot, setSnapshot] = useState(getPerformanceSnapshot);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!enabled) return undefined;
    const stopMonitoring = startPerformanceMonitoring();
    const unsubscribe = subscribeToPerformanceSnapshot(setSnapshot);
    const interval = window.setInterval(() => setSnapshot(getPerformanceSnapshot()), 1500);
    return () => {
      window.clearInterval(interval);
      unsubscribe();
      stopMonitoring();
    };
  }, [enabled]);

  const trackedMeasurements = useMemo(() => TRACKED_OPERATIONS.map(([name, label]) => ({
    name,
    label,
    measurement: snapshot.measurements.find((item) => item.name === name),
  })), [snapshot.measurements]);

  if (!enabled) return null;

  return (
    <Box
      position="fixed"
      right={4}
      bottom={4}
      zIndex={2000}
      w={isOpen ? '255px' : 'auto'}
      p={isOpen ? 3 : 1}
      border="1px solid rgba(71, 85, 105, .38)"
      borderRadius="10px"
      bg="rgba(15, 23, 42, .94)"
      color="white"
      boxShadow="0 10px 28px rgba(15, 23, 42, .28)"
      fontFamily="mono"
    >
      <Flex align="center" justify="space-between" gap={2}>
        {isOpen && <Text fontSize="10px" fontWeight="800">AUDITORÍA P0 · ?perf=1</Text>}
        <Button
          ml="auto"
          size="xs"
          h="22px"
          minW="22px"
          p={0}
          variant="ghost"
          color="white"
          _hover={{ bg: 'rgba(255,255,255,.14)' }}
          onClick={() => setIsOpen((current) => !current)}
          aria-label={isOpen ? 'Minimizar auditoría de rendimiento' : 'Abrir auditoría de rendimiento'}
        >
          {isOpen ? '−' : 'P0'}
        </Button>
      </Flex>

      {isOpen && (
        <>
          <Box mt={2} pt={2} borderTop="1px solid rgba(255,255,255,.15)">
            {trackedMeasurements.map(({ name, label, measurement }) => (
              <Flex key={name} justify="space-between" gap={2} py={0.5} fontSize="10px">
                <Text color="rgba(255,255,255,.72)">{label}</Text>
                <Text fontWeight="800" whiteSpace="nowrap">
                  {measurement ? `${measurement.duration} ms${formatMetadata(measurement.metadata) ? ` · ${formatMetadata(measurement.metadata)}` : ''}` : '—'}
                </Text>
              </Flex>
            ))}
          </Box>
          <Flex mt={2} pt={2} borderTop="1px solid rgba(255,255,255,.15)" justify="space-between" gap={2} fontSize="10px">
            <Text color="rgba(255,255,255,.72)">Long tasks</Text>
            <Text fontWeight="800">{snapshot.longTaskCount}{snapshot.latestLongTask ? ` · ${snapshot.latestLongTask.duration} ms` : ''}</Text>
          </Flex>
          <Flex justify="space-between" gap={2} fontSize="10px">
            <Text color="rgba(255,255,255,.72)">Heap JS</Text>
            <Text fontWeight="800">{snapshot.heapMegabytes === null ? 'No disponible' : `${snapshot.heapMegabytes} MB`}</Text>
          </Flex>
        </>
      )}
    </Box>
  );
}
