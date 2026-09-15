import { useMemo, useRef, useState } from 'react';
import { Badge, Box, Button, Flex, Heading, SimpleGrid, Text } from '@chakra-ui/react';
import { probeWebService, WEB_SERVICE_PROBES } from '../../api/webServiceProbe';
import { parseObrasOffMainThread } from '../../utils/parseObrasOffMainThread';
import { mapProjectsFromObras } from '../../utils/mapProjects';
import { filterObrasByFilters } from '../../utils/filterObras';
import { normalizeLicitacion, getUniqueOptions } from '../../features/licitaciones/licitacionesUtils';
import { parseCompaniasXml } from '../../api/companias';

const formatMs = (value) => `${Math.round(value || 0).toLocaleString('es-MX')} ms`;
const formatBytes = (value) => `${(Number(value || 0) / 1024 / 1024).toFixed(2)} MB`;
const formatNumber = (value) => Number(value || 0).toLocaleString('es-MX');

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
  const xmlText = measureStage(stages, 'Decodificación UTF-8', 'Convierte los bytes entregados por la red a texto XML utilizable.', () => {
    const value = decodeResponse(chunks);
    return { value, detail: `${formatNumber(value.length)} caracteres` };
  });

  if (serviceId === 'obras') {
    const obras = await measureAsyncStage(stages, 'Parseo XML + normalización (Web Worker)', 'Mismo parser de producción: extrae <datos>, limpia campos, convierte fechas/números y regresa registros al hilo principal.', async () => {
      const value = await parseObrasOffMainThread(xmlText);
      return { value, detail: `${formatNumber(value.length)} obras` };
    });
    const mapProjects = measureStage(stages, 'Proyección para mapa', 'Reduce el catálogo al contrato ligero del mapa y descarta registros sin coordenadas válidas.', () => {
      const value = mapProjectsFromObras(obras);
      return { value, detail: `${formatNumber(value.length)} coordenadas válidas` };
    });
    measureStage(stages, 'Aplicación de filtros base', 'Ejecuta la misma función de filtrado, sin filtros activos, para medir el recorrido inicial del catálogo.', () => {
      const value = filterObrasByFilters(obras, {});
      return { value, detail: `${formatNumber(value.length)} registros resultantes` };
    });
    measureStage(stages, 'Índice de opciones de filtros', 'Construye valores únicos para región, estado, categoría, etapa, sector y demás filtros dinámicos.', () => ({ detail: `${formatNumber(buildObraFacetIndex(obras))} opciones únicas` }));
    measureStage(stages, 'Agregados del resumen superior', 'Calcula contador de proyectos, inversión, superficie, estados y compañías únicas.', () => {
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
    const document = measureStage(stages, 'Parseo de documento XML', 'Convierte la respuesta ASMX a un documento y resuelve un XML embebido si existe.', () => {
      const value = unwrapXmlPayload(xmlText);
      return { value, detail: `${formatNumber(value.getElementsByTagName('datos').length)} nodos <datos>` };
    });
    const licitaciones = measureStage(stages, 'Normalización de licitaciones', 'Transforma cada registro al contrato que consume la tabla: fechas, monto, proveedor y campos de búsqueda.', () => {
      const value = Array.from(document.getElementsByTagName('datos')).map(normalizeLicitacion);
      return { value, detail: `${formatNumber(value.length)} licitaciones` };
    });
    measureStage(stages, 'Índices de filtros de tabla', 'Calcula opciones únicas que alimentan los filtros de fecha, estado, procedimiento y fuente.', () => {
      const optionCount = ['estado', 'region', 'estatus', 'tipo_de_procedimiento', 'orden_de_gobierno', 'fuente_del_registro']
        .reduce((total, key) => total + getUniqueOptions(licitaciones, key).length, 0);
      return { detail: `${formatNumber(optionCount)} opciones únicas` };
    });
    return { stages, records: licitaciones.length };
  }

  const relationships = measureStage(stages, 'Parseo de perfiles y contactos', 'Ejecuta el parser de producción de compañías: proyectos, empresas, contactos y relaciones.', () => {
    const value = parseCompaniasXml(xmlText);
    return { value, detail: `${formatNumber(value.length)} relaciones proyecto–compañía` };
  });
  measureStage(stages, 'Índice de compañías y proyectos', 'Agrupa relaciones para las consultas de perfiles y portafolios de la interfaz.', () => {
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

function MetricRow({ label, value, description, detail, maxDuration }) {
  const percent = maxDuration ? Math.max(4, (value / maxDuration) * 100) : 0;
  return <Box p={{ base: 4, md: 5 }} borderBottom="1px solid #edf0f3">
    <Flex justify="space-between" gap={5} align="start">
      <Box minW={0}><Text fontWeight="800">{label}</Text><Text mt={1} color="#667085" fontSize="13px">{description}</Text>{detail && <Text mt={1.5} color="#344054" fontSize="12px" fontWeight="600">{detail}</Text>}</Box>
      <Text fontFamily="mono" fontSize={{ base: '14px', md: '17px' }} fontWeight="800" whiteSpace="nowrap">{formatMs(value)}</Text>
    </Flex>
    {maxDuration > 0 && <Box mt={3} h="5px" borderRadius="full" bg="#eef1f5" overflow="hidden"><Box h="100%" w={`${percent}%`} borderRadius="full" bg="#e95b29" transition="width .35s ease" /></Box>}
  </Box>;
}

export default function MapPerformanceLab() {
  const [serviceId, setServiceId] = useState('obras');
  const [run, setRun] = useState(null);
  const abortRef = useRef(null);
  const service = WEB_SERVICE_PROBES.find((item) => item.id === serviceId) || WEB_SERVICE_PROBES[0];
  const networkRows = useMemo(() => {
    if (!run || run.running || run.error) return [];
    return [['Respuesta inicial (headers)', run.headersMs, 'El servidor aceptó la petición y empezó la respuesta.'], ['Primer byte recibido', run.firstByteMs, 'El primer dato que llegó al navegador.'], ['Respuesta completa', run.completeMs, `Bytes disponibles para procesar: ${formatBytes(run.receivedBytes)}.`]];
  }, [run]);
  const processingMax = Math.max(...(run?.processing?.stages || []).map((item) => item.duration), 0);
  const processingTotal = (run?.processing?.stages || []).reduce((total, item) => total + item.duration, 0);

  async function executeProbe() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRun({ running: true, phase: 'Descargando respuesta', receivedBytes: 0, elapsedMs: 0 });
    try {
      const response = await probeWebService({ method: service.method, signal: controller.signal, collectChunks: true, onProgress: (progress) => setRun((current) => current?.running ? { ...current, ...progress } : current) });
      setRun({ running: true, phase: 'Midiendo procesamiento interno', ...response, chunks: undefined });
      const processing = await runInternalPipeline(service.id, response.chunks);
      setRun({ running: false, ...response, chunks: undefined, processing });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setRun({ running: false, error: error?.message || 'No fue posible completar la prueba.' });
    }
  }

  return <Box minH="100vh" bg="#f7f8fa" color="#172033" p={{ base: 5, md: 10 }}><Box maxW="920px" mx="auto">
    <Text fontSize="12px" fontWeight="800" color="#d95b27" letterSpacing=".08em">CONSTRULEADS · LABORATORIO DE PIPELINE</Text><Heading mt={2} fontSize={{ base: '26px', md: '36px' }}>Comparador de Web Services</Heading><Text mt={3} color="#586174" maxW="800px">Mide red y procesamiento local por separado. Descarga la respuesta una sola vez y ejecuta los mismos pasos internos que usa cada módulo, sin montar su interfaz visual.</Text>
    <Flex mt={7} gap={2} flexWrap="wrap">{WEB_SERVICE_PROBES.map((item) => <Button key={item.id} size="sm" variant={serviceId === item.id ? 'solid' : 'outline'} colorPalette="orange" onClick={() => setServiceId(item.id)}>{item.label}</Button>)}</Flex><Flex mt={3} gap={3} align="center" flexWrap="wrap"><Button colorPalette="orange" onClick={executeProbe} loading={run?.running}>{run?.running ? `${run.phase}…` : `Medir ${service.label}`}</Button>{run?.running && <Text fontSize="14px">{formatBytes(run.receivedBytes)} recibidos · {formatMs(run.elapsedMs)}</Text>}</Flex>
    {run?.error && <Box mt={6} p={4} borderRadius="10px" bg="#fff0ed" color="#9b2c16">{run.error}</Box>}
    {networkRows.length > 0 && <Box mt={7} bg="white" border="1px solid #e3e6eb" borderRadius="12px" overflow="hidden"><Flex p={4} bg="#fbfcfe" justify="space-between"><Text fontWeight="800">1. Red / servidor</Text><Badge colorPalette="orange">No incluye frontend</Badge></Flex>{networkRows.map(([label, value, description]) => <MetricRow key={label} label={label} value={value} description={description} maxDuration={run.completeMs} />)}</Box>}
    {run?.processing && <><Box mt={6} bg="white" border="1px solid #e3e6eb" borderRadius="12px" overflow="hidden"><Flex p={4} bg="#fbfcfe" justify="space-between" align="center" gap={3}><Box><Text fontWeight="800">2. Procesamiento local</Text><Text fontSize="12px" color="#667085" mt={1}>Después de que todos los bytes llegaron al navegador.</Text></Box><Badge colorPalette="green">{formatMs(processingTotal)}</Badge></Flex>{run.processing.stages.map((stage) => <MetricRow key={stage.label} label={stage.label} value={stage.duration} description={stage.description} detail={stage.detail} maxDuration={processingMax} />)}</Box><SimpleGrid columns={{ base: 1, md: 3 }} gap={3} mt={5}><Box p={4} borderRadius="10px" bg="white" border="1px solid #e3e6eb"><Text fontSize="11px" color="#667085">REGISTROS PROCESADOS</Text><Text mt={1} fontWeight="800" fontSize="22px">{formatNumber(run.processing.records)}</Text></Box><Box p={4} borderRadius="10px" bg="white" border="1px solid #e3e6eb"><Text fontSize="11px" color="#667085">TOTAL RED + FRONTEND</Text><Text mt={1} fontWeight="800" fontSize="22px">{formatMs(run.completeMs + processingTotal)}</Text></Box><Box p={4} borderRadius="10px" bg="white" border="1px solid #e3e6eb"><Text fontSize="11px" color="#667085">CONCLUSIÓN</Text><Text mt={1} fontWeight="700" fontSize="13px">{run.completeMs >= processingTotal * 3 ? 'Predomina red / servidor' : 'Procesamiento local relevante'}</Text></Box></SimpleGrid></>}
    {run && !run.running && !run.error && <Box mt={5} p={4} bg="white" border="1px solid #e3e6eb" borderRadius="12px" fontSize="14px"><Text><b>HTTP:</b> {run.status} · <b>Tipo:</b> {run.contentType}</Text><Text mt={1}><b>Compresión:</b> {run.contentEncoding} · <b>Content-Length:</b> {run.contentLength || 'no enviado (chunked)'}</Text><Text mt={1}><b>Velocidad observada:</b> {(run.receivedBytes * 1000 / Math.max(run.completeMs - run.firstByteMs, 1) / 1024).toFixed(1)} KB/s</Text><Text mt={2} fontSize="12px" color="#667085">Los bytes se miden al llegar a JavaScript; el navegador puede descomprimir HTTP automáticamente antes de entregar el stream.</Text></Box>}
  </Box></Box>;
}
