import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Flex, SimpleGrid, Text } from '@chakra-ui/react';
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiLayers,
  FiMail,
  FiMinus,
  FiSearch,
  FiSliders,
  FiX,
} from 'react-icons/fi';
import { filterObrasByFilters } from '../../utils/filterObras';

const DATE_OPTIONS = ['Fecha de publicación', 'Fecha de inicio probable', 'Fecha de término probable'];
const PERIOD_OPTIONS = [
  { value: -1, label: 'Todo el periodo' }, { value: 0, label: 'Hoy' }, { value: 1, label: '1 día' },
  { value: 2, label: '7 días' }, { value: 3, label: '1 mes' }, { value: 4, label: '3 meses' }, { value: 5, label: '6 meses' },
];
const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const ESTADOS_POR_REGION_CATALOG = {
  Oeste: ['Jalisco', 'Colima', 'Michoacán', 'Nayarit', 'Aguascalientes'],
  Noroeste: ['Baja California', 'Baja California Sur', 'Sonora', 'Sinaloa', 'Chihuahua', 'Durango'],
  Centro: ['Ciudad de México', 'Estado de México', 'Hidalgo', 'Morelos', 'Puebla', 'Querétaro', 'Tlaxcala'],
  Sureste: ['Guerrero', 'Oaxaca', 'Veracruz', 'Tabasco', 'Chiapas', 'Campeche', 'Yucatán', 'Quintana Roo'],
  Noreste: ['Nuevo León', 'Coahuila', 'Tamaulipas', 'San Luis Potosí', 'Zacatecas'],
};
const inputStyle = { w: '100%', h: '38px', px: 3, bg: 'var(--cl-input-bg)', border: '1px solid var(--cl-border)', borderRadius: '8px', color: 'var(--cl-text)', fontSize: '12px', outline: 'none' };

const cleanArray = (value) => Array.isArray(value) ? [...value] : [];
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX').trim();
const sorted = (values) => [...values].sort((first, second) => first.localeCompare(second, 'es-MX'));
const includesAll = (values, candidates) => candidates.every((candidate) => values.includes(candidate));
const appendMissing = (values, next) => [...values, ...next.filter((value) => !values.includes(value))];
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

function cloneFilters(filters = {}) {
  return {
    ...filters,
    regiones: cleanArray(filters.regiones), estados: cleanArray(filters.estados), generos: cleanArray(filters.generos),
    subgeneros: cleanArray(filters.subgeneros), tipoObra: cleanArray(filters.tipoObra), tiposProyecto: cleanArray(filters.tiposProyecto),
    etapas: cleanArray(filters.etapas), sectores: cleanArray(filters.sectores), desarrollos: cleanArray(filters.desarrollos),
    fuentes: cleanArray(filters.fuentes), fechaRango: { ...(filters.fechaRango || {}) },
  };
}

function createEmptyFilters() {
  return {
    regiones: [], estados: [], generos: [], subgeneros: [], tipoObra: [], tiposProyecto: [], etapas: [], sectores: [], desarrollos: [],
    fuentes: ['construleads'], fechaConsulta: 'Fecha de publicación', periodoIndex: -1,
    fechaInicio: '', fechaFin: '', fechaRango: { desde: '', hasta: '' }, investmentMin: null, investmentMax: null, surfaceMin: null, surfaceMax: null,
  };
}

function makeTwoLevelTree(obras, parentField, childField, inferParent) {
  const groups = new Map();
  obras.forEach((obra) => {
    const child = String(obra?.[childField] || '').trim();
    const parent = String(obra?.[parentField] || '').trim() || inferParent?.(child) || 'Sin clasificación';
    const parentKey = normalize(parent);
    if (!groups.has(parentKey)) groups.set(parentKey, { label: parent, children: new Map() });
    if (child) groups.get(parentKey).children.set(normalize(child), child);
  });
  return [...groups.values()].map(({ label, children }) => ({ label, children: sorted(children.values()) })).sort((a, b) => a.label.localeCompare(b.label, 'es-MX'));
}

function makeCategoryTree(obras) {
  const groups = new Map();
  obras.forEach((obra) => {
    const genero = String(obra?.genero || '').trim();
    const subgenero = String(obra?.subgenero || '').trim();
    const tipoObra = String(obra?.tipoObra || '').trim();
    if (!genero) return;
    const generoKey = normalize(genero);
    if (!groups.has(generoKey)) groups.set(generoKey, { label: genero, children: new Map() });
    if (!subgenero) return;
    const subgeneros = groups.get(generoKey).children;
    const subgeneroKey = normalize(subgenero);
    if (!subgeneros.has(subgeneroKey)) subgeneros.set(subgeneroKey, { label: subgenero, children: new Map() });
    if (tipoObra) subgeneros.get(subgeneroKey).children.set(normalize(tipoObra), tipoObra);
  });
  return [...groups.values()].map(({ label, children }) => ({
    label,
    children: [...children.values()].map((child) => ({ label: child.label, children: sorted(child.children.values()) })).sort((a, b) => a.label.localeCompare(b.label, 'es-MX')),
  })).sort((a, b) => a.label.localeCompare(b.label, 'es-MX'));
}

function uniqueOptions(obras, field) {
  const values = new Map();
  obras.forEach((obra) => {
    const value = String(obra?.[field] || '').trim();
    if (value) values.set(normalize(value), value);
  });
  return sorted(values.values());
}

function getNumericBounds(obras, field, { defaultMax, include }) {
  let min = Infinity;
  let max = -Infinity;
  obras.forEach((obra) => {
    const value = Number(obra?.[field] || 0);
    if (!Number.isFinite(value) || !include(value)) return;
    min = Math.min(min, value);
    max = Math.max(max, value);
  });
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: defaultMax };
  return { min: Math.max(0, Math.floor(min)), max: Math.max(1, Math.ceil(max)) };
}

