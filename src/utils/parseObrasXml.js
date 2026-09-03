import { getObraSource } from './obrasSources';

export function parseObrasXml(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const items = xml.getElementsByTagName('datos');

  // Los valores del WS ya pasaron por ETL. Conservamos exactamente sus
  // acentos y sólo retiramos espacios exteriores para no alterar lo visible.
  const cleanText = (value = '') => String(value).trim();

  // Los nombres de tags sí se comparan de forma tolerante, sin modificar datos.
  const normalizeTagName = (value = '') =>
    cleanText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const cleanEstado = (value = '') => cleanText(value);

  const normalizeDate = (value = '') => String(value).trim();

  const parseNumber = (value = 0) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

    const normalized = String(value)
      .trim()
      .replace(/,/g, '')
      // El WS entrega inversiones como `6.269580000000000e+007`.
      // Conservamos el exponente para que Number pueda convertirlo a pesos.
      .replace(/[^0-9.eE+-]/g, '');

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

  const buildValueMap = (item) => {
    const values = new Map();
    const childNodes = item.getElementsByTagName('*');

    for (let index = 0; index < childNodes.length; index += 1) {
      const node = childNodes[index];
      const value = node.textContent?.trim();
      if (!value) continue;

      const nodeName = normalizeTagName(node.localName || node.nodeName);
      if (!values.has(nodeName)) values.set(nodeName, value);
    }

    return values;
  };

  const getText = (values, tags) => {
    for (let index = 0; index < tags.length; index += 1) {
      const value = values.get(normalizeTagName(tags[index]));
      if (value) return value;
    }

    return '';
  };

  const obras = new Array(items.length);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const values = buildValueMap(item);

    const getValue = (...tags) => getText(values, tags);
    const clave = getValue('Clave_Proyecto');
    const origenRaw = getValue('Origen');
    const proyectoRaw = getValue('Proyecto');
    const regionRaw = getValue('Region');
    const estadoRaw = getValue('Estado_Proyecto');
    const generoRaw = getValue('Genero');
    const subgeneroRaw = getValue('Subgenero');
    const tipoObraRaw = getValue('Tipo_Obra');
    const tipoDesarrolloRaw = getValue('Tipo_Desarrollo');
    const tipoProyectoRaw = getValue('Tipo_Proyecto');
    const etapaRaw = getValue('Etapa');
    const sectorRaw = getValue('Sector');
    const inversionRaw = getValue('Inversion');
    const superficieRaw = getValue('Sup_Construida');
    const latRaw = getValue('proy_ubicacionlatitud');
    const lngRaw = getValue('proy_ubicacionlongitud');
    const localizacion = getValue('Localizacion1');
    const descripcion = getValue('Descripcion');
    const compania = getValue('Compania');
    const rfcCompania = getValue('RFC_Compania', 'RFC_Proveedor', 'RFC');
    const claveCompania = getValue('Clave_Compania', 'Clave_Empresa', 'Empresa_Clave');
    const contactoNombre = getValue('Contacto', 'Nombre_Contacto', 'Contacto_Nombre', 'NombreContacto');
    const contactoCargo = getValue('Cargo_Contacto', 'Puesto_Contacto', 'Contacto_Cargo', 'Puesto');
    const contactoEmail = getValue('Email_Contacto', 'Correo_Contacto', 'Contacto_Email', 'Email', 'Correo');
    const contactoTelefono = getValue('Telefono_Contacto', 'Tel_Contacto', 'Contacto_Telefono', 'Telefono', 'Teléfono');
    const contactoTelefono2 = getValue('Telefono_2', 'Telefono2', 'Contacto_Telefono_2', 'Tel_Contacto_2');
    const paginaWeb = getValue('Pagina_Web', 'Página_Web', 'Sitio_Web', 'Website', 'Web');
    const rolCompania = getValue('Rol_Compania', 'Rol_Empresa', 'Empresa_Rol');
    const linkedinNombre = getValue('LinkedIn_Nombre', 'Linkedin_Nombre', 'Nombre_LinkedIn', 'Nombre_Linkedin');
    const linkedinCargo = getValue('LinkedIn_Cargo', 'Linkedin_Cargo', 'Cargo_LinkedIn', 'Cargo_Linkedin');
    const linkedinUrl = getValue('LinkedIn_URL', 'Linkedin_URL', 'URL_LinkedIn', 'URL_Linkedin', 'LinkedIn');

    const fechaPublicacion = getText(values, [
      'Fecha_publicacion',
      'Fecha_Publicacion',
      'FECHA_PUBLICACION',
      'Fecha_Publicación',
    ]);
    const fechaInicio = getText(values, [
      'Fecha_Inicio',
      'FECHA_INICIO',
      'Fecha_inicio',
    ]);
    const fechaTermino = getText(values, [
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
      origen: getObraSource(origenRaw),
      proyecto: cleanText(proyectoRaw),
      region: cleanText(regionRaw),
      estado: cleanEstado(estadoRaw),
      genero: cleanText(generoRaw),
      subgenero: cleanText(subgeneroRaw),
      tipoObra: cleanText(tipoObraRaw),
      tipoDesarrollo: cleanText(tipoDesarrolloRaw),
      tipoProyecto: cleanText(tipoProyectoRaw),
      etapa: cleanText(etapaRaw),
      sector: cleanText(sectorRaw),
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
      rfcCompania: cleanText(rfcCompania),
      claveCompania: cleanText(claveCompania),
      contactoNombre: cleanText(contactoNombre),
      contactoCargo: cleanText(contactoCargo),
      contactoEmail: cleanText(contactoEmail),
      contactoTelefono: cleanText(contactoTelefono),
      contactoTelefono2: cleanText(contactoTelefono2),
      paginaWeb: cleanText(paginaWeb),
      rolCompania: cleanText(rolCompania),
      linkedinNombre: cleanText(linkedinNombre),
      linkedinCargo: cleanText(linkedinCargo),
      linkedinUrl: cleanText(linkedinUrl),
    };
  }

  return obras;
}
