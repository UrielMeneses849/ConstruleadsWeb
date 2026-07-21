export function parseObrasXml(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const items = xml.getElementsByTagName('datos');

  const normalizeText = (value = '') =>
    String(value)
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const normalizeTagName = (value = '') => normalizeText(value).toLowerCase();

  const normalizeEstado = (value = '') => {
    const normalized = normalizeText(value);
    const comparable = normalized.toLowerCase();

    if (comparable === 'edo. de mexico' || comparable === 'edo de mexico') {
      return 'Estado de Mexico';
    }

    return normalized;
  };

  const normalizeDate = (value = '') => String(value).trim();

  const parseNumber = (value = 0) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

    const normalized = String(value)
      .trim()
      .replace(/,/g, '')
      .replace(/[^0-9.-]/g, '');

    if (!normalized) return 0;

    const numberValue = Number(normalized);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const parseDateValue = (value = '') => {
    const normalized = String(value).trim();
    if (!normalized) return null;

    const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const localMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (localMatch) {
      const [, day, month, year] = localMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const getFirstText = (item, tag) => {
    const exactTags = Array.isArray(tag) ? tag : [tag];
    const wantedTags = exactTags.map((entry) => normalizeTagName(entry));

    for (let index = 0; index < exactTags.length; index += 1) {
      const exactMatches = item.getElementsByTagName?.(exactTags[index]) || [];
      for (let exactIndex = 0; exactIndex < exactMatches.length; exactIndex += 1) {
        const node = exactMatches[exactIndex];
        if (node?.textContent?.trim()) {
          return node.textContent.trim();
        }
      }
    }

    const childNodes = item.getElementsByTagName('*');
    for (let index = 0; index < childNodes.length; index += 1) {
      const node = childNodes[index];
      const nodeName = normalizeTagName(node.localName || node.nodeName);

      if (wantedTags.includes(nodeName) && node.textContent?.trim()) {
        return node.textContent.trim();
      }
    }

    return '';
  };

  const getText = (item, tags) => {
    for (let index = 0; index < tags.length; index += 1) {
      const value = getFirstText(item, tags[index]);
      if (value) return value;
    }

    return '';
  };

  const obras = new Array(items.length);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    const clave = getFirstText(item, 'Clave_Proyecto');
    const proyectoRaw = getFirstText(item, 'Proyecto');
    const regionRaw = getFirstText(item, 'Region');
    const estadoRaw = getFirstText(item, 'Estado_Proyecto');
    const generoRaw = getFirstText(item, 'Genero');
    const subgeneroRaw = getFirstText(item, 'Subgenero');
    const tipoObraRaw = getFirstText(item, 'Tipo_Obra');
    const tipoDesarrolloRaw = getFirstText(item, 'Tipo_Desarrollo');
    const tipoProyectoRaw = getFirstText(item, 'Tipo_Proyecto');
    const etapaRaw = getFirstText(item, 'Etapa');
    const sectorRaw = getFirstText(item, 'Sector');
    const inversionRaw = getFirstText(item, 'Inversion');
    const superficieRaw = getFirstText(item, 'Sup_Construida');
    const latRaw = getFirstText(item, 'proy_ubicacionlatitud');
    const lngRaw = getFirstText(item, 'proy_ubicacionlongitud');
    const localizacion = getFirstText(item, 'Localizacion1');
    const descripcion = getFirstText(item, 'Descripcion');
    const compania = getFirstText(item, 'Compania');

    const fechaPublicacion = getText(item, [
      'Fecha_publicacion',
      'Fecha_Publicacion',
      'FECHA_PUBLICACION',
      'Fecha_Publicación',
    ]);
    const fechaInicio = getText(item, [
      'Fecha_Inicio',
      'FECHA_INICIO',
      'Fecha_inicio',
    ]);
    const fechaTermino = getText(item, [
      'Fecha_Terminacion',
      'Fecha_Termino',
      'Fecha_Terminación',
      'Fecha_Término',
      'FECHA_TERMINACION',
      'FECHA_TERMINO',
      'FECHA_TERMINACIÓN',
      'FECHA_TÉRMINO',
      'fecha_terminacion',
      'fecha_termino',
      'FechaTerminacion',
      'FechaTermino',
      'Fecha_Fin',
      'FECHA_FIN',
      'fecha_fin',
    ]);

    const inversion = parseNumber(inversionRaw);
    const superficie = parseNumber(superficieRaw);
    const lat = parseNumber(latRaw);
    const lng = parseNumber(lngRaw);
    const fechaPublicacionDate = parseDateValue(fechaPublicacion);
    const fechaInicioDate = parseDateValue(fechaInicio);
    const fechaTerminoDate = parseDateValue(fechaTermino);

    obras[index] = {
      id: clave || `${lat}-${lng}-${index}`,
      clave,
      proyecto: normalizeText(proyectoRaw),
      region: normalizeText(regionRaw),
      estado: normalizeEstado(estadoRaw),
      genero: normalizeText(generoRaw),
      subgenero: normalizeText(subgeneroRaw),
      tipoObra: normalizeText(tipoObraRaw),
      tipoDesarrollo: normalizeText(tipoDesarrolloRaw),
      tipoProyecto: normalizeText(tipoProyectoRaw),
      etapa: normalizeText(etapaRaw),
      sector: normalizeText(sectorRaw),
      inversion,
      superficie,
      fechaPublicacion: normalizeDate(fechaPublicacion),
      fechaInicio: normalizeDate(fechaInicio),
      fechaTermino: normalizeDate(fechaTermino),
      fechaTerminacion: normalizeDate(fechaTermino),
      fechaFin: normalizeDate(fechaTermino),
      fechaPublicacionDate,
      fechaInicioDate,
      fechaTerminoDate,
      fechaTerminacionDate: fechaTerminoDate,
      fechaFinDate: fechaTerminoDate,
      fechaPublicacionTime: fechaPublicacionDate?.getTime() || null,
      fechaInicioTime: fechaInicioDate?.getTime() || null,
      fechaTerminoTime: fechaTerminoDate?.getTime() || null,
      fechaTerminacionTime: fechaTerminoDate?.getTime() || null,
      fechaFinTime: fechaTerminoDate?.getTime() || null,
      lat,
      lng,
      hasValidCoordinates:
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat !== 0 &&
        lng !== 0,
      localizacion,
      descripcion,
      compania,
    };
  }

  if (import.meta.env.DEV) {
    const firstWithTermination = obras.find((obra) => obra.fechaTermino);
    console.log('[parseObrasXml] Fecha de terminación parseada:', {
      totalObras: obras.length,
      obrasConFechaTermino: obras.filter((obra) => Boolean(obra.fechaTermino)).length,
      ejemplo: firstWithTermination
        ? {
            clave: firstWithTermination.clave,
            fechaTermino: firstWithTermination.fechaTermino,
            fechaTerminoTime: firstWithTermination.fechaTerminoTime,
          }
        : null,
    });
  }

  return obras;
}