function resolveRange(minValue, maxValue, bounds) {
  const hasMin = minValue !== null && minValue !== undefined && minValue !== '' && Number.isFinite(Number(minValue));
  const hasMax = maxValue !== null && maxValue !== undefined && maxValue !== '' && Number.isFinite(Number(maxValue));
  const min = clamp(hasMin ? Number(minValue) : bounds.min, bounds.min, bounds.max);
  const max = Math.max(min, clamp(hasMax ? Number(maxValue) : bounds.max, bounds.min, bounds.max));
  return { min, max, isFiltered: min > bounds.min || max < bounds.max };
}

function getFilterSummary(filters = {}) {
  const summary = [];
  const sources = cleanArray(filters.fuentes).map((source) => source === 'construleads' ? 'Construleads' : source === 'explorer' ? 'Explorer' : source);
  if (sources.length) summary.push(`Fuente: ${sources.join(', ')}`);
  [['regiones', 'Región'], ['estados', 'Estado'], ['generos', 'Género'], ['subgeneros', 'Subgénero'], ['tipoObra', 'Tipo de obra'], ['tiposProyecto', 'Tipo de proyecto'], ['etapas', 'Etapa'], ['sectores', 'Sector'], ['desarrollos', 'Tipo de desarrollo']].forEach(([key, label]) => {
    const values = cleanArray(filters[key]);
    if (values.length) summary.push(`${label}: ${values.length === 1 ? values[0] : `${values.length} seleccionados`}`);
  });
  if (filters.fechaInicio && filters.fechaFin) summary.push(`${filters.fechaConsulta || 'Fecha'}: ${filters.fechaInicio} a ${filters.fechaFin}`);
  else if (Number(filters.periodoIndex ?? -1) >= 0) summary.push(`Periodo: ${PERIOD_OPTIONS.find((option) => option.value === Number(filters.periodoIndex))?.label || 'Personalizado'}`);
  if (filters.investmentMin !== null || filters.investmentMax !== null) summary.push('Inversión parametrizada');
  if (filters.surfaceMin !== null || filters.surfaceMax !== null) summary.push('Superficie parametrizada');
  return summary;
}

function selectedLabel(values, fallback = 'Todos') {
  if (!values.length) return fallback;
  return values.length === 1 ? values[0] : `${values[0]} +${values.length - 1}`;
}

function CheckMark({ checked, partial = false }) {
  return <Flex as="span" w="15px" h="15px" flexShrink={0} align="center" justify="center" border="1px solid" borderColor={checked || partial ? '#D95B27' : 'var(--cl-border)'} borderRadius="4px" bg={checked ? '#D95B27' : partial ? 'rgba(217, 91, 39, .14)' : 'transparent'} color={checked ? 'white' : '#B9471E'}>{checked ? <FiCheck size={11} /> : partial ? <FiMinus size={11} /> : null}</Flex>;
}

function DropdownShell({ id, label, value, isOpen, onToggle, children, disabled = false }) {
  return <Box position="relative" data-schedule-dropdown={id}>
    <Text mb={1} color="var(--cl-text-muted)" fontSize="10px" fontWeight="800">{label}</Text>
    <Flex as="button" type="button" w="100%" h="40px" px={3} gap={2} align="center" justify="space-between" bg={isOpen ? 'var(--cl-surface)' : 'var(--cl-input-bg)'} border="1px solid" borderColor={isOpen ? '#D95B27' : 'var(--cl-border)'} borderRadius="9px" color="var(--cl-text)" fontSize="12px" textAlign="left" transition="border-color 160ms ease, box-shadow 160ms ease" boxShadow={isOpen ? '0 0 0 3px rgba(217, 91, 39, .10)' : 'none'} disabled={disabled} opacity={disabled ? .55 : 1} aria-expanded={isOpen} aria-controls={`${id}-menu`} onClick={onToggle}>
      <Text flex="1" minW={0} lineClamp={1}>{value}</Text><FiChevronDown size={15} style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease' }} />
    </Flex>
    {isOpen && <Box id={`${id}-menu`} position="absolute" top="calc(100% + 6px)" left={0} zIndex={40} w="100%" minW="260px" p={2} bg="var(--cl-surface)" border="1px solid var(--cl-border)" borderRadius="11px" boxShadow="0 18px 42px rgba(22, 32, 49, .22)">{children}</Box>}
  </Box>;
}

function FlatOptionsMenu({ label, options, values, onChange }) {
  const [query, setQuery] = useState('');
  const selected = new Set(values);
  const visible = query.trim() ? options.filter((option) => normalize(option).includes(normalize(query))) : options;
  return <><Flex align="center" h="32px" px={2.5} mb={1.5} gap={1.5} bg="var(--cl-input-bg)" border="1px solid var(--cl-border)" borderRadius="7px" color="var(--cl-text-muted)"><FiSearch size={13} /><Box as="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${label.toLocaleLowerCase('es-MX')}…`} flex="1" minW={0} bg="transparent" border={0} color="var(--cl-text)" fontSize="11px" outline="none" /></Flex><Box maxH="246px" overflowY="auto" pr={.5}>{visible.map((option) => { const isSelected = selected.has(option); return <Flex key={option} as="button" type="button" w="100%" minH="32px" px={2} gap={2} align="center" borderRadius="7px" bg={isSelected ? 'rgba(217, 91, 39, .10)' : 'transparent'} color="var(--cl-text)" fontSize="11px" textAlign="left" _hover={{ bg: 'var(--cl-hover)' }} onClick={() => onChange(isSelected ? values.filter((value) => value !== option) : [...values, option])}><CheckMark checked={isSelected} /><Text flex="1" minW={0} lineClamp={1}>{option}</Text></Flex>; })}{!visible.length && <Text p={2} color="var(--cl-text-muted)" fontSize="11px">No hay coincidencias.</Text>}</Box></>;
}

