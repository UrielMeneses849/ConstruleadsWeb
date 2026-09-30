import { useMemo, useState } from 'react';
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react';
import { FiChevronDown } from 'react-icons/fi';
import {
  formatLicitacionDisplayText,
  getUniqueOptions,
  LICITACION_UNASSIGNED_LABEL,
  normalizeSearchText,
} from './licitacionesUtils';

const PERIOD_OPTIONS = ['Todos', '1 día', '7 días', '1 mes', '3 meses', '6 meses', '+ 6 meses'];

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
          {!!count && <Text fontSize="9px" color="#D95B27" fontWeight="700">{count}</Text>}
        </Flex>
        <Box as={FiChevronDown} boxSize="14px" color="var(--cl-text-muted)"
          transform={isOpen ? 'rotate(180deg)' : 'none'} transition="transform 160ms ease" />
      </Flex>
      {isOpen && <Box borderTop="1px solid var(--cl-border)">{children}</Box>}
    </Box>
  );
}

function SelectContent({ value, options, onChange, radioName }) {
  return (
    <Stack p={2} gap={0.5}>
      {options.map((option, index) => {
        const selected = Number(value) === index;
        return <Flex key={option} align="center" px={2} py={1} borderRadius="8px" cursor="pointer"
          transition="all 180ms ease" bg={selected ? 'var(--cl-surface-muted)' : 'var(--cl-surface)'}
          boxShadow={selected ? 'inset 0 0 0 1px var(--cl-border)' : 'none'}
          _hover={{ bg: 'var(--cl-surface-muted)' }} onClick={() => onChange(index)}>
          <input
            type="radio"
            name={radioName}
            checked={selected}
            readOnly
            style={{
              marginRight: 8,
              accentColor: '#4B5563',
              width: 12,
              height: 12,
              cursor: 'pointer',
            }}
          />
          <Text flex={1} fontSize="13px" fontWeight="400" color="var(--cl-text)">{option}</Text>
        </Flex>;
      })}
    </Stack>
  );
}

function isExclusiveSpecialOption(field, value) {
  return field === 'states' && value === LICITACION_UNASSIGNED_LABEL;
}

function displayFilterOption(field, value) {
  if (field === 'activeStatuses') {
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'si', 'sí', 'activo', 'activa'].includes(normalized)) return 'Activo';
    if (['0', 'false', 'no', 'inactivo', 'inactiva'].includes(normalized)) return 'Inactivo';
  }
  return formatLicitacionDisplayText(value);
}

