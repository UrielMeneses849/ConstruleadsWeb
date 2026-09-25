import { getObraSource, getObraSourceMeta } from './obrasSources.js';

const REPORT_HEADERS = [
  '#',
  'Clave Proyecto',
  'Fecha publicación',
  'Proyecto',
  'Estado Proyecto',
  'Municipio',
  'C.P.',
  'Inversión\n(Pesos Mexicanos)',
  'Fecha Inicio',
  '%\nAvance estimado de obra',
  'Género',
  'Georreferencia',
  'Metodología',
  'Ficha',
];

const COLUMN_WIDTHS = [7, 18, 16, 54, 21, 22, 13, 23, 16, 21, 20, 27, 17, 20];

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '';
}

function projectCoordinate(obra) {
  const lat = Number(firstValue(obra?.lat, obra?.latitud, obra?.Latitud));
  const lng = Number(firstValue(obra?.lng, obra?.longitud, obra?.Longitud));
  return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0
    ? { lat, lng }
    : null;
}

function projectKey(obra) {
  return firstValue(obra?.clave, obra?.Clave_Proyecto, obra?.proy_clave, obra?.idProyecto, obra?.id);
}

function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value ?? '')
    .trim()
    .replace(/,/g, '')
    .replace(/[^0-9.eE+-]/g, '');
  if (!normalized) return null;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