function TwoLevelTreeMenu({ intro, groups, parentValues, childValues, onChange }) {
  const [expanded, setExpanded] = useState(null);
  const toggleParent = (group) => {
    const selected = parentValues.includes(group.label) && includesAll(childValues, group.children);
    onChange(selected ? { parent: parentValues.filter((value) => value !== group.label), child: childValues.filter((value) => !group.children.includes(value)) } : { parent: appendMissing(parentValues, [group.label]), child: appendMissing(childValues, group.children) });
  };
  const toggleChild = (group, child) => {
    const nextChild = childValues.includes(child) ? childValues.filter((value) => value !== child) : [...childValues, child];
    const hasSelectedChild = group.children.some((value) => nextChild.includes(value));
    onChange({ parent: hasSelectedChild ? appendMissing(parentValues, [group.label]) : parentValues.filter((value) => value !== group.label), child: nextChild });
  };
  return <Box maxH="292px" overflowY="auto" pr={.5}><Text px={1.5} pb={1.5} color="var(--cl-text-muted)" fontSize="10px">{intro}</Text>{groups.map((group) => {
    const selectedChildren = group.children.filter((value) => childValues.includes(value)).length;
    const selected = parentValues.includes(group.label) && selectedChildren === group.children.length;
    const partial = !selected && (parentValues.includes(group.label) || selectedChildren > 0);
    const isExpanded = expanded === group.label;
    return <Box key={group.label} mb={1}><Flex minH="34px" px={1.5} gap={1} align="center" borderRadius="8px" bg={selected || partial ? 'rgba(217, 91, 39, .08)' : 'transparent'} _hover={{ bg: 'var(--cl-hover)' }}><Box as="button" type="button" p={1} aria-label={`Seleccionar ${group.label}`} onClick={() => toggleParent(group)}><CheckMark checked={selected} partial={partial} /></Box><Box as="button" type="button" flex="1" minW={0} py={1.5} textAlign="left" onClick={() => setExpanded((current) => current === group.label ? null : group.label)}><Text fontSize="11px" fontWeight="700" color="var(--cl-text)">{group.label}</Text></Box>{group.children.length > 0 && <Box as="button" type="button" p={1} color="var(--cl-text-muted)" aria-label={`Mostrar opciones de ${group.label}`} onClick={() => setExpanded((current) => current === group.label ? null : group.label)}><FiChevronRight size={15} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 160ms ease' }} /></Box>}</Flex>{isExpanded && group.children.length > 0 && <Box pl={5} pt={.5}>{group.children.map((child) => { const isSelected = childValues.includes(child); return <Flex key={child} as="button" type="button" w="100%" minH="30px" px={1.5} gap={2} align="center" borderRadius="7px" bg={isSelected ? 'rgba(217, 91, 39, .08)' : 'transparent'} color="var(--cl-text)" fontSize="11px" textAlign="left" _hover={{ bg: 'var(--cl-hover)' }} onClick={() => toggleChild(group, child)}><CheckMark checked={isSelected} /><Text>{child}</Text></Flex>; })}</Box>}</Box>;
  })}</Box>;
}

function CategoryTreeMenu({ groups, generos, subgeneros, tiposObra, onChange }) {
  const [expandedGenre, setExpandedGenre] = useState(null);
  const [expandedSubgenre, setExpandedSubgenre] = useState(null);
  const toggleGenre = (genre) => {
    const allSubs = genre.children.map((child) => child.label);
    const allTypes = genre.children.flatMap((child) => child.children);
    const selected = generos.includes(genre.label) && includesAll(subgeneros, allSubs) && includesAll(tiposObra, allTypes);
    onChange(selected ? { generos: generos.filter((value) => value !== genre.label), subgeneros: subgeneros.filter((value) => !allSubs.includes(value)), tipoObra: tiposObra.filter((value) => !allTypes.includes(value)) } : { generos: appendMissing(generos, [genre.label]), subgeneros: appendMissing(subgeneros, allSubs), tipoObra: appendMissing(tiposObra, allTypes) });
  };
  const toggleSubgenre = (genre, subgenre) => {
    const selected = subgeneros.includes(subgenre.label) && includesAll(tiposObra, subgenre.children);
    const nextSubgenres = selected ? subgeneros.filter((value) => value !== subgenre.label) : appendMissing(subgeneros, [subgenre.label]);
    const nextTypes = selected ? tiposObra.filter((value) => !subgenre.children.includes(value)) : appendMissing(tiposObra, subgenre.children);
    const hasSelected = genre.children.some((child) => nextSubgenres.includes(child.label)) || genre.children.flatMap((child) => child.children).some((type) => nextTypes.includes(type));
    onChange({ generos: hasSelected ? appendMissing(generos, [genre.label]) : generos.filter((value) => value !== genre.label), subgeneros: nextSubgenres, tipoObra: nextTypes });
  };
  const toggleType = (genre, subgenre, type) => {
    const nextTypes = tiposObra.includes(type) ? tiposObra.filter((value) => value !== type) : [...tiposObra, type];
    const hasSelectedType = subgenre.children.some((item) => nextTypes.includes(item));
    const nextSubgenres = hasSelectedType ? appendMissing(subgeneros, [subgenre.label]) : subgeneros.filter((value) => value !== subgenre.label);
    const hasSelected = genre.children.some((child) => nextSubgenres.includes(child.label)) || genre.children.flatMap((child) => child.children).some((item) => nextTypes.includes(item));
    onChange({ generos: hasSelected ? appendMissing(generos, [genre.label]) : generos.filter((value) => value !== genre.label), subgeneros: nextSubgenres, tipoObra: nextTypes });
  };
  return <Box maxH="320px" overflowY="auto" pr={.5}><Text px={1.5} pb={1.5} color="var(--cl-text-muted)" fontSize="10px">Género, subgénero y tipo de obra se conservan como una sola jerarquía.</Text>{groups.map((genre) => {
    const allSubs = genre.children.map((child) => child.label);
    const allTypes = genre.children.flatMap((child) => child.children);
    const selected = generos.includes(genre.label) && includesAll(subgeneros, allSubs) && includesAll(tiposObra, allTypes);
    const partial = !selected && (generos.includes(genre.label) || allSubs.some((value) => subgeneros.includes(value)) || allTypes.some((value) => tiposObra.includes(value)));
    const isExpanded = expandedGenre === genre.label;
    return <Box key={genre.label} mb={1}><Flex minH="34px" px={1.5} gap={1} align="center" borderRadius="8px" bg={selected || partial ? 'rgba(217, 91, 39, .08)' : 'transparent'} _hover={{ bg: 'var(--cl-hover)' }}><Box as="button" type="button" p={1} aria-label={`Seleccionar ${genre.label}`} onClick={() => toggleGenre(genre)}><CheckMark checked={selected} partial={partial} /></Box><Box as="button" type="button" flex="1" minW={0} py={1.5} textAlign="left" onClick={() => setExpandedGenre((current) => current === genre.label ? null : genre.label)}><Text fontSize="11px" fontWeight="700" color="var(--cl-text)">{genre.label}</Text></Box>{genre.children.length > 0 && <Box as="button" type="button" p={1} color="var(--cl-text-muted)" aria-label={`Mostrar subgéneros de ${genre.label}`} onClick={() => setExpandedGenre((current) => current === genre.label ? null : genre.label)}><FiChevronRight size={15} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 160ms ease' }} /></Box>}</Flex>{isExpanded && <Box pl={4.5} pt={.5}>{genre.children.map((subgenre) => {
      const selectedSubgenre = subgeneros.includes(subgenre.label) && includesAll(tiposObra, subgenre.children);
      const partialSubgenre = !selectedSubgenre && (subgeneros.includes(subgenre.label) || subgenre.children.some((value) => tiposObra.includes(value)));
      const subKey = `${genre.label}-${subgenre.label}`;
      const isSubExpanded = expandedSubgenre === subKey;
      return <Box key={subgenre.label} mb={.5}><Flex minH="31px" px={1.5} gap={1} align="center" borderRadius="7px" bg={selectedSubgenre || partialSubgenre ? 'rgba(217, 91, 39, .07)' : 'transparent'} _hover={{ bg: 'var(--cl-hover)' }}><Box as="button" type="button" p={1} aria-label={`Seleccionar ${subgenre.label}`} onClick={() => toggleSubgenre(genre, subgenre)}><CheckMark checked={selectedSubgenre} partial={partialSubgenre} /></Box><Box as="button" type="button" flex="1" minW={0} py={1} textAlign="left" onClick={() => setExpandedSubgenre((current) => current === subKey ? null : subKey)}><Text fontSize="11px" color="var(--cl-text)">{subgenre.label}</Text></Box>{subgenre.children.length > 0 && <Box as="button" type="button" p={1} color="var(--cl-text-muted)" aria-label={`Mostrar tipos de obra de ${subgenre.label}`} onClick={() => setExpandedSubgenre((current) => current === subKey ? null : subKey)}><FiChevronRight size={14} style={{ transform: isSubExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 160ms ease' }} /></Box>}</Flex>{isSubExpanded && <Box pl={4.5} pt={.5}>{subgenre.children.map((type) => { const selectedType = tiposObra.includes(type); return <Flex key={type} as="button" type="button" w="100%" minH="29px" px={1.5} gap={2} align="center" borderRadius="7px" bg={selectedType ? 'rgba(217, 91, 39, .07)' : 'transparent'} color="var(--cl-text)" fontSize="10px" textAlign="left" _hover={{ bg: 'var(--cl-hover)' }} onClick={() => toggleType(genre, subgenre, type)}><CheckMark checked={selectedType} /><Text>{type}</Text></Flex>; })}</Box>}</Box>;
    })}</Box>}</Box>;
  })}</Box>;
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function parseNumber(value) {
  const numeric = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function DualRange({ id, label, hint, bounds, range, onChange, step = 1, scale = 1, suffix = '' }) {
  const { min, max } = range;
  const sliderMax = Math.max(bounds.max, bounds.min + step);
  const span = Math.max(bounds.max - bounds.min, 1);
  const minPercent = clamp(((min - bounds.min) / span) * 100, 0, 100);
  const maxPercent = clamp(((max - bounds.min) / span) * 100, 0, 100);
  const setMin = (value) => onChange(clamp(value, bounds.min, max), max);
  const setMax = (value) => onChange(min, clamp(value, min, bounds.max));
  return <Box p={3} border="1px solid var(--cl-border)" borderRadius="10px" bg="var(--cl-surface)"><Flex align="start" justify="space-between" gap={2}><Box><Text color="var(--cl-text)" fontSize="11px" fontWeight="800">{label}</Text><Text mt={.5} color="var(--cl-text-muted)" fontSize="10px">{hint}</Text></Box>{range.isFiltered && <Text px={1.5} py={.5} borderRadius="full" bg="rgba(217, 91, 39, .10)" color="#B9471E" fontSize="9px" fontWeight="800">Ajustado</Text>}</Flex><SimpleGrid mt={3} columns="2" gap={2}>{[[min, setMin, 'mínimo'], [max, setMax, 'máximo']].map(([value, setValue, position]) => <Flex key={position} h="34px" px={2} gap={1} align="center" border="1px solid var(--cl-border)" borderRadius="8px" bg="var(--cl-input-bg)"><Text color="var(--cl-text-muted)" fontSize="10px">{suffix === 'M' ? '$' : ''}</Text><Box as="input" type="text" inputMode="numeric" aria-label={`${label} ${position}`} value={formatNumber(value / scale)} onChange={(event) => setValue(parseNumber(event.target.value) * scale)} flex="1" minW={0} bg="transparent" border={0} color="var(--cl-text)" fontSize="11px" fontWeight="700" outline="none" /><Text color="var(--cl-text-muted)" fontSize="10px">{suffix}</Text></Flex>)}</SimpleGrid><Box position="relative" h="34px" mt={1}><Box position="absolute" left={0} right={0} top="16px" h="4px" bg="var(--cl-border)" borderRadius="full" /><Box position="absolute" top="16px" h="4px" left={`${minPercent}%`} width={`${Math.max(maxPercent - minPercent, 0)}%`} bg="#4B5563" borderRadius="full" /><input type="range" min={bounds.min} max={sliderMax} step={step} value={min} onChange={(event) => setMin(Number(event.target.value))} className={`${id}-min`} style={{ position: 'absolute', left: 0, top: '-4px', width: '100%', background: 'transparent', pointerEvents: 'none', appearance: 'none', zIndex: 3 }} /><input type="range" min={bounds.min} max={sliderMax} step={step} value={max} onChange={(event) => setMax(Number(event.target.value))} className={`${id}-max`} style={{ position: 'absolute', left: 0, top: '-4px', width: '100%', background: 'transparent', pointerEvents: 'none', appearance: 'none', zIndex: 4 }} /><style>{`.${id}-min::-webkit-slider-thumb, .${id}-max::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:16px; height:16px; border-radius:50%; background:#4B5563; border:2px solid white; box-shadow:0 1px 4px rgba(0,0,0,.16); cursor:pointer; pointer-events:auto; } .${id}-min::-webkit-slider-runnable-track, .${id}-max::-webkit-slider-runnable-track { height:4px; background:transparent; } .${id}-min::-moz-range-thumb, .${id}-max::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:#4B5563; border:2px solid white; box-shadow:0 1px 4px rgba(0,0,0,.16); cursor:pointer; pointer-events:auto; } .${id}-min, .${id}-max { outline:none; }`}</style></Box></Box>;
}

export default function ScheduledReportModal({ isOpen, onClose, onSave, onClear, scheduledReport = null, downloadOptions = [], selectedOption, filtros = {}, obras = [], user = {} }) {
  const initialSchedule = scheduledReport || {};
  const [usesCurrentFilters, setUsesCurrentFilters] = useState(() => initialSchedule.filterMode !== 'custom');
  const [draftFilters, setDraftFilters] = useState(() => cloneFilters(initialSchedule.filters || filtros));
  const [recipient, setRecipient] = useState(() => initialSchedule.recipient || user.correo || user.email || '');
  const [reportType, setReportType] = useState(() => initialSchedule.reportType || selectedOption?.value || 'pdf_obras');
  const [frequency, setFrequency] = useState(() => initialSchedule.frequency || 'weekly');
  const [day, setDay] = useState(() => initialSchedule.day || 'Lunes');
  const [time, setTime] = useState(() => initialSchedule.time || '08:00');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !openDropdown) return undefined;
    const closeOnPointerDown = (event) => {
      if (event.target instanceof Element && event.target.closest('[data-schedule-dropdown]')) return;
      setOpenDropdown(null);
    };
    document.addEventListener('pointerdown', closeOnPointerDown, true);
    return () => document.removeEventListener('pointerdown', closeOnPointerDown, true);
  }, [isOpen, openDropdown]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (!openDropdown && event.target instanceof HTMLSelectElement) return;
      event.preventDefault();
      event.stopPropagation();
      if (openDropdown) setOpenDropdown(null);
      else onClose();
    };
    document.addEventListener('keydown', closeOnEscape, true);
    return () => document.removeEventListener('keydown', closeOnEscape, true);
  }, [isOpen, onClose, openDropdown]);

  const regionTree = useMemo(() => makeTwoLevelTree(obras, 'region', 'estado', (estado) => Object.entries(ESTADOS_POR_REGION_CATALOG).find(([, estados]) => estados.some((value) => normalize(value) === normalize(estado)))?.[0]), [obras]);
  const categoryTree = useMemo(() => makeCategoryTree(obras), [obras]);
  const projectTree = useMemo(() => makeTwoLevelTree(obras, 'tipoProyecto', 'etapa'), [obras]);
  const sectors = useMemo(() => uniqueOptions(obras, 'sector'), [obras]);
  const developments = useMemo(() => uniqueOptions(obras, 'tipoDesarrollo'), [obras]);
  const rangeBaseObras = useMemo(() => filterObrasByFilters(obras, { ...draftFilters, investmentMin: null, investmentMax: null, surfaceMin: null, surfaceMax: null, superficie: [] }), [draftFilters, obras]);
  const investmentBounds = useMemo(() => getNumericBounds(rangeBaseObras, 'inversion', { defaultMax: 1000000, include: (value) => value > 0 }), [rangeBaseObras]);
  const surfaceBounds = useMemo(() => getNumericBounds(rangeBaseObras, 'superficie', { defaultMax: 1000, include: (value) => value >= 0 }), [rangeBaseObras]);
  const investmentRange = useMemo(() => resolveRange(draftFilters.investmentMin, draftFilters.investmentMax, investmentBounds), [draftFilters.investmentMin, draftFilters.investmentMax, investmentBounds]);
  const surfaceRange = useMemo(() => resolveRange(draftFilters.surfaceMin, draftFilters.surfaceMax, surfaceBounds), [draftFilters.surfaceMin, draftFilters.surfaceMax, surfaceBounds]);
  const customFilters = useMemo(() => ({ ...draftFilters, investmentMin: investmentRange.isFiltered ? investmentRange.min : null, investmentMax: investmentRange.isFiltered ? investmentRange.max : null, surfaceMin: surfaceRange.isFiltered ? surfaceRange.min : null, surfaceMax: surfaceRange.isFiltered ? surfaceRange.max : null }), [draftFilters, investmentRange, surfaceRange]);
  const activeFilters = usesCurrentFilters ? cloneFilters(filtros) : customFilters;
  const resultCount = useMemo(() => filterObrasByFilters(obras, activeFilters).length, [activeFilters, obras]);
  const filterSummary = useMemo(() => getFilterSummary(activeFilters), [activeFilters]);
  const reportLabel = downloadOptions.find((option) => option.value === reportType)?.label || 'Reporte';
  const isMonthly = frequency === 'monthly';

  if (!isOpen) return null;

  const updateFilters = (next) => setDraftFilters((current) => ({ ...current, ...next }));
  const updateFilter = (key, value) => updateFilters({ [key]: value, ...(key === 'fechaInicio' ? { fechaRango: { ...draftFilters.fechaRango, desde: value } } : {}), ...(key === 'fechaFin' ? { fechaRango: { ...draftFilters.fechaRango, hasta: value } } : {}) });
  const toggleDropdown = (key) => setOpenDropdown((current) => current === key ? null : key);
  const selectSource = (source) => updateFilters({ fuentes: draftFilters.fuentes.includes(source) ? draftFilters.fuentes.filter((value) => value !== source) : [...draftFilters.fuentes, source] });
  const saveSchedule = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())) { setError('Indica un correo válido para guardar la programación.'); return; }
    onSave({ id: scheduledReport?.id, reportType, recipient: recipient.trim(), frequency, day, time, filterMode: usesCurrentFilters ? 'current' : 'custom', filters: cloneFilters(activeFilters), reportLabel, resultCount });
  };

  return <Box position="fixed" inset={0} zIndex={1200} bg="rgba(24, 33, 47, .52)" p={{ base: 2, md: 5 }} display="flex" alignItems="center" justifyContent="center" onMouseDown={onClose}>
    <Box role="dialog" aria-modal="true" aria-labelledby="scheduled-report-title" w="min(94vw, 900px)" maxH="min(880px, calc(100dvh - 28px))" overflowY="auto" bg="var(--cl-surface)" border="1px solid var(--cl-border)" borderRadius="16px" boxShadow="0 24px 64px rgba(20, 30, 46, .30)" onMouseDown={(event) => event.stopPropagation()}>
      <Flex px={{ base: 4, md: 6 }} py={4} align="center" gap={3} borderBottom="1px solid var(--cl-border)"><Flex w="42px" h="42px" align="center" justify="center" flexShrink={0} borderRadius="11px" bg="rgba(217, 91, 39, .12)" color="#C64B1D"><FiClock size={20} /></Flex><Box flex="1" minW={0}><Text id="scheduled-report-title" color="var(--cl-text-strong)" fontSize="16px" fontWeight="800">Programa un reporte</Text><Text mt={.5} color="var(--cl-text-muted)" fontSize="11px">Define la frecuencia y conserva la búsqueda exacta que debe usar.</Text></Box><Button variant="outline" minW="34px" h="34px" p={0} borderColor="var(--cl-border)" color="var(--cl-text-muted)" aria-label="Cerrar programación" onClick={onClose}><FiX size={18} /></Button></Flex>
      <Box p={{ base: 4, md: 6 }}>
        {scheduledReport && <Flex mb={5} p={3} align="center" gap={2.5} border="1px solid rgba(217, 91, 39, .22)" borderRadius="10px" bg="rgba(217, 91, 39, .07)"><Flex w="26px" h="26px" flexShrink={0} align="center" justify="center" borderRadius="full" bg="#D95B27" color="white"><FiCheck size={14} /></Flex><Box minW={0}><Text color="#A9431C" fontSize="11px" fontWeight="800">Ya tienes una programación guardada</Text><Text mt={.5} color="var(--cl-text-muted)" fontSize="10px" lineClamp={1}>{scheduledReport.reportLabel} · {scheduledReport.frequency === 'monthly' ? `día ${scheduledReport.day}` : `cada ${scheduledReport.day}`} · {scheduledReport.time}</Text></Box></Flex>}
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <Box><Text mb={1} color="var(--cl-text-muted)" fontSize="10px" fontWeight="800">Formato</Text><Box as="select" value={reportType} onChange={(event) => setReportType(event.target.value)} {...inputStyle}>{downloadOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Box></Box>
          <Box><Text mb={1} color="var(--cl-text-muted)" fontSize="10px" fontWeight="800">Destinatario</Text><Flex align="center" gap={2} px={3} h="38px" bg="var(--cl-input-bg)" border="1px solid var(--cl-border)" borderRadius="8px" color="var(--cl-text-muted)"><FiMail size={15} /><Box as="input" value={recipient} onChange={(event) => { setRecipient(event.target.value); setError(''); }} placeholder="correo@empresa.com" flex="1" minW={0} bg="transparent" border={0} color="var(--cl-text)" fontSize="12px" outline="none" /></Flex></Box>
          <Box><Text mb={1} color="var(--cl-text-muted)" fontSize="10px" fontWeight="800">Frecuencia</Text><Box as="select" value={frequency} onChange={(event) => { const value = event.target.value; setFrequency(value); setDay(value === 'monthly' ? '1' : 'Lunes'); }} {...inputStyle}><option value="weekly">Semanal</option><option value="monthly">Mensual</option></Box></Box>
          <SimpleGrid columns="2" gap={3}><Box><Text mb={1} color="var(--cl-text-muted)" fontSize="10px" fontWeight="800">{isMonthly ? 'Día del mes' : 'Día de envío'}</Text><Box as="select" value={day} onChange={(event) => setDay(event.target.value)} {...inputStyle}>{isMonthly ? Array.from({ length: 28 }, (_, index) => <option key={index + 1} value={String(index + 1)}>Día {index + 1}</option>) : WEEK_DAYS.map((weekDay) => <option key={weekDay} value={weekDay}>{weekDay}</option>)}</Box></Box><Box><Text mb={1} color="var(--cl-text-muted)" fontSize="10px" fontWeight="800">Hora</Text><Box as="input" type="time" value={time} onChange={(event) => setTime(event.target.value)} {...inputStyle} /></Box></SimpleGrid>
        </SimpleGrid>
        <Box mt={6} pt={5} borderTop="1px solid var(--cl-border)"><Flex align={{ base: 'start', md: 'center' }} justify="space-between" gap={3} direction={{ base: 'column', md: 'row' }}><Box><Flex align="center" gap={2}><FiSliders size={15} color="#D95B27" /><Text color="var(--cl-text-strong)" fontSize="13px" fontWeight="800">Criterios de búsqueda</Text></Flex><Text mt={.5} color="var(--cl-text-muted)" fontSize="11px">La programación guarda una instantánea; el sidebar puede seguir cambiando sin alterarla.</Text></Box><Text px={2.5} py={1} borderRadius="full" bg="var(--cl-surface-muted)" color="var(--cl-text-muted)" fontSize="10px" fontWeight="800">{resultCount.toLocaleString('es-MX')} obras</Text></Flex>
          <Flex mt={4} gap={2} wrap="wrap"><Button size="sm" h="33px" borderRadius="8px" bg={usesCurrentFilters ? '#D95B27' : 'var(--cl-surface)'} color={usesCurrentFilters ? 'white' : 'var(--cl-text)'} border="1px solid" borderColor={usesCurrentFilters ? '#D95B27' : 'var(--cl-border)'} leftIcon={<FiCheck size={14} />} onClick={() => { setOpenDropdown(null); setUsesCurrentFilters(true); setDraftFilters(cloneFilters(filtros)); }}>Usar selección actual</Button><Button size="sm" h="33px" borderRadius="8px" variant="outline" borderColor={!usesCurrentFilters ? '#D95B27' : 'var(--cl-border)'} color={!usesCurrentFilters ? '#B9471E' : 'var(--cl-text)'} leftIcon={<FiSliders size={14} />} onClick={() => { setOpenDropdown(null); setUsesCurrentFilters(false); }}>Configurar parámetros</Button></Flex>
          {usesCurrentFilters ? <Box mt={3} p={3} border="1px solid var(--cl-border)" borderRadius="10px" bg="var(--cl-surface-muted)"><Flex align="center" gap={2}><FiCalendar size={14} color="#718096" /><Text color="var(--cl-text)" fontSize="11px" fontWeight="700">Selección actual</Text></Flex><Flex mt={2} gap={1.5} wrap="wrap">{filterSummary.length ? filterSummary.slice(0, 5).map((item) => <Text key={item} px={2} py={.5} borderRadius="full" bg="var(--cl-surface)" border="1px solid var(--cl-border)" color="var(--cl-text-muted)" fontSize="10px">{item}</Text>) : <Text color="var(--cl-text-muted)" fontSize="11px">Sin filtros activos: se incluirá el catálogo disponible.</Text>}{filterSummary.length > 5 && <Text px={2} py={.5} borderRadius="full" bg="var(--cl-surface)" border="1px solid var(--cl-border)" color="var(--cl-text-muted)" fontSize="10px">+{filterSummary.length - 5} criterios</Text>}</Flex></Box> : <Box mt={4} p={{ base: 3, md: 4 }} border="1px solid var(--cl-border)" borderRadius="12px" bg="var(--cl-surface-muted)">
            <Flex mb={4} align="center" justify="space-between" gap={3}><Flex align="center" gap={2}><Flex w="27px" h="27px" align="center" justify="center" borderRadius="8px" bg="rgba(217, 91, 39, .10)" color="#C64B1D"><FiLayers size={14} /></Flex><Box><Text color="var(--cl-text)" fontSize="11px" fontWeight="800">Parámetros del reporte</Text><Text color="var(--cl-text-muted)" fontSize="10px">Árboles conectados, como en el sidebar de filtros.</Text></Box></Flex><Button size="xs" variant="ghost" color="#B9471E" onClick={() => { setOpenDropdown(null); setDraftFilters(createEmptyFilters()); }}>Limpiar</Button></Flex>
            <Box mb={4} p={3} border="1px solid var(--cl-border)" borderRadius="10px" bg="var(--cl-surface)"><Flex align="center" justify="space-between" gap={3} wrap="wrap"><Box><Text color="var(--cl-text)" fontSize="11px" fontWeight="800">Fuentes</Text><Text mt={.5} color="var(--cl-text-muted)" fontSize="10px">Elige los catálogos que alimentan esta programación.</Text></Box><Flex gap={1.5} wrap="wrap">{[['construleads', 'Construleads'], ['explorer', 'Explorer']].map(([value, label]) => { const selected = draftFilters.fuentes.includes(value); return <Button key={value} size="xs" h="29px" borderRadius="full" bg={selected ? 'rgba(217, 91, 39, .13)' : 'var(--cl-input-bg)'} color={selected ? '#B9471E' : 'var(--cl-text-muted)'} border="1px solid" borderColor={selected ? '#EAA98F' : 'var(--cl-border)'} onClick={() => selectSource(value)}>{selected && <FiCheck size={12} style={{ marginRight: 4 }} />}{label}</Button>; })}</Flex></Flex></Box>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
              <DropdownShell id="schedule-region" label="Ubicación" value={selectedLabel([...draftFilters.regiones, ...draftFilters.estados])} isOpen={openDropdown === 'region'} onToggle={() => toggleDropdown('region')}><TwoLevelTreeMenu intro="Selecciona una región o afina por estado." groups={regionTree} parentValues={draftFilters.regiones} childValues={draftFilters.estados} onChange={({ parent, child }) => updateFilters({ regiones: parent, estados: child })} /></DropdownShell>
              <DropdownShell id="schedule-category" label="Clasificación" value={selectedLabel([...draftFilters.generos, ...draftFilters.subgeneros, ...draftFilters.tipoObra])} isOpen={openDropdown === 'category'} onToggle={() => toggleDropdown('category')}><CategoryTreeMenu groups={categoryTree} generos={draftFilters.generos} subgeneros={draftFilters.subgeneros} tiposObra={draftFilters.tipoObra} onChange={updateFilters} /></DropdownShell>
              <DropdownShell id="schedule-project" label="Proyecto y etapa" value={selectedLabel([...draftFilters.tiposProyecto, ...draftFilters.etapas])} isOpen={openDropdown === 'project'} onToggle={() => toggleDropdown('project')}><TwoLevelTreeMenu intro="El tipo de proyecto contiene sus etapas disponibles." groups={projectTree} parentValues={draftFilters.tiposProyecto} childValues={draftFilters.etapas} onChange={({ parent, child }) => updateFilters({ tiposProyecto: parent, etapas: child })} /></DropdownShell>
              <DropdownShell id="schedule-sector" label="Sector" value={selectedLabel(draftFilters.sectores)} isOpen={openDropdown === 'sector'} onToggle={() => toggleDropdown('sector')} disabled={!sectors.length}><FlatOptionsMenu label="Sector" options={sectors} values={draftFilters.sectores} onChange={(values) => updateFilter('sectores', values)} /></DropdownShell>
              <DropdownShell id="schedule-development" label="Tipo de desarrollo" value={selectedLabel(draftFilters.desarrollos)} isOpen={openDropdown === 'development'} onToggle={() => toggleDropdown('development')} disabled={!developments.length}><FlatOptionsMenu label="Tipo de desarrollo" options={developments} values={draftFilters.desarrollos} onChange={(values) => updateFilter('desarrollos', values)} /></DropdownShell>
            </SimpleGrid>
            <Box mt={3} p={3} border="1px solid var(--cl-border)" borderRadius="10px" bg="var(--cl-surface)"><SimpleGrid columns={{ base: 1, md: 3 }} gap={3}><Box><Text mb={1} color="var(--cl-text-muted)" fontSize="10px" fontWeight="800">Criterio de fecha</Text><Box as="select" value={draftFilters.fechaConsulta || DATE_OPTIONS[0]} onChange={(event) => updateFilter('fechaConsulta', event.target.value)} {...inputStyle}>{DATE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</Box></Box><Box><Text mb={1} color="var(--cl-text-muted)" fontSize="10px" fontWeight="800">Periodo</Text><Box as="select" value={String(draftFilters.periodoIndex ?? -1)} onChange={(event) => updateFilter('periodoIndex', Number(event.target.value))} {...inputStyle}>{PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Box></Box><Box><Text mb={1} color="var(--cl-text-muted)" fontSize="10px" fontWeight="800">Rango de fecha</Text><Flex gap={1.5}><Box as="input" type="date" value={draftFilters.fechaInicio || ''} onChange={(event) => updateFilter('fechaInicio', event.target.value)} {...inputStyle} minW={0} px={2} /><Box as="input" type="date" value={draftFilters.fechaFin || ''} onChange={(event) => updateFilter('fechaFin', event.target.value)} {...inputStyle} minW={0} px={2} /></Flex></Box></SimpleGrid></Box>
            <SimpleGrid mt={3} columns={{ base: 1, md: 2 }} gap={3}><DualRange id="schedule-investment" label="Inversión (MXN)" hint="Límites calculados con la búsqueda disponible." bounds={investmentBounds} range={investmentRange} step={1000000} scale={1000000} suffix="M" onChange={(min, max) => updateFilters({ investmentMin: min, investmentMax: max })} /><DualRange id="schedule-surface" label="Superficie (m²)" hint="Límites calculados con la búsqueda disponible." bounds={surfaceBounds} range={surfaceRange} suffix="m²" onChange={(min, max) => updateFilters({ surfaceMin: min, surfaceMax: max })} /></SimpleGrid>
          </Box>}
        </Box>
        <Flex mt={5} p={3} gap={2.5} align="start" border="1px solid rgba(40, 84, 197, .18)" borderRadius="10px" bg="rgba(40, 84, 197, .06)"><FiClock size={15} color="#2854C5" style={{ flexShrink: 0, marginTop: 2 }} /><Text color="var(--cl-text-muted)" fontSize="10px" lineHeight="1.45">Esta versión guarda la configuración en este navegador. La ejecución y el envío automático por correo se habilitarán al conectar el servicio de programación.</Text></Flex>{error && <Text mt={3} color="#B42318" fontSize="11px" fontWeight="700">{error}</Text>}
      </Box>
      <Flex px={{ base: 4, md: 6 }} py={4} align="center" justify="space-between" gap={3} borderTop="1px solid var(--cl-border)"><Box>{scheduledReport && <Button size="sm" variant="ghost" color="#B9471E" onClick={onClear}>Desactivar</Button>}</Box><Flex gap={2}><Button size="sm" variant="outline" borderColor="var(--cl-border)" color="var(--cl-text)" onClick={onClose}>Cancelar</Button><Button size="sm" bg="#D95B27" color="white" _hover={{ bg: '#B9471E' }} onClick={saveSchedule}>{scheduledReport ? 'Actualizar programación' : 'Programar reporte'}</Button></Flex></Flex>
    </Box>
  </Box>;
}