function StatusTreeContent({ groups, filters, setFilters }) {
  const [expandedStatus, setExpandedStatus] = useState(null);
  const selectedStatuses = filters.statuses || [];
  const selectedSubstatuses = filters.substatuses || [];
  const appendMissing = (values, additions) => [
    ...values,
    ...additions.filter((value) => !values.includes(value)),
  ];

  const toggleStatus = (group) => setFilters((current) => {
    const currentStatuses = current.statuses || [];
    const currentSubstatuses = current.substatuses || [];
    const allChildrenSelected = group.children.every((child) => currentSubstatuses.includes(child));
    const fullySelected = currentStatuses.includes(group.label) && allChildrenSelected;

    if (fullySelected) {
      return {
        ...current,
        statuses: currentStatuses.filter((value) => value !== group.label),
        substatuses: currentSubstatuses.filter((value) => !group.children.includes(value)),
      };
    }

    return {
      ...current,
      statuses: appendMissing(currentStatuses, [group.label]),
      substatuses: appendMissing(currentSubstatuses, group.children),
    };
  });

  const toggleSubstatus = (group, substatus) => setFilters((current) => {
    const currentStatuses = current.statuses || [];
    const currentSubstatuses = current.substatuses || [];
    const nextSubstatuses = currentSubstatuses.includes(substatus)
      ? currentSubstatuses.filter((value) => value !== substatus)
      : [...currentSubstatuses, substatus];
    const hasSelectedChild = group.children.some((child) => nextSubstatuses.includes(child));

    return {
      ...current,
      statuses: hasSelectedChild
        ? appendMissing(currentStatuses, [group.label])
        : currentStatuses.filter((value) => value !== group.label),
      substatuses: nextSubstatuses,
    };
  });

  return <Stack maxH="clamp(240px, 56vh, 600px)" overflowY="auto" p={2} gap={1}>
    {!groups.length && <Text px={2} py={2} fontSize="11px" color="var(--cl-text-muted)">No hay estatus disponibles.</Text>}
    {groups.map((group) => {
      const selectedChildren = group.children.filter((child) => selectedSubstatuses.includes(child)).length;
      const parentSelected = selectedStatuses.includes(group.label);
      const selected = parentSelected && selectedChildren === group.children.length;
      const partial = !selected && (parentSelected || selectedChildren > 0);
      const expanded = expandedStatus === group.label;

      return <Box key={group.label}>
        <Flex minH="34px" px={1.5} gap={1} align="center" borderRadius="8px"
          bg={selected || partial ? 'var(--cl-surface-muted)' : 'transparent'}
          boxShadow={selected || partial ? 'inset 0 0 0 1px var(--cl-border)' : 'none'}
          _hover={{ bg: 'var(--cl-hover)' }}>
          <Box as="button" type="button" p={1} aria-label={`Seleccionar estatus ${group.label}`}
            onClick={() => { setExpandedStatus(group.label); toggleStatus(group); }}>
            <input type="checkbox" checked={selected} readOnly ref={(input) => { if (input) input.indeterminate = partial; }}
              style={{ accentColor: '#4B5563', width: 12, height: 12, cursor: 'pointer', pointerEvents: 'none' }} />
          </Box>
          <Box as="button" type="button" flex="1" minW={0} py={1.5} textAlign="left"
            onClick={() => setExpandedStatus((current) => current === group.label ? null : group.label)}>
            <Text fontSize="11px" fontWeight="700" color="var(--cl-text)" lineClamp={2}>{formatLicitacionDisplayText(group.label)}</Text>
          </Box>
          {!!group.children.length && <Box as="button" type="button" p={1} color="var(--cl-text-muted)"
            aria-label={`Mostrar subestatus de ${group.label}`}
            onClick={() => setExpandedStatus((current) => current === group.label ? null : group.label)}>
            <Text fontSize="18px" lineHeight="1" transform={expanded ? 'rotate(90deg)' : 'none'} transition="transform 160ms ease">›</Text>
          </Box>}
        </Flex>
        {expanded && !!group.children.length && <Box pl={5} pt={1}>
          <Text px={1.5} pb={1} fontSize="10px" fontWeight="700" color="var(--cl-text-muted)">Subestatus</Text>
          {group.children.map((substatus) => {
            const childSelected = selectedSubstatuses.includes(substatus);
            return <Flex as="button" type="button" key={`${group.label}-${substatus}`} w="100%" minH="30px" px={1.5} gap={2}
              align="center" borderRadius="7px" textAlign="left" bg={childSelected ? 'var(--cl-surface-muted)' : 'transparent'}
              color="var(--cl-text)" _hover={{ bg: 'var(--cl-hover)' }} onClick={() => toggleSubstatus(group, substatus)}>
              <input type="checkbox" checked={childSelected} readOnly
                style={{ accentColor: '#4B5563', width: 12, height: 12, pointerEvents: 'none' }} />
              <Text fontSize="10px" lineClamp={2}>{formatLicitacionDisplayText(substatus)}</Text>
            </Flex>;
          })}
        </Box>}
      </Box>;
    })}
  </Stack>;
}

function MultiContent({ field, options, filters, setFilters }) {
  const selected = filters[field] || [];
  const toggle = (value) => setFilters((current) => {
    const currentValues = current[field] || [];
    if (isExclusiveSpecialOption(field, value)) {
      return { ...current, [field]: currentValues.includes(value) ? [] : [value] };
    }

    const withoutSpecial = currentValues.filter((item) => !isExclusiveSpecialOption(field, item));
    return {
      ...current,
      [field]: withoutSpecial.includes(value)
        ? withoutSpecial.filter((item) => item !== value)
        : [...withoutSpecial, value],
    };
  });
  return (
    <Stack maxH="clamp(220px, 52vh, 560px)" overflowY="auto" p={2} gap={0.5}>
      {!options.length && <Text px={2} py={2} fontSize="11px" color="var(--cl-text-muted)">No hay opciones disponibles.</Text>}
      {options.map((option) => {
        const isUnassignedState = isExclusiveSpecialOption(field, option);
        return <Flex as="label" key={option} gap={2} align="center" px={2} py={isUnassignedState ? 2 : 1.5} borderRadius="8px" cursor="pointer"
          border={isUnassignedState ? '1px solid' : '1px solid transparent'}
          borderColor={isUnassignedState && selected.includes(option) ? '#F0BFAE' : 'transparent'}
          bg={isUnassignedState && selected.includes(option) ? 'var(--cl-orange-soft)' : 'transparent'}
          _hover={{ bg: isUnassignedState ? 'var(--cl-orange-soft)' : 'var(--cl-hover)' }}>
          <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} />
          <Box>
            <Text fontSize="11px" fontWeight={isUnassignedState ? '700' : '400'} color="var(--cl-text)" lineClamp={2}>{displayFilterOption(field, option)}</Text>
            {isUnassignedState && <Text fontSize="9px" color="var(--cl-text-muted)">Estado no reportado</Text>}
          </Box>
        </Flex>;
      })}
    </Stack>
  );
}

