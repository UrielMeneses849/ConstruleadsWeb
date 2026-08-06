import { useMemo, useState } from 'react';
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react';
import { FiChevronDown } from 'react-icons/fi';
import { BIMSA_REGIONS, getUniqueOptions } from './licitacionesUtils';

const DATE_FIELDS = ['fecha_de_publicacion', 'fecha_de_apertura', 'fecha_de_fallo'];
const DATE_OPTIONS = ['Fecha de publicación', 'Fecha de apertura', 'Fecha de fallo'];
const PERIOD_OPTIONS = ['Sin periodo', 'Hoy', '1 día', '7 días', '1 mes', '3 meses', '6 meses'];

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
    <Box p={2.5}>
      <Box as="select" value={value} onChange={(event) => onChange(event.target.value)} w="100%" h="36px"
        border="1px solid var(--cl-border)" borderRadius="9px" bg="var(--cl-input-bg)" color="var(--cl-text)" px={2} fontSize="11px">
        {options.map((option, index) => <option key={option} value={index}>{option}</option>)}
      </Box>
    </Box>
  );
}

function MultiContent({ field, options, filters, setFilters }) {
  const selected = filters[field] || [];
  const toggle = (value) => setFilters((current) => ({
    ...current,
    [field]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
  }));
  return (
    <Stack maxH="190px" overflowY="auto" p={2} gap={0.5}>
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

export default function LicitacionesSidebar({ data, filters, setFilters }) {
  const [openSection, setOpenSection] = useState(null);
  const dynamic = useMemo(() => ({
    states: getUniqueOptions(data, 'estado').filter((value) => value !== 'Sin información'),
    orders: getUniqueOptions(data, 'orden_de_gobierno').filter((value) => value !== 'Sin información'),
    institutions: getUniqueOptions(data, 'institucion_convocante').filter((value) => value !== 'Sin información'),
    procedures: getUniqueOptions(data, 'tipo_de_procedimiento').filter((value) => value !== 'Sin información'),
    statuses: getUniqueOptions(data, 'estatus').filter((value) => value !== 'Sin información'),
    sources: getUniqueOptions(data, 'fuente_del_registro').filter((value) => value !== 'Sin información'),
  }), [data]);
  const clear = () => setFilters({
    dateField: 'fecha_de_publicacion', periodIndex: -1, regions: [], states: [], orders: [],
    institutions: [], procedures: [], statuses: [], sources: [],
  });
  const multiSections = [
    ['regions', 'Región', Object.keys(BIMSA_REGIONS)], ['states', 'Estado', dynamic.states],
    ['orders', 'Orden de gobierno', dynamic.orders], ['institutions', 'Institución convocante', dynamic.institutions],
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
            onChange={(value) => setFilters((current) => ({ ...current, dateField: DATE_FIELDS[Number(value)] }))} />
        </AccordionSection>
        <AccordionSection id="period" label="Periodo de consulta" {...{ openSection, setOpenSection }}>
          <SelectContent value={filters.periodIndex + 1} options={PERIOD_OPTIONS}
            onChange={(value) => setFilters((current) => ({ ...current, periodIndex: Number(value) - 1 }))} />
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
