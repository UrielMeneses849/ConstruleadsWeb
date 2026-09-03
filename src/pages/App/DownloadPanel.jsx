import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { FiDownload } from 'react-icons/fi';
import {
  buildObrasKeys,
  DATE_TYPE_WS_MAP,
  formatDateForWs,
  iniciarDescargaReporte,
  solicitarReporte,
} from '../../api/reportes';
import { addDownloadHistoryItem } from '../../utils/downloadHistory';

const downloadOptions = [
  { value: 'pdf_obras', label: 'PDF - Obras' },
  { value: 'pdf_companias', label: 'PDF - Compañías' },
  { value: 'pdf_graficas', label: 'PDF - Gráficas' },
  { value: 'excel_clasico', label: 'Excel - Clásico' },
  { value: 'excel_contactos', label: 'Excel - Contactos' },
  { value: 'excel_mapa', label: 'Excel - Mapa' },
  { value: 'excel_prospeccion', label: 'Excel - Prospección' },
];

function ReportFileIcon({ isPdf }) {
  const color = isPdf ? '#E5484D' : '#1F9D61';

  return (
    <Box
      as="svg"
      viewBox="0 0 44 52"
      w="38px"
      h="44px"
      flexShrink={0}
      aria-hidden="true"
    >
      <path d="M7 2h20l10 10v36a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" fill={color} />
      <path d="M27 2v10h10" fill="rgba(255,255,255,.45)" />
      <rect x="9" y="27" width="24" height="13" rx="3" fill="white" opacity=".96" />
      <text
        x="21"
        y="36.5"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="800"
        fontFamily="Arial, sans-serif"
        fill={color}
      >
        {isPdf ? 'PDF' : 'XLS'}
      </text>
    </Box>
  );
}

