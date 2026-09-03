export const OBRA_SOURCES = Object.freeze({
  CONSTRULEADS: 'construleads',
  EXPLORER: 'explorer',
});

export const OBRA_SOURCE_META = Object.freeze({
  [OBRA_SOURCES.CONSTRULEADS]: Object.freeze({
    label: 'Construleads',
    color: '#D95B27',
    selectedColor: '#B9471E',
  }),
  [OBRA_SOURCES.EXPLORER]: Object.freeze({
    label: 'Explorer',
    color: '#484A4E',
    selectedColor: '#484A4E',
  }),
});

function normalizeSourceText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Los registros guardados antes de que el WS expusiera `Origen` pertenecen a
// la fuente histórica. Este valor por defecto mantiene la caché compatible.
export function getObraSource(obraOrOrigin) {
  const rawOrigin = obraOrOrigin && typeof obraOrOrigin === 'object'
    ? obraOrOrigin.origen ?? obraOrOrigin.Origen ?? obraOrOrigin.sourceOrigin
    : obraOrOrigin;

  return normalizeSourceText(rawOrigin) === OBRA_SOURCES.EXPLORER
    ? OBRA_SOURCES.EXPLORER
    : OBRA_SOURCES.CONSTRULEADS;
}

export function getObraSourceMeta(obraOrOrigin) {
  return OBRA_SOURCE_META[getObraSource(obraOrOrigin)];
}
