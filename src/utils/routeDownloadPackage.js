import {
  buildObrasKeys,
  downloadBlob,
  iniciarDescargaReporte,
  registrarDescargaRuta,
  solicitarReporte,
} from '../api/reportes.js';
import { getObraSource, OBRA_SOURCES } from './obrasSources.js';

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

export async function downloadRoutePackage({
  obras = [],
  userId,
  sessionId,
  logoBuffer,
  signal,
  onStage,
}) {
  const obrasKeys = buildObrasKeys(obras);
  if (!obrasKeys) throw new Error('Las obras seleccionadas no tienen una clave válida.');
  if (!userId || !sessionId) throw new Error('La sesión del usuario no está disponible.');

  onStage?.('Preparando Excel de ruta…');
  const { createProspectingWorkbookBlob } = await import('./prospectingWorkbook.js');
  const workbookBlob = await createProspectingWorkbookBlob({ obras, logoBuffer });

  onStage?.('Generando fichas técnicas…');
  const sourceGroups = [OBRA_SOURCES.CONSTRULEADS, OBRA_SOURCES.EXPLORER]
    .map((source) => ({
      source,
      obrasKeys: buildObrasKeys(obras.filter((obra) => getObraSource(obra?.source || obra) === source)),
    }))
    .filter(({ obrasKeys: groupKeys }) => Boolean(groupKeys));
  const reportResponses = await Promise.all(sourceGroups.map(({ source, obrasKeys: groupKeys }) =>
    solicitarReporte({
      reportType: source === OBRA_SOURCES.EXPLORER ? 'pdf_explorer' : 'pdf_obras',
      userId,
      sessionId,
      obrasKeys: groupKeys,
      signal,
    })
  ));

  onStage?.('Registrando descarga de ruta…');
  await registrarDescargaRuta({
    userId,
    sessionId,
    obrasKeys,
    signal,
  });

  onStage?.('Descargando Excel…');
  downloadBlob(workbookBlob, `ruta-prospeccion-${dateStamp()}.xlsx`);
  onStage?.('Descargando fichas técnicas…');
  await iniciarDescargaReporte(
    reportResponses.map(({ fileUrl }) => fileUrl),
    `fichas-tecnicas-${obras.length}-obras`,
    undefined,
    signal,
  );
  return { mode: 'separate' };
}
