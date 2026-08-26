import { useEffect, useRef, useState } from 'react';
import { Box, Button, Flex, Spinner, Text } from '@chakra-ui/react';
import { iniciarDescargaReporte } from '../../api/reportes';
import { addDownloadHistoryItem } from '../../utils/downloadHistory';
import { buildLicitacionKeys, solicitarExcelLicitaciones } from './licitacionesApi';

export default function LicitacionesDownloadPanel({
  user = {},
  filteredLicitaciones = [],
  selectedLicitaciones = [],
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [notification, setNotification] = useState(null);
  const abortRef = useRef(null);
  const hasSelection = selectedLicitaciones.length > 0;
  const items = hasSelection ? selectedLicitaciones : filteredLicitaciones;

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!notification) return undefined;
    const timer = window.setTimeout(() => setNotification(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  const download = async () => {
    if (isGenerating) return;
    const claves = buildLicitacionKeys(items);
    if (!claves) {
      setNotification({ type: 'error', message: 'No hay licitaciones válidas para descargar.' });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    setProgress(8);
    setStatus('Solicitando Excel…');
    setNotification(null);

    let timer = window.setInterval(() => {
      setProgress((current) => Math.min(68, current + (current < 35 ? 3 : 1)));
    }, 350);

    try {
      const { fileUrl } = await solicitarExcelLicitaciones({
        userId: user.idUsuario,
        sessionId: user.idSession,
        claves,
        signal: controller.signal,
      });
      window.clearInterval(timer);
      timer = null;
      setProgress(74);
      setStatus('Descargando archivo…');
      await iniciarDescargaReporte(
        fileUrl,
        `construleads-licitaciones-${Date.now()}`,
        (value) => setProgress(Math.min(99, 74 + value * 0.25)),
        controller.signal
      );

      addDownloadHistoryItem({
        id: Date.now(),
        date: new Intl.DateTimeFormat('es-MX', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }).format(new Date()),
        type: 'Excel',
        name: `Excel — Licitaciones · ${items.length.toLocaleString('es-MX')} registros`,
        url: fileUrl,
      });
      setProgress(100);
      setStatus('Descarga lista');
      setNotification({ type: 'success', message: 'Excel de licitaciones descargado correctamente.' });
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setNotification({ type: 'error', message: error?.message || 'No fue posible descargar el Excel.' });
      }
    } finally {
      if (timer) window.clearInterval(timer);
      abortRef.current = null;
      setIsGenerating(false);
      window.setTimeout(() => { setProgress(0); setStatus(''); }, 900);
    }
  };

  return (
    <Flex
      position="relative"
      align="center"
      gap={2}
      w="clamp(350px, 29vw, 430px)"
      minH="70px"
      px={2}
      py={1.5}
      bg="var(--cl-surface)"
      border="1px solid var(--cl-border)"
      borderRadius="12px"
      boxShadow="var(--cl-shadow-soft)"
    >
      {(notification || isGenerating) && (
        <Box
          position="absolute"
          right="0"
          bottom="calc(100% + 8px)"
          minW="280px"
          p={3}
          bg="var(--cl-surface)"
          border="1px solid var(--cl-border)"
          borderRadius="10px"
          boxShadow="var(--cl-shadow-soft)"
        >
          <Flex align="center" gap={2}>
            {isGenerating && <Spinner size="sm" color="#FF653F" />}
            <Text fontSize="12px" fontWeight="700" color={notification?.type === 'error' ? '#C53030' : 'var(--cl-text-strong)'}>
              {notification?.message || status}
            </Text>
          </Flex>
          {isGenerating && <Box mt={2} h="3px" borderRadius="full" bg="var(--cl-surface-muted)"><Box h="100%" w={`${progress}%`} borderRadius="full" bg="#FF653F" transition="width .25s ease" /></Box>}
        </Box>
      )}
      <Flex
        flex="1"
        h="38px"
        px={3}
        align="center"
        border="1px solid var(--cl-border)"
        borderRadius="9px"
        color="var(--cl-text)"
        fontSize="12px"
        fontWeight="600"
      >
        Excel - Licitaciones
      </Flex>
      <Button
        h="38px"
        px={4}
        bg="#FF653F"
        color="white"
        _hover={{ bg: '#F15A36' }}
        disabled={isGenerating || items.length === 0}
        onClick={download}
        fontSize="12px"
        whiteSpace="nowrap"
      >
        {isGenerating ? <Spinner size="sm" /> : hasSelection ? 'Descargar selección' : 'Descargar todos'}
      </Button>
    </Flex>
  );
}
