import { useMemo, useState } from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import {
  FiDownload,
  FiMapPin,
  FiNavigation,
  FiX,
} from 'react-icons/fi';

const MAX_ROUTE_STOPS = 10;

function getCoordinate(obra) {
  const lat = Number(obra?.lat ?? obra?.latitud ?? obra?.Latitud);
  const lng = Number(obra?.lng ?? obra?.longitud ?? obra?.Longitud);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function getFirstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? '';
}

function getProjectName(obra) {
  return getFirstValue(obra?.proyecto, obra?.nombreProyecto, obra?.nombre_proyecto, 'Proyecto sin nombre');
}

function getProjectKey(obra) {
  return getFirstValue(obra?.clave, obra?.proy_clave, obra?.idProyecto, obra?.id, '');
}

function getProjectType(obra) {
  return getFirstValue(obra?.tipoObra, obra?.tipo_obra, obra?.tipoDeObra, '');
}

function getProjectAddress(obra) {
  const directAddress = getFirstValue(
    obra?.direccion,
    obra?.Direccion,
    obra?.ubicacion,
    obra?.Ubicacion,
    obra?.localizacion,
    obra?.Localizacion1,
  );

  if (directAddress) return directAddress;

  const municipality = getFirstValue(
    obra?.municipio,
    obra?.muni_descripcion,
    obra?.Municipio,
    obra?.municipio_descripcion,
  );
  const state = getFirstValue(obra?.estado, obra?.esta_descripcion, obra?.Estado);
  return [municipality, state].filter(Boolean).join(', ') || 'Ubicación por confirmar';
}

function formatMdp(value) {
  const amount = Number(value) || 0;
  return `$${Math.round(amount / 1000000).toLocaleString('es-MX')} MDP`;
}

function formatSurface(value) {
  const amount = Number(value) || 0;
  return amount > 0 ? `${Math.round(amount).toLocaleString('es-MX')} m²` : 'No definida';
}

function buildSuggestedRoute(obras, maxStops = 10) {
  const remaining = obras
    .map((obra) => ({ obra, coordinate: getCoordinate(obra) }))
    .filter(({ coordinate }) => coordinate);

  if (!remaining.length) return [];

  // Sin un punto de partida indicado, iniciamos en el extremo norte del área
  // y seguimos por cercanía: una sugerencia transparente, fácil de ajustar.
  const northernmostIndex = remaining.reduce(
    (northernmost, candidate, index) => (
      candidate.coordinate.lat > remaining[northernmost].coordinate.lat ? index : northernmost
    ),
    0
  );
  const route = [remaining.splice(northernmostIndex, 1)[0]];

  while (remaining.length && route.length < maxStops) {
    const current = route.at(-1).coordinate;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((candidate, index) => {
      const distance = (candidate.coordinate.lat - current.lat) ** 2
        + (candidate.coordinate.lng - current.lng) ** 2;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    route.push(remaining.splice(nearestIndex, 1)[0]);
  }

  return route;
}

function openSuggestedRoute(route) {
  if (route.length < 2) return;
  const asCoordinate = ({ lat, lng }) => `${lat},${lng}`;
  const origin = asCoordinate(route[0].coordinate);
  const destination = asCoordinate(route.at(-1).coordinate);
  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'driving',
  });

  if (route.length > 2) {
    params.set('waypoints', route.slice(1, -1).map(({ coordinate }) => asCoordinate(coordinate)).join('|'));
  }

  window.open(`https://www.google.com/maps/dir/?${params.toString()}`, '_blank', 'noopener,noreferrer');
}

function buildSelectionRows(obras) {
  return obras.map((obra, index) => {
    const coordinate = getCoordinate(obra);
    return {
      'Orden de selección': index + 1,
      Clave: getProjectKey(obra),
      Proyecto: getProjectName(obra),
      Género: getFirstValue(obra?.genero, obra?.género),
      Subgénero: getFirstValue(obra?.subgenero, obra?.subgénero),
      'Tipo de obra': getProjectType(obra),
      Estado: getFirstValue(obra?.estado, obra?.estadoNombre),
      Dirección: getProjectAddress(obra),
      'Inversión (MXN)': Number(obra?.inversion) || 0,
      'Superficie (m²)': Number(obra?.superficie) || 0,
      Latitud: coordinate?.lat ?? '',
      Longitud: coordinate?.lng ?? '',
    };
  });
}

