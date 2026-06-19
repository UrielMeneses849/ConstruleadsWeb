import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Flex,
  Button,
} from '@chakra-ui/react';

export default function PanelResumen({ obras = [] }) {

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
    label: 'Proyectos encontrados',
    color: '#3B82F6',
    icon: '◫',
  },
  {
    valor: `$${(inversionTotal / 1000000).toFixed(2)}`,
    suffix: 'MDP',
    label: 'Inversión total',
    color: '#FF6600',
    icon: '◌',
  },
  {
    valor: estadosConProyectos.toLocaleString(),
    label: 'Estados con proyectos',
    color: '#2FB15A',
    icon: '◇',
  },
  {
    valor: superficieTotal.toLocaleString(),
    label: 'Superficie general',
    color: '#7C5CFA',
    icon: '◐',
  },
];
  return (
    <VStack
      w="340px"
      gap={2}
      align="stretch"
    >
      <Box
        bg="white"
        p={4}
        borderRadius="28px"
        border="1px solid #E5E7EB"
      >
        <HStack justify="space-between" mb={3}>
          <Heading size="sm">Descargas</Heading>
          <Text fontSize="12px" color="#6B7280">5 archivos</Text>
        </HStack>

        <Flex wrap="wrap" gap={2}>
          <Button size="xs" bg="#FF6600" color="white" _hover={{ bg: '#E65C00' }}>PDF</Button>
          <Button size="xs" variant="outline" borderColor="#FF6600" color="#FF6600">Clásica</Button>
          <Button size="xs" variant="outline" borderColor="#FF6600" color="#FF6600">Contactos</Button>
          <Button size="xs" variant="outline" borderColor="#FF6600" color="#FF6600">Compañías</Button>
          <Button size="xs" variant="outline" borderColor="#FF6600" color="#FF6600">Prospección</Button>
        </Flex>
      </Box>

      <Box
        bg="white"
        p={4}
        borderRadius="28px"
        border="1px solid #E5E7EB"
      >
        <Heading size="sm" mb={3}>
          Reporte programado
        </Heading>

        <HStack>
          <Box
            as="select"
            flex="1"
            h="32px"
            px={2}
            border="1px solid"
            borderColor="#E5E7EB"
            borderRadius="md"
          >
            <option>PDF</option>
            <option>Excel</option>
          </Box>

          <Box
            as="select"
            flex="1"
            h="32px"
            px={2}
            border="1px solid"
            borderColor="#E5E7EB"
            borderRadius="md"
          >
            <option>Semanal</option>
            <option>Quincenal</option>
            <option>Mensual</option>
          </Box>
        </HStack>

        <Button mt={3} size="sm" bg="#FF6600" color="white" _hover={{ bg: '#E65C00' }} w="full">
          Programar envío
        </Button>
      </Box>
                              
      <Box
        bg="white"
        p={1}
        borderRadius="28px"
        border="1px solid #E5E7EB"
      >
        <Heading size="sm" mb={2} px={3}>
          Resumen de proyectos
        </Heading>

        <Flex wrap="wrap" gap={2}>
          {metricasDinamicas.map((item) => (
            <Flex
              key={item.label}
              flex="1"
              minW="125px"
              bg="#F7F7F9"
              borderRadius="22px"
              p={3}
              flexDirection="column"
              align="flex-start"
              gap={2}
            >
              <Flex
                w="34px"
                h="34px"
                borderRadius="10px"
                bg={`${item.color}15`}
                color={item.color}
                align="center"
                justify="center"
                fontSize="16px"
              >
                {item.icon}
              </Flex>

              <Box>
                <HStack spacing={1} align="baseline">
                  <Text fontSize="18px" fontWeight="800">
                    {item.valor}
                  </Text>
                  {item.suffix && (
                    <Text fontWeight="700">{item.suffix}</Text>
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
        p={6}
        borderRadius="28px"
        border="1px solid #E5E7EB"
      >
        <Heading size="md" mb={6}>
          Top 5 estados por proyectos
        </Heading>

        <VStack align="stretch" gap={5}>
          {topEstados.map(([nombre, valor], index) => {
            const colores = ['#FF6600', '#F97316', '#FB8C00', '#F4A261', '#E9B88D'];
            return (
            <Flex key={nombre} align="center" gap={4}>
              <Text
                minW="110px"
                fontWeight="700"
                fontSize="14px"
              >
                {nombre}
              </Text>

              <Box flex="1">
                <Box
                  h="10px"
                  borderRadius="full"
                  bg="#F3F4F6"
                >
                  <Box
                    h="100%"
                    w={`${(valor / maxValor) * 100}%`}
                    borderRadius="full"
                    bg={colores[index] || '#FF6600'}
                  />
                </Box>
              </Box>

              <Text fontWeight="600">{valor}</Text>
            </Flex>
          );
          })}
        </VStack>
      </Box>

    </VStack>
  );
}