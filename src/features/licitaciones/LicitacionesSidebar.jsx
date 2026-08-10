import { useMemo, useState } from 'react';
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react';
import { FiChevronDown } from 'react-icons/fi';
import { getUniqueOptions } from './licitacionesUtils';

const DATE_FIELDS = ['fecha_de_publicacion', 'fecha_de_apertura', 'fecha_de_fallo'];
const DATE_OPTIONS = ['Fecha de publicación', 'Fecha de apertura', 'Fecha de fallo'];
const PERIOD_OPTIONS = ['Sin periodo', 'Hoy', '1 día', '7 días', '1 mes', '3 meses', '6 meses'];
const amountFormatter = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

function getAmountStep(min, max) {
  const span = Math.max(max - min, 0);
  if (span <= 100) return 1;
  return Math.max(1, 10 ** Math.max(0, Math.floor(Math.log10(span)) - 2));
}

function ContractAmountContent({ amountBounds, amountRange, onChange }) {
  if (!amountBounds || amountRange.min === null || amountRange.max === null) {
    return <Text p={3} fontSize="11px" color="var(--cl-text-muted)">No hay montos de contrato disponibles.</Text>;
  }
  const minBound = amountBounds.min;
  const maxBound = amountBounds.max;
  const min = amountRange.min;
  const max = amountRange.max;
  const span = Math.max(maxBound - minBound, 1);
  const minPercent = ((min - minBound) / span) * 100;
  const maxPercent = ((max - minBound) / span) * 100;
  const step = getAmountStep(minBound, maxBound);
  const update = (nextMin, nextMax) => onChange({
    min: Math.min(Math.max(nextMin, minBound), maxBound),
    max: Math.min(Math.max(Math.max(nextMin, nextMax), minBound), maxBound),
  });

  return <Box p={3}>
    <Flex gap={2} mb={3}>
      <Box flex="1" minW={0}>
        <Text fontSize="10px" fontWeight="700" color="var(--cl-text-muted)" mb={1}>Desde</Text>
        <Flex align="center" h="34px" px={2} border="1px solid var(--cl-border)" borderRadius="7px" bg="var(--cl-input-bg)">
          <Text fontSize="11px" color="var(--cl-text-muted)" mr={1}>$</Text>
          <Text fontSize="12px" fontWeight="700" color="var(--cl-text)" lineClamp={1}>{amountFormatter.format(min)}</Text>
        </Flex>
      </Box>
      <Box flex="1" minW={0}>
        <Text fontSize="10px" fontWeight="700" color="var(--cl-text-muted)" mb={1}>Hasta</Text>
        <Flex align="center" h="34px" px={2} border="1px solid var(--cl-border)" borderRadius="7px" bg="var(--cl-input-bg)">
          <Text fontSize="11px" color="var(--cl-text-muted)" mr={1}>$</Text>
          <Text fontSize="12px" fontWeight="700" color="var(--cl-text)" lineClamp={1}>{amountFormatter.format(max)}</Text>
        </Flex>
      </Box>
    </Flex>
    <Box position="relative" h="30px" mt={1}>
      <Box position="absolute" left={0} right={0} top="13px" h="4px" bg="var(--cl-border)" borderRadius="999px" />
      <Box position="absolute" top="13px" h="4px" bg="#4B5563" borderRadius="999px" left={`${minPercent}%`} width={`${Math.max(maxPercent - minPercent, 0)}%`} />
      <input className="licitaciones-sidebar-amount-min" type="range" min={minBound} max={maxBound} step={step} value={min}
        onChange={(event) => update(Math.min(Number(event.target.value), max), max)} aria-label="Monto mínimo del contrato" />
      <input className="licitaciones-sidebar-amount-max" type="range" min={minBound} max={maxBound} step={step} value={max}
        onChange={(event) => update(min, Math.max(Number(event.target.value), min))} aria-label="Monto máximo del contrato" />
    </Box>
    <Text mt={2} fontSize="10px" color="var(--cl-text-muted)">Rango calculado con los filtros anteriores.</Text>
    <style>{`
      .licitaciones-sidebar-amount-min, .licitaciones-sidebar-amount-max { position: absolute; left: 0; top: -2px; width: 100%; height: 30px; appearance: none; background: transparent; pointer-events: none; }
      .licitaciones-sidebar-amount-min { z-index: 3; }
      .licitaciones-sidebar-amount-max { z-index: 4; }
      .licitaciones-sidebar-amount-min::-webkit-slider-thumb, .licitaciones-sidebar-amount-max::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #4B5563; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,.16); cursor: pointer; pointer-events: auto; }
      .licitaciones-sidebar-amount-min::-webkit-slider-runnable-track, .licitaciones-sidebar-amount-max::-webkit-slider-runnable-track { height: 4px; background: transparent; }
      .licitaciones-sidebar-amount-min::-moz-range-thumb, .licitaciones-sidebar-amount-max::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #4B5563; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,.16); cursor: pointer; pointer-events: auto; }
      .licitaciones-sidebar-amount-min::-moz-range-track, .licitaciones-sidebar-amount-max::-moz-range-track { height: 4px; background: transparent; }
    `}</style>
  </Box>;
}

function AccordionSection({ id, label, count = 0, openSection, setOpenSection, children }) {
  const isOpen = openSection === id;
  return (
    <Box border="1px solid var(--cl-border)" borderRadius="12px" bg="var(--cl-surface)" overflow="hidden">
      <Flex
        as="button"
        type="button"
        w="100%"
        px={3}
        py={2.5}
        align="center"
        justify="space-between"
        textAlign="left"
        onClick={() => setOpenSection(isOpen ? null : id)}
        aria-expanded={isOpen}
      >
        <Flex align="center" gap={2} minW={0}>
          <Text fontSize="12px" fontWeight="700" color="var(--cl-text-strong)" lineClamp={1}>{label}</Text>
          {!!count && <Text fontSize="9px" color="#FF653F" fontWeight="700">{count}</Text>}
        </Flex>
        <Box as={FiChevronDown} boxSize="14px" color="var(--cl-text-muted)"
          transform={isOpen ? 'rotate(180deg)' : 'none'} transition="transform 160ms ease" />
      </Flex>
      {isOpen && <Box borderTop="1px solid var(--cl-border)">{children}</Box>}
    </Box>
  );
}

