import { useMemo, useRef, useState } from 'react';
import { Badge, Box, Button, Flex, Heading, SimpleGrid, Text } from '@chakra-ui/react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiCopy,
  FiDownload,
  FiFileText,
  FiInfo,
  FiX,
} from 'react-icons/fi';
import { probeWebService, WEB_SERVICE_PROBES } from '../../api/webServiceProbe';
import { parseObrasOffMainThread } from '../../utils/parseObrasOffMainThread';
import { mapProjectsFromObras } from '../../utils/mapProjects';
import { filterObrasByFilters } from '../../utils/filterObras';
import { normalizeLicitacion, getUniqueOptions } from '../../features/licitaciones/licitacionesUtils';
import { parseCompaniasXml } from '../../api/companias';
import './MapPerformanceLab.css';

const formatMs = (value) => `${Math.round(Number(value) || 0).toLocaleString('es-MX')} ms`;
const formatNumber = (value) => Number(value || 0).toLocaleString('es-MX');

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${formatNumber(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatRate(bytes, durationMs) {
  if (!bytes || !durationMs) return '—';
  return `${(bytes * 1000 / durationMs / 1024).toFixed(1)} KB/s`;
}

function measureStage(stages, label, description, operation) {
  const startedAt = performance.now();
  const result = operation();
  stages.push({ label, description, duration: performance.now() - startedAt, detail: result?.detail || '' });
  return result?.value ?? result;
}

async function measureAsyncStage(stages, label, description, operation) {
  const startedAt = performance.now();
  const result = await operation();
  stages.push({ label, description, duration: performance.now() - startedAt, detail: result?.detail || '' });
  return result?.value ?? result;
}

function decodeResponse(chunks = []) {
  const decoder = new TextDecoder();
  let text = '';
  chunks.forEach((chunk) => { text += decoder.decode(chunk, { stream: true }); });
  return `${text}${decoder.decode()}`;
}

function unwrapXmlPayload(text) {
  let document = new DOMParser().parseFromString(text, 'text/xml');
  const payload = document.documentElement?.textContent?.trim();
  if (!document.getElementsByTagName('datos').length && payload?.startsWith('<')) {
    document = new DOMParser().parseFromString(payload, 'text/xml');
  }
  return document;
}

function buildObraFacetIndex(obras) {
  const keys = ['region', 'estado', 'genero', 'subgenero', 'tipoObra', 'tipoDesarrollo', 'tipoProyecto', 'etapa', 'sector'];
  const values = Object.fromEntries(keys.map((key) => [key, new Set()]));
  obras.forEach((obra) => keys.forEach((key) => {
    if (obra?.[key]) values[key].add(String(obra[key]));
  }));
  return Object.values(values).reduce((total, set) => total + set.size, 0);
}

async function runInternalPipeline(serviceId, chunks) {
  const stages = [];
  const xmlText = measureStage(stages, 'Decodificación UTF-8', 'Convierte los bytes ya recibidos a texto XML utilizable.', () => {
    const value = decodeResponse(chunks);
    return { value, detail: `${formatNumber(value.length)} caracteres` };
  });

  if (serviceId === 'obras') {
    const obras = await measureAsyncStage(stages, 'Parseo XML + normalización (Web Worker)', 'Ejecuta el parser real de producción fuera del hilo principal.', async () => {
      const value = await parseObrasOffMainThread(xmlText);
      return { value, detail: `${formatNumber(value.length)} obras` };
    });
    const mapProjects = measureStage(stages, 'Proyección para mapa', 'Reduce el catálogo al contrato ligero del mapa y descarta coordenadas no válidas.', () => {
      const value = mapProjectsFromObras(obras);
      return { value, detail: `${formatNumber(value.length)} coordenadas válidas` };
    });
    measureStage(stages, 'Aplicación de filtros base', 'Recorre el catálogo con la misma función de filtrado usada por la interfaz.', () => {
      const value = filterObrasByFilters(obras, {});
      return { value, detail: `${formatNumber(value.length)} registros resultantes` };
    });
    measureStage(stages, 'Índice de opciones de filtros', 'Construye valores únicos para los filtros dinámicos.', () => ({ detail: `${formatNumber(buildObraFacetIndex(obras))} opciones únicas` }));
    measureStage(stages, 'Agregados del resumen superior', 'Calcula proyectos, inversión, superficie, estados y compañías únicas.', () => {
      const summary = obras.reduce((acc, obra) => {
        acc.inversion += Number(obra.inversion) || 0;
        acc.superficie += Number(obra.superficie) || 0;
        if (obra.estado) acc.estados.add(obra.estado);
        if (obra.compania) acc.companias.add(obra.compania);
        return acc;
      }, { inversion: 0, superficie: 0, estados: new Set(), companias: new Set() });
      return { detail: `${formatNumber(obras.length)} proyectos · ${summary.estados.size} estados · ${summary.companias.size} compañías` };
    });
    return { stages, records: obras.length, mapRecords: mapProjects.length };
  }

  if (serviceId === 'licitaciones') {
    const document = measureStage(stages, 'Parseo de documento XML', 'Convierte la respuesta ASMX a documento y resuelve XML embebido.', () => {
      const value = unwrapXmlPayload(xmlText);
      return { value, detail: `${formatNumber(value.getElementsByTagName('datos').length)} nodos <datos>` };
    });
    const licitaciones = measureStage(stages, 'Normalización de licitaciones', 'Transforma cada registro al contrato consumido por la tabla.', () => {
      const value = Array.from(document.getElementsByTagName('datos')).map(normalizeLicitacion);
      return { value, detail: `${formatNumber(value.length)} licitaciones` };
    });
    measureStage(stages, 'Índices de filtros de tabla', 'Calcula las opciones únicas de todos los filtros visibles.', () => {
      const optionCount = ['estado', 'region', 'estatus', 'tipo_de_procedimiento', 'orden_de_gobierno', 'fuente_del_registro']
        .reduce((total, key) => total + getUniqueOptions(licitaciones, key).length, 0);
      return { detail: `${formatNumber(optionCount)} opciones únicas` };
    });
    return { stages, records: licitaciones.length };
  }

  const relationships = measureStage(stages, 'Parseo de perfiles y contactos', 'Ejecuta el parser real de compañías, contactos y relaciones.', () => {
    const value = parseCompaniasXml(xmlText);
    return { value, detail: `${formatNumber(value.length)} relaciones proyecto–compañía` };
  });
  measureStage(stages, 'Índice de compañías y proyectos', 'Agrupa relaciones para consultas de perfiles y portafolios.', () => {
    const companyKeys = new Set();
    const projectKeys = new Set();
    relationships.forEach((item) => {
      if (item.company?.clave || item.company?.name) companyKeys.add(item.company.clave || item.company.name);
      if (item.projectKey) projectKeys.add(item.projectKey);
    });
    return { detail: `${formatNumber(companyKeys.size)} compañías · ${formatNumber(projectKeys.size)} proyectos` };
  });
  return { stages, records: relationships.length };
}

function findPercentEvent(events, totalBytes, percent) {
  const target = totalBytes * percent;
  return events.find((event) => event.cumulativeBytes >= target) || events.at(-1) || null;
}

function analyzeCompression(run) {
  const encodedBytes = Number(run.resourceTiming?.encodedBodySize) || 0;
  const decodedBytes = Number(run.resourceTiming?.decodedBodySize) || 0;
  const headerVisible = run.contentEncoding !== 'sin encabezado';
  if (headerVisible) {
    return {
      detected: true,
      label: `Sí · ${run.contentEncoding}`,
      note: encodedBytes && decodedBytes ? `${formatBytes(encodedBytes)} codificado → ${formatBytes(decodedBytes)} decodificado` : 'Content-Encoding expuesto por el navegador',
      summary: `detectada mediante Content-Encoding: ${run.contentEncoding}`,
    };
  }
  if (encodedBytes && decodedBytes) {
    const savings = 1 - (encodedBytes / decodedBytes);
    if (savings > 0.03) {
      return {
        detected: true,
        label: `${Math.round(savings * 100)}% menos bytes`,
        note: `${formatBytes(encodedBytes)} codificado → ${formatBytes(decodedBytes)} decodificado`,
        summary: `detectada por Resource Timing; ${formatBytes(encodedBytes)} codificados frente a ${formatBytes(decodedBytes)} decodificados`,
      };
    }
    return {
      detected: false,
      label: 'No detectada',
      note: `encodedBodySize y decodedBodySize: ${formatBytes(decodedBytes)}`,
      summary: `no detectada; encodedBodySize y decodedBodySize fueron iguales (${formatBytes(decodedBytes)})`,
    };
  }
  return {
    detected: null,
    label: 'No concluyente',
    note: 'Sin Content-Encoding ni tamaños accesibles en Resource Timing',
    summary: 'no concluyente porque el navegador no expuso Content-Encoding ni tamaños codificado/decodificado',
  };
}

function analyzeRun(run) {
  if (!run || run.running || run.error) return null;
  const events = run.chunkEvents || [];
  const afterHeadersMs = Math.max(0, run.completeMs - run.headersMs);
  const firstBodyGapMs = Math.max(0, run.firstByteMs - run.headersMs);
  const bodyTransferMs = Math.max(0, run.completeMs - run.firstByteMs);
  const longestGapEvent = events.reduce((largest, event) => (!largest || event.gapMs > largest.gapMs ? event : largest), null);
  const averageChunkBytes = events.length ? run.receivedBytes / events.length : 0;
  const p50 = findPercentEvent(events, run.receivedBytes, 0.5);
  const p90 = findPercentEvent(events, run.receivedBytes, 0.9);
  const compression = analyzeCompression(run);
  const headersFastButBodySlow = run.headersMs < 1000 && afterHeadersMs > 1000;
  let title = 'El body se entregó prácticamente junto con los headers';
  let explanation = `Después de disponer de los headers, el XML quedó completo en ${formatMs(afterHeadersMs)}.`;
  let tone = 'green';

  if (firstBodyGapMs > Math.max(250, bodyTransferMs * 1.5)) {
    title = 'Los headers llegaron antes, pero el body comenzó más tarde';
    explanation = `Fetch expuso los headers en ${formatMs(run.headersMs)}; el primer bloque del XML apareció ${formatMs(firstBodyGapMs)} después.`;
    tone = 'red';
  } else if (events.length > 1 && bodyTransferMs > 250) {
    title = 'El navegador recibió el XML de forma progresiva';
    explanation = `Se observaron ${formatNumber(events.length)} entregas del stream entre el primer y el último bloque durante ${formatMs(bodyTransferMs)}.`;
    tone = 'orange';
  } else if (afterHeadersMs > 250) {
    title = 'El body llegó en una ráfaga posterior a los headers';
    explanation = `Los headers estuvieron disponibles antes; JavaScript recibió ${formatBytes(run.receivedBytes)} en ${formatNumber(events.length)} bloque${events.length === 1 ? '' : 's'} después de ${formatMs(afterHeadersMs)}.`;
    tone = 'orange';
  }

  return {
    afterHeadersMs,
    firstBodyGapMs,
    bodyTransferMs,
    longestGapEvent,
    averageChunkBytes,
    p50,
    p90,
    compression,
    headersFastButBodySlow,
    title,
    explanation,
    tone,
  };
}

function buildEvidenceText(run, analysis) {
  if (!run || !analysis) return '';
  return [
    `Traza ${run.serviceLabel} — HTTP ${run.status}`,
    `Headers disponibles: ${formatMs(run.headersMs)} desde el inicio.`,
    `Primer bloque del body: ${formatMs(run.firstByteMs)} desde el inicio (${formatMs(analysis.firstBodyGapMs)} después de headers).`,
    `Body completo: ${formatMs(run.completeMs)} desde el inicio (${formatMs(analysis.afterHeadersMs)} después de headers).`,
    `Transferencia observada entre primer y último bloque: ${formatMs(analysis.bodyTransferMs)}.`,
    `Tamaño entregado a JavaScript: ${formatBytes(run.receivedBytes)} en ${formatNumber(run.chunkEvents?.length)} bloques.`,
    `50% recibido a los ${formatMs(analysis.p50?.receivedAtMs)}; 90% a los ${formatMs(analysis.p90?.receivedAtMs)}.`,
    `Compresión: ${analysis.compression.summary}.`,
    `Conclusión: ${analysis.title}. ${analysis.explanation}`,
  ].join('\n');
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function MetricRow({ label, value, description, detail, maxDuration }) {
  const percent = maxDuration ? Math.max(2, (value / maxDuration) * 100) : 0;
  return <Box p={{ base: 4, md: 5 }} borderBottom="1px solid #e8edf3">
    <Flex justify="space-between" gap={5} align="start">
      <Box minW={0}>
        <Text fontWeight="700" color="#152238">{label}</Text>
        <Text mt={1} color="#667085" fontSize="13px" lineHeight="1.55">{description}</Text>
        {detail && <Text mt={1.5} color="#344054" fontSize="12px" fontWeight="600">{detail}</Text>}
      </Box>
      <Text fontFamily="monospace" fontSize={{ base: '14px', md: '17px' }} fontWeight="800" whiteSpace="nowrap">{formatMs(value)}</Text>
    </Flex>
    {maxDuration > 0 && <Box mt={3} h="5px" borderRadius="full" bg="#eef1f5" overflow="hidden"><Box h="100%" w={`${percent}%`} borderRadius="full" bg="#e95b29" transition="width .35s ease" /></Box>}
  </Box>;
}

function StatCard({ eyebrow, value, note, tone = 'navy' }) {
  return <Box className={`lab-stat lab-stat--${tone}`}>
    <Text className="lab-stat__eyebrow">{eyebrow}</Text>
    <Text className="lab-stat__value">{value}</Text>
    <Text className="lab-stat__note">{note}</Text>
  </Box>;
}

function EmptyGuide() {
  const steps = [
    ['01', 'Petición enviada', 'Inicia el cronómetro antes de fetch().'],
    ['02', 'Headers disponibles', 'fetch() resuelve y ya conocemos HTTP y encabezados.'],
    ['03', 'Primer bloque XML', 'reader.read() entrega los primeros bytes a JavaScript.'],
    ['04', 'Último bloque XML', 'El stream termina y el body ya está completo.'],
    ['05', 'Frontend', 'Sólo entonces medimos parseo, filtros y agregados.'],
  ];
  return <Box className="lab-empty">
    <Flex align="center" gap={3}><Box className="lab-empty__icon"><FiActivity /></Box><Box><Text fontWeight="800" color="#162237">Lo que demostrará la siguiente medición</Text><Text color="#667085" fontSize="13px">Cinco marcas independientes; ninguna se infiere de otra.</Text></Box></Flex>
    <Box className="lab-guide-grid">{steps.map(([number, title, text]) => <Box key={number} className="lab-guide-step"><Text className="lab-guide-step__number">{number}</Text><Text fontWeight="700" fontSize="13px">{title}</Text><Text mt={1} color="#667085" fontSize="12px" lineHeight="1.5">{text}</Text></Box>)}</Box>
  </Box>;
}

function ArrivalTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return <Box className="lab-chart-tooltip"><Text fontWeight="800">{formatMs(label)} desde el inicio</Text><Text mt={1}>{point.percent.toFixed(1)}% · {formatBytes(point.cumulativeBytes)}</Text><Text mt={1} color="#667085">Bloque #{point.index || 0}</Text></Box>;
}

export default function MapPerformanceLab() {
  const [serviceId, setServiceId] = useState('obras');
  const [run, setRun] = useState(null);
  const [history, setHistory] = useState([]);
  const [showAllChunks, setShowAllChunks] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef(null);
  const service = WEB_SERVICE_PROBES.find((item) => item.id === serviceId) || WEB_SERVICE_PROBES[0];
  const analysis = useMemo(() => analyzeRun(run), [run]);
  const processingMax = Math.max(...(run?.processing?.stages || []).map((item) => item.duration), 0);
  const processingTotal = (run?.processing?.stages || []).reduce((total, item) => total + item.duration, 0);
  const traceChartData = useMemo(() => {
    if (!run?.chunkEvents?.length) return [];
    const points = [{ index: 0, timeMs: run.headersMs, cumulativeBytes: 0, percent: 0 }];
    run.chunkEvents.forEach((event) => points.push({
      ...event,
      timeMs: event.receivedAtMs,
      percent: run.receivedBytes ? (event.cumulativeBytes / run.receivedBytes) * 100 : 0,
    }));
    if (points.at(-1).timeMs < run.completeMs) points.push({ ...points.at(-1), timeMs: run.completeMs });
    return points;
  }, [run]);
  const visibleChunks = useMemo(() => {
    const events = run?.chunkEvents || [];
    if (showAllChunks || events.length <= 100) return events;
    return [...events.slice(0, 50), { separator: true, hidden: events.length - 100 }, ...events.slice(-50)];
  }, [run, showAllChunks]);

  function selectService(id) {
    if (run?.running) return;
    setServiceId(id);
    setRun(null);
    setCopied(false);
    setShowAllChunks(false);
  }

  async function executeProbe() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setCopied(false);
    setShowAllChunks(false);
    setRun({ running: true, phase: 'Esperando respuesta del servidor', receivedBytes: 0, elapsedMs: 0, chunkCount: 0 });
    try {
      const response = await probeWebService({
        method: service.method,
        signal: controller.signal,
        collectChunks: true,
        onProgress: (progress) => setRun((current) => current?.running ? { ...current, ...progress } : current),
      });
      setRun({ running: true, phase: response.ok ? 'Midiendo procesamiento local' : 'Cerrando traza HTTP', ...response, chunks: undefined });
      let processing = null;
      let processingError = '';
      let responsePreview = '';
      if (response.ok) {
        try {
          processing = await runInternalPipeline(service.id, response.chunks);
        } catch (error) {
          processingError = error?.message || 'El procesamiento local no pudo completarse.';
        }
      } else {
        responsePreview = decodeResponse(response.chunks).slice(0, 1600);
      }
      const completed = {
        running: false,
        ...response,
        chunks: undefined,
        serviceId: service.id,
        serviceLabel: service.label,
        processing,
        processingError,
        responsePreview,
      };
      setRun(completed);
      setHistory((current) => [completed, ...current].slice(0, 8));
    } catch (error) {
      if (error?.name === 'AbortError') {
        setRun((current) => ({ ...current, running: false, cancelled: true, error: 'La medición fue cancelada.' }));
        return;
      }
      setRun({ running: false, error: error?.message || 'No fue posible completar la prueba.' });
    } finally {
      abortRef.current = null;
    }
  }

  function exportJson() {
    const stamp = new Date(run.requestedAt).toISOString().replace(/[:.]/g, '-');
    downloadText(`traza-${run.serviceId}-${stamp}.json`, JSON.stringify(run, null, 2), 'application/json');
  }

  function exportCsv() {
    const rows = ['bloque,llegada_ms,pausa_ms,bytes,bytes_acumulados,porcentaje'];
    (run.chunkEvents || []).forEach((event) => rows.push([
      event.index,
      event.receivedAtMs.toFixed(3),
      event.gapMs.toFixed(3),
      event.bytes,
      event.cumulativeBytes,
      ((event.cumulativeBytes / Math.max(run.receivedBytes, 1)) * 100).toFixed(3),
    ].join(',')));
    downloadText(`bloques-${run.serviceId}.csv`, rows.join('\n'), 'text/csv;charset=utf-8');
  }

  async function copyEvidence() {
    await navigator.clipboard.writeText(buildEvidenceText(run, analysis));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const evidenceText = buildEvidenceText(run, analysis);
  const phaseSegments = analysis ? [
    { label: 'Espera hasta headers', value: run.headersMs, className: 'wait' },
    { label: 'Headers → primer bloque', value: analysis.firstBodyGapMs, className: 'gap' },
    { label: 'Transferencia del body', value: analysis.bodyTransferMs, className: 'transfer' },
    ...(run.processing ? [{ label: 'Procesamiento local', value: processingTotal, className: 'frontend' }] : []),
  ] : [];
  const phaseTotal = phaseSegments.reduce((total, segment) => total + segment.value, 0);

  return <Box minH="100vh" bg="#f4f6f9" color="#172033" px={{ base: 4, md: 8 }} py={{ base: 7, md: 10 }}>
    <Box maxW="1180px" mx="auto">
      <Box className="lab-hero">
        <Flex justify="space-between" align={{ base: 'start', lg: 'end' }} direction={{ base: 'column', lg: 'row' }} gap={6}>
          <Box maxW="790px">
            <Text className="lab-kicker">CONSTRULEADS · LABORATORIO DE RESPUESTA XML</Text>
            <Heading mt={2} fontSize={{ base: '28px', md: '42px' }} lineHeight="1.08" letterSpacing="-.035em">Traza forense del Web Service</Heading>
            <Text mt={4} color="#5e687b" maxW="760px" lineHeight="1.7">Observa exactamente cuándo aparecen los headers, cuándo JavaScript recibe el primer bloque y cómo se acumula el XML hasta quedar completo. El procesamiento del frontend se mide después y por separado.</Text>
          </Box>
          <Box className="lab-scope-note"><FiInfo /><Text><b>Alcance:</b> navegador → Web Service → navegador. No incluye render de pantallas.</Text></Box>
        </Flex>
      </Box>

      <Box className="lab-control-panel">
        <Flex justify="space-between" align={{ base: 'stretch', md: 'end' }} direction={{ base: 'column', md: 'row' }} gap={5}>
          <Box>
            <Text className="lab-control-label">WEB SERVICE A MEDIR</Text>
            <Flex mt={2.5} gap={2} flexWrap="wrap">{WEB_SERVICE_PROBES.map((item) => <Button key={item.id} size="sm" className={serviceId === item.id ? 'lab-service-button is-active' : 'lab-service-button'} aria-pressed={serviceId === item.id} onClick={() => selectService(item.id)}>{item.label}</Button>)}</Flex>
          </Box>
          <Flex gap={2} align="center" flexWrap="wrap">
            {run?.running && <Button variant="outline" colorPalette="red" onClick={() => abortRef.current?.abort()}><FiX /> Cancelar</Button>}
            <Button className="lab-primary-button" onClick={executeProbe} loading={run?.running}><FiActivity /> {run?.running ? 'Midiendo en vivo' : `Medir ${service.label}`}</Button>
          </Flex>
        </Flex>
        {run?.running && <Box className="lab-live-strip">
          <Box className="lab-live-dot" aria-hidden="true" />
          <Box flex="1"><Text fontWeight="700" fontSize="13px">{run.phase}</Text><Text color="#667085" fontSize="12px">La vista se actualiza con cada lectura del stream.</Text></Box>
          <Flex className="lab-live-numbers"><Text><b>{formatMs(run.elapsedMs)}</b><span>transcurridos</span></Text><Text><b>{formatBytes(run.receivedBytes)}</b><span>recibidos</span></Text><Text><b>{formatNumber(run.chunkCount)}</b><span>bloques</span></Text></Flex>
        </Box>}
      </Box>

      {!run && <EmptyGuide />}
      {run?.error && <Box className="lab-error"><FiAlertTriangle /><Box><Text fontWeight="800">{run.cancelled ? 'Medición cancelada' : 'No se pudo completar la traza'}</Text><Text mt={1} fontSize="13px">{run.error}</Text></Box></Box>}

      {analysis && <>
        <Box className={`lab-verdict lab-verdict--${analysis.tone}`}>
          <Flex justify="space-between" gap={5} align={{ base: 'start', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
            <Flex gap={3} align="start"><Box className="lab-verdict__icon">{analysis.tone === 'green' ? <FiCheckCircle /> : <FiAlertTriangle />}</Box><Box><Text className="lab-section-eyebrow">CONCLUSIÓN DE ESTA EJECUCIÓN</Text><Heading mt={1} fontSize={{ base: '19px', md: '24px' }} lineHeight="1.3">{analysis.title}</Heading><Text mt={2} maxW="800px" color="#526074" fontSize="14px" lineHeight="1.65">{analysis.explanation}</Text>{analysis.headersFastButBodySlow && <Text mt={2} fontWeight="800" color="#a43a18" fontSize="14px">Los headers fueron rápidos, pero el XML no estaba completo en ese momento: tardó {formatMs(analysis.afterHeadersMs)} adicionales.</Text>}<Text mt={2} className={analysis.compression.detected === false ? 'lab-compression-finding is-uncompressed' : 'lab-compression-finding'}><b>Compresión:</b> {analysis.compression.summary}.</Text></Box></Flex>
            <Badge colorPalette={run.ok ? 'green' : 'red'} size="lg" whiteSpace="nowrap">HTTP {run.status} {run.ok ? 'OK' : run.statusText}</Badge>
          </Flex>
        </Box>

        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={3} mt={5}>
          <StatCard eyebrow="1 · HEADERS DISPONIBLES" value={formatMs(run.headersMs)} note="fetch() resolvió" tone="navy" />
          <StatCard eyebrow="2 · PRIMER BLOQUE XML" value={formatMs(run.firstByteMs)} note={`${formatMs(analysis.firstBodyGapMs)} después de headers`} tone={analysis.firstBodyGapMs > 250 ? 'red' : 'navy'} />
          <StatCard eyebrow="3 · BODY COMPLETO" value={formatMs(run.completeMs)} note={`${formatMs(analysis.afterHeadersMs)} después de headers`} tone={analysis.afterHeadersMs > 1000 ? 'orange' : 'navy'} />
          <StatCard eyebrow="4 · PROCESAMIENTO LOCAL" value={run.processing ? formatMs(processingTotal) : 'No ejecutado'} note="comienza con el XML completo" tone="green" />
        </SimpleGrid>

        <Box className="lab-card" mt={5}>
          <Flex className="lab-card__header" justify="space-between" align={{ base: 'start', md: 'center' }} gap={3} direction={{ base: 'column', md: 'row' }}>
            <Box><Text className="lab-section-eyebrow">SECUENCIA CRONOLÓGICA</Text><Heading mt={1} fontSize="19px">Qué ocurrió entre el clic y los datos utilizables</Heading></Box>
            <Badge colorPalette="orange">Red y frontend separados</Badge>
          </Flex>
          <Box className="lab-phase-bar" aria-label="Duración relativa de cada fase">
            {phaseSegments.map((segment) => {
              const isCompact = segment.value / Math.max(phaseTotal, 1) < 0.065;
              return <Box key={segment.label} title={`${segment.label}: ${formatMs(segment.value)}`} className={`lab-phase lab-phase--${segment.className}${isCompact ? ' is-compact' : ''}`} style={{ flexGrow: Math.max(segment.value, 1) }}>{!isCompact && <><Text>{segment.label}</Text><b>{formatMs(segment.value)}</b></>}</Box>;
            })}
          </Box>
          <Box className="lab-phase-legend">{phaseSegments.map((segment) => <Flex key={segment.label} align="center" gap={2}><span className={`lab-phase-legend__dot lab-phase-legend__dot--${segment.className}`} /><Text><b>{segment.label}</b><small>{formatMs(segment.value)}</small></Text></Flex>)}</Box>
          <Box className="lab-milestones">
            {[
              ['0 ms', 'Petición enviada'],
              [formatMs(run.headersMs), 'Headers disponibles'],
              [formatMs(run.firstByteMs), 'Primer bloque XML'],
              [formatMs(run.completeMs), 'Body completo'],
              [run.processing ? formatMs(run.completeMs + processingTotal) : '—', 'Datos procesados'],
            ].map(([time, label], index) => <Box className="lab-milestone" key={label}><Box className="lab-milestone__dot">{index + 1}</Box><Text fontFamily="monospace" fontWeight="800">{time}</Text><Text color="#667085" fontSize="12px">{label}</Text></Box>)}
          </Box>
        </Box>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5} mt={5}>
          <Box className="lab-card">
            <Box className="lab-card__header"><Text className="lab-section-eyebrow">HUELLA DE LA DESCARGA</Text><Heading mt={1} fontSize="19px">Acumulación del XML en el tiempo</Heading><Text mt={2} color="#667085" fontSize="12px">Cada cambio de la curva es una entrega observada por <code>reader.read()</code>.</Text></Box>
            <Box className="lab-chart" role="img" aria-label="Porcentaje acumulado del XML recibido a través del tiempo">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={traceChartData} margin={{ top: 12, right: 16, left: -10, bottom: 6 }}>
                  <CartesianGrid stroke="#e9edf2" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="timeMs" type="number" domain={[0, Math.ceil(run.completeMs)]} tickFormatter={(value) => `${Math.round(value)} ms`} tick={{ fontSize: 11, fill: '#667085' }} axisLine={{ stroke: '#cfd6df' }} />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ArrivalTooltip />} />
                  <ReferenceLine x={run.headersMs} stroke="#253858" strokeDasharray="4 4" label={{ value: 'headers', fill: '#253858', fontSize: 10, position: 'insideTopRight' }} />
                  <Area type="stepAfter" dataKey="percent" stroke="#e85d24" strokeWidth={2.5} fill="#f6c3ad" fillOpacity={0.52} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Box>

          <Box className="lab-card">
            <Box className="lab-card__header"><Text className="lab-section-eyebrow">ESTADÍSTICAS DEL STREAM</Text><Heading mt={1} fontSize="19px">Cómo fue entregado el body</Heading></Box>
            <Box className="lab-stream-stats">
              {[
                ['Tamaño observado', formatBytes(run.receivedBytes), 'Bytes entregados a JavaScript'],
                ['Bloques observados', formatNumber(run.chunkEvents.length), 'No equivalen necesariamente a paquetes TCP'],
                ['Tamaño promedio', formatBytes(analysis.averageChunkBytes), 'Promedio por reader.read()'],
                ['Pausa más larga', formatMs(analysis.longestGapEvent?.gapMs), `Antes del bloque #${analysis.longestGapEvent?.index || '—'}`],
                ['50% del XML', formatMs(analysis.p50?.receivedAtMs), 'Tiempo desde el inicio'],
                ['90% del XML', formatMs(analysis.p90?.receivedAtMs), 'Tiempo desde el inicio'],
                ['Promedio desde headers', formatRate(run.receivedBytes, analysis.afterHeadersMs), 'Tasa efectiva observada'],
                ['Compresión observable', analysis.compression.label, analysis.compression.note],
              ].map(([label, value, note]) => <Box className="lab-stream-stat" key={label}><Text>{label}</Text><b>{value}</b><span>{note}</span></Box>)}
            </Box>
          </Box>
        </SimpleGrid>

        <Box className="lab-card" mt={5}>
          <Flex className="lab-card__header" justify="space-between" align={{ base: 'start', md: 'center' }} gap={4} direction={{ base: 'column', md: 'row' }}>
            <Box><Text className="lab-section-eyebrow">TRAZA BLOQUE POR BLOQUE</Text><Heading mt={1} fontSize="19px">Cada entrega del ReadableStream</Heading><Text mt={2} color="#667085" fontSize="12px">Una pausa grande señala tiempo sin nuevos bytes disponibles para JavaScript.</Text></Box>
            <Flex gap={2} flexWrap="wrap"><Button size="sm" variant="outline" onClick={exportCsv}><FiDownload /> CSV de bloques</Button><Button size="sm" variant="outline" onClick={exportJson}><FiDownload /> Traza JSON</Button></Flex>
          </Flex>
          <Box overflowX="auto">
            <table className="lab-table">
              <thead><tr><th>Bloque</th><th>Llegó a los</th><th>Pausa anterior</th><th>Tamaño</th><th>Acumulado</th><th>Respuesta recibida</th></tr></thead>
              <tbody>{visibleChunks.map((event, index) => event.separator ? <tr key={`separator-${index}`} className="lab-table__separator"><td colSpan="6">… {formatNumber(event.hidden)} bloques intermedios ocultos …</td></tr> : <tr key={event.index} className={event.gapMs === analysis.longestGapEvent?.gapMs ? 'is-longest-gap' : ''}><td>#{event.index}</td><td>{formatMs(event.receivedAtMs)}</td><td>{formatMs(event.gapMs)}{event.gapMs === analysis.longestGapEvent?.gapMs && <span className="lab-longest-label">mayor pausa</span>}</td><td>{formatBytes(event.bytes)}</td><td>{formatBytes(event.cumulativeBytes)}</td><td><Box className="lab-percent-cell"><Box><Box style={{ width: `${(event.cumulativeBytes / Math.max(run.receivedBytes, 1)) * 100}%` }} /></Box><span>{((event.cumulativeBytes / Math.max(run.receivedBytes, 1)) * 100).toFixed(1)}%</span></Box></td></tr>)}</tbody>
            </table>
          </Box>
          {run.chunkEvents.length > 100 && <Box p={4} borderTop="1px solid #e9edf2" textAlign="center"><Button size="sm" variant="ghost" onClick={() => setShowAllChunks((value) => !value)}>{showAllChunks ? 'Mostrar resumen' : `Mostrar los ${formatNumber(run.chunkEvents.length)} bloques`}</Button></Box>}
        </Box>

        {run.processing && <Box className="lab-card" mt={5}>
          <Flex className="lab-card__header" justify="space-between" align="center" gap={3}><Box><Text className="lab-section-eyebrow">DESPUÉS DE LA RED</Text><Heading mt={1} fontSize="19px">Procesamiento local real</Heading><Text mt={2} fontSize="12px" color="#667085">Empieza únicamente después de que todos los bytes del XML llegaron.</Text></Box><Badge colorPalette="green">Total {formatMs(processingTotal)}</Badge></Flex>
          {run.processing.stages.map((stage) => <MetricRow key={stage.label} label={stage.label} value={stage.duration} description={stage.description} detail={stage.detail} maxDuration={processingMax} />)}
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={3} p={4} bg="#f8fafc"><StatCard eyebrow="REGISTROS" value={formatNumber(run.processing.records)} note="procesados por el frontend" /><StatCard eyebrow="RED + FRONTEND" value={formatMs(run.completeMs + processingTotal)} note="tiempo total medido" /><StatCard eyebrow="FASE DOMINANTE" value={run.completeMs >= processingTotal * 3 ? 'Red / servidor' : 'Procesamiento local'} note="comparación de tiempos" tone={run.completeMs >= processingTotal * 3 ? 'orange' : 'green'} /></SimpleGrid>
        </Box>}

        {run.processingError && <Box className="lab-warning" mt={5}><FiAlertTriangle /><Box><Text fontWeight="800">La red sí terminó; falló el procesamiento local</Text><Text mt={1} fontSize="13px">{run.processingError}</Text></Box></Box>}

        {!run.ok && <Box className="lab-warning" mt={5}><FiAlertTriangle /><Box width="100%"><Text fontWeight="800">El servidor respondió HTTP {run.status}</Text><Text mt={1} fontSize="13px">La traza de red se conserva para poder comparar esta ejecución fallida contra una exitosa.</Text>{run.responsePreview && <pre className="lab-response-preview">{run.responsePreview}</pre>}</Box></Box>}

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5} mt={5}>
          <Box className="lab-card">
            <Box className="lab-card__header"><Text className="lab-section-eyebrow">METADATOS HTTP</Text><Heading mt={1} fontSize="19px">Lo que el navegador pudo observar</Heading></Box>
            <Box className="lab-metadata">
              {[
                ['Fecha local', new Date(run.requestedAt).toLocaleString('es-MX')],
                ['HTTP', `${run.status} ${run.statusText || ''}`.trim()],
                ['Content-Type', run.contentType],
                ['Content-Length', run.contentLength ? `${run.contentLength} B` : 'no informado'],
                ['Content-Encoding', run.contentEncoding],
                ['Transfer-Encoding', run.transferEncoding],
                ['Protocolo observado', run.resourceTiming?.nextHopProtocol || 'no disponible'],
                ['Resource Timing transferSize', run.resourceTiming?.transferSize ? formatBytes(run.resourceTiming.transferSize) : 'no disponible / restringido'],
                ['encodedBodySize', run.resourceTiming?.encodedBodySize ? formatBytes(run.resourceTiming.encodedBodySize) : 'no disponible / restringido'],
                ['decodedBodySize', run.resourceTiming?.decodedBodySize ? formatBytes(run.resourceTiming.decodedBodySize) : 'no disponible / restringido'],
              ].map(([label, value]) => <Flex key={label} className="lab-metadata__row"><Text>{label}</Text><Text>{value}</Text></Flex>)}
            </Box>
            <details className="lab-details"><summary>Ver todos los response headers expuestos</summary><Box mt={3}>{Object.entries(run.responseHeaders || {}).map(([key, value]) => <Flex key={key} className="lab-header-row"><code>{key}</code><span>{value}</span></Flex>)}</Box></details>
          </Box>

          <Box className="lab-card lab-evidence-card">
            <Box className="lab-card__header"><Flex gap={2} align="center"><FiFileText /><Text className="lab-section-eyebrow">RESUMEN PARA COMPARTIR</Text></Flex><Heading mt={1} fontSize="19px">Evidencia en lenguaje directo</Heading></Box>
            <pre>{evidenceText}</pre>
            <Box p={4} pt={0}><Button className="lab-copy-button" onClick={copyEvidence}><FiCopy /> {copied ? 'Copiado' : 'Copiar conclusión'}</Button></Box>
          </Box>
        </SimpleGrid>

        <Box className="lab-method-note" mt={5}><FiInfo /><Text><b>Lectura correcta de esta prueba:</b> <code>fetch()</code> resuelve cuando los headers están disponibles; eso no garantiza que el body ya esté completo. Los bloques son entregas del stream observadas por el navegador, no paquetes TCP ni llamadas directas al query. Un proxy, el servidor web, HTTP/2 y el propio navegador pueden agrupar bytes. El stream entrega bytes ya descomprimidos; por eso la evidencia de compresión combina <code>Content-Encoding</code> con <code>encodedBodySize</code> y <code>decodedBodySize</code>. Para atribuir cada pausa al query o a la red se necesita correlacionar esta traza con logs del servidor usando la misma hora o un identificador de petición.</Text></Box>
      </>}

      {history.length > 0 && <Box className="lab-card" mt={5} mb={8}>
        <Flex className="lab-card__header" justify="space-between" align="center"><Box><Text className="lab-section-eyebrow">COMPARACIÓN EN ESTA SESIÓN</Text><Heading mt={1} fontSize="19px">Ejecuciones recientes</Heading><Text mt={2} color="#667085" fontSize="12px">Útil para contrastar el query con error, el query completo y una respuesta reducida.</Text></Box><Button size="sm" variant="ghost" onClick={() => setHistory([])}>Limpiar</Button></Flex>
        <Box overflowX="auto"><table className="lab-table lab-history-table"><thead><tr><th>Hora</th><th>Servicio</th><th>HTTP</th><th>Headers</th><th>Después de headers</th><th>Total</th><th>Tamaño</th><th>Bloques</th></tr></thead><tbody>{history.map((item) => <tr key={item.requestedAt}><td>{new Date(item.requestedAt).toLocaleTimeString('es-MX')}</td><td>{item.serviceLabel}</td><td><span className={item.ok ? 'lab-http lab-http--ok' : 'lab-http lab-http--error'}>{item.status}</span></td><td>{formatMs(item.headersMs)}</td><td>{formatMs(item.completeMs - item.headersMs)}</td><td>{formatMs(item.completeMs)}</td><td>{formatBytes(item.receivedBytes)}</td><td>{formatNumber(item.chunkEvents?.length)}</td></tr>)}</tbody></table></Box>
      </Box>}
    </Box>
  </Box>;
}