export default function LicitacionesSidebar({ data, filters, setFilters, onClear, availableStates }) {
  // Un único panel abierto mantiene la barra ordenada. Las selecciones dentro
  // del panel no modifican este estado, así que no lo cierran accidentalmente.
  const [openSection, setOpenSection] = useState(null);
  const statusGroups = useMemo(() => {
    const groups = new Map();
    data.forEach((item) => {
      const status = String(item.estatus || '').trim();
      if (!status || status === 'Sin información') return;
      const key = normalizeSearchText(status);
      if (!groups.has(key)) groups.set(key, { label: status, children: new Map() });
      const substatus = String(item.subestatus || '').trim();
      if (substatus && substatus !== 'Sin información') {
        groups.get(key).children.set(normalizeSearchText(substatus), substatus);
      }
    });
    return [...groups.values()]
      .map((group) => ({
        label: group.label,
        children: [...group.children.values()].sort((a, b) => a.localeCompare(b, 'es')),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [data]);
  const dynamic = useMemo(() => ({
    states: (() => {
      const values = getUniqueOptions(availableStates, 'estado');
      return values.includes(LICITACION_UNASSIGNED_LABEL)
        ? [LICITACION_UNASSIGNED_LABEL, ...values.filter((value) => value !== LICITACION_UNASSIGNED_LABEL)]
        : values;
    })(),
    orders: getUniqueOptions(data, 'orden_de_gobierno').filter((value) => value !== 'Sin información'),
    procedures: getUniqueOptions(data, 'tipo_de_procedimiento').filter((value) => value !== 'Sin información'),
    sectors: getUniqueOptions(data, 'sector').filter((value) => value !== 'Sin información'),
    activeStatuses: getUniqueOptions(data, 'activo').filter((value) => value !== 'Sin información'),
    developments: getUniqueOptions(data, 'desarrollo').filter((value) => value !== 'Sin información'),
  }), [availableStates, data]);
  const multiSections = [
    ['procedures', 'Tipo de procedimiento', dynamic.procedures],
    ['sectors', 'Sector', dynamic.sectors],
    ['activeStatuses', 'Activo', dynamic.activeStatuses],
    ['developments', 'Desarrollo', dynamic.developments],
    ['orders', 'Orden de gobierno', dynamic.orders],
    ['states', 'Entidad Federativa', dynamic.states],
  ];

  return (
    <Box w="var(--cl-sidebar-width)" h="100%" border="1px solid var(--cl-border)" borderRadius="12px"
      bg="var(--cl-surface)" p={3} overflowY="auto" flexShrink={0}>
      <Flex justify="space-between" align="center" mb={3}>
        <Box><Text fontWeight="700" fontSize="14px" color="var(--cl-text-strong)">Licitaciones</Text>
          <Text fontSize="10px" color="var(--cl-text-muted)">Filtros de búsqueda</Text></Box>
        <Button size="xs" variant="ghost" color="#D95B27" onClick={onClear}>Limpiar</Button>
      </Flex>
      <Stack gap={2}>
        <AccordionSection id="status" label="Estatus" count={(filters.statuses || []).length + (filters.substatuses || []).length}
          {...{ openSection, setOpenSection }}>
          <StatusTreeContent groups={statusGroups} {...{ filters, setFilters }} />
        </AccordionSection>
        <AccordionSection id="period" label="Fecha de publicación" count={filters.periodIndex >= 0 ? 1 : 0}
          {...{ openSection, setOpenSection }}>
          <Text px={4} pt={3} fontSize="10px" fontWeight="700" color="var(--cl-text-muted)">Periodo de consulta</Text>
          <SelectContent value={filters.periodIndex + 1} options={PERIOD_OPTIONS}
            radioName="licitaciones-periodo-consulta"
            onChange={(value) => setFilters((current) => ({ ...current, periodIndex: Number(value) - 1 }))} />
        </AccordionSection>
        {multiSections.map(([field, label, options]) => (
          <AccordionSection key={field} id={field} label={label} count={(filters[field] || []).length}
            {...{ openSection, setOpenSection }}>
            <MultiContent {...{ field, options, filters, setFilters }} />
          </AccordionSection>
        ))}
      </Stack>
    </Box>
  );
}
