import { getObraSource } from './obrasSources';

// Contrato de lectura del mapa. No contiene descripción, contactos ni campos
// de ficha; sí conserva los atributos que los filtros y la tarjeta actual usan.
export function normalizeMapProject(record, index = 0) {
  const text = (...keys) => {
    for (const key of keys) {
      const value = record?.[key];
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    return '';
  };
  const number = (value) => {
    const parsed = Number(String(value ?? '').trim().replace(/,/g, '').replace(/[^0-9.eE+-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const dateTime = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const local = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    const date = local ? new Date(Number(local[3]), Number(local[2]) - 1, Number(local[1])) : new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  };
  const lat = number(record?.lat ?? record?.latitud ?? record?.proy_ubicacionlatitud);
  const lng = number(record?.lng ?? record?.longitud ?? record?.proy_ubicacionlongitud);
  const clave = text('clave', 'Clave_Proyecto', 'clave_proyecto');
  const fechaPublicacion = text('fechaPublicacion', 'Fecha_Publicacion', 'fecha_publicacion');
  const fechaInicio = text('fechaInicio', 'Fecha_Inicio', 'fecha_inicio');
  const fechaTermino = text('fechaTermino', 'Fecha_Terminacion', 'fecha_terminacion');
  return {
    id: text('id', 'Id_Obra', 'ID_OBRA') || clave || `${lat}-${lng}-${index}`,
    clave, origen: getObraSource(record?.origen || record?.Origen || record),
    proyecto: text('proyecto', 'Proyecto'), region: text('region', 'Region'), estado: text('estado', 'Estado_Proyecto'),
    genero: text('genero', 'Genero'), subgenero: text('subgenero', 'Subgenero'), tipoObra: text('tipoObra', 'Tipo_Obra', 'tipo_obra'),
    tipoDesarrollo: text('tipoDesarrollo', 'Tipo_Desarrollo', 'tipo_desarrollo'), tipoProyecto: text('tipoProyecto', 'Tipo_Proyecto', 'tipo_proyecto'),
    etapa: text('etapa', 'Etapa'), sector: text('sector', 'Sector'),
    inversion: number(record?.inversion ?? record?.Inversion), superficie: number(record?.superficie ?? record?.Sup_Construida ?? record?.sup_construida),
    fechaPublicacion, fechaInicio, fechaTermino, fechaTerminacion: fechaTermino, fechaFin: fechaTermino,
    fechaPublicacionTime: dateTime(fechaPublicacion), fechaInicioTime: dateTime(fechaInicio), fechaTerminoTime: dateTime(fechaTermino),
    lat, lng, hasValidCoordinates: lat !== 0 && lng !== 0,
  };
}

export function mapProjectsFromObras(obras = []) {
  return obras.map(normalizeMapProject).filter((project) => project.hasValidCoordinates);
}
