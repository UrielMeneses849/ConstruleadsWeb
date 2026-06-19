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

  return Array.from(xml.getElementsByTagName('datos')).map(
    (item) => ({
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
        item.querySelector('Fecha_Publicacion')?.textContent || ''
      ),

      fechaInicio: normalizeDate(
        item.querySelector('Fecha_Inicio')?.textContent || ''
      ),

      fechaTermino: normalizeDate(
        item.querySelector('Fecha_Termino')?.textContent || ''
      ),

      fechaPublicacionDate: item.querySelector('Fecha_Publicacion')?.textContent
        ? new Date(item.querySelector('Fecha_Publicacion')?.textContent.trim())
        : null,

      fechaInicioDate: item.querySelector('Fecha_Inicio')?.textContent
        ? new Date(item.querySelector('Fecha_Inicio')?.textContent.trim())
        : null,

      fechaTerminoDate: item.querySelector('Fecha_Termino')?.textContent
        ? new Date(item.querySelector('Fecha_Termino')?.textContent.trim())
        : null,

      lat: Number(
        item.querySelector('Latitude')?.textContent || 0
      ),

      lng: Number(
        item.querySelector('Longitude')?.textContent || 0
      ),
    })
  );
}