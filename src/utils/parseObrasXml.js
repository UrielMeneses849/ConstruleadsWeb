export function parseObrasXml(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');

  const normalizeText = (value = '') =>
    value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const normalizeDate = (value = '') =>
    value.trim();

  const parseDateValue = (value = '') => {
    const normalized = value.trim();
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

  const getText = (item, tags) => {
    for (const tag of tags) {
      const value = item.querySelector(tag)?.textContent?.trim();

      if (value) return value;
    }

    return '';
  };

  return Array.from(xml.getElementsByTagName('datos')).map(
    (item) => {
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
        'FECHA_TERMINACION',
        'FECHA_TERMINO',
        'Fecha_Término',
      ]);

      return ({
      clave:
        item.querySelector('Clave_Proyecto')?.textContent || '',

      proyecto: normalizeText(
        item.querySelector('Proyecto')?.textContent || ''
      ),

      region: normalizeText(
        item.querySelector('Region')?.textContent || ''
      ),

      estado: normalizeText(
        item.querySelector('Estado_Proyecto')?.textContent || ''
      ),

      genero: normalizeText(
        item.querySelector('Genero')?.textContent || ''
      ),

      subgenero: normalizeText(
        item.querySelector('Subgenero')?.textContent || ''
      ),

      tipoObra: normalizeText(
        item.querySelector('Tipo_Obra')?.textContent || ''
      ),

      tipoDesarrollo: normalizeText(
        item.querySelector('Tipo_Desarrollo')?.textContent || ''
      ),

      tipoProyecto: normalizeText(
        item.querySelector('Tipo_Proyecto')?.textContent || ''
      ),

      etapa: normalizeText(
        item.querySelector('Etapa')?.textContent || ''
      ),

      sector: normalizeText(
        item.querySelector('Sector')?.textContent || ''
      ),

      inversion: Number(
        item.querySelector('Inversion')?.textContent || 0
      ),

      superficie: Number(
        item.querySelector('Sup_Construida')?.textContent || 0
      ),

      fechaPublicacion: normalizeDate(
        fechaPublicacion
      ),

      fechaInicio: normalizeDate(
        fechaInicio
      ),

      fechaTermino: normalizeDate(
        fechaTermino
      ),

      fechaPublicacionDate: parseDateValue(fechaPublicacion),

      fechaInicioDate: parseDateValue(fechaInicio),

      fechaTerminoDate: parseDateValue(fechaTermino),

      lat: Number(
        item.querySelector('proy_ubicacionlatitud')?.textContent || 0
      ),

      lng: Number(
        item.querySelector('proy_ubicacionlongitud')?.textContent || 0
      ),

      localizacion:
        item.querySelector('Localizacion1')?.textContent || '',

      descripcion:
        item.querySelector('Descripcion')?.textContent || '',

      compania:
        item.querySelector('Compania')?.textContent || '',
      });
    }
  );
}
