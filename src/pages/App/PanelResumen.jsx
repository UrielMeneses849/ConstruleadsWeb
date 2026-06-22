import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Flex,
  Button,
} from '@chakra-ui/react';

export default function PanelResumen({ obras = [], variant = 'sidebar' }) {

const totalProyectos = obras.length;
const inversionTotal = obras.reduce(
  (acc, o) => acc + (Number(o.inversion) || 0),
  0
);
const superficieTotal = obras.reduce(
  (acc, o) => acc + (Number(o.superficie) || 0),
  0
);

const estadosMap = {};
obras.forEach((o) => {
  const estado = o.estado;
  if (!estado) return;
  estadosMap[estado] = (estadosMap[estado] || 0) + 1;
});

const estadosConProyectos = Object.keys(estadosMap).length;

const topEstados = Object.entries(estadosMap)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

const maxValor = topEstados[0]?.[1] || 1;

const metricasDinamicas = [
  {
    valor: totalProyectos.toLocaleString(),
    label: 'Proyectos',
    color: '#3B82F6',
  },
  {
    valor: `$${(inversionTotal / 1000000).toFixed(2)}`,
    suffix: 'MDP',
    label: 'Inversión',
    color: '#FF6600',
  },
  {
    valor: estadosConProyectos.toLocaleString(),
    label: 'Estados',
    color: '#2FB15A',
  },
  {
    valor: superficieTotal.toLocaleString(),
    label: 'Superficie',
    color: '#7C5CFA',
  },
];

if (variant === 'floating') {
  return (
    <Flex
      align="stretch"
      gap={3}
      w="100%"
    >
      <Box
        flex="2.2"
        minW="0"
        p={4}
        borderRadius="12px"
        boxShadow="0 12px 30px rgba(0,0,0,.12)"
        border="1px solid #E5E7EB"
      >
        <Heading size="sm" mb={3} px={3}>
          Resumen de proyectos
        </Heading>

        <Flex gap={2} w="100%" px={3} align="stretch">
          {metricasDinamicas.map((item) => (
            <Box
              key={item.label}
              flex="1 1 0"
              minW="0"

              borderRadius="16px"
              px={3}
              py={2}
            >
              <HStack spacing={1} align="baseline" mb={1}>
                <Text fontSize="22px" fontWeight="400">
                  {item.valor}
                </Text>
                {item.suffix && (
                  <Text fontWeight="400">{item.suffix}</Text>
                )}
              </HStack>

              <Text
                w="100%"
                fontSize="11px"
                color="#6B7280"
                whiteSpace="nowrap"
                overflow="visible"
              >
                {item.label}
              </Text>
            </Box>
          ))}
        </Flex>
      </Box>

      <Box
        minW="340px"
        maxW="340px"

        p={4}
        borderRadius="24px"
        boxShadow="0 12px 30px rgba(0,0,0,.12)"
        border="1px solid #E5E7EB"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
      >
        <Flex justify="space-between" align="center" mb={2} w="100%">
          <Heading size="sm">Descargas</Heading>
          <Text fontSize="12px" color="#6B7280">
            5 archivos
          </Text>
        </Flex>

        <HStack spacing={2} w="100%" align="center" justify="center">
          <Box flex="1">
            <select
              defaultValue="pdf"
              style={{
                width: '100%',
                height: '48px',
                border: '1px solid #FF6600',
                borderRadius: '8px',
                padding: '0 12px',
                background: 'white',
              }}
            >
              <option value="pdf">PDF</option>
              <option value="excel-clasica">Excel - Clásica</option>
              <option value="excel-contactos">Excel - Contactos</option>
              <option value="excel-companias">Excel - Compañías</option>
              <option value="excel-prospeccion">Excel - Prospección</option>
            </select>
          </Box>

          <Button
            flex="0 0 130px"
            h="48px"
            bg="#FF6600"
            color="white"
            _hover={{ bg: '#E65C00' }}
          >
            Descargar
          </Button>
        </HStack>
      </Box>
    </Flex>
  );
}

  return (
    <VStack
      w="100%"
      gap={2}
      align="stretch"
      flexFlow="row"
    >

      <Box
        bg="white"
        p={1}
        pl={4}
        pr={4}
        borderRadius="22px"
        border="1px solid #E5E7EB"
        width="100%"
      >
        <Heading size="sm" mb={2} >
          Resumen de proyectos
        </Heading>

        <Flex wrap="wrap" gap={2}>
          {metricasDinamicas.map((item) => (
            <Flex
              key={item.label}
              flex="1"
              minW="125px"
              borderRadius="22px"
              p={3}
              flexDirection="column"
              align="flex-start"
              gap={1}
            >
              
              <Box>
                <HStack spacing={1} align="baseline">
                  <Text fontSize="18px" fontWeight="400">
                    {item.valor}
                  </Text>
                  {item.suffix && (
                    <Text fontWeight="400">{item.suffix}</Text>
                  )}
                </HStack>
                <Text
                  mt={1}
                  fontSize="12px"
                  color="#6B7280"
                  maxW="90px"
                  lineHeight="1.2"
                >
                  {item.label}
                </Text>
              </Box>
            </Flex>
          ))}
        </Flex>
      </Box>

      <Box
        bg="white"
        p={4}
        borderRadius="28px"
        border="1px solid #E5E7EB"
        minW="420px"
      >
        <HStack justify="space-between" mb={5}>
          <Heading size="sm">Descargas</Heading>
          <Text fontSize="12px" color="#6B7280">5 archivos</Text>
        </HStack>

        <Flex gap={2} align="center">
          <Box flex="1">
            <select
              defaultValue="pdf"
              style={{
                width: '100%',
                height: '36px',
                border: '1px solid #FF6600',
                borderRadius: '8px',
                padding: '0 12px',
                background: 'white',
              }}
            >
              <option value="pdf">PDF</option>
              <option value="excel-clasica">Excel - Clásica</option>
              <option value="excel-contactos">Excel - Contactos</option>
              <option value="excel-companias">Excel - Compañías</option>
              <option value="excel-prospeccion">Excel - Prospección</option>
            </select>
          </Box>

          <Button
            minW="120px"
            h="36px"
            bg="#FF6600"
            color="white"
            _hover={{ bg: '#E65C00' }}
          >
            Descargar
          </Button>
        </Flex>


    </Box>


    </VStack>
  );
}