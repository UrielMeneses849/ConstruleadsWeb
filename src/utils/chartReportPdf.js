import {
  aggregateObrasByMetric,
  getMonthKeyFromObra,
  getMonthLabel,
  getSelectedDateField,
} from './filterObras';
import fontkit from '@pdf-lib/fontkit';
import poppinsRegularUrl from '@fontsource/poppins/files/poppins-latin-400-normal.woff?url';
import poppinsSemiBoldUrl from '@fontsource/poppins/files/poppins-latin-600-normal.woff?url';
import poppinsBoldUrl from '@fontsource/poppins/files/poppins-latin-700-normal.woff?url';

const PAGE_SIZE = [842, 595];
const ACCENT = { r: 1, g: 0.396, b: 0.247 };
const INK = { r: 0.125, g: 0.125, b: 0.125 };
const MUTED = { r: 0.42, g: 0.45, b: 0.5 };
const BORDER = { r: 0.89, g: 0.9, b: 0.92 };
const PANEL = { r: 0.975, g: 0.978, b: 0.982 };
const BAR = { r: 0.278, g: 0.333, b: 0.412 };
const BAR_LIGHT = { r: 0.9, g: 0.92, b: 0.94 };
const CHIP_FILL = { r: 1, g: 0.955, b: 0.935 };
const CHIP_BORDER = { r: 1, g: 0.73, b: 0.64 };
const REPORT_MARGIN_X = 40;
const REPORT_CONTENT_WIDTH = PAGE_SIZE[0] - REPORT_MARGIN_X * 2;
const METRIC_PANEL_HEIGHT = 130;
const METRIC_PANEL_GAP = 14;
const METRIC_PANEL_BOTTOM = 38;
const METRICS = [
  { key: 'proyectos', label: 'Proyectos', suffix: '' },
  { key: 'inversion', label: 'Inversión', suffix: 'MDP' },
  { key: 'superficie', label: 'm² construidos', suffix: 'm²' },
];

const rgbValue = (rgb, rgbFn) => rgbFn(rgb.r, rgb.g, rgb.b);
const abortError = () => new DOMException('La descarga fue cancelada.', 'AbortError');

function drawRoundedFill(page, { x, y, width, height, radius = 8, color }) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (!safeRadius) {
    page.drawRectangle({ x, y, width, height, color });
    return;
  }

  page.drawRectangle({
    x: x + safeRadius,
    y,
    width: width - safeRadius * 2,
    height,
    color,
  });
  page.drawRectangle({
    x,
    y: y + safeRadius,
    width,
    height: height - safeRadius * 2,
    color,
  });
  [
    [x + safeRadius, y + safeRadius],
    [x + width - safeRadius, y + safeRadius],
    [x + safeRadius, y + height - safeRadius],
    [x + width - safeRadius, y + height - safeRadius],
  ].forEach(([circleX, circleY]) => {
    page.drawCircle({ x: circleX, y: circleY, size: safeRadius, color });
  });
}

function drawRoundedPanel(page, { x, y, width, height, radius = 8, fill, border }) {
  drawRoundedFill(page, { x, y, width, height, radius, color: border });
  const inset = 0.8;
  drawRoundedFill(page, {
    x: x + inset,
    y: y + inset,
    width: width - inset * 2,
    height: height - inset * 2,
    radius: Math.max(0, radius - inset),
    color: fill,
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })
    .format(Math.round(Number(value) || 0));
}

function metricValue(value, metric) {
  return metric === 'inversion' ? (Number(value) || 0) / 1_000_000 : Number(value) || 0;
}

function truncate(text, maxLength) {
  const safeText = String(text || '');
  return safeText.length > maxLength ? `${safeText.slice(0, maxLength - 1)}…` : safeText;
}

function safePdfText(value) {
  return String(value ?? '')
    .replace(/[^\u0020-\u007E\u00A0-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]/g, '?');
}