function buildRouteRows(route) {
  if (!route.length) {
    return [{ Nota: 'No hay suficientes proyectos con coordenadas para sugerir una ruta.' }];
  }

  return route.map(({ obra, coordinate }, index) => ({
    Parada: index + 1,
    Proyecto: getProjectName(obra),
    Clave: getProjectKey(obra),
    Estado: getFirstValue(obra?.estado, obra?.estadoNombre),
    Dirección: getProjectAddress(obra),
    'Tipo de obra': getProjectType(obra),
    Latitud: coordinate.lat,
    Longitud: coordinate.lng,
  }));
}

function setSheetPresentation(sheet, columnWidths, numericColumns = []) {
  sheet['!cols'] = columnWidths.map((width) => ({ wch: width }));
  const range = sheet['!ref'];
  if (range) sheet['!autofilter'] = { ref: range };

  numericColumns.forEach(({ column, format }) => {
    for (let row = 1; ; row += 1) {
      const cell = sheet[`${column}${row + 1}`];
      if (!cell) break;
      cell.z = format;
    }
  });
}

async function exportSelectionToExcel(obras, route) {
  // Carga diferida: la librería de Excel sólo se descarga cuando hace falta.
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const selectionSheet = XLSX.utils.json_to_sheet(buildSelectionRows(obras));
  setSheetPresentation(
    selectionSheet,
    [18, 18, 54, 18, 18, 34, 20, 34, 19, 19, 14, 14],
    [
      { column: 'I', format: '#,##0' },
      { column: 'J', format: '#,##0' },
      { column: 'K', format: '0.000000' },
      { column: 'L', format: '0.000000' },
    ]
  );
  XLSX.utils.book_append_sheet(workbook, selectionSheet, 'Proyectos seleccionados');

  const routeSheet = XLSX.utils.json_to_sheet(buildRouteRows(route));
  setSheetPresentation(routeSheet, [12, 54, 18, 20, 34, 14, 14, 14], [
    { column: 'G', format: '0.000000' },
    { column: 'H', format: '0.000000' },
  ]);
  XLSX.utils.book_append_sheet(workbook, routeSheet, 'Ruta sugerida');

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `construleads-ruta-${date}.xlsx`, { compression: true });
}

