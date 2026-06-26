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
        item.querySelector('Fecha_publicacion')?.textContent || ''
      ),

      fechaInicio: normalizeDate(
        item.querySelector('Fecha_Inicio')?.textContent || ''
      ),

      fechaTermino: normalizeDate(
        item.querySelector('Fecha_Terminacion')?.textContent || ''
      ),

      fechaPublicacionDate: item.querySelector('Fecha_publicacion')?.textContent
        ? new Date(item.querySelector('Fecha_publicacion')?.textContent.trim())
        : null,

      fechaInicioDate: item.querySelector('Fecha_Inicio')?.textContent
        ? new Date(item.querySelector('Fecha_Inicio')?.textContent.trim())
        : null,

      fechaTerminoDate: item.querySelector('Fecha_Terminacion')?.textContent
        ? new Date(item.querySelector('Fecha_Terminacion')?.textContent.trim())
        : null,

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
    })
  );
}