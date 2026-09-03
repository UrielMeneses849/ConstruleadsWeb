import { Box, Flex, Grid, Image, SimpleGrid, Text } from '@chakra-ui/react';

const valueOrUnknown = (value) => String(value || '').trim() || 'Desconocido';

const cleanDisplayValue = (value) => {
  const cleaned = String(value || '')
    .trim()
    .replace(/^[,;:\s]+/, '')
    .replace(/\s+/g, ' ');
  return cleaned || 'Desconocido';
};

const formatNumber = (value) => {
  const number = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(number) ? new Intl.NumberFormat('es-MX').format(number) : '0';
};

function DetailCard({ label, children }) {
  return (
    <Box bg="var(--ft-surface-muted)" borderRadius="12px" p={4} minW="0">
      <Text color="var(--ft-text-muted)" fontSize="12px" mb={1}>{label}</Text>
      <Text fontSize="14px" fontWeight="500" overflowWrap="anywhere">{children}</Text>
    </Box>
  );
}

function CenteredTagCard({ label, children }) {
  return (
    <Box
      bg="var(--ft-surface-muted)"
      borderRadius="12px"
      p={4}
      minW="0"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
    >
      <Text color="var(--ft-text-muted)" fontSize="12px" mb={2}>{label}</Text>
      <Tag>{children}</Tag>
    </Box>
  );
}

function DateCard({ startDate, endDate }) {
  return (
    <Box bg="var(--ft-surface-muted)" borderRadius="12px" p={4} minW="0">
      <Grid templateColumns="minmax(130px, 1fr) auto" gap="8px 16px" alignItems="center">
        <Text color="var(--ft-text-muted)" fontSize="12px" whiteSpace="nowrap">Fecha inicio probable</Text>
        <Text fontSize="13px" fontWeight="500" textAlign="right">{valueOrUnknown(startDate)}</Text>
        <Text color="var(--ft-text-muted)" fontSize="12px" whiteSpace="nowrap">Fecha término probable</Text>
        <Text fontSize="13px" fontWeight="500" textAlign="right">{valueOrUnknown(endDate)}</Text>
      </Grid>
    </Box>
  );
}

function SummaryRow({ label, children, emphasis = false }) {
  return (
    <Flex justify="space-between" align="flex-start" gap={4}>
      <Text color="var(--ft-text-muted)" fontSize={emphasis ? '14px' : '13px'} flexShrink={0}>{label}</Text>
      <Text
        fontSize={emphasis ? '15px' : '13px'}
        fontWeight={emphasis ? '600' : '500'}
        textAlign="right"
        overflowWrap="anywhere"
      >
        {children}
      </Text>
    </Flex>
  );
}

function Tag({ children }) {
  return (
    <Box as="span" display="inline-flex" px={3} py={1} border="1px solid #D95B27"
      borderRadius="999px" color="#B9471E" fontSize="12px" fontWeight="600">
      {children}
    </Box>
  );
}

function Company({ company }) {
  const phones = [company.telefono1, company.telefono2, company.telefono3].filter(Boolean);
  return (
    <Grid templateColumns={{ base: '1fr', lg: 'minmax(230px, .8fr) 1.4fr' }} gap={6} py={5}
      borderTop="1px solid var(--ft-border)" _first={{ borderTop: 0 }}>
      <Box>
        <Text fontSize="16px" fontWeight="600" mb={3}>{valueOrUnknown(company.nombre)}</Text>
        <Grid templateColumns="82px 1fr" gap="5px 10px" fontSize="13px">
          <Text color="var(--ft-text-muted)">Rol</Text><Text>{valueOrUnknown(company.rol)}</Text>
          <Text color="var(--ft-text-muted)">Dirección</Text><Text>{valueOrUnknown(company.direccion)}</Text>
          {phones.map((phone, index) => (
            <Box key={`${phone}-${index}`} display="contents">
              <Text color="var(--ft-text-muted)">{index ? `Teléfono ${index + 1}` : 'Teléfono'}</Text><Text>{phone}</Text>
            </Box>
          ))}
        </Grid>
      </Box>
      <Box>
        <Text color="var(--ft-text-muted)" fontSize="12px" mb={3}>Contactos</Text>
        {company.contactos?.length ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
            {company.contactos.map((contact, index) => (
              <Box key={`${contact.email}-${index}`} bg="var(--ft-surface-muted)" borderRadius="12px" p={4}>
                <Text fontWeight="600" fontSize="13px">{valueOrUnknown(contact.puesto)}</Text>
                <Text fontSize="13px" mt={1}>{valueOrUnknown(contact.nombre)}</Text>
                {contact.email && <Text color="var(--ft-text-muted)" fontSize="12px" mt={1}>{contact.email}</Text>}
              </Box>
            ))}
          </SimpleGrid>
        ) : <Text color="var(--ft-text-muted)" fontSize="13px">Sin contactos registrados</Text>}
      </Box>
    </Grid>
  );
}