export default function MapSelectionModal({ obras = [], onClose, onViewProject }) {
  const [isExporting, setIsExporting] = useState(false);
  const states = new Set(obras.map((obra) => obra?.estado).filter(Boolean));
  const investment = obras.reduce((total, obra) => total + (Number(obra?.inversion) || 0), 0);
  const surface = obras.reduce((total, obra) => total + (Number(obra?.superficie) || 0), 0);
  const route = useMemo(() => buildSuggestedRoute(obras, MAX_ROUTE_STOPS), [obras]);
  const geoLocatedCount = useMemo(
    () => obras.filter((obra) => Boolean(getCoordinate(obra))).length,
    [obras],
  );
  const routeStart = route[0]?.obra;

  const handleExcelExport = async () => {
    setIsExporting(true);
    try {
      await exportSelectionToExcel(obras, route);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes cl-map-selection-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cl-map-selection-dialog-in {
          from { opacity: 0; transform: translateY(10px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cl-map-selection-backdrop, .cl-map-selection-dialog { animation-duration: 1ms !important; }
        }
      `}</style>
      <Box
        className="cl-map-selection-backdrop"
        position="absolute"
        inset={0}
        zIndex={60}
        bg="rgba(7, 12, 22, .48)"
        backdropFilter="blur(3px)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
        animation="cl-map-selection-backdrop-in 160ms ease-out both"
        onClick={onClose}
        role="presentation"
      >
        <Box
          className="cl-map-selection-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Resumen de ruta"
          w="min(890px, 100%)"
          h="min(700px, calc(100% - 20px))"
          maxH="calc(100% - 20px)"
          overflow="hidden"
          display="flex"
          flexDirection="column"
          bg="var(--cl-surface)"
          color="var(--cl-text)"
          border="1px solid var(--cl-border)"
          borderRadius="18px"
          boxShadow="0 24px 64px rgba(0,0,0,.35)"
          animation="cl-map-selection-dialog-in 220ms cubic-bezier(.2,.8,.2,1) both"
          onClick={(event) => event.stopPropagation()}
        >
          <Flex align="center" gap={3} px={5} py={4} borderBottom="1px solid var(--cl-border)">
            <Flex w="38px" h="38px" align="center" justify="center" borderRadius="11px" bg="var(--cl-orange-soft)" color="#D94E2D" flexShrink={0}>
              <FiMapPin size={19} />
            </Flex>
            <Box minW={0} flex="1">
              <Text fontSize="16px" fontWeight="600" color="var(--cl-text-strong)">Ruta en preparación</Text>
              <Text mt={0.5} fontSize="12px" color="var(--cl-text-muted)">
                {obras.length.toLocaleString('es-MX')} proyectos incluidos en la ruta
              </Text>
            </Box>
            <Button
              aria-label="Cerrar selección"
              title="Cerrar"
              variant="ghost"
              minW="32px"
              w="32px"
              h="32px"
              p={0}
              borderRadius="9px"
              color="var(--cl-text-muted)"
              _hover={{ bg: 'var(--cl-hover)', color: 'var(--cl-text-strong)' }}
              onClick={onClose}
            >
              <FiX size={18} />
            </Button>
          </Flex>

          <Box px={5} py={4} flex="1" minH={0} overflowY="auto">
            <Box display="grid" gridTemplateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={2.5} mb={3}>
              {[
                ['Proyectos', obras.length.toLocaleString('es-MX')],
                ['Inversión identificada', formatMdp(investment)],
                ['Superficie', formatSurface(surface)],
                ['Estados', states.size.toLocaleString('es-MX')],
              ].map(([label, value]) => (
                <Box key={label} bg="var(--cl-surface-muted)" border="1px solid var(--cl-border)" borderRadius="12px" px={3} py={2.5}>
                  <Text fontSize="10px" color="var(--cl-text-muted)" lineHeight="1.2">{label}</Text>
                  <Text mt={1} fontSize="15px" fontWeight="600" color="var(--cl-text-strong)" lineHeight="1.1">{value}</Text>
                </Box>
              ))}
            </Box>

            {routeStart && (
              <Flex
                align={{ base: 'flex-start', md: 'center' }}
                justify="space-between"
                gap={3}
                flexDirection={{ base: 'column', md: 'row' }}
                mb={4}
                px={4}
                py={3.5}
                bg="var(--cl-orange-soft)"
                bgGradient="linear(to-r, var(--cl-orange-soft), var(--cl-surface))"
                border="1px solid rgba(255, 101, 63, .38)"
                borderRadius="14px"
                boxShadow="0 7px 18px rgba(255, 101, 63, .12)"
              >
                <Flex gap={3} minW={0} align="center">
                  <Flex w="38px" h="38px" align="center" justify="center" borderRadius="full" bg="#FF653F" color="white" flexShrink={0} boxShadow="0 5px 12px rgba(255, 101, 63, .34)">
                    <FiNavigation size={18} />
                  </Flex>
                  <Box minW={0}>
                    <Flex align="center" gap={2}>
                      <Text fontSize="13px" fontWeight="800" color="var(--cl-text-strong)">Ruta sugerida</Text>
                      <Text px={2} py={0.5} borderRadius="full" bg="rgba(255, 101, 63, .16)" color="#D94E2D" fontSize="9px" fontWeight="800">POR CERCANÍA</Text>
                    </Flex>
                    <Text mt={0.5} fontSize="12px" fontWeight="600" color="var(--cl-text-strong)" lineClamp={1}>
                      Inicio: {getProjectAddress(routeStart)}
                    </Text>
                    <Text mt={0.5} fontSize="10px" color="var(--cl-text-muted)" lineClamp={1}>
                      Ordenada para minimizar el recorrido entre destinos.
                    </Text>
                  </Box>
                </Flex>
                <Box px={3} py={1.5} borderRadius="10px" bg="var(--cl-surface)" border="1px solid var(--cl-border)" textAlign={{ base: 'left', md: 'right' }}>
                  <Text fontSize="18px" lineHeight="1" fontWeight="800" color="#FF653F">{route.length}</Text>
                  <Text mt={1} fontSize="9px" fontWeight="700" color="var(--cl-text-muted)" whiteSpace="nowrap">de {geoLocatedCount} destinos</Text>
                </Box>
              </Flex>
            )}

            <Flex align="center" justify="space-between" gap={3} mb={2.5}>
              <Box>
                <Text fontSize="13px" fontWeight="600" color="var(--cl-text-strong)">Proyectos seleccionados</Text>
              <Text mt={0.5} fontSize="11px" color="var(--cl-text-muted)">Consulta rápida antes de exportar o abrir el recorrido.</Text>
              </Box>
              <Text fontSize="11px" fontWeight="600" color="#FF653F" whiteSpace="nowrap">{obras.length} registros</Text>
            </Flex>

            <Box border="1px solid var(--cl-border)" borderRadius="12px" overflow="hidden">
              {obras.slice(0, 12).map((obra, index) => (
                <Flex
                  key={`${obra?.id || obra?.clave || obra?.proyecto || 'obra'}-${index}`}
                  align="center"
                  gap={3}
                  px={3.5}
                  py={2.5}
                  borderBottom={index < Math.min(obras.length, 12) - 1 ? '1px solid var(--cl-border)' : '0'}
                  cursor={onViewProject ? 'pointer' : 'default'}
                  _hover={onViewProject ? { bg: 'var(--cl-hover)' } : undefined}
                  onClick={() => onViewProject?.(obra)}
                >
                  <Flex w="28px" h="28px" borderRadius="full" align="center" justify="center" bg="var(--cl-surface-muted)" color="#FF653F" fontSize="10px" fontWeight="700" flexShrink={0}>
                    {String(obra?.estado || 'MX').slice(0, 2).toUpperCase()}
                  </Flex>
                  <Box minW={0} flex="1">
                    <Text fontSize="12px" fontWeight="500" color="var(--cl-text-strong)" lineClamp={1}>
                      {getProjectName(obra)}
                    </Text>
                    <Text mt={0.5} fontSize="10px" color="var(--cl-text-muted)" lineClamp={1}>
                      {[getProjectKey(obra), obra?.estado, getProjectType(obra)].filter(Boolean).join(' · ')}
                    </Text>
                  </Box>
                  <Text fontSize="11px" fontWeight="500" color="var(--cl-text)" whiteSpace="nowrap">{formatMdp(obra?.inversion)}</Text>
                </Flex>
              ))}
            </Box>
            {obras.length > 12 && (
              <Text mt={2} fontSize="11px" color="var(--cl-text-muted)">Se muestran 12 de {obras.length.toLocaleString('es-MX')} proyectos.</Text>
            )}
          </Box>

          <Flex flexShrink={0} align="center" justify="space-between" gap={3} flexWrap="wrap" px={5} py={3.5} borderTop="1px solid var(--cl-border)" bg="var(--cl-surface-muted)">
            <Text fontSize="10px" color="var(--cl-text-muted)">
              Excel incluye los {obras.length} proyectos{geoLocatedCount ? ` y hasta ${MAX_ROUTE_STOPS} paradas sugeridas` : ''}.
            </Text>
            <Flex gap={2} flexWrap="wrap">
              <Button
                h="34px"
                minW="172px"
                px={3}
                variant="outline"
                borderColor="var(--cl-border)"
                color="var(--cl-text-strong)"
                fontSize="12px"
                fontWeight="600"
                leftIcon={<FiNavigation size={15} />}
                isDisabled={route.length < 2}
                title={route.length < 2 ? 'Selecciona al menos dos proyectos con coordenadas' : `Abrir recorrido con ${route.length} paradas`}
                onClick={() => openSuggestedRoute(route)}
              >
                {route.length > 1 ? `Abrir ruta · ${route.length} paradas` : 'Ruta no disponible'}
              </Button>
              <Button
                h="34px"
                minW="146px"
                px={3}
                bg="#FF653F"
                color="white"
                _hover={{ bg: '#D94E2D' }}
                fontSize="12px"
                fontWeight="600"
                leftIcon={<FiDownload size={15} />}
                loading={isExporting}
                loadingText="Preparando Excel"
                onClick={handleExcelExport}
              >
                Descargar Excel
              </Button>
            </Flex>
          </Flex>
        </Box>
      </Box>
    </>
  );
}