function SelectContent({ value, options, onChange }) {
  return (
    <Stack p={2} gap={0.5}>
      {options.map((option, index) => {
        const selected = Number(value) === index;
        return <Flex as="button" type="button" key={option} align="center" gap={2} px={2} py={1.5}
          borderRadius="8px" textAlign="left" bg={selected ? 'var(--cl-orange-soft)' : 'transparent'}
          _hover={{ bg: selected ? 'var(--cl-orange-soft)' : 'var(--cl-hover)' }} onClick={() => onChange(index)}>
          <Box w="13px" h="13px" flexShrink={0} borderRadius="full" border="1.5px solid"
            borderColor={selected ? 'var(--cl-orange)' : 'var(--cl-text-muted)'} p="3px">
            {selected && <Box w="100%" h="100%" borderRadius="full" bg="var(--cl-orange)" />}
          </Box>
          <Text fontSize="11px" fontWeight={selected ? 700 : 500} color="var(--cl-text)">{option}</Text>
        </Flex>;
      })}
    </Stack>
  );
}

function MultiContent({ field, options, filters, setFilters }) {
  const selected = filters[field] || [];
  const toggle = (value) => setFilters((current) => ({
    ...current,
    [field]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
  }));
  return (
    <Stack maxH="clamp(220px, 52vh, 560px)" overflowY="auto" p={2} gap={0.5}>
      {options.map((option) => (
        <Flex as="label" key={option} gap={2} align="center" px={2} py={1.5} borderRadius="8px" cursor="pointer"
          _hover={{ bg: 'var(--cl-hover)' }}>
          <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} />
          <Text fontSize="11px" color="var(--cl-text)" lineClamp={2}>{option}</Text>
        </Flex>
      ))}
    </Stack>
  );
}

export default function LicitacionesSidebar({ data, filters, setFilters, amountBounds, amountRange }) {
  const [openSection, setOpenSection] = useState(null);
  const dynamic = useMemo(() => ({
    states: getUniqueOptions(data, 'estado').filter((value) => value !== 'Sin información'),
    orders: getUniqueOptions(data, 'orden_de_gobierno').filter((value) => value !== 'Sin información'),
    procedures: getUniqueOptions(data, 'tipo_de_procedimiento').filter((value) => value !== 'Sin información'),
    statuses: getUniqueOptions(data, 'estatus').filter((value) => value !== 'Sin información'),
    sources: getUniqueOptions(data, 'fuente_del_registro').filter((value) => value !== 'Sin información'),
  }), [data]);
  const clear = () => setFilters({
    dateField: 'fecha_de_publicacion', periodIndex: -1, states: [], orders: [],
    procedures: [], statuses: [], sources: [], amountMin: null, amountMax: null,
  });
  const multiSections = [
    ['states', 'Estado', dynamic.states], ['orders', 'Orden de gobierno', dynamic.orders],
    ['procedures', 'Tipo de procedimiento', dynamic.procedures], ['statuses', 'Estatus', dynamic.statuses],
    ['sources', 'Fuente del registro', dynamic.sources],
  ];

  return (
    <Box w="var(--cl-sidebar-width)" h="100%" border="1px solid var(--cl-border)" borderRadius="12px"
      bg="var(--cl-surface)" p={3} overflowY="auto" flexShrink={0}>
      <Flex justify="space-between" align="center" mb={3}>
        <Box><Text fontWeight="700" fontSize="14px" color="var(--cl-text-strong)">Licitaciones</Text>
          <Text fontSize="10px" color="var(--cl-text-muted)">Filtros de búsqueda</Text></Box>
        <Button size="xs" variant="ghost" color="#FF653F" onClick={clear}>Limpiar</Button>
      </Flex>
      <Stack gap={2}>
        <AccordionSection id="date" label="Tipo de fecha" {...{ openSection, setOpenSection }}>
          <SelectContent value={DATE_FIELDS.indexOf(filters.dateField)} options={DATE_OPTIONS}
            onChange={(value) => { setFilters((current) => ({ ...current, dateField: DATE_FIELDS[Number(value)] })); setOpenSection(null); }} />
        </AccordionSection>
        <AccordionSection id="period" label="Periodo de consulta" {...{ openSection, setOpenSection }}>
          <SelectContent value={filters.periodIndex + 1} options={PERIOD_OPTIONS}
            onChange={(value) => { setFilters((current) => ({ ...current, periodIndex: Number(value) - 1 })); setOpenSection(null); }} />
        </AccordionSection>
        <AccordionSection id="amount" label="Monto del contrato" count={amountRange?.active ? 1 : 0}
          {...{ openSection, setOpenSection }}>
          <ContractAmountContent {...{ amountBounds, amountRange }} onChange={({ min, max }) => {
            setFilters((current) => ({ ...current, amountMin: min, amountMax: max }));
          }} />
        </AccordionSection>
        {multiSections.map(([field, label, options]) => options.length ? (
          <AccordionSection key={field} id={field} label={label} count={(filters[field] || []).length}
            {...{ openSection, setOpenSection }}>
            <MultiContent {...{ field, options, filters, setFilters }} />
          </AccordionSection>
        ) : null)}
      </Stack>
    </Box>
  );
}