export default function FichaTecnicaContent({ obra, isDarkMode = false }) {
  const additional = [
    ['Descripción', obra.descripcion], ['Acabados', obra.acabados],
    ['Observaciones', obra.observaciones], ['Descripción adicional', obra.descripcionextra],
    ['Características', obra.caracteristicas], ['Actualización', obra.actualizacion],
    ['Concurso', obra.concurso],
  ].filter(([, value]) => String(value || '').trim());

  return (
    <Box w="100%" maxW="1380px" mx="auto" p={{ base: 4, md: 7 }} bg="var(--ft-surface)" color="var(--ft-text)"
      fontFamily="Poppins, sans-serif">
      <Flex justify="space-between" align="flex-start" gap={6} mb={5}>
        <Image src={`${import.meta.env.BASE_URL}logo-construleads.svg`} alt="Bimsa Construleads"
          w={{ base: '175px', md: '230px' }} h="auto" objectFit="contain"
          filter={isDarkMode ? 'brightness(0) invert(1)' : undefined} />
        <Box textAlign="right">
          <Text fontSize={{ base: '18px', md: '21px' }} fontWeight="500">Ficha Técnica del Proyecto</Text>
          <Text fontSize="13px" color="var(--ft-text-muted)">Fecha de publicación: {valueOrUnknown(obra.proy_fechacierre)}</Text>
          <Flex justify="flex-end" gap={2} mt={3} wrap="wrap">
            <Box bg="#D95B27" color="white" px={3} py={2} borderRadius="8px" fontSize="12px" fontWeight="600">
              {cleanDisplayValue(obra.proy_tipoproyectodescripcion)}
            </Box>
            <Box bg="var(--ft-chip)" px={3} py={2} borderRadius="8px" fontSize="12px" fontWeight="600">
              {valueOrUnknown(obra.proy_clave)}
            </Box>
          </Flex>
        </Box>
      </Flex>

      <Box border="1px solid var(--ft-border)" borderLeft="5px solid #D95B27" borderRadius="24px" p={{ base: 4, md: 6 }}>
        <Flex justify="space-between" align="center" gap={3} mb={4}>
          <Text fontSize="22px" fontWeight="400">Información General</Text>
          <Tag>Etapa: {cleanDisplayValue(obra.proy_etapa)}</Tag>
        </Flex>
        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={3}>
          <Box>
            <DetailCard label="Nombre del proyecto">{valueOrUnknown(obra.proy_nombre)}</DetailCard>
            <Grid
              templateColumns={{ base: '1fr', md: 'minmax(280px, 1.2fr) minmax(0, .9fr) minmax(0, .9fr)' }}
              gap={3}
              mt={3}
            >
              <DateCard startDate={obra.proy_fecha_inicio} endDate={obra.proy_fecha_fin} />
              <CenteredTagCard label="Género">{obra.genero}</CenteredTagCard>
              <CenteredTagCard label="Subgénero">{obra.subgenero}</CenteredTagCard>
            </Grid>
            <Box mt={3}><DetailCard label={`Ubicación · ${valueOrUnknown(obra.esta_descripcion)}, ${valueOrUnknown(obra.muni_descripcion)}`}>
              {valueOrUnknown(obra.proy_localizacion)}
            </DetailCard></Box>
          </Box>
          <Box
            bg="var(--ft-surface-muted)"
            borderRadius="16px"
            p={5}
            display="flex"
            flexDirection="column"
            justifyContent="space-between"
            gap={4}
          >
            <SummaryRow label="Inversión" emphasis>MXN ${formatNumber(obra.proy_inversion)}</SummaryRow>
            <SummaryRow label="Superficie construida">
              {Number(obra.superficie) ? `${formatNumber(obra.superficie)} m²` : 'Desconocido'}
            </SummaryRow>
            <SummaryRow label="Sector">{valueOrUnknown(obra.sector)}</SummaryRow>
            <SummaryRow label="Tipo de obra">{valueOrUnknown(obra.tipo_obra)}</SummaryRow>
            <SummaryRow label="Tipo de desarrollo">{valueOrUnknown(obra.desa_descripcion)}</SummaryRow>
          </Box>
        </Grid>
      </Box>

      <Box border="1px solid var(--ft-border)" borderRadius="24px" p={{ base: 4, md: 6 }} mt={2}>
        <Text fontSize="22px" mb={1}>Compañías</Text>
        {obra.cias_normalizadas?.length
          ? obra.cias_normalizadas.map((company, index) => <Company key={`${company.nombre}-${index}`} company={company} />)
          : <Text color="var(--ft-text-muted)" fontSize="13px" mt={4}>Sin compañías registradas</Text>}
      </Box>

      {additional.length > 0 && (
        <Box border="1px solid var(--ft-border)" borderRadius="24px" p={{ base: 4, md: 6 }} mt={2}>
          <Text fontSize="22px" mb={5}>Información Adicional</Text>
          <Grid templateColumns="1fr" gap={5}>
            {additional.map(([label, value]) => (
              <Box key={label}>
                <Text fontWeight="600" fontSize="14px" mb={1}>{label}</Text>
                <Text color="var(--ft-text-muted)" fontSize="13px" whiteSpace="pre-wrap">{value}</Text>
              </Box>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