export default function DownloadPanel({
  selectedObras = [],
  filteredObras = [],
  filtros = {},
  user = {},
}) {
  const [selectedOption, setSelectedOption] = useState(downloadOptions[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('Preparando reporte…');
  const [notification, setNotification] = useState(null);
  const panelRef = useRef(null);
  const downloadAbortRef = useRef(null);
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
    const isChartsPdf = selectedOption.value === 'pdf_graficas';
    const isExcel = !selectedOption.value.startsWith('pdf_');
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
    if (!isChartsPdf && (!user.idUsuario || !user.idSession)) {
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
    setDownloadProgress(3);
    setDownloadStage('Solicitando reporte…');
    setIsOpen(false);
    setNotification(null);
    const abortController = new AbortController();
    downloadAbortRef.current = abortController;

    let estimatedProgressTimer = window.setInterval(() => {
      setDownloadProgress((current) => {
        if (current < 30) return Math.min(current + 2, 30);
        if (current < 58) return Math.min(current + 1, 58);
        return Math.min(current + 0.5, 70);
      });
    }, 350);

    try {
      if (isChartsPdf) {
        setDownloadStage('Diseñando 6 páginas…');
        const { generateChartsPdf } = await import('../../utils/chartReportPdf');
        await generateChartsPdf({
          obras: obrasParaDescargar,
          filtros,
          user,
          signal: abortController.signal,
          onProgress: (progress) => {
            setDownloadProgress((current) => Math.max(current, progress));
          },
        });
        if (estimatedProgressTimer) window.clearInterval(estimatedProgressTimer);
        estimatedProgressTimer = null;
        const now = new Date();
        addDownloadHistoryItem({
          id: Date.now(),
          date: new Intl.DateTimeFormat('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          }).format(now),
          type: 'PDF',
          name: `PDF — Gráficas · ${obrasParaDescargar.length} obras`,
          url: '',
        });
        setDownloadProgress(100);
        setDownloadStage('Descarga lista');
        setNotification({ type: 'success', message: 'PDF de gráficas generado correctamente.' });
        return;
      }

      const reportBatches = ['pdf_obras', 'pdf_companias'].includes(selectedOption.value)
        ? Array.from(
            { length: Math.ceil(obrasParaDescargar.length / 900) },
            (_, index) => obrasParaDescargar.slice(index * 900, (index + 1) * 900)
          )
        : [obrasParaDescargar];
      const reportResponses = [];
      for (let index = 0; index < reportBatches.length; index += 1) {
        const batch = reportBatches[index];
        reportResponses.push(await solicitarReporte({
          reportType: selectedOption.value,
          userId: user.idUsuario,
          sessionId: user.idSession,
          obrasKeys: buildObrasKeys(batch),
          dateType,
          dateMin,
          dateMax,
          signal: abortController.signal,
        }));
        const completedBatchProgress = Math.max(
          50,
          Math.round(15 + ((index + 1) / reportBatches.length) * 55)
        );
        setDownloadProgress((current) => Math.max(current, completedBatchProgress));
      }
      window.clearInterval(estimatedProgressTimer);
      estimatedProgressTimer = null;
      setDownloadProgress(72);
      setDownloadStage('Descargando archivo…');
      const fileUrls = reportResponses.map(({ fileUrl }) => fileUrl);
      const now = new Date();
      const reportName = selectedOption.label.replace(' - ', ' — ');
      addDownloadHistoryItem({
        id: Date.now(),
        date: new Intl.DateTimeFormat('es-MX', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }).format(now),
        type: isExcel ? 'Excel' : 'PDF',
        name: `${reportName} · ${obrasParaDescargar.length} obras`,
        url: fileUrls[0],
      });
      await iniciarDescargaReporte(
        fileUrls,
        `construleads-${selectedOption.value}-${Date.now()}`,
        (transferProgress) => {
          setDownloadProgress(72 + Math.round(transferProgress * 0.26));
        },
        abortController.signal
      );
      setDownloadProgress(100);
      setDownloadStage('Descarga lista');
      setNotification({ type: 'success', message: 'Reporte generado correctamente.' });
    } catch (error) {
      const wasCancelled = error?.name === 'AbortError';
      setNotification({
        type: wasCancelled ? 'cancelled' : 'error',
        message: wasCancelled
          ? 'Descarga cancelada.'
          : error instanceof Error && error.message
          ? error.message
          : 'No fue posible generar el reporte.',
      });
    } finally {
      if (estimatedProgressTimer) window.clearInterval(estimatedProgressTimer);
      downloadAbortRef.current = null;
      setIsGenerating(false);
    }
  };

  return (
    <Flex
      ref={panelRef}
      bg="var(--cl-surface)"
      border="1px solid var(--cl-border)"
      borderRadius="11px"
      minH="70px"
      px={2}
      py={1.5}
      gap={2}
      align="center"
      boxShadow="none"
      w="clamp(350px, 27vw, 410px)"
      position="relative"
    >
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
              <ReportFileIcon isPdf={selectedOption.value.startsWith('pdf_')} />
            ) : (
              <Flex
                w="28px"
                h="28px"
                borderRadius="full"
                align="center"
                justify="center"
                bg={notification?.type === 'success'
                  ? '#DCFCE7'
                  : notification?.type === 'cancelled' ? 'var(--cl-surface-muted)' : '#FEE2E2'}
                color={notification?.type === 'success'
                  ? '#15803D'
                  : notification?.type === 'cancelled' ? 'var(--cl-text-muted)' : '#B91C1C'}
                fontWeight="800"
              >
                {notification?.type === 'success' ? '✓' : '!'}
              </Flex>
            )}
            <Box minW="0" flex="1">
              <Flex align="center" justify="space-between" gap={3}>
                <Text fontSize="13px" fontWeight="700" color="var(--cl-text-strong)">
                  {isGenerating ? selectedOption.label : notification?.message}
                </Text>
                {isGenerating && (
                  <Text fontSize="12px" fontWeight="800" color="#D95B27">
                    {Math.round(downloadProgress)}%
                  </Text>
                )}
              </Flex>
              {isGenerating && (
                <Text mt={0.5} fontSize="12px" color="var(--cl-text-muted)">
                  {downloadStage}
                </Text>
              )}
            </Box>
            {isGenerating && (
              <Button
                size="xs"
                variant="ghost"
                minW="30px"
                h="30px"
                p={0}
                borderRadius="full"
                color="var(--cl-text-muted)"
                aria-label="Cancelar descarga"
                title="Cancelar descarga"
                onClick={() => downloadAbortRef.current?.abort()}
              >
                ×
              </Button>
            )}
          </Flex>
          {isGenerating && (
            <Box
              mt={3}
              h="4px"
              overflow="hidden"
              borderRadius="full"
              bg="var(--cl-border)"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(downloadProgress)}
            >
              <Box
                h="100%"
                w={`${downloadProgress}%`}
                borderRadius="full"
                bg="#D95B27"
                transition="width 220ms ease"
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
          <Text as="span" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
            {selectedOption.label}
          </Text>
          <Text as="span" color="var(--cl-text-muted)" fontSize="14px" ml={2}>
            {isOpen ? '⌃' : '⌄'}
          </Text>
        </Flex>

        {isOpen && (
          <Box
            position="absolute"
            top="calc(100% + 6px)"
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
        bg="#D95B27"
        color="white"
        borderRadius="8px"
        fontSize="13px"
        fontWeight="600"
        leftIcon={!isGenerating ? <FiDownload size={14} /> : undefined}
        disabled={isGenerating}
        _hover={{ bg: '#B9471E' }}
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
