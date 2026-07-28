import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Spinner,
  Text,
} from '@chakra-ui/react';
import {
  buildObrasKeys,
  DATE_TYPE_WS_MAP,
  formatDateForWs,
  iniciarDescargaReporte,
  solicitarReporte,
} from '../../api/reportes';

const downloadOptions = [
  { value: 'pdf_obras', label: 'PDF - Obras' },
  { value: 'excel_clasico', label: 'Excel - Clásico' },
  { value: 'excel_contactos', label: 'Excel - Contactos' },
  { value: 'excel_mapa', label: 'Excel - Mapa' },
  { value: 'excel_prospeccion', label: 'Excel - Prospección' },
];

export default function DownloadPanel({
  selectedObras = [],
  filteredObras = [],
  filtros = {},
  user = {},
}) {
  const [selectedOption, setSelectedOption] = useState(downloadOptions[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState(null);
  const panelRef = useRef(null);
  const hasSelection = selectedObras.length > 0;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const handlePointerDown = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!notification) return undefined;
    const timer = window.setTimeout(() => setNotification(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  const handleDownload = async () => {
    if (isGenerating) return;

    const obrasParaDescargar = hasSelection ? selectedObras : filteredObras;
    const obrasKeys = buildObrasKeys(obrasParaDescargar);
    const isExcel = selectedOption.value !== 'pdf_obras';
    const selectedDateType =
      filtros.fechaConsulta ||
      filtros.selectedValues?.['Fecha de consulta'] ||
      'Fecha de publicación';
    const dateType = DATE_TYPE_WS_MAP[selectedDateType] || '';
    const dateMin = formatDateForWs(filtros.fechaInicio || filtros.fechaRango?.desde);
    const dateMax = formatDateForWs(filtros.fechaFin || filtros.fechaRango?.hasta);

    if (!obrasKeys) {
      setNotification({ type: 'error', message: 'No hay obras válidas para descargar.' });
      return;
    }
    if (!user.idUsuario || !user.idSession) {
      setNotification({ type: 'error', message: 'La sesión del usuario no está disponible.' });
      return;
    }
    if (isExcel && (!dateType || !dateMin || !dateMax)) {
      setNotification({
        type: 'error',
        message: 'Selecciona un criterio y un rango de fechas válido para el reporte Excel.',
      });
      return;
    }

    setIsGenerating(true);
    setIsOpen(false);
    setNotification(null);

    try {
      const { fileUrl } = await solicitarReporte({
        reportType: selectedOption.value,
        userId: user.idUsuario,
        sessionId: user.idSession,
        obrasKeys,
        dateType,
        dateMin,
        dateMax,
      });
      const history = JSON.parse(localStorage.getItem('cl_download_history') || '[]');
      const now = new Date();
      const reportName = selectedOption.label.replace(' - ', ' — ');
      localStorage.setItem('cl_download_history', JSON.stringify([
        {
          id: Date.now(),
          date: new Intl.DateTimeFormat('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          }).format(now),
          type: isExcel ? 'Excel' : 'PDF',
          name: `${reportName} · ${obrasParaDescargar.length} obras`,
          size: 'Generado',
          url: fileUrl,
        },
        ...history,
      ].slice(0, 100)));
      iniciarDescargaReporte(fileUrl);
      setNotification({ type: 'success', message: 'Reporte generado correctamente.' });
    } catch (error) {
      setNotification({
        type: 'error',
        message: error instanceof Error && error.message
          ? error.message
          : 'No fue posible generar el reporte.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Flex
      ref={panelRef}
      bg="var(--cl-surface)"
      border="1px solid var(--cl-border)"
      borderRadius="12px"
      p={2}
      gap={2}
      align="center"
      boxShadow="none"
      w="clamp(288px, 24vw, 320px)"
      position="relative"
    >
      <style>{`
        @keyframes cl-report-progress {
          0% { transform: translateX(-100%); }
          55% { transform: translateX(80%); }
          100% { transform: translateX(250%); }
        }
      `}</style>

      {(isGenerating || notification) && (
        <Box
          position="absolute"
          bottom="56px"
          right={0}
          w="min(360px, calc(100vw - 24px))"
          bg="var(--cl-surface)"
          border="1px solid var(--cl-border)"
          borderRadius="14px"
          boxShadow="0 16px 38px rgba(0,0,0,.18)"
          p={4}
          zIndex={60}
          role="status"
          aria-live="polite"
        >
          <Flex align="center" gap={3}>
            {isGenerating ? (
              <Spinner size="sm" color="#FF653F" />
            ) : (
              <Flex
                w="28px"
                h="28px"
                borderRadius="full"
                align="center"
                justify="center"
                bg={notification?.type === 'success' ? '#DCFCE7' : '#FEE2E2'}
                color={notification?.type === 'success' ? '#15803D' : '#B91C1C'}
                fontWeight="800"
              >
                {notification?.type === 'success' ? '✓' : '!'}
              </Flex>
            )}
            <Box minW="0" flex="1">
              <Text fontSize="13px" fontWeight="700" color="var(--cl-text-strong)">
                {isGenerating ? selectedOption.label : notification?.message}
              </Text>
              {isGenerating && (
                <Text mt={0.5} fontSize="12px" color="var(--cl-text-muted)">
                  Generando reporte…
                </Text>
              )}
            </Box>
          </Flex>
          {isGenerating && (
            <Box mt={3} h="4px" overflow="hidden" borderRadius="full" bg="var(--cl-border)">
              <Box
                h="100%"
                w="38%"
                borderRadius="full"
                bg="#FF653F"
                animation="cl-report-progress 1.5s ease-in-out infinite"
              />
            </Box>
          )}
        </Box>
      )}

      <Box flex="1" position="relative">
        <Flex
          as="button"
          type="button"
          w="100%"
          h="36px"
          px={3}
          align="center"
          justify="space-between"
          bg="var(--cl-input-bg)"
          border="1px solid var(--cl-border)"
          borderRadius="8px"
          color="var(--cl-text)"
          fontSize="13px"
          textAlign="left"
          disabled={isGenerating}
          opacity={isGenerating ? 0.65 : 1}
          transition="border-color 160ms ease, background 160ms ease"
          _hover={{ bg: 'var(--cl-hover)', borderColor: 'var(--cl-text-muted)' }}
          onClick={() => setIsOpen((value) => !value)}
        >
          <Text as="span" noOfLines={1}>{selectedOption.label}</Text>
          <Text as="span" color="var(--cl-text-muted)" fontSize="14px" ml={2}>
            {isOpen ? '⌃' : '⌄'}
          </Text>
        </Flex>

        {isOpen && (
          <Box
            position="absolute"
            bottom="44px"
            left={0}
            zIndex={50}
            w="max-content"
            minW="220px"
            maxW="min(280px, calc(100vw - 32px))"
            bg="var(--cl-surface)"
            border="1px solid var(--cl-border)"
            borderRadius="8px"
            overflow="hidden"
          >
            {downloadOptions.map((option) => (
              <Flex
                as="button"
                type="button"
                key={option.value}
                w="100%"
                px={3}
                py={2}
                align="center"
                bg="var(--cl-surface)"
                color="var(--cl-text)"
                fontSize="13px"
                textAlign="left"
                whiteSpace="nowrap"
                _hover={{ bg: 'var(--cl-hover)' }}
                onClick={() => {
                  setSelectedOption(option);
                  setIsOpen(false);
                }}
              >
                <Text
                  as="span"
                  whiteSpace="nowrap"
                  fontWeight={selectedOption.value === option.value ? '600' : '500'}
                >
                  {option.label}
                </Text>
              </Flex>
            ))}
          </Box>
        )}
      </Box>

      <Button
        h="36px"
        minW={hasSelection ? '140px' : '128px'}
        bg="#FF653F"
        color="white"
        borderRadius="8px"
        fontSize="13px"
        disabled={isGenerating}
        _hover={{ bg: '#D94E2D' }}
        onClick={handleDownload}
      >
        {isGenerating ? (
          <Flex align="center" gap={2}>
            <Spinner size="xs" />
            <Text as="span">Generando…</Text>
          </Flex>
        ) : hasSelection ? 'Descargar selección' : 'Descargar todos'}
      </Button>
    </Flex>
  );
}