function inferCompany(user = {}) {
  const directValue =
    user.empresa ||
    user.company ||
    user.compania ||
    user.nombreEmpresa ||
    user.razonSocial;
  if (directValue) return String(directValue).trim();

  const email = user.correo || user.email || user.usuario || '';
  const domain = String(email).split('@')[1]?.split('.')[0];
  if (domain) {
    return domain.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return user.nombreUsuario || 'Cliente Construleads';
}

function getFilterChips(filtros = {}) {
  const chips = [];
  const append = (label, value) => {
    const values = Array.isArray(value) ? value : value ? [value] : [];
    if (values.length) chips.push({ label, value: values.join(', ') });
  };

  append('Región', filtros.regiones || filtros.selectedRegiones);
  append('Estado', filtros.estados || filtros.selectedEstados);
  append('Género', filtros.generos || filtros.selectedGeneros);
  append('Subgénero', filtros.subgeneros || filtros.selectedSubgeneros);
  append('Tipo de obra', filtros.tipoObra || filtros.selectedTipoObra);
  append('Tipo de proyecto', filtros.tiposProyecto || filtros.selectedTiposProyecto);
  append('Sector', filtros.sectores || filtros.selectedSectores);
  append('Etapa', filtros.etapas || filtros.selectedEtapas);
  append('Desarrollo', filtros.desarrollos || filtros.selectedDesarrollos);

  const periodLabels = ['Hoy', '1 día', '7 días', '1 mes', '3 meses', '6 meses'];
  const periodIndex = Number(filtros.periodoIndex ?? -1);
  const hasPeriod = periodIndex >= 0 && periodIndex < periodLabels.length;
  const hasCustomDates = filtros.hasDateRangeFilter === true;
  const dateCriterion = getSelectedDateField(filtros);
  if (hasPeriod || hasCustomDates || dateCriterion !== 'Fecha de publicación') {
    append('Tipo de fecha', dateCriterion);
  }
  if (hasPeriod) append('Periodo', periodLabels[periodIndex]);
  if (hasCustomDates && filtros.fechaInicio && filtros.fechaFin) {
    append('Rango', `${filtros.fechaInicio} a ${filtros.fechaFin}`);
  }

  const investmentMin = Number(filtros.investmentMin);
  const investmentMax = Number(filtros.investmentMax);
  if (
    filtros.investmentMin !== null &&
    filtros.investmentMin !== undefined &&
    filtros.investmentMax !== null &&
    filtros.investmentMax !== undefined &&
    Number.isFinite(investmentMin) &&
    Number.isFinite(investmentMax)
  ) {
    append('Inversión', `${formatNumber(investmentMin / 1_000_000)} a ${formatNumber(investmentMax / 1_000_000)} MDP`);
  }

  const surfaceMin = Number(filtros.surfaceMin);
  const surfaceMax = Number(filtros.surfaceMax);
  if (
    filtros.surfaceMin !== null &&
    filtros.surfaceMin !== undefined &&
    filtros.surfaceMax !== null &&
    filtros.surfaceMax !== undefined &&
    Number.isFinite(surfaceMin) &&
    Number.isFinite(surfaceMax)
  ) {
    append('Superficie', `${formatNumber(surfaceMin)} a ${formatNumber(surfaceMax)} m²`);
  }

  return chips;
}

function drawFilterChips({ page, chips, fonts, rgb }) {
  const startX = 116;
  const maxX = 802;
  const rowY = [496, 477];
  const height = 15;
  const gap = 5;
  let x = startX;
  let row = 0;
  let hidden = 0;

  drawText(page, chips.length ? 'Filtros aplicados' : 'Sin filtros aplicados', {
    x: 40,
    y: 500,
    size: 7.1,
    color: rgbValue(chips.length ? INK : MUTED, rgb),
  }, chips.length ? fonts.semiBold : fonts.regular);

  for (let index = 0; index < chips.length; index += 1) {
    const chip = chips[index];
    const fullText = `${chip.label}: ${chip.value}`;
    let visibleText = fullText;
    let textWidth = fonts.regular.widthOfTextAtSize(visibleText, 6.2);
    const maxChipWidth = 250;

    while (textWidth + 16 > maxChipWidth && visibleText.length > chip.label.length + 5) {
      visibleText = `${visibleText.slice(0, -2).trim()}…`;
      textWidth = fonts.regular.widthOfTextAtSize(visibleText, 6.2);
    }

    const width = Math.max(48, textWidth + 16);
    if (x + width > maxX) {
      row += 1;
      x = startX;
    }
    if (row >= rowY.length) {
      hidden = chips.length - index;
      break;
    }

    drawRoundedPanel(page, {
      x,
      y: rowY[row],
      width,
      height,
      radius: 7.5,
      fill: rgbValue(CHIP_FILL, rgb),
      border: rgbValue(CHIP_BORDER, rgb),
    });
    drawText(page, visibleText, {
      x: x + 8,
      y: rowY[row] + 4.4,
      size: 6.2,
      color: rgbValue(INK, rgb),
    }, fonts.regular);
    x += width + gap;
  }

  if (hidden > 0) {
    const text = `+${hidden} filtros`;
    const width = fonts.semiBold.widthOfTextAtSize(text, 6.2) + 16;
    const fallbackRow = rowY.length - 1;
    const fallbackX = 40;
    drawRoundedFill(page, {
      x: fallbackX,
      y: rowY[fallbackRow],
      width,
      height,
      radius: 7.5,
      color: rgbValue(BORDER, rgb),
    });
    drawText(page, text, {
      x: fallbackX + 8,
      y: rowY[fallbackRow] + 4.4,
      size: 6.2,
      color: rgbValue(INK, rgb),
    }, fonts.semiBold);
  }
}

function buildPageDefinitions(obras, filtros) {
  const selectedDateField = getSelectedDateField(filtros);
  const monthGetter = (obra) => getMonthKeyFromObra(obra, selectedDateField);

  return [
    { title: 'Géneros', subtitle: 'Distribución por género constructivo', getter: 'genero', chartType: 'bars' },
    { title: 'Subgéneros', subtitle: 'Principales subgéneros de las obras', getter: 'subgenero', chartType: 'columns' },
    { title: 'Regiones', subtitle: 'Distribución de proyectos por región', getter: 'region', chartType: 'treemap' },
    { title: 'Estados', subtitle: 'Distribución de proyectos por estado', getter: 'estado', chartType: 'bars' },
    {
      title: 'Distribución temporal',
      subtitle: `Distribución por ${selectedDateField.toLowerCase()}`,
      getter: monthGetter,
      monthLabels: true,
      chartType: 'timeline',
    },
    { title: 'Compañías', subtitle: 'Principales compañías por proyectos', getter: 'compania', chartType: 'columns' },
  ].map((definition) => ({
    ...definition,
    metrics: METRICS.map((metric) => ({
      ...metric,
      items: aggregateObrasByMetric(obras, definition.getter, metric.key)
        .filter((item) => item.key !== 'Sin dato' && item.key !== 'Sin fecha')
        .sort(definition.monthLabels
          ? (a, b) => String(a.key).localeCompare(String(b.key))
          : (a, b) => b.value - a.value)
        .map((item) => ({
          ...item,
          label: definition.monthLabels ? getMonthLabel(item.key) : item.label,
        })),
    })),
  }));
}

function drawText(page, text, options, font) {
  page.drawText(safePdfText(text), { ...options, font });
}

function drawTimeline({ page, items, metric, bounds, fonts, rgb, max }) {
  const { regular, bold } = fonts;
  const { x, y, width, height } = bounds;
  const plotY = y + 17;
  const plotHeight = height - 33;
  const step = width / Math.max(items.length - 1, 1);
  let previousPoint = null;

  [0.33, 0.66, 1].forEach((fraction) => {
    page.drawLine({
      start: { x, y: plotY + plotHeight * fraction },
      end: { x: x + width, y: plotY + plotHeight * fraction },
      thickness: 0.5,
      color: rgbValue(BORDER, rgb),
    });
  });

  items.forEach((item, index) => {
    const value = metricValue(item.value, metric.key);
    const point = {
      x: x + index * step,
      y: plotY + (value / max) * plotHeight,
    };
    page.drawLine({
      start: { x: point.x, y: plotY },
      end: point,
      thickness: 0.75,
      color: rgbValue(BORDER, rgb),
    });
    if (previousPoint) {
      page.drawLine({
        start: previousPoint,
        end: point,
        thickness: 2.5,
        color: rgbValue(BAR, rgb),
      });
    }
    page.drawCircle({
      x: point.x,
      y: point.y,
      size: 4.1,
      color: rgb(1, 1, 1),
      borderColor: rgbValue(BAR, rgb),
      borderWidth: 1.6,
    });
    page.drawCircle({
      x: point.x,
      y: point.y,
      size: 1.8,
      color: rgbValue(ACCENT, rgb),
    });
    drawText(page, formatNumber(value), {
      x: Math.max(x, Math.min(point.x - 8, x + width - 35)),
      y: point.y + 7,
      size: 7,
      color: rgbValue(INK, rgb),
    }, bold);
    drawText(page, truncate(item.label, 10), {
      x: Math.max(x, Math.min(point.x - 13, x + width - 42)),
      y,
      size: 6.2,
      color: rgbValue(MUTED, rgb),
    }, regular);
    previousPoint = point;
  });
}

function drawColumns({ page, items, metric, bounds, fonts, rgb, max }) {
  const { regular, bold } = fonts;
  const { x, y, width, height } = bounds;
  const gap = 6;
  const slotWidth = width / items.length;
  const barWidth = Math.min(42, Math.max(13, slotWidth - gap));
  const plotHeight = height - 23;

  page.drawLine({
    start: { x, y: y + 15 },
    end: { x: x + width, y: y + 15 },
    thickness: 0.7,
    color: rgbValue(BORDER, rgb),
  });

  items.forEach((item, index) => {
    const value = metricValue(item.value, metric.key);
    const barHeight = Math.max(3, (value / max) * (plotHeight - 17));
    const barX = x + index * slotWidth + (slotWidth - barWidth) / 2;
    drawRoundedFill(page, {
      x: barX,
      y: y + 15,
      width: barWidth,
      height: barHeight,
      radius: 8,
      color: rgbValue(BAR, rgb),
    });
    drawText(page, formatNumber(value), {
      x: barX,
      y: y + barHeight + 20,
      size: 7,
      color: rgbValue(INK, rgb),
    }, bold);
    drawText(page, truncate(item.label, 10), {
      x: barX,
      y,
      size: 6.1,
      color: rgbValue(MUTED, rgb),
    }, regular);
  });
}

function drawTreemap({ page, items, metric, bounds, fonts, rgb }) {
  const { bold } = fonts;
  const { x, y, width, height } = bounds;
  const visibleItems = items.slice(0, 5);
  const colors = [
    rgb(0.30, 0.34, 0.40),
    rgb(0.42, 0.46, 0.52),
    rgb(0.58, 0.61, 0.66),
    rgb(0.73, 0.75, 0.78),
    rgb(0.84, 0.85, 0.87),
  ];
  const firstRow = visibleItems.slice(0, 3);
  const secondRow = visibleItems.slice(3);
  const rows = secondRow.length ? [
    { items: firstRow, y: y + height * 0.34, height: height * 0.66 },
    { items: secondRow, y, height: height * 0.32 },
  ] : [{ items: firstRow, y, height }];

  rows.forEach((row) => {
    const rowTotal = row.items.reduce((sum, item) => sum + metricValue(item.value, metric.key), 0) || 1;
    let cursorX = x;
    row.items.forEach((item) => {
      const itemIndex = visibleItems.indexOf(item);
      const itemWidth = width * (metricValue(item.value, metric.key) / rowTotal);
      drawRoundedFill(page, {
        x: cursorX,
        y: row.y,
        width: Math.max(itemWidth - 2, 4),
        height: row.height,
        radius: 8,
        color: colors[itemIndex],
      });
      const textColor = itemIndex < 3 ? rgb(1, 1, 1) : rgbValue(INK, rgb);
      const innerWidth = itemWidth - 14;
      if (innerWidth >= 27) {
        drawText(page, truncate(item.label, Math.max(3, Math.floor(innerWidth / 5.2))), {
          x: cursorX + 7,
          y: row.y + row.height - 15,
          size: innerWidth < 48 ? 5.6 : 6.8,
          color: textColor,
        }, bold);
      }
      if (innerWidth >= 42 && row.height >= 34) {
        drawText(page, `${formatNumber(metricValue(item.value, metric.key))}${metric.suffix ? ` ${metric.suffix}` : ''}`, {
          x: cursorX + 7,
          y: row.y + 8,
          size: innerWidth < 64 ? 5.4 : 6.2,
          color: textColor,
        }, bold);
      }
      cursorX += itemWidth;
    });
  });
}

function drawBars({ page, items, metric, bounds, fonts, rgb, max }) {
  const { regular, bold } = fonts;
  const { x, y, width, height } = bounds;
  const labelWidth = Math.min(172, width * 0.26);
  const gap = 8;
  const rowHeight = Math.min(16, (height - gap * (items.length - 1)) / items.length);
  const contentHeight = rowHeight * items.length + gap * Math.max(0, items.length - 1);
  const topOffset = Math.max(0, height - contentHeight);

  items.forEach((item, index) => {
    const value = metricValue(item.value, metric.key);
    const rowY = y + topOffset + (items.length - 1 - index) * (rowHeight + gap);
    const barX = x + labelWidth;
    const valueWidth = Math.min(112, width * 0.24);
    const maxBarWidth = width - labelWidth - valueWidth;
    const barWidth = Math.max(3, (value / max) * maxBarWidth);

    drawText(page, truncate(item.label, Math.max(9, Math.floor(labelWidth / 4.8))), {
      x,
      y: rowY + 2,
      size: 7.6,
      color: rgbValue(INK, rgb),
    }, regular);
    drawRoundedFill(page, {
      x: barX,
      y: rowY,
      width: maxBarWidth,
      height: rowHeight,
      radius: 8,
      color: rgbValue(BAR_LIGHT, rgb),
    });
    drawRoundedFill(page, {
      x: barX,
      y: rowY,
      width: barWidth,
      height: rowHeight,
      radius: 8,
      color: rgbValue(BAR, rgb),
    });
    drawText(page, `${formatNumber(value)}${metric.suffix ? ` ${metric.suffix}` : ''}`, {
      x: barX + maxBarWidth + 8,
      y: rowY + 2,
      size: 7.2,
      color: rgbValue(INK, rgb),
    }, bold);
  });
}

function drawMetricPanel({ page, metric, x, y, width, height, fonts, rgb, chartType }) {
  const { regular, bold } = fonts;
  const items = metric.items.slice(0, chartType === 'timeline' ? 7 : chartType === 'columns' ? 5 : chartType === 'treemap' ? 5 : 4);
  const total = metric.items.reduce((sum, item) => sum + metricValue(item.value, metric.key), 0);
  const max = Math.max(...items.map((item) => metricValue(item.value, metric.key)), 1);
  const totalText = `Total: ${formatNumber(total)}${metric.suffix ? ` ${metric.suffix}` : ''}`;

  drawRoundedPanel(page, {
    x,
    y,
    width,
    height,
    radius: 8,
    fill: rgbValue(PANEL, rgb),
    border: rgbValue(BORDER, rgb),
  });
  drawRoundedFill(page, {
    x,
    y: y + height - 4,
    width,
    height: 4,
    radius: 2,
    color: rgbValue(ACCENT, rgb),
  });

  drawText(page, metric.label, {
    x: x + 16,
    y: y + height - 25,
    size: 9.4,
    color: rgbValue(INK, rgb),
  }, bold);
  drawText(page, totalText, {
    x: x + width - 16 - bold.widthOfTextAtSize(safePdfText(totalText), 8.1),
    y: y + height - 24.5,
    size: 8.1,
    color: rgbValue(MUTED, rgb),
  }, bold);

  if (!items.length) {
    drawText(page, 'No hay datos disponibles para esta vista.', {
      x: x + 16,
      y: y + 50,
      size: 10,
      color: rgbValue(MUTED, rgb),
    }, regular);
    return;
  }

  const chartX = x + 16;
  const chartY = y + 17;
  const chartWidth = width - 32;
  const bounds = { x: chartX, y: chartY, width: chartWidth, height: height - 55 };
  if (chartType === 'timeline') {
    drawTimeline({ page, items, metric, bounds, fonts, rgb, max });
  } else if (chartType === 'columns') {
    drawColumns({ page, items, metric, bounds, fonts, rgb, max });
  } else if (chartType === 'treemap') {
    drawTreemap({ page, items, metric, bounds, fonts, rgb });
  } else {
    drawBars({ page, items, metric, bounds, fonts, rgb, max });
  }
}

function triggerPdfDownload(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function generateChartsPdf({
  obras = [],
  filtros = {},
  user = {},
  signal,
  onProgress,
}) {
  if (!obras.length) throw new Error('No hay datos para generar el PDF de gráficas.');
  if (signal?.aborted) throw abortError();

  const { PDFDocument, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regularBytes, semiBoldBytes, boldBytes] = await Promise.all([
    fetch(poppinsRegularUrl, { signal }).then((response) => response.arrayBuffer()),
    fetch(poppinsSemiBoldUrl, { signal }).then((response) => response.arrayBuffer()),
    fetch(poppinsBoldUrl, { signal }).then((response) => response.arrayBuffer()),
  ]);
  const fonts = {
    regular: await pdf.embedFont(regularBytes, { subset: true }),
    semiBold: await pdf.embedFont(semiBoldBytes, { subset: true }),
    bold: await pdf.embedFont(boldBytes, { subset: true }),
  };
  let logo;
  try {
    const logoResponse = await fetch(`${import.meta.env.BASE_URL}bimsa-logo.png`, { signal });
    if (logoResponse.ok) logo = await pdf.embedPng(await logoResponse.arrayBuffer());
  } catch {
    if (signal?.aborted) throw abortError();
  }

  const definitions = buildPageDefinitions(obras, filtros);
  const company = inferCompany(user);
  const generatedAt = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());
  const filterChips = getFilterChips(filtros);

  definitions.forEach((definition, pageIndex) => {
    if (signal?.aborted) throw abortError();
    const page = pdf.addPage(PAGE_SIZE);
    const [, pageHeight] = PAGE_SIZE;

    if (logo) {
      const dimensions = logo.scaleToFit(122, 32);
      page.drawImage(logo, {
        x: 40,
        y: pageHeight - 55,
        width: dimensions.width,
        height: dimensions.height,
      });
    } else {
      drawText(page, 'Bimsa Construleads', {
        x: 40,
        y: pageHeight - 45,
        size: 14,
        color: rgbValue(INK, rgb),
      }, fonts.bold);
    }

    drawText(page, definition.title, {
      x: 198,
      y: pageHeight - 37,
      size: 13,
      color: rgbValue(INK, rgb),
    }, fonts.bold);
    drawText(page, definition.subtitle, {
      x: 198,
      y: pageHeight - 52,
      size: 8,
      color: rgbValue(MUTED, rgb),
    }, fonts.regular);
    drawText(page, `Reporte hecho para ${truncate(company, 38)}`, {
      x: 572,
      y: pageHeight - 37,
      size: 8,
      color: rgbValue(INK, rgb),
    }, fonts.semiBold);
    drawText(page, generatedAt, {
      x: 572,
      y: pageHeight - 50,
      size: 8,
      color: rgbValue(MUTED, rgb),
    }, fonts.regular);

    page.drawLine({
      start: { x: 40, y: pageHeight - 67 },
      end: { x: 802, y: pageHeight - 67 },
      thickness: 1,
      color: rgbValue(BORDER, rgb),
    });
    drawText(page, `${formatNumber(obras.length)} proyectos en la selección`, {
      x: 646,
      y: pageHeight - 82,
      size: 7.2,
      color: rgbValue(MUTED, rgb),
    }, fonts.bold);
    drawFilterChips({ page, chips: filterChips, fonts, rgb });

    const metricPositions = definition.metrics.map((_, metricIndex) => ({
      x: REPORT_MARGIN_X,
      y: METRIC_PANEL_BOTTOM + (definition.metrics.length - metricIndex - 1) * (METRIC_PANEL_HEIGHT + METRIC_PANEL_GAP),
    }));

    definition.metrics.forEach((metric, metricIndex) => {
      drawMetricPanel({
        page,
        metric,
        ...metricPositions[metricIndex],
        width: REPORT_CONTENT_WIDTH,
        height: METRIC_PANEL_HEIGHT,
        fonts,
        rgb,
        chartType: definition.chartType,
      });
    });

    drawText(page, `Página ${pageIndex + 1} de ${definitions.length}`, {
      x: 730,
      y: 11,
      size: 7,
      color: rgbValue(MUTED, rgb),
    }, fonts.regular);
    onProgress?.(12 + Math.round(((pageIndex + 1) / definitions.length) * 76));
  });

  if (signal?.aborted) throw abortError();
  const bytes = await pdf.save();
  onProgress?.(96);
  triggerPdfDownload(bytes, `construleads-graficas-${Date.now()}.pdf`);
  onProgress?.(100);
  return { filename: 'PDF — Gráficas', company };
}
