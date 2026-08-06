import { Box, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import { FiExternalLink, FiStar, FiX } from 'react-icons/fi';
import { formatLicitacionAmount, formatLicitacionDate, LICITACION_EMPTY_VALUE } from './licitacionesUtils';

function DetailGroup({ title, items }) {
  const visible = items.filter((item) => item.value && item.value !== LICITACION_EMPTY_VALUE);
  if (!visible.length) return null;
  return <Box><Text fontSize="10px" color="#FF653F" fontWeight="800" letterSpacing=".12em" mb={3}>{title}</Text>
    <Stack gap={3}>{visible.map((item) => <Box key={item.label}><Text fontSize="9px" color="var(--cl-text-muted)" fontWeight="700">{item.label.toUpperCase()}</Text>
      <Text fontSize="12px" color="var(--cl-text-strong)" mt={0.5}>{item.value}</Text></Box>)}</Stack></Box>;
}

export default function LicitacionDrawer({ item, followed, onToggleFollow, onClose }) {
  if (!item) return null;
  const timeline = [
    ['Publicación', item.fecha_de_publicacion], ['Apertura', item.fecha_de_apertura], ['Fallo', item.fecha_de_fallo],
    ['Inicio del contrato', item.fecha_de_inicio_del_contrato], ['Fin del contrato', item.fecha_de_fin_del_contrato],
  ];
  return <><Box position="fixed" inset={0} bg="rgba(10,10,10,.32)" zIndex={80} onClick={onClose} />
    <Box position="fixed" right={0} top={0} bottom={0} w={{ base: '100%', md: '520px' }} bg="var(--cl-surface)"
      color="var(--cl-text)" zIndex={81} boxShadow="-18px 0 50px rgba(0,0,0,.18)" overflowY="auto">
      <Flex p={6} borderBottom="1px solid var(--cl-border)" justify="space-between" gap={4} align="start" position="sticky" top={0} bg="var(--cl-surface)" zIndex={2}>
        <Box><Text color="#FF653F" fontSize="10px" fontWeight="800">DETALLE DE LICITACIÓN</Text>
          <Heading fontSize="20px" mt={1}>{item.expediente}</Heading><Text fontSize="11px" color="var(--cl-text-muted)" mt={1}>{item.institucion_convocante}</Text></Box>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Cerrar"><FiX /></Button>
      </Flex>
      <Stack p={6} gap={7}>
        <Flex gap={2} wrap="wrap">
          <Button size="sm" bg={followed ? '#FFF4D6' : 'var(--cl-surface-muted)'} color={followed ? '#9A6700' : 'var(--cl-text)'} onClick={onToggleFollow}><FiStar /> {followed ? 'Siguiendo' : 'Seguir'}</Button>
          {item.direccion_del_anuncio && item.direccion_del_anuncio !== LICITACION_EMPTY_VALUE && <Button as="a" href={item.direccion_del_anuncio} target="_blank" rel="noopener noreferrer" size="sm" variant="outline"><FiExternalLink /> Abrir expediente</Button>}
        </Flex>
        <DetailGroup title="Identificación" items={[
          { label: 'Clave', value: item.clave }, { label: 'Código expediente', value: item.codigo_del_expediente },
          { label: 'Número procedimiento', value: item.numero_de_procedimiento }, { label: 'Código contrato', value: item.codigo_del_contrato },
          { label: 'Fuente del registro', value: item.fuente_del_registro },
        ]} />
        <DetailGroup title="Descripción" items={[{ label: 'Descripción', value: item.descripcion }, { label: 'Fuente', value: item.fuente_de_la_descripcion }]} />
        <Box><Text fontSize="10px" color="#FF653F" fontWeight="800" letterSpacing=".12em" mb={4}>LÍNEA DE TIEMPO</Text>
          <Stack gap={0}>{timeline.map(([label, value], index) => <Flex key={label} gap={3} minH="48px">
            <Flex direction="column" align="center"><Box w="9px" h="9px" borderRadius="full" bg={value ? '#FF653F' : '#C9C9C9'} mt={1} />
              {index < timeline.length - 1 && <Box w="1px" flex="1" bg="var(--cl-border)" />}</Flex>
            <Box><Text fontSize="11px" fontWeight="700">{label}</Text><Text fontSize="10px" color="var(--cl-text-muted)">{formatLicitacionDate(value, 'Sin fecha')}</Text></Box>
          </Flex>)}</Stack></Box>
        <DetailGroup title="Contrato adjudicado" items={[
          { label: 'Proveedor', value: item.proveedor_adjudicado }, { label: 'RFC', value: item.RFC_del_proveedor },
          { label: 'Estratificación', value: item.estratificacion_del_proveedor },
          { label: 'Monto', value: item.monto_del_contrato_MXN === null ? '' : formatLicitacionAmount(item.monto_del_contrato_MXN) },
          { label: 'Inicio', value: item.fecha_de_inicio_del_contrato ? formatLicitacionDate(item.fecha_de_inicio_del_contrato) : '' },
          { label: 'Fin', value: item.fecha_de_fin_del_contrato ? formatLicitacionDate(item.fecha_de_fin_del_contrato) : '' },
        ]} />
      </Stack>
    </Box></>;
}