function parsePercentage(value) {
  const number = parseNumber(value);
  if (number === null) return null;
  return Math.abs(number) > 1 ? number / 100 : number;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const text = String(value).trim();
  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const local = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  const date = iso
    ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    : local
      ? new Date(Number(local[3]), Number(local[2]) - 1, Number(local[1]))
      : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMapUrl(obra) {
  const directUrl = firstValue(obra?.georreferencia, obra?.geoReferencia, obra?.urlMapa, obra?.mapUrl);
  if (directUrl) return String(directUrl);
  const coordinate = projectCoordinate(obra);
  return coordinate
    ? `https://www.google.com/maps/dir/?api=1&destination=${coordinate.lat},${coordinate.lng}`
    : '';
}

function getFichaUrl(obra) {
  return String(firstValue(
    obra?.urlFicha,
    obra?.URL_Ficha,
    obra?.fichaUrl,
    obra?.Ficha_URL,
    obra?.url_ficha,
  ));
}

export function buildProspectingRows(obras = []) {
  return obras.map((obra, index) => {
    const mapUrl = getMapUrl(obra);
    const fichaUrl = getFichaUrl(obra);
    const sourceLabel = getObraSourceMeta(getObraSource(obra)).label;
    const investment = parseNumber(firstValue(obra?.inversion, obra?.Inversion, obra?.proy_inversion));
    const progress = parsePercentage(firstValue(
      obra?.porcentajeAvance,
      obra?.avanceEstimado,
      obra?.avance,
      obra?.PorcentajeAvance,
      obra?.Porcentaje_Avance,
      obra?.Avance,
    ));

    return [
      index + 1,
      projectKey(obra),
      parseDate(firstValue(obra?.fechaPublicacionDate, obra?.fechaPublicacion, obra?.Fecha_Publicacion)),
      firstValue(obra?.proyecto, obra?.Proyecto, obra?.nombreProyecto, 'Proyecto sin nombre'),
      firstValue(obra?.estado, obra?.Estado_Proyecto, obra?.estadoNombre),
      firstValue(obra?.municipio, obra?.Municipio, obra?.Municipio_Proyecto, obra?.muni_descripcion, obra?.municipio_descripcion),
      firstValue(obra?.codigoPostal, obra?.codigo_postal, obra?.cp, obra?.CP, obra?.C_P),
      investment,
      parseDate(firstValue(obra?.fechaInicioDate, obra?.fechaInicio, obra?.Fecha_Inicio)),
      progress,
      firstValue(obra?.genero, obra?.Genero, obra?.género),
      mapUrl ? { text: 'Abrir en Google Maps', hyperlink: mapUrl } : '',
      sourceLabel,
      fichaUrl ? { text: 'Ver ficha', hyperlink: fichaUrl } : 'Disponible en la plataforma',
    ];
  });
}

function applyCellBorder(cell) {
  cell.border = {
    bottom: { style: 'thin', color: { argb: 'FFD9DEE3' } },
  };
}

export async function createProspectingWorkbook({
  obras = [],
  logoBuffer,
  generatedAt = new Date(),
  company = 'BIMSA REPORTS, SISTEMAS',
}) {
  const ExcelJSImport = await import('exceljs/dist/exceljs.min.js');
  const ExcelJS = ExcelJSImport.default || ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bimsa Construleads';
  workbook.company = 'Bimsa Reports';
  workbook.created = generatedAt;
  workbook.modified = generatedAt;

  const sheet = workbook.addWorksheet('Reporte', {
    views: [{ state: 'frozen', ySplit: 3, activeCell: 'A4' }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      printTitlesRow: '1:3',
      margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 },
    },
  });

  COLUMN_WIDTHS.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  sheet.getRow(1).height = 72;
  sheet.getRow(2).height = 10;
  sheet.getRow(3).height = 42;
  sheet.mergeCells('C1:H1');

  if (logoBuffer) {
    const imageId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
    sheet.addImage(imageId, {
      tl: { col: 0.15, row: 0.15 },
      ext: { width: 286, height: 88 },
      editAs: 'oneCell',
    });
  } else {
    sheet.mergeCells('A1:B1');
    const brandCell = sheet.getCell('A1');
    brandCell.value = 'Bimsa Reports';
    brandCell.font = { name: 'Arial', size: 23, bold: true, color: { argb: 'FF495257' } };
    brandCell.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  const metadata = sheet.getCell('C1');
  metadata.value = [
    `Empresa: ${company}`,
    `Fecha de descarga: ${new Intl.DateTimeFormat('es-MX').format(generatedAt)}`,
    'Reporte: Prospección en campo',
    `Obras seleccionadas: ${obras.length.toLocaleString('es-MX')}`,
  ].join('\n');
  metadata.font = { name: 'Arial', size: 11, color: { argb: 'FF3E464A' } };
  metadata.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

  sheet.mergeCells('I1:N1');
  const summary = sheet.getCell('I1');
  summary.value = {
    richText: [
      { text: `${obras.length.toLocaleString('es-MX')} `, font: { size: 26, bold: true, color: { argb: 'FFD95B27' } } },
      { text: obras.length === 1 ? 'obra seleccionada' : 'obras seleccionadas', font: { size: 14, bold: true, color: { argb: 'FF172F68' } } },
      { text: '\nLista preparada para prospección y recorrido en campo', font: { size: 10, color: { argb: 'FF657282' } } },
    ],
  };
  summary.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };

  for (let column = 1; column <= REPORT_HEADERS.length; column += 1) {
    const separatorCell = sheet.getRow(2).getCell(column);
    separatorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: column >= 12 ? 'FF495257' : 'FFED7D31' } };
  }

  const headerRow = sheet.getRow(3);
  REPORT_HEADERS.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: index >= 11 ? 'FF495257' : 'FFED7D31' },
    };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  const rows = buildProspectingRows(obras);
  rows.forEach((values, rowIndex) => {
    const row = sheet.addRow(values);
    row.height = 44;
    const background = rowIndex % 2 === 0 ? 'FFF2F2F2' : 'FFFFFFFF';
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: background } };
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF30383D' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: [1, 8, 10].includes(columnNumber) ? 'center' : 'left',
        wrapText: true,
      };
      applyCellBorder(cell);
      if (cell.value && typeof cell.value === 'object' && cell.value.hyperlink) {
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FF1265A8' }, underline: true };
      }
    });

    row.getCell(3).numFmt = 'dd/mm/yyyy';
    row.getCell(7).numFmt = '@';
    row.getCell(8).numFmt = '"$"#,##0';
    row.getCell(9).numFmt = 'dd/mm/yyyy';
    row.getCell(10).numFmt = '0%';
  });

  const lastRow = Math.max(3, sheet.rowCount);
  sheet.autoFilter = { from: 'A3', to: `N${lastRow}` };
  sheet.properties.defaultRowHeight = 18;
  sheet.headerFooter.oddFooter = '&LGenerado por Bimsa Construleads&C&P de &N&R&D';
  sheet.getColumn(1).alignment = { horizontal: 'center' };

  return workbook;
}

export async function downloadProspectingWorkbook(options) {
  const blob = await createProspectingWorkbookBlob(options);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `reporte-prospeccion-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function createProspectingWorkbookBlob(options) {
  const workbook = await createProspectingWorkbook(options);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
